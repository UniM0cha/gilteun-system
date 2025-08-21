import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

describe('Computed Style Tests', () => {
  describe('Button Computed Styles', () => {
    it('has correct CSS classes for default variant', () => {
      render(<Button>Test Button</Button>);
      const button = screen.getByRole('button');

      // CSS 클래스 확인 (jsdom에서는 computed style이 제대로 작동하지 않으므로)
      expect(button).toHaveClass('h-9'); // 높이
      expect(button).toHaveClass('px-4', 'py-2'); // 패딩
      expect(button).toHaveClass('rounded-md'); // 테두리 반지름
      expect(button).toHaveClass('font-medium'); // 폰트 굵기
      expect(button).toHaveClass('text-sm'); // 폰트 크기
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground'); // 색상
    });

    it('has consistent CSS classes across sizes', () => {
      const sizes = [
        { size: 'sm' as const, expectedClass: 'h-8' },
        { size: 'default' as const, expectedClass: 'h-9' },
        { size: 'lg' as const, expectedClass: 'h-10' },
        { size: 'icon' as const, expectedClasses: ['size-9'] },
      ];

      sizes.forEach(({ size, expectedClass, expectedClasses }) => {
        const { unmount } = render(<Button size={size}>Button</Button>);
        const button = screen.getByRole('button');

        if (expectedClasses) {
          expectedClasses.forEach((cls) => expect(button).toHaveClass(cls));
        } else if (expectedClass) {
          expect(button).toHaveClass(expectedClass);
        }

        unmount();
      });
    });
  });

  describe('Input Computed Styles', () => {
    it('has correct CSS classes', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');

      // CSS 클래스 확인 (jsdom에서 computed style은 제한적)
      expect(input).toHaveClass('h-10'); // 높이
      expect(input).toHaveClass('px-3', 'py-2'); // 패딩
      expect(input).toHaveClass('rounded-md'); // 테두리 반지름
      expect(input).toHaveClass('text-base'); // 폰트 크기
      expect(input).toHaveClass('border-input'); // 테두리 색상
    });
  });

  describe('CSS Custom Properties', () => {
    it('applies correct color classes', () => {
      render(
        <div>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
        </div>
      );

      const primaryButton = screen.getByRole('button', { name: 'Primary' });
      const secondaryButton = screen.getByRole('button', { name: 'Secondary' });

      // CSS 클래스 확인 (jsdom에서 CSS variables 접근 제한적)
      expect(primaryButton).toHaveClass('bg-primary', 'text-primary-foreground');
      expect(secondaryButton).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });
  });

  describe('Responsive Breakpoints', () => {
    it('handles small screen sizes correctly', () => {
      // 작은 화면 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      render(<Button>Mobile Button</Button>);
      const button = screen.getByRole('button');
      // 모바일에서도 최소 터치 대상 크기 유지 (h-9 = 36px + 패딩)
      expect(button).toHaveClass('h-9');
    });
  });

  describe('Animation and Transitions', () => {
    it('has proper transition classes', () => {
      render(<Button>Animated Button</Button>);
      const button = screen.getByRole('button');

      // transition 클래스 확인
      expect(button).toHaveClass('transition-all');
    });
  });

  describe('Typography Consistency', () => {
    it('maintains consistent font classes', () => {
      render(
        <div>
          <Button>Button Text</Button>
          <Input placeholder="Input Text" />
        </div>
      );

      const button = screen.getByRole('button');
      const input = screen.getByRole('textbox');

      // 폰트 크기 클래스 확인
      expect(button).toHaveClass('text-sm', 'font-medium');
      expect(input).toHaveClass('text-base');
    });
  });
});
