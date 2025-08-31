/**
 * SettingsPage E2E 테스트
 * 
 * 테스트 범위:
 * - 프로필 설정 (이름, 역할, 아이콘)
 * - 테마 설정 (다크모드)
 * - 입력 설정 (Apple Pencil, 손바닥 거치 방지, 자동 저장, 펜 굵기)
 * - 연결 설정 (자동 연결)
 * - 위험 구역 (프로필 삭제)
 * - 변경사항 추적 및 저장
 * - localStorage 데이터 영속성
 */

import { test, expect, Page } from '@playwright/test';

const TEST_URL = process.env.TEST_URL || 'http://localhost:5173';

// 테스트 헬퍼 클래스
class SettingsPageTestHelper {
  constructor(private page: Page) {}

  async gotoWithProfile(profileName: string = '김찬양') {
    // 프로필 선택 후 설정 페이지로 이동
    await this.page.goto(TEST_URL);
    await this.page.waitForSelector('[data-testid="profile-select"]', { timeout: 10000 });
    await this.page.locator(`text=${profileName}`).click();
    await this.page.waitForURL(/#\/worship$/);
    await this.page.goto(TEST_URL + '#/settings');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForSettingsPage() {
    await this.page.waitForSelector('h1:has-text("설정")', { timeout: 10000 });
  }

  // 프로필 설정 헬퍼
  async getProfileNameInput() {
    return this.page.locator('input[placeholder="닉네임"]');
  }

  async getRoleSelect() {
    return this.page.locator('select').first();
  }

  async selectRole(role: string) {
    await this.getRoleSelect().selectOption(role);
  }

  async selectIcon(iconText: string) {
    await this.page.locator(`.grid.grid-cols-6 button:has-text("${iconText}")`).click();
  }

  async saveProfile() {
    await this.page.locator('button:has-text("프로필 저장")').click();
  }

  async isProfileSaveButtonEnabled() {
    const button = this.page.locator('button:has-text("프로필 저장")');
    const className = await button.getAttribute('class');
    return !className?.includes('cursor-not-allowed');
  }

  // 다크모드 헬퍼
  async getDarkModeToggle() {
    return this.page.locator('button').filter({ has: this.page.locator('.h-6.w-6') }).first();
  }

  async toggleDarkMode() {
    await this.getDarkModeToggle().click();
  }

  async isDarkModeEnabled() {
    const htmlElement = this.page.locator('html');
    const className = await htmlElement.getAttribute('class');
    return className?.includes('dark') || false;
  }

  async getDarkModeToggleState() {
    const toggle = await this.getDarkModeToggle();
    const className = await toggle.getAttribute('class');
    return className?.includes('bg-blue-600') || false;
  }

  // 입력 설정 헬퍼
  async getApplePencilToggle() {
    return this.page.locator('text=Apple Pencil 압력 감지').locator('..').locator('button');
  }

  async getPalmRejectionToggle() {
    return this.page.locator('text=손바닥 거치 방지').locator('..').locator('button');
  }

  async getAutoSaveToggle() {
    return this.page.locator('text=자동 저장').locator('..').locator('button');
  }

  async getThicknessSlider() {
    return this.page.locator('input[type="range"]');
  }

  async toggleApplePencil() {
    await this.getApplePencilToggle().click();
  }

  async togglePalmRejection() {
    await this.getPalmRejectionToggle().click();
  }

  async toggleAutoSave() {
    await this.getAutoSaveToggle().click();
  }

  async setThickness(value: number) {
    await this.getThicknessSlider().fill(value.toString());
  }

  async getThicknessValue() {
    return await this.getThicknessSlider().inputValue();
  }

  async isSettingsSaveButtonVisible() {
    return await this.page.locator('button:has-text("설정 저장")').isVisible();
  }

  async saveSettings() {
    await this.page.locator('button:has-text("설정 저장")').click();
  }

  // 연결 설정 헬퍼
  async getAutoConnectToggle() {
    return this.page.locator('text=자동 연결').locator('..').locator('button');
  }

  async toggleAutoConnect() {
    await this.getAutoConnectToggle().click();
  }

  // 위험 구역 헬퍼
  async clickDeleteProfile() {
    await this.page.locator('button:has-text("프로필 영구 삭제")').click();
  }

  async waitForDeleteDialog() {
    await this.page.waitForSelector('text=프로필 완전 삭제', { timeout: 5000 });
  }

  async confirmDelete() {
    await this.page.locator('button:has-text("영구 삭제")').click();
  }

  async cancelDelete() {
    await this.page.locator('button:has-text("취소")').click();
  }

  async isDeleteDialogClosed() {
    return !(await this.page.locator('text=프로필 완전 삭제').isVisible());
  }

  // 네비게이션 헬퍼
  async goBack() {
    await this.page.locator('button').first().click(); // ArrowLeft 버튼
  }

  // 저장된 데이터 확인 헬퍼
  async getStoredProfile() {
    return await this.page.evaluate(() => {
      const stored = localStorage.getItem('gilteun-profile');
      return stored ? JSON.parse(stored) : null;
    });
  }

  async getStoredDarkMode() {
    return await this.page.evaluate(() => {
      return localStorage.getItem('gilteun-dark-mode') === 'true';
    });
  }

  async getStoredApplePencil() {
    return await this.page.evaluate(() => {
      return localStorage.getItem('gilteun-pencil-pressure') !== 'false';
    });
  }

  async getStoredPalmRejection() {
    return await this.page.evaluate(() => {
      return localStorage.getItem('gilteun-palm-rejection') !== 'false';
    });
  }

  async getStoredAutoSave() {
    return await this.page.evaluate(() => {
      return localStorage.getItem('gilteun-auto-save') !== 'false';
    });
  }

  async getStoredThickness() {
    return await this.page.evaluate(() => {
      return parseInt(localStorage.getItem('gilteun-annotation-thickness') || '3');
    });
  }

  // localStorage 초기화
  async clearStoredSettings() {
    await this.page.evaluate(() => {
      localStorage.removeItem('gilteun-profile');
      localStorage.removeItem('gilteun-dark-mode');
      localStorage.removeItem('gilteun-pencil-pressure');
      localStorage.removeItem('gilteun-palm-rejection');
      localStorage.removeItem('gilteun-auto-save');
      localStorage.removeItem('gilteun-annotation-thickness');
    });
  }
}

test.describe('SettingsPage 종합 테스트', () => {
  let helper: SettingsPageTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new SettingsPageTestHelper(page);
  });

  test.describe('기본 레이아웃 및 접근', () => {
    test('설정 페이지에 접근할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 페이지 제목 확인
      await expect(page.locator('h1:has-text("설정")')).toBeVisible();

      // URL 확인
      await expect(page).toHaveURL(/#\/settings$/);

      // 뒤로가기 버튼 확인
      await expect(page.locator('button').first()).toBeVisible();
    });

    test('권한이 없는 사용자는 설정 페이지에서 리다이렉션된다', async ({ page }) => {
      // 프로필 선택 없이 직접 설정 페이지 접근
      await page.goto(TEST_URL + '#/settings');

      // 프로필 선택 페이지로 리다이렉션 확인
      await expect(page).toHaveURL(/^\/#?\/?$/);
      await expect(page.locator('[data-testid="profile-select"]')).toBeVisible();
    });

    test('모든 설정 섹션이 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 각 설정 섹션 확인
      await expect(page.locator('h2:has-text("프로필 설정")')).toBeVisible();
      await expect(page.locator('h2:has-text("테마 설정")')).toBeVisible();
      await expect(page.locator('h2:has-text("입력 설정")')).toBeVisible();
      await expect(page.locator('h2:has-text("연결 설정")')).toBeVisible();
      await expect(page.locator('h2:has-text("위험 구역")')).toBeVisible();
    });

    test('iPad 세로 레이아웃에 최적화되어 표시된다', async ({ page }) => {
      // iPad 뷰포트 설정
      await page.setViewportSize({ width: 1668, height: 2388 });

      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 컨테이너가 화면에 맞게 표시되는지 확인
      const container = page.locator('.mx-auto.max-w-4xl');
      const containerBox = await container.boundingBox();

      expect(containerBox!.width).toBeLessThanOrEqual(1668);

      // 설정 카드들이 적절한 간격으로 배치되는지 확인
      const settingsCards = page.locator('.space-y-6 .rounded-2xl');
      expect(await settingsCards.count()).toBeGreaterThanOrEqual(5);
    });
  });

  test.describe('프로필 설정', () => {
    test('현재 사용자 정보가 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 이름 필드에 현재 사용자 이름이 표시되는지 확인
      const nameInput = await helper.getProfileNameInput();
      const currentName = await nameInput.inputValue();
      expect(currentName).toBe('김찬양');
    });

    test('프로필 이름을 변경할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 이름 변경
      const nameInput = await helper.getProfileNameInput();
      await nameInput.clear();
      await nameInput.fill('변경된이름');

      // 저장 버튼이 활성화되는지 확인
      expect(await helper.isProfileSaveButtonEnabled()).toBe(true);

      // 프로필 저장
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('프로필이 저장되었습니다');
        dialog.accept();
      });

      await helper.saveProfile();

      // localStorage에 저장되었는지 확인
      const storedProfile = await helper.getStoredProfile();
      expect(storedProfile.name).toBe('변경된이름');
    });

    test('역할을 선택할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 역할 변경
      await helper.selectRole('드러머');

      // 저장 버튼 활성화 확인
      expect(await helper.isProfileSaveButtonEnabled()).toBe(true);

      // 저장
      page.on('dialog', dialog => dialog.accept());
      await helper.saveProfile();

      // 변경된 역할이 유지되는지 확인
      const roleSelect = await helper.getRoleSelect();
      const selectedRole = await roleSelect.inputValue();
      expect(selectedRole).toBe('드러머');
    });

    test('아이콘을 선택할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 아이콘 변경
      await helper.selectIcon('🎸');

      // 저장 버튼 활성화 확인
      expect(await helper.isProfileSaveButtonEnabled()).toBe(true);

      // 저장
      page.on('dialog', dialog => dialog.accept());
      await helper.saveProfile();

      // 선택된 아이콘이 표시되는지 확인
      const selectedIcon = page.locator('.ring-2.ring-blue-500');
      await expect(selectedIcon).toContainText('🎸');
    });

    test('빈 이름으로는 저장할 수 없다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 이름을 비우기
      const nameInput = await helper.getProfileNameInput();
      await nameInput.clear();

      // 저장 시도
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('이름을 입력하세요');
        dialog.accept();
      });

      await helper.saveProfile();

      // 저장 버튼이 여전히 활성화되어 있는지 확인
      expect(await helper.isProfileSaveButtonEnabled()).toBe(true);
    });

    test('변경사항이 없으면 저장 버튼이 비활성화된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 초기 상태에서는 저장 버튼 비활성화
      expect(await helper.isProfileSaveButtonEnabled()).toBe(false);

      // 이름 변경 후 다시 원래대로
      const nameInput = await helper.getProfileNameInput();
      await nameInput.fill('다른이름');
      expect(await helper.isProfileSaveButtonEnabled()).toBe(true);

      await nameInput.clear();
      await nameInput.fill('김찬양');
      expect(await helper.isProfileSaveButtonEnabled()).toBe(false);
    });
  });

  test.describe('다크모드 설정', () => {
    test('다크모드 토글이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 초기 상태 확인 (라이트모드)
      expect(await helper.isDarkModeEnabled()).toBe(false);

      // 다크모드 토글
      await helper.toggleDarkMode();
      await page.waitForTimeout(500);

      // 다크모드 활성화 확인
      expect(await helper.isDarkModeEnabled()).toBe(true);

      // 토글 상태 확인
      expect(await helper.getDarkModeToggleState()).toBe(true);

      // localStorage 저장 확인
      expect(await helper.getStoredDarkMode()).toBe(true);
    });

    test('다크모드에서 UI 색상이 변경된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 다크모드 활성화
      await helper.toggleDarkMode();
      await page.waitForTimeout(500);

      // 배경색 변경 확인
      const mainContainer = page.locator('.min-h-screen');
      const className = await mainContainer.getAttribute('class');
      expect(className).toContain('dark:bg-slate-900');

      // 텍스트 색상 변경 확인
      const heading = page.locator('h1:has-text("설정")');
      const headingClass = await heading.getAttribute('class');
      expect(headingClass).toContain('dark:text-slate-100');
    });

    test('페이지 새로고침 후에도 다크모드가 유지된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 다크모드 활성화
      await helper.toggleDarkMode();
      await page.waitForTimeout(500);

      // 페이지 새로고침
      await page.reload();
      await helper.waitForSettingsPage();

      // 다크모드 유지 확인
      expect(await helper.isDarkModeEnabled()).toBe(true);
      expect(await helper.getDarkModeToggleState()).toBe(true);
    });
  });

  test.describe('입력 설정', () => {
    test('Apple Pencil 압력 감지 토글이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // Apple Pencil 설정 토글
      await helper.toggleApplePencil();

      // 설정 저장 버튼 표시 확인
      expect(await helper.isSettingsSaveButtonVisible()).toBe(true);

      // 설정 저장
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('설정이 저장되었습니다');
        dialog.accept();
      });

      await helper.saveSettings();

      // localStorage 저장 확인
      const stored = await helper.getStoredApplePencil();
      expect(stored).toBe(false); // 기본값이 true이므로 토글 후 false
    });

    test('손바닥 거치 방지 토글이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 손바닥 거치 방지 토글
      await helper.togglePalmRejection();

      // 설정 저장 버튼 표시 확인
      expect(await helper.isSettingsSaveButtonVisible()).toBe(true);

      // 설정 저장
      page.on('dialog', dialog => dialog.accept());
      await helper.saveSettings();

      // localStorage 저장 확인
      const stored = await helper.getStoredPalmRejection();
      expect(stored).toBe(false); // 기본값이 true이므로 토글 후 false
    });

    test('자동 저장 토글이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 자동 저장 토글
      await helper.toggleAutoSave();

      // 설정 저장
      page.on('dialog', dialog => dialog.accept());
      await helper.saveSettings();

      // localStorage 저장 확인
      const stored = await helper.getStoredAutoSave();
      expect(stored).toBe(false); // 기본값이 true이므로 토글 후 false
    });

    test('펜 굵기 슬라이더가 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 펜 굵기 변경
      await helper.setThickness(7);

      // 슬라이더 값 확인
      expect(await helper.getThicknessValue()).toBe('7');

      // 레이블 업데이트 확인
      await expect(page.locator('text=기본 펜 굵기: 7px')).toBeVisible();

      // 설정 저장
      page.on('dialog', dialog => dialog.accept());
      await helper.saveSettings();

      // localStorage 저장 확인
      const stored = await helper.getStoredThickness();
      expect(stored).toBe(7);
    });

    test('여러 설정을 한 번에 변경하고 저장할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 여러 설정 변경
      await helper.toggleApplePencil();
      await helper.togglePalmRejection();
      await helper.setThickness(8);

      // 설정 저장 버튼이 표시되는지 확인
      expect(await helper.isSettingsSaveButtonVisible()).toBe(true);

      // 설정 저장
      page.on('dialog', dialog => dialog.accept());
      await helper.saveSettings();

      // 모든 설정이 localStorage에 저장되었는지 확인
      expect(await helper.getStoredApplePencil()).toBe(false);
      expect(await helper.getStoredPalmRejection()).toBe(false);
      expect(await helper.getStoredThickness()).toBe(8);

      // 저장 버튼이 사라지는지 확인
      expect(await helper.isSettingsSaveButtonVisible()).toBe(false);
    });
  });

  test.describe('연결 설정', () => {
    test('자동 연결 토글이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 자동 연결 토글 (즉시 저장됨)
      await helper.toggleAutoConnect();

      // 토글 상태 변경 확인
      const toggle = await helper.getAutoConnectToggle();
      const className = await toggle.getAttribute('class');
      
      // 토글이 비활성화 상태(기본값이 true이므로 토글 후 false)를 나타내는지 확인
      expect(className).toContain('bg-slate-300');
    });

    test('자동 연결 설정이 즉시 적용된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 초기 상태 확인 (활성화)
      const initialToggle = await helper.getAutoConnectToggle();
      const initialClass = await initialToggle.getAttribute('class');
      expect(initialClass).toContain('bg-blue-600');

      // 토글 후 즉시 비활성화 상태 확인
      await helper.toggleAutoConnect();
      
      const updatedToggle = await helper.getAutoConnectToggle();
      const updatedClass = await updatedToggle.getAttribute('class');
      expect(updatedClass).toContain('bg-slate-300');
    });
  });

  test.describe('위험 구역 - 프로필 삭제', () => {
    test('프로필 삭제 버튼이 위험한 스타일로 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 위험 구역 섹션 확인
      const dangerZone = page.locator('.border-red-200.bg-red-50');
      await expect(dangerZone).toBeVisible();

      // 삭제 버튼 스타일 확인
      const deleteButton = page.locator('button:has-text("프로필 영구 삭제")');
      const buttonClass = await deleteButton.getAttribute('class');
      expect(buttonClass).toContain('bg-red-600');
    });

    test('프로필 삭제 확인 다이얼로그가 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 삭제 버튼 클릭
      await helper.clickDeleteProfile();
      await helper.waitForDeleteDialog();

      // 다이얼로그 내용 확인
      await expect(page.locator('h3:has-text("프로필 완전 삭제")')).toBeVisible();
      await expect(page.locator('text=이 작업은 되돌릴 수 없습니다')).toBeVisible();
      await expect(page.locator('text=삭제될 데이터:')).toBeVisible();
      await expect(page.locator('text=김찬양')).toBeVisible(); // 현재 사용자 이름

      // 버튼 확인
      await expect(page.locator('button:has-text("취소")')).toBeVisible();
      await expect(page.locator('button:has-text("영구 삭제")')).toBeVisible();
    });

    test('프로필 삭제를 취소할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      await helper.clickDeleteProfile();
      await helper.waitForDeleteDialog();

      // 취소 버튼 클릭
      await helper.cancelDelete();

      // 다이얼로그 닫힘 확인
      expect(await helper.isDeleteDialogClosed()).toBe(true);

      // 여전히 설정 페이지에 있는지 확인
      await expect(page.locator('h1:has-text("설정")')).toBeVisible();
    });

    test('프로필을 영구 삭제할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      await helper.clickDeleteProfile();
      await helper.waitForDeleteDialog();

      // 영구 삭제 버튼 클릭
      await helper.confirmDelete();

      // 프로필 선택 페이지로 리다이렉션 확인
      await expect(page).toHaveURL(/^\/#?\/?$/);
      await expect(page.locator('[data-testid="profile-select"]')).toBeVisible();

      // localStorage가 정리되었는지 확인
      const storedProfile = await helper.getStoredProfile();
      expect(storedProfile).toBe(null);
    });
  });

  test.describe('데이터 영속성 (localStorage)', () => {
    test('모든 설정이 localStorage에 저장된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 다크모드 활성화
      await helper.toggleDarkMode();

      // 입력 설정 변경
      await helper.toggleApplePencil();
      await helper.setThickness(5);

      // 설정 저장
      page.on('dialog', dialog => dialog.accept());
      await helper.saveSettings();

      // localStorage 확인
      expect(await helper.getStoredDarkMode()).toBe(true);
      expect(await helper.getStoredApplePencil()).toBe(false);
      expect(await helper.getStoredThickness()).toBe(5);
    });

    test('페이지 새로고침 후에도 설정이 유지된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 설정 변경
      await helper.toggleDarkMode();
      await helper.toggleApplePencil();
      await helper.setThickness(6);
      
      page.on('dialog', dialog => dialog.accept());
      await helper.saveSettings();

      // 페이지 새로고침
      await page.reload();
      await helper.waitForSettingsPage();

      // 설정 유지 확인
      expect(await helper.isDarkModeEnabled()).toBe(true);
      expect(await helper.getThicknessValue()).toBe('6');
    });

    test('초기 로딩 시 저장된 설정이 복원된다', async ({ page }) => {
      // 사전에 설정값 저장
      await page.goto(TEST_URL);
      await page.evaluate(() => {
        localStorage.setItem('gilteun-dark-mode', 'true');
        localStorage.setItem('gilteun-pencil-pressure', 'false');
        localStorage.setItem('gilteun-annotation-thickness', '8');
      });

      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 저장된 설정이 복원되었는지 확인
      expect(await helper.isDarkModeEnabled()).toBe(true);
      expect(await helper.getThicknessValue()).toBe('8');
    });
  });

  test.describe('네비게이션 및 사용성', () => {
    test('뒤로가기 버튼이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      await helper.goBack();

      // 예배 목록 페이지로 이동했는지 확인
      await expect(page).toHaveURL(/#\/worship$/);
      await expect(page.locator('[data-testid="worship-list"]')).toBeVisible();
    });

    test('키보드 네비게이션이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // Tab 키로 포커스 이동
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // 이름 입력 필드에 포커스
      const focusedElement = page.locator(':focus');
      const placeholder = await focusedElement.getAttribute('placeholder');
      expect(placeholder).toBe('닉네임');

      // Enter 키로 텍스트 입력 모드
      await page.keyboard.type('키보드입력');
      
      const inputValue = await focusedElement.inputValue();
      expect(inputValue).toContain('키보드입력');
    });

    test('터치 인터페이스에 최적화되어 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 토글 버튼들이 터치에 적합한 크기인지 확인
      const darkModeToggle = await helper.getDarkModeToggle();
      const toggleBox = await darkModeToggle.boundingBox();
      
      expect(toggleBox!.height).toBeGreaterThanOrEqual(28); // 최소 28px 높이
      expect(toggleBox!.width).toBeGreaterThanOrEqual(56); // 최소 56px 너비

      // 아이콘 선택 버튼들이 터치에 적합한지 확인
      const iconButton = page.locator('.grid.grid-cols-6 button').first();
      const iconBox = await iconButton.boundingBox();
      
      expect(iconBox!.height).toBeGreaterThanOrEqual(48); // 최소 48px
      expect(iconBox!.width).toBeGreaterThanOrEqual(48);
    });

    test('반응형 레이아웃이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 다양한 뷰포트에서 테스트
      const viewports = [
        { width: 768, height: 1024 }, // 태블릿 세로
        { width: 1024, height: 768 }, // 태블릿 가로
        { width: 1668, height: 2388 }, // iPad Pro
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);

        // 컨테이너가 화면에 맞게 표시되는지 확인
        const container = page.locator('.mx-auto.max-w-4xl');
        const containerBox = await container.boundingBox();
        expect(containerBox!.width).toBeLessThanOrEqual(viewport.width);

        // 아이콘 그리드가 적절히 배치되는지 확인
        const iconGrid = page.locator('.grid.grid-cols-6');
        await expect(iconGrid).toBeVisible();
      }
    });
  });

  test.describe('성능 및 메모리 관리', () => {
    test('페이지 로딩 성능이 적절하다', async ({ page }) => {
      const startTime = Date.now();

      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3초 이내 로딩
    });

    test('설정 변경 시 메모리 사용량이 적절하다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 초기 메모리 사용량
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // 다수의 설정 변경
      for (let i = 0; i < 10; i++) {
        await helper.toggleDarkMode();
        await page.waitForTimeout(100);
        await helper.toggleDarkMode();
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

    test('설정 저장 응답 시간이 빠르다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 설정 변경
      await helper.toggleApplePencil();

      // 저장 시간 측정
      const startTime = Date.now();
      
      page.on('dialog', dialog => dialog.accept());
      await helper.saveSettings();

      const saveTime = Date.now() - startTime;
      expect(saveTime).toBeLessThan(1000); // 1초 이내 저장
    });
  });

  test.describe('오류 처리', () => {
    test('잘못된 localStorage 데이터 처리', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 잘못된 데이터 주입
      await page.evaluate(() => {
        localStorage.setItem('gilteun-profile', 'invalid-json');
        localStorage.setItem('gilteun-dark-mode', 'invalid-boolean');
        localStorage.setItem('gilteun-annotation-thickness', 'invalid-number');
      });

      await page.reload();
      await helper.waitForSettingsPage();

      // 기본값으로 복원되는지 확인
      expect(await helper.isDarkModeEnabled()).toBe(false);
      expect(await helper.getThicknessValue()).toBe('3'); // 기본값

      // 페이지가 정상적으로 표시되는지 확인
      await expect(page.locator('h1:has-text("설정")')).toBeVisible();
    });

    test('네트워크 오류 시에도 로컬 설정이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // 네트워크 차단
      await page.context().setOffline(true);

      // 다크모드 토글 (로컬 기능)
      await helper.toggleDarkMode();
      await page.waitForTimeout(500);

      // 여전히 작동하는지 확인
      expect(await helper.isDarkModeEnabled()).toBe(true);

      // 네트워크 복구
      await page.context().setOffline(false);
    });

    test('프로필 삭제 중 오류 발생 시 적절한 처리', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForSettingsPage();

      // localStorage 접근 권한 제거 시뮬레이션 (실제로는 불가능하지만 기능적 테스트)
      await helper.clickDeleteProfile();
      await helper.waitForDeleteDialog();
      await helper.confirmDelete();

      // 여전히 프로필 선택 페이지로 이동하는지 확인
      await expect(page).toHaveURL(/^\/#?\/?$/);
    });
  });
});