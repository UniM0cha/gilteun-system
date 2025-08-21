import { getDrizzleDB } from '../database/drizzle.js';
import { worships, scores, scoreDrawings, users, systemSettings } from '../database/schema.js';
import { eq, count, and, sql } from 'drizzle-orm';

export interface SystemStatus {
  isOnline: boolean;
  connectedUsers: number;
  uptime: string;
  serverPort: number;
  lastSync: string;
  startTime: Date;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: number;
}

export interface UserSession {
  id: string;
  name: string;
  instrument: string;
  joinedAt: string;
  isActive: boolean;
  currentPage?: number;
  worshipId?: string;
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  component?: string;
  details?: unknown;
}

class AdminService {
  private startTime: Date;
  private logs: SystemLog[] = [];
  private connectedUsers: Map<string, UserSession> = new Map();

  constructor() {
    this.startTime = new Date();
    this.addLog('info', '길튼 시스템 관리 서비스 시작됨', 'AdminService');
  }

  // 시스템 상태 조회
  getSystemStatus(): SystemStatus {
    const uptime = this.formatUptime(Date.now() - this.startTime.getTime());

    return {
      isOnline: true,
      connectedUsers: this.connectedUsers.size,
      uptime,
      serverPort: parseInt(process.env.PORT || '3001'),
      lastSync: new Date().toLocaleTimeString('ko-KR'),
      startTime: this.startTime,
      memoryUsage: process.memoryUsage(),
    };
  }

  // 업타임 포맷팅
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}일 ${hours % 24}시간 ${minutes % 60}분`;
    } else if (hours > 0) {
      return `${hours}시간 ${minutes % 60}분`;
    } else if (minutes > 0) {
      return `${minutes}분`;
    } else {
      return `${seconds}초`;
    }
  }

  // 연결된 사용자 관리
  addConnectedUser(socketId: string, userSession: UserSession): void {
    this.connectedUsers.set(socketId, userSession);
    this.addLog('info', `사용자 연결: ${userSession.name} (${userSession.instrument})`, 'UserManager');
  }

  removeConnectedUser(socketId: string): void {
    const user = this.connectedUsers.get(socketId);
    if (user) {
      this.connectedUsers.delete(socketId);
      this.addLog('info', `사용자 연결 해제: ${user.name}`, 'UserManager');
    }
  }

  getConnectedUsers(): UserSession[] {
    return Array.from(this.connectedUsers.values());
  }

  updateUserSession(socketId: string, updates: Partial<UserSession>): void {
    const user = this.connectedUsers.get(socketId);
    if (user) {
      this.connectedUsers.set(socketId, { ...user, ...updates });
    }
  }

  // 로그 관리
  addLog(level: SystemLog['level'], message: string, component?: string, details?: unknown): void {
    const log: SystemLog = {
      id: this.generateId(),
      level,
      message,
      timestamp: new Date(),
      component,
      details,
    };

    this.logs.unshift(log); // 최신 로그를 앞에 추가

    // 로그 개수 제한 (최대 1000개)
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }

    // 콘솔에도 출력
    const timestamp = log.timestamp.toLocaleTimeString('ko-KR');
    const prefix = component ? `[${component}]` : '';

    switch (level) {
      case 'error':
        console.error(`[${timestamp}] ${prefix} ${message}`, details || '');
        break;
      case 'warn':
        console.warn(`[${timestamp}] ${prefix} ${message}`, details || '');
        break;
      case 'debug':
        console.debug(`[${timestamp}] ${prefix} ${message}`, details || '');
        break;
      default:
        console.log(`[${timestamp}] ${prefix} ${message}`, details || '');
    }
  }

  getLogs(limit: number = 100, level?: SystemLog['level']): SystemLog[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = this.logs.filter((log) => log.level === level);
    }

    return filteredLogs.slice(0, limit);
  }

  // 시스템 설정 관리
  async getSystemSettings() {
    try {
      const db = (await getDrizzleDB()).getDatabase();

      const settings = await db.select({ key: systemSettings.key, value: systemSettings.value }).from(systemSettings);

      const settingsObj: Record<string, unknown> = {};

      settings.forEach((setting) => {
        try {
          settingsObj[setting.key] = JSON.parse(setting.value);
        } catch {
          settingsObj[setting.key] = setting.value;
        }
      });

      // 기본 설정 추가
      return {
        autoBackup: settingsObj.autoBackup || false,
        dataSync: settingsObj.dataSync || true,
        securityEnabled: settingsObj.securityEnabled || false,
        logLevel: settingsObj.logLevel || 'info',
        maxUsers: settingsObj.maxUsers || 50,
        ...settingsObj,
      };
    } catch (error) {
      this.addLog('error', '시스템 설정 조회 실패', 'AdminService', error);
      return {};
    }
  }

  async updateSystemSetting(key: string, value: unknown): Promise<boolean> {
    try {
      const db = (await getDrizzleDB()).getDatabase();

      await db
        .insert(systemSettings)
        .values({
          key,
          value: JSON.stringify(value),
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: JSON.stringify(value),
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });

      this.addLog('info', `시스템 설정 업데이트: ${key}`, 'AdminService');
      return true;
    } catch (error) {
      this.addLog('error', `시스템 설정 업데이트 실패: ${key}`, 'AdminService', error);
      return false;
    }
  }

  // 데이터베이스 통계
  async getDatabaseStats() {
    try {
      const db = (await getDrizzleDB()).getDatabase();

      const [worshipsCount, scoresCount, drawingsCount, usersCount] = await Promise.all([
        db.select({ count: count() }).from(worships),
        db.select({ count: count() }).from(scores),
        db.select({ count: count() }).from(scoreDrawings),
        db.select({ count: count() }).from(users),
      ]);

      const stats = {
        worships: worshipsCount[0]?.count || 0,
        scores: scoresCount[0]?.count || 0,
        drawings: drawingsCount[0]?.count || 0,
        templates: 0, // command_templates 테이블이 스키마에 없으므로 0으로 설정
        users: usersCount[0]?.count || 0,
      };

      return stats;
    } catch (error) {
      this.addLog('error', '데이터베이스 통계 조회 실패', 'AdminService', error);
      return {
        worships: 0,
        scores: 0,
        drawings: 0,
        templates: 0,
        users: 0,
      };
    }
  }

  // 시스템 정리 작업
  async cleanupSystem(): Promise<{ success: boolean; message: string }> {
    try {
      const db = (await getDrizzleDB()).getDatabase();

      // 오래된 드로잉 데이터 정리 (30일 이상)
      const deletedDrawings = await db
        .delete(scoreDrawings)
        .where(sql`${scoreDrawings.createdAt} < datetime('now', '-30 days')`);

      // 비활성 예배 정리 (90일 이상)
      const deletedWorships = await db
        .delete(worships)
        .where(and(eq(worships.isActive, false), sql`${worships.updatedAt} < datetime('now', '-90 days')`));

      this.addLog(
        'info',
        `시스템 정리 완료: 드로잉 ${deletedDrawings.changes}개, 예배 ${deletedWorships.changes}개 삭제`,
        'AdminService'
      );

      return {
        success: true,
        message: `정리 완료: 드로잉 ${deletedDrawings.changes}개, 예배 ${deletedWorships.changes}개 삭제됨`,
      };
    } catch (error) {
      this.addLog('error', '시스템 정리 실패', 'AdminService', error);
      return {
        success: false,
        message: '시스템 정리 중 오류가 발생했습니다.',
      };
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  generateScoreId(): string {
    return this.generateId();
  }
}

// 싱글톤 인스턴스
export const adminService = new AdminService();
