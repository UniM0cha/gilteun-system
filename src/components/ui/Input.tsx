import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

/**
 * iPad 터치 최적화된 입력 컴포넌트
 * - 44px 최소 높이 (Apple 가이드라인)
 * - 라벨, 에러, 도움말 지원
 * - 접근성 최적화
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = '', id, disabled, ...props }, ref) => {
    // 고유 ID 생성 (접근성)
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helper ? `${inputId}-helper` : undefined;

    const inputClasses = [
      'block w-full rounded-lg border px-3 py-3',
      'text-base leading-tight', // iPad 확대 방지
      'transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-1',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'min-h-[44px]', // Apple 가이드라인

      // 상태별 스타일
      error
        ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500',

      // 배경색
      disabled ? 'bg-gray-50' : 'bg-white',

      className,
    ].join(' ');

    return (
      <div className="space-y-1">
        {/* 라벨 */}
        {label && (
          <label
            htmlFor={inputId}
            className={`block text-sm leading-6 font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}
          >
            {label}
          </label>
        )}

        {/* 입력 필드 */}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            disabled={disabled}
            aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
            aria-invalid={error ? 'true' : undefined}
            {...props}
          />

          {/* 에러 아이콘 */}
          {error && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p id={errorId} className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* 도움말 텍스트 */}
        {helper && !error && (
          <p id={helperId} className="text-sm text-gray-600">
            {helper}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
