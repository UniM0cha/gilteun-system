import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store';

/**
 * 에러 상태 인터페이스
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Props 인터페이스
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * React Error Boundary 컴포넌트
 * 앱 전체의 JavaScript 에러를 캐치하고 안전한 UI를 표시
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Zustand 스토어에 에러 저장
    useAppStore.getState().setError({
      code: 'REACT_ERROR',
      message: error.message,
      details: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      timestamp: Date.now(),
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    // 스토어 초기화
    useAppStore.getState().reset();

    // 컴포넌트 상태 초기화
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback
        error={this.state.error}
        onReload={this.handleReload}
        onReset={this.handleReset}
      />;
    }

    return this.props.children;
  }
}

/**
 * 에러 폴백 UI 컴포넌트
 */
interface ErrorFallbackProps {
  error: Error | null;
  onReload: () => void;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReload, onReset }) => {
  return (
    <div className="fullscreen-portrait flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* 에러 아이콘 */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* 에러 제목 */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">
            문제가 발생했습니다
          </h1>
          <p className="text-sm text-gray-600">
            예상치 못한 오류로 인해 앱이 중단되었습니다.
          </p>
        </div>

        {/* 에러 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
            <h3 className="text-sm font-medium text-red-800 mb-2">에러 정보:</h3>
            <p className="text-xs text-red-700 font-mono break-all">
              {error.message}
            </p>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-red-600 cursor-pointer">
                  스택 트레이스 보기
                </summary>
                <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap overflow-auto max-h-32">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="space-y-3">
          <button
            onClick={onReload}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            앱 새로고침
          </button>

          <button
            onClick={onReset}
            className="btn btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            처음부터 다시 시작
          </button>
        </div>

        {/* 도움말 메시지 */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>문제가 계속 발생하면:</p>
          <p>1. WiFi 연결 상태를 확인해주세요</p>
          <p>2. 앱을 완전히 종료 후 다시 실행해주세요</p>
          <p>3. 관리자에게 문의해주세요</p>
        </div>
      </div>
    </div>
  );
};

/**
 * 함수형 컴포넌트용 에러 바운더리 훅
 */
export const useErrorHandler = () => {
  const setError = useAppStore((state) => state.setError);

  return (error: Error, errorInfo?: string) => {
    console.error('Error caught by useErrorHandler:', error);

    setError({
      code: 'HANDLED_ERROR',
      message: error.message,
      details: {
        stack: error.stack,
        info: errorInfo,
      },
      timestamp: Date.now(),
    });
  };
};
