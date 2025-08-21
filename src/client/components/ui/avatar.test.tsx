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

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://github.com/shadcn.png');
    expect(image).toHaveAttribute('alt', '@shadcn');
  });

  it('renders fallback when image fails to load', () => {
    render(
      <Avatar>
        <AvatarImage src="invalid-url" alt="Failed image" />
        <AvatarFallback>FB</AvatarFallback>
      </Avatar>
    );

    // Initially, the image element should be present
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('FB')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(
      <Avatar className="custom-avatar">
        <AvatarFallback>Test</AvatarFallback>
      </Avatar>
    );

    const avatar = screen.getByText('Test').closest('span');
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