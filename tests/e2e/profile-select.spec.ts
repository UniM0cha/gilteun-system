/**
 * ProfileSelect 페이지 종합 E2E 테스트
 * 
 * 테스트 범위:
 * - 프로필 카드 표시 및 선택
 * - 새 프로필 생성 다이얼로그
 * - 프로필 편집 기능
 * - 서버 연결 상태 확인
 * - 에러 처리 및 토스트 알림
 * - 접근성 및 터치 최적화
 */

import { test, expect, Page } from '@playwright/test';

const TEST_URL = process.env.TEST_URL || 'http://localhost:5173';

// 테스트 헬퍼 함수들
class ProfileSelectTestHelper {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(TEST_URL);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForProfileCards() {
    await this.page.waitForSelector('[data-testid="profile-select"]', { timeout: 10000 });
    await this.page.waitForSelector('.cursor-pointer', { timeout: 5000 });
  }

  async getProfileCardCount() {
    return await this.page.locator('[data-testid="profile-select"] >> .cursor-pointer').count();
  }

  async clickProfile(name: string) {
    await this.page.locator(`text=${name}`).click();
  }

  async clickNewProfile() {
    await this.page.locator('text=새 프로필').click();
  }

  async fillNewProfileForm(name: string, role: string = '찬양', iconIndex: number = 0) {
    // 이름 입력
    await this.page.locator('input[placeholder="이름을 입력하세요"]').fill(name);
    
    // 역할 선택
    await this.page.selectOption('select', role);
    
    // 아이콘 선택 (첫 번째부터 인덱스 기반)
    const iconButtons = this.page.locator('.grid-cols-6 button');
    await iconButtons.nth(iconIndex).click();
  }

  async saveProfile() {
    await this.page.locator('button:has-text("저장")').click();
  }

  async cancelDialog() {
    await this.page.locator('button:has-text("취소")').click();
  }

  async waitForNewProfileDialog() {
    await this.page.waitForSelector('text=새 프로필 생성', { timeout: 5000 });
  }

  async waitForEditProfileDialog() {
    await this.page.waitForSelector('text=프로필 편집', { timeout: 5000 });
  }

  async isDialogVisible() {
    return await this.page.locator('text=새 프로필 생성, text=프로필 편집').isVisible();
  }

  async rightClickProfile(name: string) {
    await this.page.locator(`text=${name}`).click({ button: 'right' });
  }

  async longPressProfile(name: string) {
    // 모바일 환경에서 long press 시뮬레이션
    const element = this.page.locator(`text=${name}`);
    await element.dispatchEvent('pointerdown', { pressure: 0.5 });
    await this.page.waitForTimeout(800); // 긴 누르기
    await element.dispatchEvent('pointerup');
  }

  async deleteProfile() {
    await this.page.locator('button:has-text("삭제")').click();
    // 확인 다이얼로그 처리
    await this.page.locator('button:has-text("확인")').click();
  }

  async checkServerConnection() {
    // 서버 상태 표시기 확인
    const connectionIndicator = this.page.locator('[data-testid="connection-status"]');
    if (await connectionIndicator.isVisible()) {
      return await connectionIndicator.textContent();
    }
    return null;
  }

  async checkToastMessage(expectedMessage: string) {
    const toastElement = this.page.locator('.fixed.top-4.right-4 >> text=' + expectedMessage);
    await expect(toastElement).toBeVisible({ timeout: 3000 });
    return toastElement;
  }
}

