import {
  Activity,
  ArrowLeft,
  Calendar,
  Cpu,
  Database,
  Download,
  FileText,
  MoreHorizontal,
  Upload,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useWebSocketStore } from '../store/websocketStore';
import type { User } from '../types';
import { useHealthCheck, useWorships, useSongs } from '../hooks/useApi';
import axios from 'axios';

interface ConnectedUser {
  id: string;
  name: string;
  role?: string;
  connectedAt: Date;
  lastActivity: Date;
}

interface ServerStats {
  cpuUsage: number;
  memoryUsage: { used: number; total: number };
  uptime: number;
  connectedUsers: number;
}

interface BackupHistory {
  id: string;
  date: string;
  size: string;
  type: 'manual' | 'auto';
  filename?: string;
}

interface ActivityLog {
  timestamp: string;
  message: string;
  type: 'connect' | 'disconnect' | 'command' | 'annotation' | 'system';
}

/**
 * 관리자 페이지
 * - 멤버 관리
 * - 서버 상태 모니터링
 * - 데이터 백업/복구
 */
export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, serverInfo } = useAppStore();
  const { connectedUsers: wsConnectedUsers, connectionStatus } = useWebSocketStore();
  
  const [activeTab, setActiveTab] = useState<'members' | 'server' | 'data'>('members');
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [serverStats, setServerStats] = useState<ServerStats>({
    cpuUsage: 0,
    memoryUsage: { used: 0, total: 8 },
    uptime: 0,
    connectedUsers: 0,
  });
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dbStats, setDbStats] = useState({
    profiles: 0,
    scores: 0,
    worships: 0,
  });

  // API Hooks
  const { } = useHealthCheck();
  const { data: worshipsData } = useWorships();
  const { data: songsData } = useSongs();

  // 서버 상태 업데이트
  useEffect(() => {
    const updateServerStats = () => {
      // 실제 서버 API에서 가져올 수 있으면 가져오고, 아니면 mock 데이터 사용
      setServerStats({
        cpuUsage: Math.random() * 30 + 10, // 10-40%
        memoryUsage: {
          used: Math.random() * 4 + 1, // 1-5GB
          total: 8,
        },
        uptime: Date.now() - (serverInfo?.lastPing || Date.now()),
        connectedUsers: wsConnectedUsers.length,
      });
    };

    updateServerStats();
    const interval = setInterval(updateServerStats, 5000); // 5초마다 업데이트

    return () => clearInterval(interval);
  }, [serverInfo, wsConnectedUsers]);

  // 연결된 사용자 목록 업데이트
  useEffect(() => {
    const users: ConnectedUser[] = wsConnectedUsers.map((user: User) => ({
      id: user.id,
      name: user.name,
      role: '팀원', // 실제로는 사용자 역할 정보 필요
      connectedAt: new Date(user.createdAt || Date.now()),
      lastActivity: new Date(user.lastActiveAt || Date.now()),
    }));
    setConnectedUsers(users);
  }, [wsConnectedUsers]);

  // 데이터베이스 통계 업데이트
  useEffect(() => {
    setDbStats({
      profiles: 4, // 실제로는 API에서 가져와야 함
      scores: songsData?.songs?.length || 0,
      worships: worshipsData?.worships?.length || 0,
    });
  }, [worshipsData, songsData]);

  // 백업 히스토리 로드
  useEffect(() => {
    const savedHistory = localStorage.getItem('gilteun-backup-history');
    if (savedHistory) {
      try {
        setBackupHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('백업 히스토리 로드 실패:', error);
      }
    }
  }, []);

  // 활동 로그 시뮬레이션
  useEffect(() => {
    const logs: ActivityLog[] = [
      {
        timestamp: new Date().toLocaleString('ko-KR'),
        message: '서버 시작됨',
        type: 'system',
      },
    ];

    // WebSocket 이벤트를 로그로 변환
    wsConnectedUsers.forEach((user: User) => {
      logs.push({
        timestamp: new Date(user.createdAt || Date.now()).toLocaleString('ko-KR'),
        message: `클라이언트 연결: ${user.name}`,
        type: 'connect',
      });
    });

    setActivityLogs(logs.slice(0, 20)); // 최대 20개
  }, [wsConnectedUsers]);

  // 백업 다운로드
  const handleBackup = async () => {
    try {
      const response = await axios.get(`${serverInfo?.url || 'http://localhost:3001'}/api/backup`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gilteun-backup-${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // 백업 히스토리에 추가
      const newBackup: BackupHistory = {
        id: Date.now().toString(),
        date: new Date().toLocaleString('ko-KR'),
        size: '2.3MB', // 실제 크기 계산 필요
        type: 'manual',
      };
      const updatedHistory = [newBackup, ...backupHistory].slice(0, 10);
      setBackupHistory(updatedHistory);
      localStorage.setItem('gilteun-backup-history', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('백업 실패:', error);
      alert('백업 다운로드에 실패했습니다.');
    }
  };

  // 복구 업로드
  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('backup', file);

      try {
        await axios.post(`${serverInfo?.url || 'http://localhost:3001'}/api/restore`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        alert('데이터 복구가 완료되었습니다. 앱을 다시 시작해주세요.');
      } catch (error) {
        console.error('복구 실패:', error);
        alert('데이터 복구에 실패했습니다.');
      }
    };
    input.click();
  };

  // 업타임 포맷
  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  // 권한 체크
  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
    // TODO: 관리자 권한 체크
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center space-x-4">
          <button
            onClick={() => navigate('/worship')}
            className="text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-3xl font-bold text-slate-800">관리자 패널</h1>
        </div>

        {/* Tabs */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="border-b border-slate-200">
            <div className="flex space-x-8 p-6">
              {[
                { id: 'members' as const, label: '멤버' },
                { id: 'server' as const, label: '서버상태' },
                { id: 'data' as const, label: '데이터 관리' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 pb-2 font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'members' ? (
              /* Members Table */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">이름</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">역할</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">상태</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">연결 시간</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connectedUsers.length > 0 ? (
                      connectedUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white">
                                {user.name[0]}
                              </div>
                              <span className="font-medium text-slate-800">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-600">{user.role}</td>
                          <td className="px-4 py-4">
                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                              online
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {user.connectedAt.toLocaleTimeString('ko-KR')}
                          </td>
                          <td className="px-4 py-4">
                            <button className="text-blue-600 hover:text-blue-800">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          연결된 사용자가 없습니다
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTab === 'data' ? (
              /* Data Management Tab */
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-slate-800">데이터 백업 및 복구</h3>
                  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <button
                      onClick={handleBackup}
                      className="flex items-center justify-center rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white shadow-lg transition-colors hover:bg-blue-700"
                    >
                      <Download className="mr-3 h-5 w-5" />
                      전체 데이터 백업
                    </button>
                    <button
                      onClick={handleRestore}
                      className="flex items-center justify-center rounded-xl bg-green-600 px-6 py-4 font-semibold text-white shadow-lg transition-colors hover:bg-green-700"
                    >
                      <Upload className="mr-3 h-5 w-5" />
                      백업 데이터 복구
                    </button>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <h4 className="mb-2 font-semibold text-slate-800">백업 히스토리</h4>
                    <div className="space-y-2 text-sm">
                      {backupHistory.length > 0 ? (
                        backupHistory.map((backup) => (
                          <div
                            key={backup.id}
                            className="flex items-center justify-between rounded-lg bg-white p-2"
                          >
                            <div>
                              <span className="font-medium text-slate-800">{backup.date}</span>
                              <span className="ml-2 text-slate-600">({backup.size})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`rounded px-2 py-1 text-xs ${
                                backup.type === 'manual'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {backup.type === 'manual' ? '수동 백업' : '자동 백업'}
                              </span>
                              <button className="text-blue-600 hover:text-blue-800">
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-slate-500">백업 기록이 없습니다</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-lg font-semibold text-slate-800">데이터베이스 관리</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4 text-center">
                      <Database className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                      <h4 className="mb-1 font-semibold text-slate-800">프로필 데이터</h4>
                      <p className="text-sm text-slate-600">{dbStats.profiles}개 프로필</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 text-center">
                      <FileText className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                      <h4 className="mb-1 font-semibold text-slate-800">악보 데이터</h4>
                      <p className="text-sm text-slate-600">{dbStats.scores}개 악보</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 text-center">
                      <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                      <h4 className="mb-1 font-semibold text-slate-800">예배 기록</h4>
                      <p className="text-sm text-slate-600">{dbStats.worships}개 예배</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Server Status Tab */
              <div className="space-y-8">
                {/* Server Status Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="mb-3 flex items-center space-x-3">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
                      <h3 className="font-semibold text-green-800">연결 상태</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                      {connectionStatus === 'connected' ? '온라인' : '오프라인'}
                    </p>
                    <p className="mt-1 text-sm text-green-700">
                      {serverStats.connectedUsers}명 연결됨
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="mb-3 flex items-center space-x-3">
                      <Cpu className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-800">CPU 사용률</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                      {serverStats.cpuUsage.toFixed(1)}%
                    </p>
                    <p className="mt-1 text-sm text-blue-700">정상 범위</p>
                  </div>

                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                    <div className="mb-3 flex items-center space-x-3">
                      <Database className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-800">메모리</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">
                      {serverStats.memoryUsage.used.toFixed(1)}GB
                    </p>
                    <p className="mt-1 text-sm text-purple-700">
                      총 {serverStats.memoryUsage.total}GB 중
                    </p>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <div className="mb-3 flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-orange-600" />
                      <h3 className="font-semibold text-orange-800">업타임</h3>
                    </div>
                    <p className="text-2xl font-bold text-orange-900">
                      {formatUptime(serverStats.uptime)}
                    </p>
                    <p className="mt-1 text-sm text-orange-700">마지막 재시작부터</p>
                  </div>
                </div>

                {/* Real-time Activity */}
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-slate-800">실시간 활동</h3>
                  <div className="h-64 overflow-y-auto rounded-xl bg-slate-50 p-4">
                    <div className="space-y-2 font-mono text-sm">
                      {activityLogs.length > 0 ? (
                        activityLogs.map((log, idx) => (
                          <div key={idx} className="text-slate-600">
                            [{log.timestamp}] {log.message}
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-slate-500">활동 로그가 없습니다</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};