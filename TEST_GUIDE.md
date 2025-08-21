# 길튼 시스템 테스트 가이드

이 문서는 길튼 시스템의 테스트 구조와 실행 방법을 설명합니다.

## 📋 테스트 개요

### 테스트 도구 스택
- **단위/통합 테스트**: Vitest + Testing Library
- **E2E 테스트**: Playwright
- **스타일 테스트**: Visual Regression + CSS 클래스 검증

### 테스트 구조
```
gilteun-system/
├── packages/client/src/
│   ├── __tests__/                      # 통합 테스트
│   │   └── styles/                     # 스타일 관련 테스트
│   │       ├── visual-style.test.tsx   # UI 일관성 테스트
│   │       ├── computed-style.test.tsx # CSS 클래스 검증
│   │       └── dark-mode-style.test.tsx # 다크모드 테스트
│   ├── components/                     # 컴포넌트별 테스트
│   │   ├── ui/
│   │   │   ├── button.test.tsx
│   │   │   ├── input.test.tsx
│   │   │   └── ...
│   │   └── command/
│   │       └── CommandOverlay.test.tsx
│   └── test/
│       └── setup.ts                    # 테스트 설정
├── packages/server/src/
│   ├── api/__tests__/                  # API 테스트
│   │   ├── worshipRoutes.test.ts
│   │   └── socket-handlers.test.ts
│   └── test/
│       └── setup.ts
└── e2e/                               # E2E 테스트
    ├── home-page.spec.ts
    └── style-consistency.spec.ts
```

## 🚀 테스트 실행

### 전체 테스트
```bash
# 모든 패키지의 테스트 실행
pnpm test

# 커버리지 포함 실행
pnpm test:coverage
```

### 패키지별 테스트
```bash
# 클라이언트 테스트만
pnpm -C packages/client test

# 서버 테스트만
pnpm -C packages/server test

# E2E 테스트
pnpm test:e2e
```

### 개발 중 테스트
```bash
# 변경사항 감지하여 자동 실행
pnpm test:watch

# UI 모드로 테스트 실행
pnpm test:ui

# 스타일 테스트만
pnpm test:style
```

## 🎨 스타일 테스트 상세

### 1. Visual Style Tests (`visual-style.test.tsx`)
UI 컴포넌트의 시각적 일관성을 검증합니다.

**테스트 항목:**
- ✅ 버튼 variant별 일관된 높이
- ✅ hover/focus 상태 CSS 클래스
- ✅ 색상 토큰 일관성
- ✅ 터치 친화적 크기 (44px 이상)
- ✅ 접근성 요구사항

**예제:**
```typescript
it('maintains consistent height across variants', () => {
  const variants = ['default', 'secondary', 'outline'] as const
  
  variants.forEach(variant => {
    const { unmount } = render(<Button variant={variant}>Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-10') // 모든 variant가 동일한 높이
    unmount()
  })
})
```

### 2. Computed Style Tests (`computed-style.test.tsx`)
CSS 클래스가 올바르게 적용되는지 검증합니다.

**테스트 항목:**
- ✅ Tailwind CSS 클래스 적용
- ✅ 반응형 크기별 CSS 클래스
- ✅ 컴포넌트간 스타일 일관성

### 3. Dark Mode Tests (`dark-mode-style.test.tsx`)
다크 모드에서의 스타일 동작을 검증합니다.

**테스트 항목:**
- ✅ 다크 모드 CSS 변수 적용
- ✅ 색상 대비 및 접근성
- ✅ 테마 전환 시 일관성

## 🧩 컴포넌트 테스트 가이드

### UI 컴포넌트 테스트 패턴

#### 1. 기본 렌더링 테스트
```typescript
it('renders with default props', () => {
  render(<Button>Click me</Button>)
  const button = screen.getByRole('button', { name: 'Click me' })
  expect(button).toBeInTheDocument()
})
```

#### 2. Props 변형 테스트
```typescript
it('renders different variants', () => {
  const { rerender } = render(<Button variant="secondary">Secondary</Button>)
  expect(screen.getByRole('button')).toHaveClass('bg-secondary')

  rerender(<Button variant="outline">Outline</Button>)
  expect(screen.getByRole('button')).toHaveClass('border')
})
```

