import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

describe('Computed Style Tests', () => {
  describe('Button Computed Styles', () => {
    it('has correct CSS classes for default variant', () => {
      render(<Button>Test Button</Button>)
      const button = screen.getByRole('button')
      
      // CSS 클래스 확인 (jsdom에서는 computed style이 제대로 작동하지 않으므로)
      expect(button).toHaveClass('h-10') // 높이
      expect(button).toHaveClass('px-4', 'py-2') // 패딩
      expect(button).toHaveClass('rounded-md') // 테두리 반지름
      expect(button).toHaveClass('font-medium') // 폰트 굵기
      expect(button).toHaveClass('text-sm') // 폰트 크기
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground') // 색상
    })

    it('has consistent CSS classes across sizes', () => {
      const sizes = [
        { size: 'sm' as const, expectedClass: 'h-9' },
        { size: 'default' as const, expectedClass: 'h-10' },
        { size: 'lg' as const, expectedClass: 'h-11' },
        { size: 'icon' as const, expectedClasses: ['h-10', 'w-10'] },
      ]
      
      sizes.forEach(({ size, expectedClass, expectedClasses }) => {
        const { unmount } = render(<Button size={size}>Button</Button>)
        const button = screen.getByRole('button')
        
        if (expectedClasses) {
          expectedClasses.forEach(cls => expect(button).toHaveClass(cls))
        } else if (expectedClass) {
          expect(button).toHaveClass(expectedClass)
        }
        
        unmount()
      })
    })
  })

  describe('Input Computed Styles', () => {
    it('has correct computed styles', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      const computedStyle = window.getComputedStyle(input)
      
      // 높이 확인 (h-10 = 2.5rem = 40px)
      expect(computedStyle.height).toBe('40px')
      
      // 패딩 확인 (px-3 = 0.75rem, py-2 = 0.5rem)
      expect(computedStyle.paddingLeft).toBe('12px')
      expect(computedStyle.paddingRight).toBe('12px')
      expect(computedStyle.paddingTop).toBe('8px')
      expect(computedStyle.paddingBottom).toBe('8px')
      
      // 테두리 반지름 확인
      expect(computedStyle.borderRadius).toBe('6px')
      
      // 폰트 크기 확인 (text-base = 1rem = 16px)
      expect(computedStyle.fontSize).toBe('16px')
    })
  })

  describe('CSS Custom Properties', () => {
    it('uses correct CSS variables for colors', () => {
      render(
        <div>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
        </div>
      )
      
      const primaryButton = screen.getByRole('button', { name: 'Primary' })
      const secondaryButton = screen.getByRole('button', { name: 'Secondary' })
      
      const primaryStyle = window.getComputedStyle(primaryButton)
      const secondaryStyle = window.getComputedStyle(secondaryButton)
      
      // CSS 변수가 정의되어 있는지 확인
      expect(primaryStyle.getPropertyValue('--primary')).toBeTruthy()
      expect(secondaryStyle.getPropertyValue('--secondary')).toBeTruthy()
    })
  })

  describe('Responsive Breakpoints', () => {
    it('handles small screen sizes correctly', () => {
      // 작은 화면 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      })
      
      render(<Button>Mobile Button</Button>)
      const button = screen.getByRole('button')
      const computedStyle = window.getComputedStyle(button)
      
      // 모바일에서도 최소 터치 대상 크기 유지
      expect(parseInt(computedStyle.height)).toBeGreaterThanOrEqual(40)
    })
  })

  describe('Animation and Transitions', () => {
    it('has proper transition properties', () => {
      render(<Button>Animated Button</Button>)
      const button = screen.getByRole('button')
      const computedStyle = window.getComputedStyle(button)
      
      // transition 속성이 설정되어 있는지 확인
      expect(computedStyle.transitionProperty).toBeTruthy()
      expect(computedStyle.transitionDuration).toBeTruthy()
    })
  })

  describe('Typography Consistency', () => {
    it('maintains consistent line heights', () => {
      render(
        <div>
          <Button>Button Text</Button>
          <Input placeholder="Input Text" />
        </div>
      )
      
      const button = screen.getByRole('button')
      const input = screen.getByRole('textbox')
      
      const buttonStyle = window.getComputedStyle(button)
      const inputStyle = window.getComputedStyle(input)
      
      // 둘 다 적절한 line-height를 가지고 있는지 확인
      expect(parseFloat(buttonStyle.lineHeight)).toBeGreaterThan(1)
      expect(parseFloat(inputStyle.lineHeight)).toBeGreaterThan(1)
    })
  })
})