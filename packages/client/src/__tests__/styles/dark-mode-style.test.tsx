import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'

describe('Dark Mode Style Tests', () => {
  beforeEach(() => {
    // 다크 모드 클래스 추가
    document.documentElement.classList.add('dark')
  })

  afterEach(() => {
    // 다크 모드 클래스 제거
    document.documentElement.classList.remove('dark')
  })

  describe('Button Dark Mode', () => {
    it('applies correct dark mode classes', () => {
      render(<Button>Dark Button</Button>)
      const button = screen.getByRole('button')
      
      // 기본적으로 다크 모드에서도 같은 클래스들이 적용되어야 함
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
      expect(button).toHaveClass('hover:bg-primary/90')
    })

    it('maintains readability in dark mode', () => {
      render(<Button variant="outline">Outline Button</Button>)
      const button = screen.getByRole('button')
      
      // 아웃라인 버튼의 경우 다크 모드에서 테두리가 보여야 함
      expect(button).toHaveClass('border')
      expect(button).toHaveClass('bg-background')
      expect(button).toHaveClass('hover:bg-accent')
    })
  })

  describe('Input Dark Mode', () => {
    it('applies correct dark mode styling', () => {
      render(<Input placeholder="Dark input" />)
      const input = screen.getByRole('textbox')
      
      expect(input).toHaveClass('bg-background')
      expect(input).toHaveClass('border')
      expect(input).toHaveClass('text-foreground')
    })
  })

  describe('Card Dark Mode', () => {
    it('applies correct dark mode background', () => {
      render(
        <Card>
          <div>Card Content</div>
        </Card>
      )
      const card = screen.getByText('Card Content').parentElement
      
      expect(card).toHaveClass('bg-card', 'text-card-foreground')
      expect(card).toHaveClass('border')
    })
  })

  describe('Color Contrast in Dark Mode', () => {
    it('ensures sufficient contrast for text elements', () => {
      render(
        <div>
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Input placeholder="Input field" />
        </div>
      )
      
      const primaryButton = screen.getByRole('button', { name: 'Primary Button' })
      const secondaryButton = screen.getByRole('button', { name: 'Secondary Button' })
      const input = screen.getByRole('textbox')
      
      // 모든 요소가 적절한 색상 클래스를 가지고 있는지 확인
      expect(primaryButton).toHaveClass('text-primary-foreground')
      expect(secondaryButton).toHaveClass('text-secondary-foreground')
      expect(input).toHaveClass('text-foreground')
    })
  })

  describe('Dark Mode Theme Toggle', () => {
    it('handles theme transitions smoothly', () => {
      render(<Button>Theme Button</Button>)
      const button = screen.getByRole('button')
      
      // 다크 모드에서 시작
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      
      // 라이트 모드로 전환
      document.documentElement.classList.remove('dark')
      
      // 같은 클래스들이 여전히 적용되어야 함 (CSS 변수가 변경됨)
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
      
      // 다시 다크 모드로
      document.documentElement.classList.add('dark')
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
    })
  })

  describe('Accessibility in Dark Mode', () => {
    it('maintains focus visibility in dark mode', () => {
      render(<Button>Focus Button</Button>)
      const button = screen.getByRole('button')
      
      expect(button).toHaveClass('focus-visible:outline-none')
      expect(button).toHaveClass('focus-visible:ring-2')
      expect(button).toHaveClass('focus-visible:ring-ring')
    })

    it('maintains disabled state visibility in dark mode', () => {
      render(<Button disabled>Disabled Button</Button>)
      const button = screen.getByRole('button')
      
      expect(button).toHaveClass('disabled:opacity-50')
      expect(button).toHaveClass('disabled:pointer-events-none')
    })
  })
})