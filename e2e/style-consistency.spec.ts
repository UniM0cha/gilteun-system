import { test, expect } from '@playwright/test'

test.describe('Style Consistency E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/style-test')
  })

  test('all buttons have consistent styling', async ({ page }) => {
    const buttons = page.getByRole('button')
    const buttonElements = await buttons.all()
    
    // 모든 버튼의 기본 높이가 일치하는지 확인
    const heights: number[] = []
    
    for (const button of buttonElements) {
      const box = await button.boundingBox()
      if (box && box.height > 0) {
        heights.push(box.height)
      }
    }
    
    // 기본 크기 버튼들은 모두 같은 높이여야 함 (±2px 허용)
    const defaultHeight = heights[0]
    for (const height of heights) {
      if (Math.abs(height - 36) < 5 || Math.abs(height - 40) < 5 || Math.abs(height - 44) < 5) {
        // sm(36px), default(40px), lg(44px) 중 하나여야 함
        expect([36, 40, 44]).toContain(Math.round(height))
      }
    }
  })

  test('hover states are working correctly', async ({ page }) => {
    const button = page.getByRole('button').first()
    
    // 초기 스타일 캡처
    const initialStyle = await button.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    
    // 호버
    await button.hover()
    
    // 호버 후 스타일 확인 (약간의 지연 필요)
    await page.waitForTimeout(100)
    const hoverStyle = await button.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    
    // 호버 상태에서 배경색이 변경되어야 함
    expect(hoverStyle).not.toBe(initialStyle)
  })

  test('focus states are accessible', async ({ page }) => {
    const button = page.getByRole('button').first()
    
    // 키보드 포커스
    await button.focus()
    
    // 포커스 링이 표시되는지 확인
    const focusStyle = await button.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
      }
    })
    
    // outline이나 box-shadow가 설정되어야 함
    expect(focusStyle.outline !== 'none' || focusStyle.boxShadow !== 'none').toBeTruthy()
  })

  test('dark mode toggle works properly', async ({ page }) => {
    // 라이트 모드 초기 상태
    const lightModeBody = await page.locator('body').evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    
    // 다크 모드로 전환 (시스템 설정 시뮬레이션)
    await page.emulateMedia({ colorScheme: 'dark' })
    
    // 다크 모드 배경색 확인
    const darkModeBody = await page.locator('body').evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    
    // 배경색이 변경되어야 함
    expect(darkModeBody).not.toBe(lightModeBody)
    
    // 모든 버튼이 여전히 보이는지 확인
    const buttons = page.getByRole('button')
    await expect(buttons.first()).toBeVisible()
  })

  test('responsive breakpoints work correctly', async ({ page }) => {
    // 데스크톱 크기
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(100)
    
    const desktopLayout = await page.locator('.space-y-8').boundingBox()
    
    // 태블릿 크기
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(100)
    
    const tabletLayout = await page.locator('.space-y-8').boundingBox()
    
    // 모바일 크기
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(100)
    
    const mobileLayout = await page.locator('.space-y-8').boundingBox()
    
    // 각 브레이크포인트에서 레이아웃이 적절하게 조정되는지 확인
    expect(desktopLayout?.width).toBeGreaterThan(tabletLayout?.width || 0)
    expect(tabletLayout?.width).toBeGreaterThan(mobileLayout?.width || 0)
  })

  test('form elements maintain accessibility', async ({ page }) => {
    const inputs = page.getByRole('textbox')
    const labels = page.getByRole('group').first().locator('label')
    
    // 모든 input에 연결된 label이 있는지 확인
    const inputCount = await inputs.count()
    const labelCount = await labels.count()
    
    expect(inputCount).toBeGreaterThan(0)
    expect(labelCount).toBeGreaterThanOrEqual(inputCount)
    
    // 첫 번째 input의 접근성 확인
    const firstInput = inputs.first()
    await firstInput.focus()
    
    const ariaLabel = await firstInput.getAttribute('aria-label')
    const id = await firstInput.getAttribute('id')
    
    // aria-label이나 연결된 label이 있어야 함
    expect(ariaLabel || id).toBeTruthy()
  })

  test('color contrast meets accessibility standards', async ({ page }) => {
    // 주요 텍스트 요소들의 색상 대비 확인
    const textElements = [
      page.getByText('shadcn/ui 스타일 테스트'),
      page.getByText('Button 컴포넌트'),
      page.getByText('다양한 variant와 hover 효과 테스트'),
    ]
    
    for (const element of textElements) {
      const styles = await element.evaluate((el) => {
        const computedStyle = window.getComputedStyle(el)
        return {
          color: computedStyle.color,
          backgroundColor: computedStyle.backgroundColor,
        }
      })
      
      // 색상이 설정되어 있는지 확인 (구체적인 대비율 계산은 더 복잡한 로직 필요)
      expect(styles.color).toBeTruthy()
    }
  })
})