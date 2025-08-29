import React, { FC } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  dataTestId?: string;
}

/**
 * 카드 컨테이너 컴포넌트
 * - 콘텐츠 그룹화
 * - 다양한 패딩과 그림자 옵션
 * - 터치 인터랙션 지원
 */
export const Card: FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'sm',
  onClick,
  dataTestId,
}) => {
  // 패딩 클래스
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  // 그림자 클래스
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  const cardClasses = [
    'bg-white rounded-lg border border-gray-200',
    paddingClasses[padding],
    shadowClasses[shadow],

    // 클릭 가능한 카드인 경우
    onClick &&
      [
        'cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-gray-300',
        'active:scale-98 active:shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      ]
        .filter(Boolean)
        .join(' '),

    className,
  ]
    .filter(Boolean)
    .join(' ');

  const Component = onClick ? 'button' : 'div';

  return (
    <Component className={cardClasses} onClick={onClick} {...(onClick && { type: 'button' })} data-testid={dataTestId}>
      {children}
    </Component>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return <div className={`mb-4 border-b border-gray-200 pb-2 ${className}`}>{children}</div>;
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => {
  return <h3 className={`text-lg leading-6 font-semibold text-gray-900 ${className}`}>{children}</h3>;
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => {
  return <div className={className}>{children}</div>;
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return <div className={`mt-4 border-t border-gray-200 pt-4 ${className}`}>{children}</div>;
};
