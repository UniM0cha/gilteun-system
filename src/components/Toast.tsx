import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { useAppError, useConnectionStatus, useIsOffline } from '../store';

/**
 * 토스트 메시지 타입
 */
type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * 토스트 메시지 인터페이스
 */
interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

/**
 * 토스트 컨테이너 상태 (사용 안함)
 */
// interface ToastState {
//   toasts: Toast[];
// }

/**
 * 토스트 관리 훅
 */
const useToastManager = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const newToast: Toast = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // 최대 5개

    // 자동 제거 (persistent가 false인 경우)
    if (!toast.persistent) {
      setTimeout(() => {
        removeToast(newToast.id);
      }, toast.duration || 4000);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  return { toasts, addToast, removeToast, clearAll };
};

/**
 * 토스트 컨테이너 컴포넌트
 */
export const ToastContainer: React.FC = () => {
  const { toasts, addToast, removeToast } = useToastManager();

  // 앱 에러 감지
  const appError = useAppError();
  const connectionStatus = useConnectionStatus();
  const isOffline = useIsOffline();

  // 앱 에러를 토스트로 표시
  useEffect(() => {
    if (appError) {
      addToast({
        type: 'error',
        title: '오류 발생',
        message: appError.message,
        duration: 6000,
      });
    }
  }, [appError]);

  // 연결 상태 변화를 토스트로 표시
  useEffect(() => {
    if (connectionStatus === 'connected') {
      addToast({
        type: 'success',
        title: '연결됨',
        message: '서버에 성공적으로 연결되었습니다',
        duration: 3000,
      });
    } else if (connectionStatus === 'error') {
      addToast({
        type: 'error',
        title: '연결 실패',
        message: '서버 연결에 실패했습니다',
        duration: 5000,
      });
    } else if (connectionStatus === 'reconnecting') {
      addToast({
        type: 'warning',
        title: '재연결 시도',
        message: '서버에 재연결을 시도하고 있습니다',
        persistent: true,
      });
    }
  }, [connectionStatus]);

  // 오프라인 상태 토스트
  useEffect(() => {
    if (isOffline) {
      addToast({
        type: 'warning',
        title: '오프라인 모드',
        message: '네트워크 연결을 확인해주세요',
        persistent: true,
      });
    }
  }, [isOffline]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2" style={{ top: 'env(safe-area-inset-top, 1rem) + 1rem' }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

/**
 * 개별 토스트 아이템 컴포넌트
 */
interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  // 애니메이션을 위한 마운트 효과
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // 타입별 아이콘
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  // 타입별 스타일
  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // 애니메이션 완료 후 제거
  };

  return (
    <div
      className={`flex max-w-sm min-w-64 transform items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} ${getStyles()} `}
    >
      {/* 아이콘 */}
      <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>

      {/* 메시지 내용 */}
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium">{toast.title}</h4>
        <p className="mt-1 text-sm opacity-90">{toast.message}</p>
      </div>

      {/* 닫기 버튼 */}
      <button
        onClick={handleClose}
        className="touch-target flex-shrink-0 rounded-md p-1 transition-colors hover:bg-black/10"
        aria-label="알림 닫기"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

/**
 * 프로그래매틱 토스트 사용을 위한 훅
 */
export const useToast = () => {
  // 전역 토스트 이벤트를 통한 토스트 생성
  const showToast = (toast: Omit<Toast, 'id'>) => {
    const event = new CustomEvent('show-toast', { detail: toast });
    window.dispatchEvent(event);
  };

  return {
    success: (title: string, message: string, duration?: number) =>
      showToast({ type: 'success', title, message, duration }),

    error: (title: string, message: string, duration?: number) =>
      showToast({ type: 'error', title, message, duration }),

    warning: (title: string, message: string, duration?: number) =>
      showToast({ type: 'warning', title, message, duration }),

    info: (title: string, message: string, duration?: number) => showToast({ type: 'info', title, message, duration }),
  };
};
