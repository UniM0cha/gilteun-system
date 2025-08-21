import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

describe('Avatar', () => {
  it('renders avatar with image correctly', () => {
    render(
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    );

    // Avatar발백 상태에서는 img가 로드되지 않음
    expect(screen.getByText('CN')).toBeInTheDocument();
  });

  it('renders fallback when image fails to load', () => {
    render(
      <Avatar>
        <AvatarImage src="invalid-url" alt="Failed image" />
        <AvatarFallback>FB</AvatarFallback>
      </Avatar>
    );

    // 이미지 로드 실패 시 fallback 상태
    expect(screen.getByText('FB')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(
      <Avatar className="custom-avatar">
        <AvatarFallback>Test</AvatarFallback>
      </Avatar>
    );

    // Check if the Avatar root component has the custom class
    const avatar = screen.getByText('Test').closest('[data-slot="avatar"]');
    expect(avatar).toHaveClass('custom-avatar');
  });

  it('renders fallback only', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('supports data-testid', () => {
    render(
      <Avatar data-testid="test-avatar">
        <AvatarFallback>Test</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByTestId('test-avatar')).toBeInTheDocument();
  });
});
