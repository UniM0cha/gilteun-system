import { test, expect } from '@playwright/test'

test.describe('Home Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays home page correctly', async ({ page }) => {
    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/길튼 시스템/)

    // 메인 요소들이 표시되는지 확인
    await expect(page.getByText('길튼 시스템')).toBeVisible()
  })

  test('profile creation flow works', async ({ page }) => {
    // 프로필 생성 버튼 클릭
    const createProfileButton = page.getByText('새 프로필 만들기')
    if (await createProfileButton.isVisible()) {
      await createProfileButton.click()
      
      // 프로필 생성 폼이 표시되는지 확인
      await expect(page.getByText('프로필 생성')).toBeVisible()
      
      // 이름 입력
      await page.getByPlaceholder('이름을 입력하세요').fill('테스트 사용자')
      
      // 역할 선택
      await page.getByText('세션').click()
      
      // 악기 선택
      await page.getByText('피아노').click()
      
      // 프로필 생성
      await page.getByText('프로필 생성').click()
      
      // 생성 완료 확인
      await expect(page.getByText('테스트 사용자')).toBeVisible()
    }
  })

  test('responsive design on tablet', async ({ page }) => {
    // iPad 크기로 설정
    await page.setViewportSize({ width: 768, height: 1024 })
    
    // 터치 친화적 요소들이 적절한 크기인지 확인
    const buttons = await page.getByRole('button').all()
    
    for (const button of buttons) {
      const box = await button.boundingBox()
      if (box) {
        // 최소 44px 터치 대상 확인
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44)
      }
    }
  })
})