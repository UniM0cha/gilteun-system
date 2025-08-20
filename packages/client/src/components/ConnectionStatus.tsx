import { useSocket } from '../hooks/useSocket';
import { Button } from './ui/button';
import { WifiOff, Wifi, Loader2 } from 'lucide-react';

export const ConnectionStatus = () => {
  const { isConnected, isConnecting, error, connect, disconnect } = useSocket();

  if (isConnecting) {
    return (
      <div className="flex items-center space-x-2 text-yellow-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">연결 중...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <Wifi className="h-4 w-4" />
        <span className="text-sm">연결됨</span>
        <Button variant="outline" size="sm" onClick={disconnect}>
          연결 해제
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-red-600">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm">
        {error ? `연결 실패: ${error}` : '연결되지 않음'}
      </span>
      <Button variant="outline" size="sm" onClick={connect}>
        다시 연결
      </Button>
    </div>
  );
};