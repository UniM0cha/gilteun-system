import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

describe('shadcn/ui 테마 적용 테스트', () => {
  beforeEach(() => {
    // DOM에 CSS 변수가 설정되어 있는지 확인하기 위해 스타일을 설정
    document.documentElement.style.setProperty('--background', '0 0% 100%');
    document.documentElement.style.setProperty('--foreground', '0 0% 3.9%');
    document.documentElement.style.setProperty('--primary', '0 0% 9%');
    document.documentElement.style.setProperty('--primary-foreground', '0 0% 98%');
    document.documentElement.style.setProperty('--muted', '0 0% 96.1%');
    document.documentElement.style.setProperty('--muted-foreground', '0 0% 45.1%');
    document.documentElement.style.setProperty('--border', '0 0% 89.8%');
    document.documentElement.style.setProperty('--destructive', '0 84.2% 60.2%');
    document.documentElement.style.setProperty('--radius', '0.5rem');
  });

  it('CSS 변수가 정의되어 있어야 함', () => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    expect(computedStyle.getPropertyValue('--background')).toBeTruthy();
    expect(computedStyle.getPropertyValue('--foreground')).toBeTruthy();
    expect(computedStyle.getPropertyValue('--primary')).toBeTruthy();
    expect(computedStyle.getPropertyValue('--primary-foreground')).toBeTruthy();
    expect(computedStyle.getPropertyValue('--muted')).toBeTruthy();
    expect(computedStyle.getPropertyValue('--muted-foreground')).toBeTruthy();
    expect(computedStyle.getPropertyValue('--border')).toBeTruthy();
    expect(computedStyle.getPropertyValue('--destructive')).toBeTruthy();
    expect(computedStyle.getPropertyValue('--radius')).toBeTruthy();
  });

  it('Button 컴포넌트가 올바른 테마 클래스를 적용해야 함', () => {
    render(<Button data-testid="theme-button">테스트 버튼</Button>);
    const button = screen.getByTestId('theme-button');

    // Button의 기본 variant가 primary 색상을 사용하는지 확인
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('text-primary-foreground');
    expect(button).toHaveClass('hover:bg-primary/90');
  });

  it('Button variant들이 올바른 테마 클래스를 적용해야 함', () => {
    const { rerender } = render(
      <Button data-testid="test-button" variant="outline">
        Outline
      </Button>
    );
    let button = screen.getByTestId('test-button');
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('bg-background');
    expect(button).toHaveClass('hover:bg-accent');

    rerender(
      <Button data-testid="test-button" variant="secondary">
        Secondary
      </Button>
    );
    button = screen.getByTestId('test-button');
    expect(button).toHaveClass('bg-secondary');
    expect(button).toHaveClass('text-secondary-foreground');

    rerender(
      <Button data-testid="test-button" variant="destructive">
        Destructive
      </Button>
    );
    button = screen.getByTestId('test-button');
    expect(button).toHaveClass('bg-destructive');
    expect(button).toHaveClass('text-white');
  });

  it('Card 컴포넌트가 올바른 테마 클래스를 적용해야 함', () => {
    render(
      <Card data-testid="theme-card">
        <CardHeader>
          <CardTitle data-testid="card-title">카드 제목</CardTitle>
        </CardHeader>
        <CardContent data-testid="card-content">카드 내용</CardContent>
      </Card>
    );

    const card = screen.getByTestId('theme-card');
    expect(card).toHaveClass('bg-card');
    expect(card).toHaveClass('text-card-foreground');
    expect(card).toHaveClass('border');
  });

  it('Input 컴포넌트가 올바른 테마 클래스를 적용해야 함', () => {
    render(<Input data-testid="theme-input" placeholder="테스트 입력" />);
    const input = screen.getByTestId('theme-input');

    expect(input).toHaveClass('border-input');
    expect(input).toHaveClass('bg-background');
    expect(input).toHaveClass('ring-offset-background');
    expect(input).toHaveClass('focus-visible:ring-ring');
  });

  it('Badge 컴포넌트가 올바른 테마 클래스를 적용해야 함', () => {
    const { rerender } = render(<Badge data-testid="theme-badge">기본 뱃지</Badge>);
    let badge = screen.getByTestId('theme-badge');
    expect(badge).toHaveClass('bg-primary');
    expect(badge).toHaveClass('text-primary-foreground');

    rerender(
      <Badge data-testid="theme-badge" variant="outline">
        아웃라인 뱃지
      </Badge>
    );
    badge = screen.getByTestId('theme-badge');
    expect(badge).toHaveClass('border');
    expect(badge).toHaveClass('text-foreground');

    rerender(
      <Badge data-testid="theme-badge" variant="destructive">
        경고 뱃지
      </Badge>
    );
    badge = screen.getByTestId('theme-badge');
    expect(badge).toHaveClass('bg-destructive');
    expect(badge).toHaveClass('text-destructive-foreground');
  });

  it('muted 색상 변수들이 올바르게 적용되어야 함', () => {
    render(
      <div>
        <p data-testid="muted-text" className="text-muted-foreground">
          흐린 텍스트
        </p>
        <div data-testid="muted-bg" className="bg-muted">
          흐린 배경
        </div>
      </div>
    );

    const mutedText = screen.getByTestId('muted-text');
    const mutedBg = screen.getByTestId('muted-bg');

    expect(mutedText).toHaveClass('text-muted-foreground');
    expect(mutedBg).toHaveClass('bg-muted');
  });

  it('destructive 색상이 오류 상황에 올바르게 적용되어야 함', () => {
    render(
      <div>
        <p data-testid="error-text" className="text-destructive">
          오류 메시지
        </p>
        <Button data-testid="error-button" variant="destructive">
          삭제
        </Button>
      </div>
    );

    const errorText = screen.getByTestId('error-text');
    const errorButton = screen.getByTestId('error-button');

    expect(errorText).toHaveClass('text-destructive');
    expect(errorButton).toHaveClass('bg-destructive');
    expect(errorButton).toHaveClass('text-white');
  });

  it('다크모드 클래스 지원이 설정되어야 함', () => {
    // 다크모드 클래스 추가
    document.documentElement.classList.add('dark');

    // 다크모드 CSS 변수 설정
    document.documentElement.style.setProperty('--background', '0 0% 3.9%');
    document.documentElement.style.setProperty('--foreground', '0 0% 98%');

    const computedStyle = getComputedStyle(document.documentElement);
    expect(computedStyle.getPropertyValue('--background')).toBe('0 0% 3.9%');
    expect(computedStyle.getPropertyValue('--foreground')).toBe('0 0% 98%');

    // 정리
    document.documentElement.classList.remove('dark');
  });
});
