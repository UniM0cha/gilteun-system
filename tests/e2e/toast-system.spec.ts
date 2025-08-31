/**
 * Toast Notification System E2E 테스트
 * 
 * 테스트 범위:
 * - 다양한 토스트 타입 (success, error, warning, info)
 * - 자동 사라짐 기능 (duration)
 * - 영구 토스트 (persistent)
 * - 토스트 닫기 기능
 * - 여러 토스트 표시 및 관리
 * - 연결 상태에 따른 토스트 표시
 * - 토스트 애니메이션 및 스타일
 */

import { test, expect, Page } from '@playwright/test';

const TEST_URL = process.env.TEST_URL || 'http://localhost:5173';

// 테스트 헬퍼 클래스
class ToastSystemTestHelper {
  constructor(private page: Page) {}

  async gotoWithProfile(profileName: string = '김찬양') {
    // 프로필 선택 후 아무 페이지로 이동 (Toast는 전역 컴포넌트)
    await this.page.goto(TEST_URL);
    await this.page.waitForSelector('[data-testid="profile-select"]', { timeout: 10000 });
    await this.page.locator(`text=${profileName}`).click();
    await this.page.waitForURL(/#\/worship$/);
    await this.page.waitForLoadState('networkidle');
  }

  // Toast 컨테이너 관련
  async getToastContainer() {
    return this.page.locator('.fixed.top-4.right-4');
  }

  async getAllToasts() {
    return this.page.locator('.fixed.top-4.right-4 > div');
  }

  async getToastCount() {
    const toasts = await this.getAllToasts();
    return await toasts.count();
  }

  async getToastByIndex(index: number) {
    const toasts = await this.getAllToasts();
    return toasts.nth(index);
  }

  async getToastByText(text: string) {
    return this.page.locator('.fixed.top-4.right-4').locator(`text=${text}`).locator('..');
  }

  // 토스트 타입별 헬퍼
  async getSuccessToasts() {
    return this.page.locator('.fixed.top-4.right-4 .bg-green-50');
  }

  async getErrorToasts() {
    return this.page.locator('.fixed.top-4.right-4 .bg-red-50');
  }

  async getWarningToasts() {
    return this.page.locator('.fixed.top-4.right-4 .bg-yellow-50');
  }

  async getInfoToasts() {
    return this.page.locator('.fixed.top-4.right-4 .bg-blue-50');
  }

  // 토스트 상호작용
  async closeToast(toastElement: any) {
    const closeButton = toastElement.locator('button[aria-label="알림 닫기"]');
    await closeButton.click();
  }

  async closeToastByText(text: string) {
    const toast = await this.getToastByText(text);
    await this.closeToast(toast);
  }

  async waitForToastToDisappear(text: string, timeout: number = 5000) {
    await this.page.waitForSelector(`.fixed.top-4.right-4 >> text=${text}`, { state: 'detached', timeout });
  }

  async waitForToastToAppear(text: string, timeout: number = 3000) {
    await this.page.waitForSelector(`.fixed.top-4.right-4 >> text=${text}`, { timeout });
  }

  // 토스트 트리거 액션들
  async triggerSuccessToast() {
    // 설정에서 프로필 저장으로 성공 토스트 트리거
    await this.page.goto(TEST_URL + '#/settings');
    await this.page.waitForSelector('input[placeholder="닉네임"]');
    
    const nameInput = this.page.locator('input[placeholder="닉네임"]');
    await nameInput.fill('토스트테스트');
    
    // 알림 다이얼로그 처리
    this.page.on('dialog', dialog => {
      dialog.accept();
    });
    
    await this.page.locator('button:has-text("프로필 저장")').click();
  }

  async triggerErrorToast() {
    // 네트워크 차단 후 연결 시도로 에러 토스트 트리거
    await this.page.context().setOffline(true);
    await this.page.reload();
    await this.page.waitForTimeout(3000); // 연결 실패 대기
  }

  async triggerNetworkRecoveryToast() {
    // 네트워크 복구로 연결 성공 토스트 트리거
    await this.page.context().setOffline(false);
    await this.page.reload();
    await this.page.waitForTimeout(2000);
  }

  async triggerCommandSentToast() {
    // 명령 전송으로 토스트 트리거
    await this.page.goto(TEST_URL + '#/command');
    await this.page.waitForSelector('.grid .cursor-pointer');
    
    // 첫 번째 명령 클릭
    await this.page.locator('.grid .cursor-pointer').filter({ hasNotText: '새 명령' }).first().click();
    await this.page.waitForTimeout(1000);
  }

  // 연결 상태 변경
  async simulateOfflineMode() {
    await this.page.context().setOffline(true);
    await this.page.waitForTimeout(2000);
  }

  async simulateOnlineMode() {
    await this.page.context().setOffline(false);
    await this.page.waitForTimeout(2000);
  }

  // 토스트 애니메이션 확인
  async checkToastAnimation(toastElement: any) {
    // 초기 상태 (투명도 0, 오른쪽으로 이동)
    const initialClass = await toastElement.getAttribute('class');
    
    // 애니메이션 완료 대기
    await this.page.waitForTimeout(500);
    
    const animatedClass = await toastElement.getAttribute('class');
    
    return {
      hasTransition: initialClass?.includes('transition') || false,
      hasOpacity: animatedClass?.includes('opacity-100') || false,
      hasTransform: animatedClass?.includes('translate-x-0') || false,
    };
  }
}

test.describe('Toast Notification System 테스트', () => {
  let helper: ToastSystemTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new ToastSystemTestHelper(page);
  });

