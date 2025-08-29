import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

/**
 * 로딩 스피너 컴포넌트
 * - 다양한 사이즈 지원
 * - 선택적 텍스트 표시
 * - 중앙 정렬 옵션
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '', text }) => {
  // 사이즈별 클래스
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const spinnerClasses = ['animate-spin text-blue-600', sizeClasses[size], className].join(' ');

  if (text) {
    return (
      <div className="flex items-center justify-center gap-2">
        <Loader2 className={spinnerClasses} />
        <span className="text-sm text-gray-600">{text}</span>
      </div>
    );
  }

  return <Loader2 className={spinnerClasses} />;
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
  className?: string;
}

/**
 * 로딩 오버레이 컴포넌트
 * - 콘텐츠 위에 로딩 상태 표시
 * - 백드롭과 중앙 정렬 스피너
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  text = '로딩 중...',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}

      {isLoading && (
        <div className="bg-opacity-75 absolute inset-0 z-10 flex items-center justify-center bg-white">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-sm text-gray-600">{text}</p>
          </div>
        </div>
      )}
    </div>
  );
};