#### 3. 상호작용 테스트
```typescript
it('handles click events', () => {
  const handleClick = vi.fn()
  render(<Button onClick={handleClick}>Click me</Button>)
  
  fireEvent.click(screen.getByRole('button'))
  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

#### 4. 접근성 테스트
```typescript
it('maintains accessibility', () => {
  render(<Button disabled>Disabled</Button>)
  const button = screen.getByRole('button')
  expect(button).toBeDisabled()
  expect(button).toHaveAttribute('aria-disabled', 'true')
})
```

### 복잡한 컴포넌트 테스트

#### CommandOverlay 테스트 예제
```typescript
it('auto-expires commands after 3 seconds', async () => {
  const onCommandExpire = vi.fn()
  const command = createMockCommand()
  
  render(<CommandOverlay commands={[command]} onCommandExpire={onCommandExpire} />)
  
  await act(async () => {
    vi.advanceTimersByTime(3600) // 3.6초
  })
  
  await waitFor(() => {
    expect(onCommandExpire).toHaveBeenCalledWith('cmd-1')
  })
})
```

## 🔌 서버 테스트

### API 엔드포인트 테스트
```typescript
describe('GET /api/worships', () => {
  it('returns list of worships', async () => {
    const mockWorships = [
      { id: 1, name: '주일 1부 예배', date: '2024-01-07' }
    ]
    
    vi.mocked(mockDb.db.prepare().all).mockReturnValue(mockWorships)
    
    const response = await request(app)
      .get('/api/worships')
      .expect(200)
    
    expect(response.body).toEqual({
      success: true,
      data: mockWorships,
    })
  })
})
```

### Socket.io 테스트
```typescript
it('handles user join correctly', (done) => {
  const userData = {
    id: 'user-1',
    name: '테스트 사용자',
    role: 'session' as const,
    instrument: 'piano',
  }
  
  clientSocket.on('users:update', (users) => {
    expect(users).toContainEqual({
      ...userData,
      socketId: expect.any(String),
    })
    done()
  })
  
  clientSocket.emit('user:join', userData)
})
```

## 🌐 E2E 테스트

### 기본 페이지 플로우
```typescript
test('profile creation flow works', async ({ page }) => {
  await page.goto('/')
  
  const createProfileButton = page.getByText('새 프로필 만들기')
  await createProfileButton.click()
  
  await page.getByPlaceholder('이름을 입력하세요').fill('테스트 사용자')
  await page.getByText('세션').click()
  await page.getByText('피아노').click()
  await page.getByText('프로필 생성').click()
  
  await expect(page.getByText('테스트 사용자')).toBeVisible()
})
```

### 스타일 일관성 E2E 테스트
```typescript
test('all buttons have consistent styling', async ({ page }) => {
  await page.goto('/style-test')
  const buttons = page.getByRole('button')
  const buttonElements = await buttons.all()
  
  for (const button of buttonElements) {
    const box = await button.boundingBox()
    if (box && box.height > 0) {
      expect([36, 40, 44]).toContain(Math.round(box.height))
    }
  }
})
```

## 📊 커버리지 목표

### 현재 목표
- **단위 테스트**: 80%+ 라인 커버리지
- **통합 테스트**: 70%+ 기능 커버리지
- **E2E 테스트**: 핵심 플로우 100%
- **스타일 테스트**: 모든 UI 컴포넌트 100%

### 커버리지 확인
```bash
pnpm test:coverage
```

커버리지 리포트는 `coverage/` 폴더에 HTML 형태로 생성됩니다.

## 🐛 테스트 문제 해결

### 일반적인 문제들

#### 1. act() 경고
```typescript
// ❌ 잘못된 방법
vi.advanceTimersByTime(1000)

// ✅ 올바른 방법
await act(async () => {
  vi.advanceTimersByTime(1000)
})
```

#### 2. CSS 스타일 테스트
```typescript
// ❌ jsdom에서 작동하지 않음
expect(computedStyle.height).toBe('40px')

// ✅ CSS 클래스로 검증
expect(button).toHaveClass('h-10')
```

#### 3. 비동기 상태 업데이트
```typescript
// ❌ 타이밍 문제
expect(element).toBeInTheDocument()

// ✅ waitFor 사용
await waitFor(() => {
  expect(element).toBeInTheDocument()
})
```

### 디버깅 팁

#### 1. 테스트 UI 모드 사용
```bash
pnpm test:ui
```

#### 2. 스크린샷 확인 (E2E)
```typescript
await page.screenshot({ path: 'debug-screenshot.png' })
```

#### 3. DOM 구조 확인
```typescript
screen.debug() // 현재 DOM 출력
```

## 📝 테스트 작성 가이드라인

### 1. 네이밍 규칙
- 파일명: `ComponentName.test.tsx`
- 테스트명: 동작을 명확하게 설명
- 그룹: `describe` 블록으로 기능별 그룹화

### 2. 테스트 구조
```typescript
describe('ComponentName', () => {
  describe('렌더링', () => {
    it('기본 상태로 렌더링된다', () => {
      // 테스트 내용
    })
  })

  describe('상호작용', () => {
    it('클릭 시 핸들러가 호출된다', () => {
      // 테스트 내용
    })
  })

  describe('접근성', () => {
    it('키보드 네비게이션이 작동한다', () => {
      // 테스트 내용
    })
  })
})
```

### 3. 모킹 가이드라인
- 외부 의존성은 항상 모킹
- Socket.io, API 호출 등 네트워크 관련 모킹 필수
- 타이머 관련 테스트는 `vi.useFakeTimers()` 사용

## 🎯 다음 단계

### 추가 구현 예정
1. **Visual Regression 테스트**: 스크린샷 비교 기반 테스트
2. **성능 테스트**: Lighthouse CI 통합
3. **크로스 브라우저 테스트**: BrowserStack 연동
4. **CI/CD 파이프라인**: GitHub Actions 자동화

### 기여 가이드
1. 새로운 컴포넌트 추가 시 테스트 필수
2. 버그 수정 시 재현 테스트 작성
3. 테스트 커버리지 80% 이상 유지
4. E2E 테스트는 핵심 플로우에만 집중

---

이 테스트 시스템을 통해 길튼 시스템의 안정성과 품질을 보장할 수 있습니다. 특히 UI 스타일 테스트를 통해 일관된 사용자 경험을 유지할 수 있습니다.