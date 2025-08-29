import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

/**
 * iPad 터치 최적화된 버튼 컴포넌트
 * - 최소 44px 터치 영역 (Apple 가이드라인)
 * - 시각적 피드백 제공
 * - 다양한 variant 지원
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, children, className = '', ...props }, ref) => {
    const baseClasses = [
      'inline-flex items-center justify-center rounded-lg font-medium',
      'transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'active:scale-95', // 터치 피드백
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
    ];

    // 사이즈별 클래스 (iPad 터치 최적화)
    const sizeClasses = {
      sm: 'h-10 px-3 text-sm min-w-[44px]', // 최소 44px 보장
      md: 'h-11 px-4 text-base min-w-[44px]',
      lg: 'h-12 px-6 text-lg min-w-[44px]',
    };

    // variant별 색상 클래스
    const variantClasses = {
      primary: [
        'bg-blue-600 text-white shadow-sm',
        'hover:bg-blue-700 focus:ring-blue-500',
        'border border-transparent',
      ].join(' '),
      secondary: [
        'bg-gray-100 text-gray-900 shadow-sm',
        'hover:bg-gray-200 focus:ring-gray-500',
        'border border-transparent',
      ].join(' '),
      outline: [
        'bg-transparent text-gray-900 shadow-sm',
        'hover:bg-gray-50 focus:ring-gray-500',
        'border border-gray-300',
      ].join(' '),
      ghost: [
        'bg-transparent text-gray-900',
        'hover:bg-gray-100 focus:ring-gray-500',
        'border border-transparent',
      ].join(' '),
      destructive: [
        'bg-red-600 text-white shadow-sm',
        'hover:bg-red-700 focus:ring-red-500',
        'border border-transparent',
      ].join(' '),
    };

    const buttonClasses = [...baseClasses, sizeClasses[size], variantClasses[variant], className].join(' ');

    const isDisabled = disabled || loading;

    return (
      <button ref={ref} className={buttonClasses} disabled={isDisabled} {...props}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
