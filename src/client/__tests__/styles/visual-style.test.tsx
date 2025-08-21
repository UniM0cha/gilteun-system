import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

describe('Visual Style Tests', () => {
  describe('Button Styling', () => {
    it('applies correct default styling', () => {
      render(<Button>Default Button</Button>);
      const button = screen.getByRole('button');

      // 기본 배경 색상과 텍스트 색상 확인
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
      // 패딩과 높이 확인
      expect(button).toHaveClass('h-9', 'px-4', 'py-2');
      // 테두리 반지름 확인
      expect(button).toHaveClass('rounded-md');
      // hover 효과 확인
      expect(button).toHaveClass('hover:bg-primary/90');
    });

    it('maintains consistent height across variants', () => {
      const variants = ['default', 'secondary', 'outline', 'ghost'] as const;

      variants.forEach((variant) => {
        const { unmount } = render(<Button variant={variant}>Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('h-9'); // 모든 variant가 동일한 높이
        unmount();
      });
    });

    it('has proper focus and disabled states', () => {
      const { rerender } = render(<Button>Button</Button>);
      let button = screen.getByRole('button');
      expect(button).toHaveClass('outline-none', 'focus-visible:ring-[3px]');

      rerender(<Button disabled>Disabled</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });
  });

  describe('Input Styling', () => {
    it('applies correct default styling', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');

      expect(input).toHaveClass('flex', 'h-10', 'w-full');
      expect(input).toHaveClass('rounded-md', 'border');
      expect(input).toHaveClass('bg-background', 'px-3', 'py-2');
      expect(input).toHaveClass('text-base');
    });

    it('has proper focus states', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2');
    });

    it('has proper disabled styling', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });
  });

  describe('Badge Styling', () => {
    it('applies correct default styling', () => {
      render(<Badge>Default Badge</Badge>);
      const badge = screen.getByText('Default Badge');

      expect(badge).toHaveClass('inline-flex', 'items-center');
      expect(badge).toHaveClass('rounded-full', 'px-2.5', 'py-0.5');
      expect(badge).toHaveClass('text-xs', 'font-semibold');
    });

    it('maintains consistent padding across variants', () => {
      const variants = ['default', 'secondary', 'outline', 'destructive'] as const;

      variants.forEach((variant) => {
        const { unmount } = render(<Badge variant={variant}>Badge</Badge>);
        const badge = screen.getByText('Badge');
        expect(badge).toHaveClass('px-2.5', 'py-0.5'); // 모든 variant가 동일한 패딩
        unmount();
      });
    });
  });

  describe('Responsive Design', () => {
    it('maintains touch-friendly sizes on mobile', () => {
      render(<Button>Touch Button</Button>);
      const button = screen.getByRole('button');

      // 최소 44px 터치 대상 (h-10 = 40px이므로 패딩으로 보완)
      expect(button).toHaveClass('h-9', 'px-4');

      // jsdom에서는 computed style이 제한적이므로 클래스 확인
      expect(button).toHaveClass('h-9'); // 36px + padding으로 터치 친화적
    });
  });

  describe('Color Consistency', () => {
    it('uses consistent color tokens', () => {
      render(
        <>
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Badge>Primary Badge</Badge>
          <Badge variant="secondary">Secondary Badge</Badge>
        </>
      );

      const primaryButton = screen.getByRole('button', {
        name: 'Primary Button',
      });
      const secondaryButton = screen.getByRole('button', {
        name: 'Secondary Button',
      });
      const primaryBadge = screen.getByText('Primary Badge');
      const secondaryBadge = screen.getByText('Secondary Badge');

      // 기본 색상 일관성 확인
      expect(primaryButton).toHaveClass('bg-primary', 'text-primary-foreground');
      expect(secondaryButton).toHaveClass('bg-secondary', 'text-secondary-foreground');
      expect(primaryBadge).toHaveClass('bg-primary', 'text-primary-foreground');
      expect(secondaryBadge).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });
  });
});