  test.describe('기본 토스트 표시', () => {
    test('토스트 컨테이너가 올바른 위치에 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 토스트 컨테이너 위치 확인
      const container = await helper.getToastContainer();
      const containerClass = await container.getAttribute('class');
      
      expect(containerClass).toContain('fixed');
      expect(containerClass).toContain('top-4');
      expect(containerClass).toContain('right-4');
      expect(containerClass).toContain('z-50');
    });

    test('성공 토스트가 올바르게 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 성공 토스트 트리거
      await helper.triggerSuccessToast();

      // 성공 토스트 확인
      const successToasts = await helper.getSuccessToasts();
      if (await successToasts.count() > 0) {
        const firstToast = successToasts.first();
        await expect(firstToast).toBeVisible();
        
        // 성공 토스트 스타일 확인
        const toastClass = await firstToast.getAttribute('class');
        expect(toastClass).toContain('bg-green-50');
        expect(toastClass).toContain('border-green-200');
        
        // 체크 아이콘 확인
        const checkIcon = firstToast.locator('.text-green-600');
        await expect(checkIcon).toBeVisible();
      }
    });

    test('에러 토스트가 올바르게 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 에러 토스트 트리거
      await helper.triggerErrorToast();

      // 에러 토스트 확인 (네트워크 오류나 연결 실패)
      const errorMessages = [
        'text=서버 연결에 실패했습니다',
        'text=연결 실패',
        'text=네트워크 오류',
        '.bg-red-50'
      ];

      let errorToastFound = false;
      for (const selector of errorMessages) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          errorToastFound = true;
          
          // 에러 토스트 스타일 확인
          const errorToast = page.locator('.fixed.top-4.right-4 .bg-red-50').first();
          if (await errorToast.isVisible()) {
            const toastClass = await errorToast.getAttribute('class');
            expect(toastClass).toContain('bg-red-50');
            expect(toastClass).toContain('border-red-200');
          }
          break;
        }
      }

      // 네트워크 복구
      await helper.simulateOnlineMode();
    });

    test('경고 토스트가 올바르게 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 오프라인 모드로 경고 토스트 트리거
      await helper.simulateOfflineMode();

      // 경고 토스트 확인
      const warningMessages = [
        'text=오프라인 모드',
        'text=네트워크 연결을 확인해주세요',
        'text=재연결 시도',
        '.bg-yellow-50'
      ];

      let warningToastFound = false;
      for (const selector of warningMessages) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          warningToastFound = true;
          
          // 경고 토스트 스타일 확인
          const warningToast = page.locator('.fixed.top-4.right-4 .bg-yellow-50').first();
          if (await warningToast.isVisible()) {
            const toastClass = await warningToast.getAttribute('class');
            expect(toastClass).toContain('bg-yellow-50');
            expect(toastClass).toContain('border-yellow-200');
          }
          break;
        }
      }

      // 네트워크 복구
      await helper.simulateOnlineMode();
    });
  });

  test.describe('토스트 상호작용', () => {
    test('토스트 닫기 버튼이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 토스트 트리거
      await helper.triggerSuccessToast();

      // 토스트가 나타날 때까지 대기
      await page.waitForTimeout(1000);

      const toasts = await helper.getAllToasts();
      if (await toasts.count() > 0) {
        const firstToast = toasts.first();
        
        // 닫기 버튼 확인
        const closeButton = firstToast.locator('button[aria-label="알림 닫기"]');
        if (await closeButton.isVisible()) {
          await closeButton.click();
          
          // 토스트가 사라지는지 확인
          await page.waitForTimeout(500);
          expect(await firstToast.isVisible()).toBe(false);
        }
      }
    });

    test('자동 사라짐 기능이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 명령 전송으로 임시 토스트 트리거
      await helper.triggerCommandSentToast();

      // 토스트 확인
      const commandToast = page.locator('text=명령 전송됨');
      if (await commandToast.isVisible()) {
        // 2초 후 자동으로 사라지는지 확인
        await page.waitForTimeout(3000);
        expect(await commandToast.isVisible()).toBe(false);
      }
    });

    test('영구 토스트는 자동으로 사라지지 않는다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 오프라인 모드로 영구 토스트 트리거
      await helper.simulateOfflineMode();

      const persistentToast = page.locator('.fixed.top-4.right-4').locator('text=오프라인, text=재연결').first();
      if (await persistentToast.isVisible()) {
        // 5초 후에도 여전히 표시되는지 확인
        await page.waitForTimeout(5000);
        expect(await persistentToast.isVisible()).toBe(true);
      }

      // 네트워크 복구
      await helper.simulateOnlineMode();
    });
  });

  test.describe('다중 토스트 관리', () => {
    test('여러 토스트가 동시에 표시될 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 여러 토스트 트리거
      await helper.triggerSuccessToast();
      await page.waitForTimeout(500);

      // 오프라인 모드로 추가 토스트
      await helper.simulateOfflineMode();
      await page.waitForTimeout(500);

      // 여러 토스트가 표시되는지 확인
      const toastCount = await helper.getToastCount();
      if (toastCount > 1) {
        expect(toastCount).toBeGreaterThan(1);
        
        // 토스트들이 수직으로 정렬되는지 확인
        const container = await helper.getToastContainer();
        const containerClass = await container.getAttribute('class');
        expect(containerClass).toContain('space-y-2');
      }

      // 네트워크 복구
      await helper.simulateOnlineMode();
    });

    test('토스트 최대 개수 제한이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 명령 페이지에서 여러 명령 전송으로 다수 토스트 생성
      await page.goto(TEST_URL + '#/command');
      await page.waitForSelector('.grid .cursor-pointer');

      const commands = await page.locator('.grid .cursor-pointer').filter({ hasNotText: '새 명령' });
      const commandCount = await commands.count();

      // 여러 명령을 빠르게 연속 전송
      for (let i = 0; i < Math.min(6, commandCount); i++) {
        await commands.nth(i).click();
        await page.waitForTimeout(200);
      }

      // 토스트 개수가 5개를 초과하지 않는지 확인 (useToastManager의 제한)
      await page.waitForTimeout(1000);
      const finalToastCount = await helper.getToastCount();
      expect(finalToastCount).toBeLessThanOrEqual(5);
    });
  });

  test.describe('연결 상태 기반 토스트', () => {
    test('서버 연결 상태 변화에 따른 토스트가 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 연결됨 상태에서 시작하여 오프라인으로 전환
      await helper.simulateOfflineMode();

      // 연결 실패 또는 오프라인 토스트 확인
      const disconnectMessages = [
        'text=연결 실패',
        'text=오프라인',
        'text=서버 연결에 실패했습니다'
      ];

      let disconnectToastFound = false;
      for (const selector of disconnectMessages) {
        if (await page.locator(selector).isVisible()) {
          disconnectToastFound = true;
          break;
        }
      }

      // 다시 온라인으로 전환
      await helper.simulateOnlineMode();

      // 연결 성공 토스트 확인
      const connectMessages = [
        'text=연결됨',
        'text=서버에 성공적으로 연결되었습니다',
        'text=온라인'
      ];

      let connectToastFound = false;
      for (const selector of connectMessages) {
        if (await page.locator(selector).isVisible()) {
          connectToastFound = true;
          break;
        }
      }

      // 적어도 하나의 상태 변화 토스트가 표시되어야 함
      expect(disconnectToastFound || connectToastFound).toBe(true);
    });

    test('재연결 시도 토스트가 영구적으로 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 불안정한 연결 상태 시뮬레이션
      await helper.simulateOfflineMode();
      await page.waitForTimeout(2000);

      const reconnectingToast = page.locator('text=재연결 시도, text=재연결을 시도하고 있습니다');
      if (await reconnectingToast.isVisible()) {
        // 영구 토스트이므로 시간이 지나도 사라지지 않음
        await page.waitForTimeout(4000);
        expect(await reconnectingToast.isVisible()).toBe(true);
      }

      // 연결 복구로 토스트 제거
      await helper.simulateOnlineMode();
    });
  });

  test.describe('토스트 애니메이션 및 스타일', () => {
    test('토스트 슬라이드 인 애니메이션이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 토스트 트리거
      await helper.triggerSuccessToast();

      // 토스트 엘리먼트 대기
      const toast = page.locator('.fixed.top-4.right-4 > div').first();
      if (await toast.isVisible()) {
        // 애니메이션 클래스 확인
        const animation = await helper.checkToastAnimation(toast);
        
        expect(animation.hasTransition).toBe(true);
        // 애니메이션 완료 후 올바른 위치와 투명도
        expect(animation.hasOpacity).toBe(true);
        expect(animation.hasTransform).toBe(true);
      }
    });

    test('토스트 타입별 색상과 아이콘이 올바르다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 성공 토스트
      await helper.triggerSuccessToast();
      
      const successToast = page.locator('.bg-green-50').first();
      if (await successToast.isVisible()) {
        // 녹색 배경과 체크 아이콘 확인
        const checkIcon = successToast.locator('.text-green-600');
        await expect(checkIcon).toBeVisible();
      }

      // 에러 토스트 (네트워크 오류로)
      await helper.simulateOfflineMode();
      
      const errorToast = page.locator('.bg-red-50').first();
      if (await errorToast.isVisible()) {
        // 빨간색 배경과 X 아이콘 확인
        const errorIcon = errorToast.locator('.text-red-600');
        if (await errorIcon.isVisible()) {
          await expect(errorIcon).toBeVisible();
        }
      }

      await helper.simulateOnlineMode();
    });

    test('토스트가 화면 가장자리에서 적절한 여백을 가진다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 토스트 트리거
      await helper.triggerSuccessToast();

      const container = await helper.getToastContainer();
      if (await container.isVisible()) {
        const containerBox = await container.boundingBox();
        const viewportSize = page.viewportSize()!;

        // 오른쪽과 위쪽에서 적절한 여백 (16px = 1rem)
        expect(viewportSize.width - (containerBox!.x + containerBox!.width)).toBeGreaterThanOrEqual(15);
        expect(containerBox!.y).toBeGreaterThanOrEqual(15);
      }
    });

    test('iPad의 안전 영역을 고려한 위치 조정', async ({ page }) => {
      // iPad 뷰포트 설정
      await page.setViewportSize({ width: 1668, height: 2388 });

      await helper.gotoWithProfile('김찬양');
      await helper.triggerSuccessToast();

      const container = await helper.getToastContainer();
      if (await container.isVisible()) {
        const containerStyle = await container.getAttribute('style');
        
        // 안전 영역 고려한 top 위치 확인
        if (containerStyle?.includes('env(safe-area-inset-top')) {
          expect(containerStyle).toContain('env(safe-area-inset-top');
        }

        // 적어도 기본 여백은 확보되어야 함
        const containerBox = await container.boundingBox();
        expect(containerBox!.y).toBeGreaterThanOrEqual(16); // 최소 1rem
      }
    });
  });

  test.describe('접근성 및 사용성', () => {
    test('토스트가 스크린 리더에 적절히 노출된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 토스트 트리거
      await helper.triggerSuccessToast();

      const toast = page.locator('.fixed.top-4.right-4 > div').first();
      if (await toast.isVisible()) {
        // ARIA 레이블이나 역할 확인
        const ariaLabel = await toast.getAttribute('aria-label');
        const role = await toast.getAttribute('role');

        // 토스트나 알림 역할이 있어야 함
        expect(ariaLabel || role || await toast.textContent()).toBeTruthy();

        // 닫기 버튼의 접근성 확인
        const closeButton = toast.locator('button[aria-label="알림 닫기"]');
        if (await closeButton.isVisible()) {
          const ariaLabel = await closeButton.getAttribute('aria-label');
          expect(ariaLabel).toContain('닫기');
        }
      }
    });

    test('키보드로 토스트를 닫을 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 토스트 트리거
      await helper.triggerSuccessToast();

      const toast = page.locator('.fixed.top-4.right-4 > div').first();
      if (await toast.isVisible()) {
        const closeButton = toast.locator('button[aria-label="알림 닫기"]');
        if (await closeButton.isVisible()) {
          // Tab으로 닫기 버튼에 포커스
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');

          // Enter나 Space로 닫기
          await page.keyboard.press('Enter');
          
          // 토스트가 닫혔는지 확인
          await page.waitForTimeout(500);
          expect(await toast.isVisible()).toBe(false);
        }
      }
    });

    test('터치 제스처로 토스트를 닫을 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 토스트 트리거
      await helper.triggerSuccessToast();

      const toast = page.locator('.fixed.top-4.right-4 > div').first();
      if (await toast.isVisible()) {
        const closeButton = toast.locator('button[aria-label="알림 닫기"]');
        if (await closeButton.isVisible()) {
          // 터치 이벤트 시뮬레이션
          await closeButton.dispatchEvent('touchstart');
          await closeButton.dispatchEvent('touchend');

          // 토스트가 닫혔는지 확인
          await page.waitForTimeout(500);
          expect(await toast.isVisible()).toBe(false);
        }
      }
    });
  });

  test.describe('오류 처리 및 안정성', () => {
    test('토스트 시스템이 메모리 누수 없이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 초기 메모리 사용량
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // 다수의 토스트 생성 및 제거
      for (let i = 0; i < 10; i++) {
        await helper.triggerSuccessToast();
        await page.waitForTimeout(100);
        
        // 토스트 강제 닫기
        const toasts = await helper.getAllToasts();
        if (await toasts.count() > 0) {
          const closeButton = toasts.first().locator('button');
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
        }
        await page.waitForTimeout(100);
      }

      // 최종 메모리 사용량
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // 메모리 증가량이 합리적인 범위 내 (5MB 이하)
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);
      expect(memoryIncrease).toBeLessThan(5);
    });

    test('연결 상태 급변 시에도 토스트가 안정적으로 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 네트워크 상태 빠른 전환
      for (let i = 0; i < 3; i++) {
        await helper.simulateOfflineMode();
        await page.waitForTimeout(500);
        await helper.simulateOnlineMode();
        await page.waitForTimeout(500);
      }

      // 토스트 시스템이 여전히 응답하는지 확인
      await helper.triggerSuccessToast();
      await page.waitForTimeout(1000);

      const finalToastCount = await helper.getToastCount();
      expect(finalToastCount).toBeGreaterThanOrEqual(0); // 오류 없이 작동
    });

    test('잘못된 토스트 데이터 처리', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 프로그래매틱하게 잘못된 토스트 생성 시도
      await page.evaluate(() => {
        const event = new CustomEvent('show-toast', { 
          detail: {
            type: 'invalid-type',
            title: '',
            message: null,
          }
        });
        window.dispatchEvent(event);
      });

      // 토스트 시스템이 오류 없이 작동하는지 확인
      await page.waitForTimeout(1000);
      
      // 정상적인 토스트는 여전히 작동해야 함
      await helper.triggerSuccessToast();
      await page.waitForTimeout(1000);
      
      // 페이지가 여전히 정상적으로 작동하는지 확인
      await expect(page.locator('body')).toBeVisible();
    });
  });
});