import { getDB } from '../database/db';

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
  details?: any;
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
    this.addLog(
      'info',
      `사용자 연결: ${userSession.name} (${userSession.instrument})`,
      'UserManager'
    );
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
  addLog(
    level: SystemLog['level'],
    message: string,
    component?: string,
    details?: any
  ): void {
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
  getSystemSettings() {
    const db = getDB().getDatabase();

    try {
      // 시스템 설정 테이블이 없으면 생성
      db.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const settings = db
        .prepare('SELECT key, value FROM system_settings')
        .all();
      const settingsObj: Record<string, any> = {};

      settings.forEach((setting: any) => {
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

  updateSystemSetting(key: string, value: any): boolean {
    const db = getDB().getDatabase();

    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO system_settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(key, JSON.stringify(value));
      this.addLog('info', `시스템 설정 업데이트: ${key}`, 'AdminService');
      return true;
    } catch (error) {
      this.addLog(
        'error',
        `시스템 설정 업데이트 실패: ${key}`,
        'AdminService',
        error
      );
      return false;
    }
  }

  // 데이터베이스 통계
  getDatabaseStats() {
    const db = getDB().getDatabase();

    try {
      const stats = {
        worships:
          db.prepare('SELECT COUNT(*) as count FROM worships').get()?.count ||
          0,
        scores:
          db.prepare('SELECT COUNT(*) as count FROM scores').get()?.count || 0,
        drawings:
          db.prepare('SELECT COUNT(*) as count FROM score_drawings').get()
            ?.count || 0,
        templates:
          db.prepare('SELECT COUNT(*) as count FROM command_templates').get()
            ?.count || 0,
        users:
          db.prepare('SELECT COUNT(*) as count FROM users').get()?.count || 0,
      };

      return stats;
    } catch (error) {
      this.addLog(
        'error',
        '데이터베이스 통계 조회 실패',
        'AdminService',
        error
      );
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
  cleanupSystem(): { success: boolean; message: string } {
    try {
      const db = getDB().getDatabase();

      // 오래된 드로잉 데이터 정리 (30일 이상)
      const deletedDrawings = db
        .prepare(
          `
        DELETE FROM score_drawings 
        WHERE created_at < datetime('now', '-30 days')
      `
        )
        .run();

      // 비활성 예배 정리 (90일 이상)
      const deletedWorships = db
        .prepare(
          `
        DELETE FROM worships 
        WHERE is_active = 0 AND updated_at < datetime('now', '-90 days')
      `
        )
        .run();

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