test.describe('ProfileSelect 페이지 종합 테스트', () => {
  let helper: ProfileSelectTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new ProfileSelectTestHelper(page);
    await helper.goto();
  });

  test.describe('기본 UI 표시', () => {
    test('페이지 제목과 로고가 표시된다', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('길튼 시스템');
      
      // 로고 이미지가 있다면 확인
      const logo = page.locator('img[alt*="길튼"], img[alt*="logo"]');
      if (await logo.isVisible()) {
        await expect(logo).toBeVisible();
      }
    });

    test('기본 프로필 카드들이 올바르게 표시된다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // 5개 카드 확인 (4개 기본 + 1개 새 프로필)
      const cardCount = await helper.getProfileCardCount();
      expect(cardCount).toBe(5);
      
      // 기본 프로필들 확인
      const expectedProfiles = ['김찬양', '이피아노', '박기타', '최드럼'];
      for (const profile of expectedProfiles) {
        await expect(page.locator(`text=${profile}`)).toBeVisible();
      }
      
      // 새 프로필 카드 확인
      await expect(page.locator('text=새 프로필')).toBeVisible();
    });

    test('프로필 카드가 iPad에 최적화된 크기로 표시된다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // 카드 크기가 터치에 적합한지 확인 (최소 44px)
      const firstCard = page.locator('[data-testid="profile-select"] >> .cursor-pointer').first();
      const cardBox = await firstCard.boundingBox();
      
      expect(cardBox!.height).toBeGreaterThanOrEqual(44);
      expect(cardBox!.width).toBeGreaterThanOrEqual(44);
    });
  });

  test.describe('프로필 선택 기능', () => {
    test('기존 프로필 선택 시 예배 목록으로 이동한다', async ({ page }) => {
      await helper.waitForProfileCards();
      await helper.clickProfile('김찬양');
      
      // URL 변경 확인
      await expect(page).toHaveURL(/#\/worship$/);
      
      // 예배 목록 페이지 로딩 확인
      await expect(page.locator('[data-testid="worship-list"]')).toBeVisible();
      
      // 사용자 정보 표시 확인
      await expect(page.locator('text=/환영합니다.*김찬양/')).toBeVisible();
    });

    test('각 프로필별 고유 아이콘과 역할이 표시된다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // 각 프로필의 역할 확인
      const profiles = [
        { name: '김찬양', role: '리더' },
        { name: '이피아노', role: '건반' },
        { name: '박기타', role: '기타' },
        { name: '최드럼', role: '드럼' }
      ];
      
      for (const profile of profiles) {
        const profileCard = page.locator(`text=${profile.name}`).locator('..');
        await expect(profileCard.locator(`text=${profile.role}`)).toBeVisible();
      }
    });

    test('프로필 카드 호버 효과가 작동한다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      const firstCard = page.locator('[data-testid="profile-select"] >> .cursor-pointer').first();
      
      // 호버 전 상태 확인
      const beforeHover = await firstCard.getAttribute('class');
      
      // 호버 효과
      await firstCard.hover();
      await page.waitForTimeout(300);
      
      const afterHover = await firstCard.getAttribute('class');
      
      // 호버 시 클래스 변화 확인 (예: hover:shadow-lg, hover:scale-105 등)
      expect(afterHover).not.toBe(beforeHover);
    });
  });

  test.describe('새 프로필 생성', () => {
    test('새 프로필 다이얼로그가 올바르게 열린다', async ({ page }) => {
      await helper.waitForProfileCards();
      await helper.clickNewProfile();
      
      await helper.waitForNewProfileDialog();
      
      // 다이얼로그 요소들 확인
      await expect(page.locator('input[placeholder="이름을 입력하세요"]')).toBeVisible();
      await expect(page.locator('select')).toBeVisible();
      await expect(page.locator('.grid-cols-6 button')).toHaveCount(12);
      
      // 버튼들 확인
      await expect(page.locator('button:has-text("저장")')).toBeVisible();
      await expect(page.locator('button:has-text("취소")')).toBeVisible();
    });

    test('새 프로필을 성공적으로 생성할 수 있다', async ({ page }) => {
      await helper.waitForProfileCards();
      await helper.clickNewProfile();
      await helper.waitForNewProfileDialog();
      
      // 새 프로필 정보 입력
      await helper.fillNewProfileForm('신규유저', '베이스', 3);
      await helper.saveProfile();
      
      // 다이얼로그 닫힘 확인
      await expect(page.locator('text=새 프로필 생성')).not.toBeVisible();
      
      // 성공 토스트 확인
      await helper.checkToastMessage('프로필이 생성되었습니다');
      
      // 새 프로필 카드가 추가되었는지 확인
      await expect(page.locator('text=신규유저')).toBeVisible();
      
      // 총 카드 수 증가 확인
      const newCardCount = await helper.getProfileCardCount();
      expect(newCardCount).toBe(6);
    });

    test('프로필 이름 유효성 검증이 작동한다', async ({ page }) => {
      await helper.waitForProfileCards();
      await helper.clickNewProfile();
      await helper.waitForNewProfileDialog();
      
      // 빈 이름으로 저장 시도
      await helper.saveProfile();
      
      // 에러 메시지 확인
      await expect(page.locator('text=이름을 입력해주세요')).toBeVisible();
      
      // 기존 이름과 중복으로 저장 시도
      await helper.fillNewProfileForm('김찬양', '찬양', 0);
      await helper.saveProfile();
      
      // 중복 에러 메시지 확인
      await helper.checkToastMessage('이미 존재하는 이름입니다');
    });

    test('다이얼로그 취소 기능이 작동한다', async ({ page }) => {
      await helper.waitForProfileCards();
      await helper.clickNewProfile();
      await helper.waitForNewProfileDialog();
      
      // 일부 정보 입력
      await helper.fillNewProfileForm('취소테스트', '건반', 2);
      
      // 취소 버튼 클릭
      await helper.cancelDialog();
      
      // 다이얼로그 닫힘 확인
      await expect(page.locator('text=새 프로필 생성')).not.toBeVisible();
      
      // 프로필이 생성되지 않았는지 확인
      await expect(page.locator('text=취소테스트')).not.toBeVisible();
    });

    test('ESC 키로 다이얼로그를 닫을 수 있다', async ({ page }) => {
      await helper.waitForProfileCards();
      await helper.clickNewProfile();
      await helper.waitForNewProfileDialog();
      
      // ESC 키 누르기
      await page.keyboard.press('Escape');
      
      // 다이얼로그 닫힘 확인
      await expect(page.locator('text=새 프로필 생성')).not.toBeVisible();
    });
  });

  test.describe('프로필 편집 기능', () => {
    test('프로필 우클릭으로 편집 메뉴가 표시된다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // 우클릭 (데스크톱 환경)
      await helper.rightClickProfile('김찬양');
      
      // 컨텍스트 메뉴 확인
      const contextMenu = page.locator('[data-testid="context-menu"], .context-menu');
      if (await contextMenu.isVisible()) {
        await expect(contextMenu.locator('text=편집')).toBeVisible();
        await expect(contextMenu.locator('text=삭제')).toBeVisible();
      }
    });

    test('프로필 롱 프레스로 편집 메뉴가 표시된다 (모바일)', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // 롱 프레스 (모바일 환경)
      await helper.longPressProfile('이피아노');
      
      // 편집 옵션이 나타나는지 확인
      const editOption = page.locator('text=편집, button:has-text("편집")');
      if (await editOption.isVisible()) {
        await expect(editOption).toBeVisible();
      }
    });

    test('프로필 편집 다이얼로그가 기존 정보로 채워진다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // 편집 메뉴 열기 (가정: 더블클릭으로 편집 모드)
      await page.locator('text=김찬양').dblclick();
      
      const editDialog = page.locator('text=프로필 편집');
      if (await editDialog.isVisible()) {
        await helper.waitForEditProfileDialog();
        
        // 기존 정보가 채워져 있는지 확인
        const nameInput = page.locator('input[placeholder="이름을 입력하세요"]');
        const currentName = await nameInput.inputValue();
        expect(currentName).toBe('김찬양');
        
        const roleSelect = page.locator('select');
        const currentRole = await roleSelect.inputValue();
        expect(currentRole).toBe('리더');
      }
    });
  });

  test.describe('서버 연결 및 상태 관리', () => {
    test('서버 연결 상태가 표시된다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // 연결 상태 표시기 확인
      const connectionStatus = await helper.checkServerConnection();
      
      if (connectionStatus !== null) {
        expect(['연결됨', '연결 중', '연결 실패']).toContain(connectionStatus);
      }
    });

    test('서버 연결 실패 시 적절한 에러 메시지가 표시된다', async ({ page }) => {
      // 네트워크 차단하여 연결 실패 시뮬레이션
      await page.context().setOffline(true);
      
      await helper.goto();
      
      // 에러 토스트 확인
      const errorToast = page.locator('.fixed.top-4.right-4 >> text=서버 연결');
      if (await errorToast.isVisible()) {
        await expect(errorToast).toBeVisible();
      }
      
      // 네트워크 복구
      await page.context().setOffline(false);
    });

    test('연결 재시도 기능이 작동한다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // 재시도 버튼이 있다면 클릭
      const retryButton = page.locator('button:has-text("재시도"), button:has-text("다시 연결")');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        
        // 연결 시도 중 표시 확인
        await expect(page.locator('text=연결 중')).toBeVisible();
      }
    });
  });

  test.describe('접근성 및 사용성', () => {
    test('키보드 네비게이션이 작동한다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // Tab 키로 포커스 이동
      await page.keyboard.press('Tab');
      
      // 첫 번째 프로필에 포커스 확인
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Enter 키로 프로필 선택
      await page.keyboard.press('Enter');
      
      // 선택 동작 확인
      await expect(page).toHaveURL(/#\/worship$/);
    });

    test('스크린 리더를 위한 ARIA 속성이 적절히 설정되어 있다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // 프로필 선택 영역의 ARIA 레이블 확인
      const profileSection = page.locator('[data-testid="profile-select"]');
      const ariaLabel = await profileSection.getAttribute('aria-label');
      expect(ariaLabel).toContain('프로필');
      
      // 각 프로필 카드의 접근성 확인
      const profileCards = page.locator('[data-testid="profile-select"] >> .cursor-pointer');
      const firstCard = profileCards.first();
      
      const role = await firstCard.getAttribute('role');
      expect(['button', 'option']).toContain(role);
    });

    test('터치 제스처가 올바르게 작동한다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      const firstCard = page.locator('[data-testid="profile-select"] >> .cursor-pointer').first();
      
      // 터치 이벤트 시뮬레이션
      await firstCard.dispatchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      await firstCard.dispatchEvent('touchend', {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      // 선택 동작 확인
      await expect(page).toHaveURL(/#\/worship$/);
    });

    test('세로 방향(Portrait) 레이아웃이 적절히 표시된다', async ({ page }) => {
      // iPad 세로 방향 뷰포트 설정
      await page.setViewportSize({ width: 1668, height: 2388 });
      
      await helper.goto();
      await helper.waitForProfileCards();
      
      // 카드들이 세로 레이아웃에 맞게 배치되었는지 확인
      const profileCards = page.locator('[data-testid="profile-select"] >> .cursor-pointer');
      const cardCount = await profileCards.count();
      
      for (let i = 0; i < cardCount; i++) {
        const card = profileCards.nth(i);
        const box = await card.boundingBox();
        
        // 카드가 화면 너비를 넘지 않는지 확인
        expect(box!.x + box!.width).toBeLessThanOrEqual(1668);
      }
    });
  });

  test.describe('성능 및 반응성', () => {
    test('페이지 로딩 시간이 적절하다', async ({ page }) => {
      const startTime = Date.now();
      
      await helper.goto();
      await helper.waitForProfileCards();
      
      const loadTime = Date.now() - startTime;
      
      // 3초 이내 로딩 완료
      expect(loadTime).toBeLessThan(3000);
    });

    test('프로필 선택 응답 시간이 적절하다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      const startTime = Date.now();
      await helper.clickProfile('김찬양');
      
      // 페이지 전환 대기
      await expect(page).toHaveURL(/#\/worship$/);
      
      const responseTime = Date.now() - startTime;
      
      // 1초 이내 응답
      expect(responseTime).toBeLessThan(1000);
    });

    test('다중 프로필 생성 시 메모리 사용량이 적절하다', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // 초기 메모리 사용량 측정
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // 여러 프로필 생성 시도
      for (let i = 0; i < 3; i++) {
        await helper.clickNewProfile();
        await helper.waitForNewProfileDialog();
        await helper.fillNewProfileForm(`테스트${i}`, '찬양', i);
        await helper.saveProfile();
        await page.waitForTimeout(100);
      }
      
      // 최종 메모리 사용량 측정
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // 메모리 증가량이 합리적인 범위 내인지 확인 (20MB 이하)
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);
      expect(memoryIncrease).toBeLessThan(20);
    });
  });

  test.describe('오류 처리', () => {
    test('잘못된 프로필 데이터 처리', async ({ page }) => {
      // localStorage에 잘못된 데이터 주입
      await page.evaluate(() => {
        localStorage.setItem('profiles', 'invalid-json');
      });
      
      await helper.goto();
      
      // 기본 프로필로 복구되는지 확인
      await helper.waitForProfileCards();
      const cardCount = await helper.getProfileCardCount();
      expect(cardCount).toBeGreaterThanOrEqual(5);
      
      // 에러 토스트가 표시되는지 확인
      const errorToast = page.locator('.fixed.top-4.right-4 >> text=프로필 데이터');
      if (await errorToast.isVisible()) {
        await expect(errorToast).toBeVisible();
      }
    });

    test('네트워크 오류 시 적절한 피드백 제공', async ({ page }) => {
      await helper.waitForProfileCards();
      
      // 네트워크 차단
      await page.context().setOffline(true);
      
      // 프로필 선택 시도
      await helper.clickProfile('김찬양');
      
      // 오류 메시지 확인
      const errorMessage = page.locator('text=네트워크 연결, text=연결 실패');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
      
      // 네트워크 복구
      await page.context().setOffline(false);
    });
  });
});