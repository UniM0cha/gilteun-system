// 카드 컴포넌트

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

// Props 타입
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

// 변형별 스타일
const variantStyles = {
  default: 'bg-white',
  outline: 'bg-white border border-gray-200',
  elevated: 'bg-white shadow-lg',
};

// 패딩 스타일
const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'outline', padding = 'md', hoverable = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl',
          variantStyles[variant],
          paddingStyles[padding],
          hoverable && 'cursor-pointer transition-shadow hover:shadow-md',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// 카드 헤더
type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

// 카드 제목
type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  );
}

// 카드 설명
type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export function CardDescription({ className, children, ...props }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-gray-500', className)} {...props}>
      {children}
    </p>
  );
}

// 카드 컨텐츠
type CardContentProps = HTMLAttributes<HTMLDivElement>;

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}

// 카드 푸터
type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div className={cn('mt-4 flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  );
}
