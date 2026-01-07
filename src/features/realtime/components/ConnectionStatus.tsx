// 실시간 연결 상태 표시 컴포넌트

import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { ConnectionStatus as ConnectionStatusType } from '../types';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  participantCount: number;
}

export function ConnectionStatus({ status, participantCount }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {/* 연결 아이콘 */}
      {status === 'connected' && (
        <span className="flex items-center gap-1 text-green-600">
          <Wifi className="h-4 w-4" />
          <span>연결됨</span>
        </span>
      )}
      {status === 'connecting' && (
        <span className="flex items-center gap-1 text-amber-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>연결 중...</span>
        </span>
      )}
      {status === 'disconnected' && (
        <span className="flex items-center gap-1 text-gray-400">
          <WifiOff className="h-4 w-4" />
          <span>연결 끊김</span>
        </span>
      )}
      {status === 'error' && (
        <span className="flex items-center gap-1 text-red-600">
          <WifiOff className="h-4 w-4" />
          <span>연결 오류</span>
        </span>
      )}

      {/* 참여자 수 (연결 시에만 표시) */}
      {status === 'connected' && participantCount > 0 && (
        <span className="text-gray-500">
          · {participantCount}명 참여 중
        </span>
      )}
    </div>
  );
}

export default ConnectionStatus;
