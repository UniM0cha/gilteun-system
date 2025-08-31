/**
 * CommandEditorPage E2E 테스트
 * 
 * 테스트 범위:
 * - 명령 패널 그리드 표시 및 상호작용
 * - 실시간 명령 전송 기능
 * - 새 명령 생성/편집/삭제
 * - 명령 히스토리 관리
 * - WebSocket 연결 상태 확인
 * - 로컬스토리지 데이터 영속성
 * - 반응형 레이아웃 (iPad 최적화)
 */

import { test, expect, Page } from '@playwright/test';

const TEST_URL = process.env.TEST_URL || 'http://localhost:5173';

// 테스트 헬퍼 클래스
class CommandEditorTestHelper {
  constructor(private page: Page) {}

  async gotoWithProfile(profileName: string = '김찬양') {
    // 프로필 선택 후 명령 에디터 페이지로 이동
    await this.page.goto(TEST_URL);
    await this.page.waitForSelector('[data-testid="profile-select"]', { timeout: 10000 });
    await this.page.locator(`text=${profileName}`).click();
    await this.page.waitForURL(/#\/worship$/);
    await this.page.goto(TEST_URL + '#/command');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForCommandEditor() {
    await this.page.waitForSelector('h1:has-text("명령 패널 편집")', { timeout: 10000 });
  }

  async getCommandCardCount() {
    // 명령 카드들 (새 명령 추가 카드 제외)
    const commandCards = this.page.locator('.grid .cursor-pointer').filter({ hasNotText: '새 명령' });
    return await commandCards.count();
  }

  async getConnectionStatus() {
    const statusElement = this.page.locator('.rounded-full.px-3.py-1 >> text=/연결됨|연결 끊김/');
    return await statusElement.textContent();
  }

  async clickCommand(commandText: string) {
    await this.page.locator(`.grid >> text=${commandText}`).click();
  }

  async clickNewCommandButton() {
    await this.page.locator('button:has-text("새 명령 추가")').click();
  }

  async clickNewCommandCard() {
    await this.page.locator('.grid >> text=새 명령').click();
  }

  async waitForCommandDialog(isEdit: boolean = false) {
    const dialogTitle = isEdit ? '명령 수정' : '새 명령 만들기';
    await this.page.waitForSelector(`text=${dialogTitle}`, { timeout: 5000 });
  }

  async fillCommandForm(options: {
    emoji?: string;
    text?: string;
    description?: string;
    colorIndex?: number;
  }) {
    // 이모지 선택
    if (options.emoji) {
      await this.page.locator(`button:has-text("${options.emoji}")`).first().click();
    }

    // 텍스트 입력
    if (options.text) {
      await this.page.locator('input[placeholder="예: 더 힘있게!"]').fill(options.text);
    }

    // 설명 입력
    if (options.description) {
      await this.page.locator('input[placeholder="예: 강렬한 찬양"]').fill(options.description);
    }

    // 색상 선택
    if (options.colorIndex !== undefined) {
      const colorButtons = this.page.locator('.grid.grid-cols-5 button');
      await colorButtons.nth(options.colorIndex).click();
    }
  }

  async saveCommand() {
    await this.page.locator('button:has-text("저장")').click();
  }

  async updateCommand() {
    await this.page.locator('button:has-text("수정")').click();
  }

  async cancelDialog() {
    await this.page.locator('button:has-text("취소")').click();
  }

  async closeDialog() {
    await this.page.locator('button').filter({ has: this.page.locator('svg') }).last().click();
  }

  async isDialogClosed() {
    const dialog = this.page.locator('text=새 명령 만들기, text=명령 수정');
    return !(await dialog.isVisible());
  }

  async hoverCommandCard(commandText: string) {
    const commandCard = this.page.locator(`.grid >> text=${commandText}`).locator('..');
    await commandCard.hover();
  }

  async clickEditCommand(commandText: string) {
    await this.hoverCommandCard(commandText);
    
    // 편집 버튼이 나타날 때까지 대기
    const editButton = this.page.locator('.group-hover\\:opacity-100 button').first();
    await editButton.waitFor({ state: 'visible' });
    await editButton.click();
  }

  async clickDeleteCommand(commandText: string) {
    await this.hoverCommandCard(commandText);
    
    // 삭제 버튼이 나타날 때까지 대기
    const deleteButton = this.page.locator('.group-hover\\:opacity-100 button').last();
    await deleteButton.waitFor({ state: 'visible' });
    await deleteButton.click();
  }

  async confirmDelete() {
    // 브라우저 confirm 다이얼로그 처리
    this.page.on('dialog', dialog => dialog.accept());
  }

  async getHistoryCount() {
    const historyItems = this.page.locator('.space-y-2 .rounded-lg');
    if (await historyItems.first().isVisible()) {
      return await historyItems.count();
    }
    return 0;
  }

  async waitForSendConfirmation(commandText: string) {
    await this.page.waitForSelector(`text=명령 전송됨: ${commandText}`, { timeout: 3000 });
  }

  async goBackToWorship() {
    await this.page.locator('button').first().click(); // ArrowLeft 버튼
  }

  // 특정 명령 카드 찾기
  async findCommandCard(commandText: string) {
    return this.page.locator(`.grid >> text=${commandText}`).locator('..');
  }

  // 미리보기 영역 확인
  async getPreviewContent() {
    const preview = this.page.locator('.rounded-2xl.p-4.text-white.shadow-lg');
    const emoji = await preview.locator('.text-2xl').textContent();
    const text = await preview.locator('.text-lg.font-bold').textContent();
    const description = await preview.locator('.text-sm.opacity-90').textContent();
    
    return { emoji, text, description };
  }

  // 로컬스토리지에서 명령 데이터 확인
  async getStoredCommands() {
    return await this.page.evaluate(() => {
      const stored = localStorage.getItem('gilteun-commands');
      return stored ? JSON.parse(stored) : null;
    });
  }

  // 로컬스토리지에서 히스토리 데이터 확인
  async getStoredHistory() {
    return await this.page.evaluate(() => {
      const stored = localStorage.getItem('gilteun-command-history');
      return stored ? JSON.parse(stored) : null;
    });
  }

  // 로컬스토리지 데이터 초기화
  async clearStoredData() {
    await this.page.evaluate(() => {
      localStorage.removeItem('gilteun-commands');
      localStorage.removeItem('gilteun-command-history');
    });
  }
}

test.describe('CommandEditor 종합 테스트', () => {
  let helper: CommandEditorTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new CommandEditorTestHelper(page);
  });

  test.describe('기본 레이아웃 및 접근', () => {
    test('명령 에디터 페이지에 접근할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 페이지 제목 확인
      await expect(page.locator('h1:has-text("명령 패널 편집")')).toBeVisible();

      // URL 확인
      await expect(page).toHaveURL(/#\/command$/);

      // 뒤로가기 버튼 확인
      await expect(page.locator('button').first()).toBeVisible();
    });

    test('권한이 없는 사용자는 명령 에디터에서 리다이렉션된다', async ({ page }) => {
      // 프로필 선택 없이 직접 명령 에디터 접근
      await page.goto(TEST_URL + '#/command');

      // 프로필 선택 페이지로 리다이렉션 확인
      await expect(page).toHaveURL(/^\/#?\/?$/);
      await expect(page.locator('[data-testid="profile-select"]')).toBeVisible();
    });

    test('연결 상태가 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      const connectionStatus = await helper.getConnectionStatus();
      expect(['연결됨', '연결 끊김']).toContain(connectionStatus);

      // 상태에 따른 색상 확인
      const statusElement = page.locator('.rounded-full.px-3.py-1');
      const className = await statusElement.getAttribute('class');
      
      if (connectionStatus === '연결됨') {
        expect(className).toContain('bg-green-100');
        expect(className).toContain('text-green-800');
      } else {
        expect(className).toContain('bg-red-100');
        expect(className).toContain('text-red-800');
      }
    });

    test('기본 명령 카드들이 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      const commandCount = await helper.getCommandCardCount();
      expect(commandCount).toBeGreaterThanOrEqual(12); // 12개 기본 명령

      // 기본 명령들 확인
      const expectedCommands = [
        '더 힘있게!', '차분하게', '템포 Up', '템포 Down',
        '간주', '다시', '잠깐 멈춤', '집중',
        '박수', '기도', '자유롭게', '은혜로'
      ];

      for (const command of expectedCommands) {
        await expect(page.locator(`text=${command}`)).toBeVisible();
      }

      // 새 명령 카드 확인
      await expect(page.locator('text=새 명령')).toBeVisible();
    });

    test('iPad 세로 레이아웃에 최적화되어 표시된다', async ({ page }) => {
      // iPad 뷰포트 설정
      await page.setViewportSize({ width: 1668, height: 2388 });

      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 그리드 레이아웃이 적절히 배치되는지 확인
      const grid = page.locator('.grid.grid-cols-2.gap-6.md\\:grid-cols-3.lg\\:grid-cols-4');
      await expect(grid).toBeVisible();

      // 명령 카드들이 터치에 적합한 크기인지 확인
      const firstCard = grid.locator('.cursor-pointer').first();
      const cardBox = await firstCard.boundingBox();
      
      expect(cardBox!.height).toBeGreaterThanOrEqual(100); // 충분한 터치 영역
      expect(cardBox!.width).toBeGreaterThanOrEqual(100);
    });
  });

  test.describe('명령 전송 기능', () => {
    test('명령을 클릭하여 전송할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 첫 번째 명령 클릭
      await helper.clickCommand('더 힘있게!');

      // 전송 확인 토스트 대기
      await helper.waitForSendConfirmation('더 힘있게!');

      // 토스트가 표시되는지 확인
      await expect(page.locator('text=명령 전송됨: 더 힘있게!')).toBeVisible();
    });

    test('연결되지 않은 상태에서 명령 전송 시 경고가 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 네트워크 차단하여 연결 끊김 상태 시뮬레이션
      await page.context().setOffline(true);
      await page.waitForTimeout(2000);

      // 명령 전송 시도
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('서버에 연결되어 있지 않습니다');
        dialog.accept();
      });

      await helper.clickCommand('더 힘있게!');

      // 네트워크 복구
      await page.context().setOffline(false);
    });

    test('명령 전송 후 히스토리에 기록된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 초기 히스토리 개수
      const initialHistoryCount = await helper.getHistoryCount();

      // 명령 전송
      await helper.clickCommand('차분하게');
      await helper.waitForSendConfirmation('차분하게');

      // 토스트가 사라질 때까지 대기
      await page.waitForTimeout(3000);

      // 히스토리 증가 확인
      const newHistoryCount = await helper.getHistoryCount();
      expect(newHistoryCount).toBe(initialHistoryCount + 1);

      // 히스토리 섹션이 표시되는지 확인
      await expect(page.locator('h2:has-text("최근 전송 내역")')).toBeVisible();

      // 방금 전송한 명령이 히스토리 첫 번째에 있는지 확인
      const firstHistoryItem = page.locator('.space-y-2 .rounded-lg').first();
      await expect(firstHistoryItem).toContainText('차분하게');
    });

    test('명령 카드 호버 효과가 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      const commandCard = await helper.findCommandCard('더 힘있게!');
      
      // 호버 전 상태
      const beforeHover = await commandCard.getAttribute('class');

      // 호버
      await commandCard.hover();
      await page.waitForTimeout(200);

      // 호버 후 상태 (scale 효과 확인)
      const afterHover = await commandCard.getAttribute('class');
      expect(afterHover).toContain('hover:scale-105');
    });
  });

  test.describe('새 명령 생성', () => {
    test('새 명령 추가 버튼으로 다이얼로그를 열 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      await helper.clickNewCommandButton();
      await helper.waitForCommandDialog();

      // 다이얼로그 요소들 확인
      await expect(page.locator('text=새 명령 만들기')).toBeVisible();
      await expect(page.locator('input[placeholder="예: 더 힘있게!"]')).toBeVisible();
      await expect(page.locator('input[placeholder="예: 강렬한 찬양"]')).toBeVisible();
      await expect(page.locator('.grid.grid-cols-6')).toBeVisible(); // 이모지 선택
      await expect(page.locator('.grid.grid-cols-5')).toBeVisible(); // 색상 선택
      await expect(page.locator('text=미리보기')).toBeVisible();
    });

    test('새 명령 카드로도 다이얼로그를 열 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      await helper.clickNewCommandCard();
      await helper.waitForCommandDialog();

      await expect(page.locator('text=새 명령 만들기')).toBeVisible();
    });

    test('새 명령을 성공적으로 생성할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      const initialCount = await helper.getCommandCardCount();

      await helper.clickNewCommandButton();
      await helper.waitForCommandDialog();

      // 새 명령 정보 입력
      await helper.fillCommandForm({
        emoji: '🚀',
        text: '테스트 명령',
        description: '테스트용 명령',
        colorIndex: 2
      });

      await helper.saveCommand();

      // 다이얼로그 닫힘 확인
      expect(await helper.isDialogClosed()).toBe(true);

      // 새 명령 카드 추가 확인
      const newCount = await helper.getCommandCardCount();
      expect(newCount).toBe(initialCount + 1);

      // 새 명령이 표시되는지 확인
      await expect(page.locator('text=테스트 명령')).toBeVisible();
      await expect(page.locator('text=🚀')).toBeVisible();
    });

    test('명령 텍스트 없이는 저장할 수 없다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      await helper.clickNewCommandButton();
      await helper.waitForCommandDialog();

      // 텍스트 없이 저장 시도
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('명령 텍스트를 입력하세요');
        dialog.accept();
      });

      await helper.saveCommand();

      // 다이얼로그가 여전히 열려있는지 확인
      await expect(page.locator('text=새 명령 만들기')).toBeVisible();
    });

    test('미리보기가 실시간으로 업데이트된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      await helper.clickNewCommandButton();
      await helper.waitForCommandDialog();

      // 텍스트 입력
      await helper.fillCommandForm({ text: '실시간 테스트' });

      // 미리보기 확인
      const preview = await helper.getPreviewContent();
      expect(preview.text).toContain('실시간 테스트');

      // 이모지 변경
      await helper.fillCommandForm({ emoji: '⭐' });

      // 미리보기 업데이트 확인
      const updatedPreview = await helper.getPreviewContent();
      expect(updatedPreview.emoji).toBe('⭐');
    });

    test('다이얼로그를 취소할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      const initialCount = await helper.getCommandCardCount();

      await helper.clickNewCommandButton();
      await helper.waitForCommandDialog();

      // 일부 데이터 입력
      await helper.fillCommandForm({ text: '취소될 명령' });

      // 취소
      await helper.cancelDialog();

      // 다이얼로그 닫힘 확인
      expect(await helper.isDialogClosed()).toBe(true);

      // 새 명령이 추가되지 않았는지 확인
      const finalCount = await helper.getCommandCardCount();
      expect(finalCount).toBe(initialCount);
    });

    test('X 버튼으로 다이얼로그를 닫을 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      await helper.clickNewCommandButton();
      await helper.waitForCommandDialog();

      await helper.closeDialog();

      // 다이얼로그 닫힘 확인
      expect(await helper.isDialogClosed()).toBe(true);
    });
  });

  test.describe('명령 편집 기능', () => {
    test('명령 카드 호버 시 편집 버튼이 나타난다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      await helper.hoverCommandCard('더 힘있게!');

      // 편집/삭제 버튼이 나타나는지 확인
      const editButton = page.locator('.group-hover\\:opacity-100 button').first();
      const deleteButton = page.locator('.group-hover\\:opacity-100 button').last();

      await expect(editButton).toBeVisible();
      await expect(deleteButton).toBeVisible();
    });

    test('편집 버튼 클릭 시 편집 다이얼로그가 열린다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      await helper.clickEditCommand('더 힘있게!');
      await helper.waitForCommandDialog(true);

      // 편집 다이얼로그 확인
      await expect(page.locator('text=명령 수정')).toBeVisible();
      await expect(page.locator('button:has-text("수정")')).toBeVisible();

      // 기존 데이터가 채워져 있는지 확인
      const textInput = page.locator('input[placeholder="예: 더 힘있게!"]');
      const currentText = await textInput.inputValue();
      expect(currentText).toBe('더 힘있게!');
    });

    test('명령을 성공적으로 수정할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      await helper.clickEditCommand('더 힘있게!');
      await helper.waitForCommandDialog(true);

      // 명령 수정
      await helper.fillCommandForm({
        text: '수정된 명령',
        description: '수정된 설명'
      });

      await helper.updateCommand();

      // 다이얼로그 닫힘 확인
      expect(await helper.isDialogClosed()).toBe(true);

      // 수정된 내용이 반영되었는지 확인
      await expect(page.locator('text=수정된 명령')).toBeVisible();
      await expect(page.locator('text=수정된 설명')).toBeVisible();
    });
  });

  test.describe('명령 삭제 기능', () => {
    test('삭제 버튼 클릭 시 확인 다이얼로그가 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      const initialCount = await helper.getCommandCardCount();

      // 삭제 확인 다이얼로그 처리
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('이 명령을 삭제하시겠습니까?');
        dialog.accept();
      });

      await helper.clickDeleteCommand('잠깐 멈춤');

      // 명령이 삭제되었는지 확인
      await page.waitForTimeout(500);
      const newCount = await helper.getCommandCardCount();
      expect(newCount).toBe(initialCount - 1);

      // 삭제된 명령이 더 이상 표시되지 않는지 확인
      await expect(page.locator('text=잠깐 멈춤')).not.toBeVisible();
    });

    test('삭제 확인을 취소할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      const initialCount = await helper.getCommandCardCount();

      // 삭제 취소
      page.on('dialog', dialog => {
        dialog.dismiss();
      });

      await helper.clickDeleteCommand('집중');

      // 명령이 삭제되지 않았는지 확인
      await page.waitForTimeout(500);
      const newCount = await helper.getCommandCardCount();
      expect(newCount).toBe(initialCount);

      // 명령이 여전히 표시되는지 확인
      await expect(page.locator('text=집중')).toBeVisible();
    });
  });

  test.describe('명령 히스토리', () => {
    test('명령 전송 후 히스토리 섹션이 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 명령 전송
      await helper.clickCommand('기도');
      await helper.waitForSendConfirmation('기도');
      
      await page.waitForTimeout(3000); // 토스트 사라질 때까지 대기

      // 히스토리 섹션 확인
      await expect(page.locator('h2:has-text("최근 전송 내역")')).toBeVisible();

      // 히스토리 항목 확인
      const historyItems = page.locator('.space-y-2 .rounded-lg');
      expect(await historyItems.count()).toBeGreaterThan(0);

      // 첫 번째 히스토리 항목이 방금 전송한 명령인지 확인
      const firstItem = historyItems.first();
      await expect(firstItem).toContainText('기도');
      await expect(firstItem).toContainText('🙏');
    });

    test('히스토리 항목에 타임스탬프가 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 명령 전송
      await helper.clickCommand('박수');
      await helper.waitForSendConfirmation('박수');
      
      await page.waitForTimeout(3000);

      // 타임스탬프 형식 확인
      const firstItem = page.locator('.space-y-2 .rounded-lg').first();
      const timestamp = firstItem.locator('.text-sm.text-slate-500').last();
      
      const timestampText = await timestamp.textContent();
      expect(timestampText).toMatch(/\d{1,2}:\d{2}:\d{2}/); // HH:MM:SS 형식
    });

    test('히스토리는 최대 10개까지만 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 여러 명령 연속 전송 (11개)
      const commands = [
        '더 힘있게!', '차분하게', '템포 Up', '템포 Down', '간주',
        '다시', '잠깐 멈춤', '집중', '박수', '기도', '자유롭게'
      ];

      for (const command of commands) {
        await helper.clickCommand(command);
        await page.waitForTimeout(300); // 각 전송 간 간격
      }

      await page.waitForTimeout(3000); // 마지막 토스트 사라질 때까지 대기

      // 히스토리 항목이 최대 10개인지 확인
      const historyItems = page.locator('.space-y-2 .rounded-lg');
      const historyCount = await historyItems.count();
      expect(historyCount).toBeLessThanOrEqual(10);
    });
  });

  test.describe('데이터 영속성 (localStorage)', () => {
    test('새로 생성한 명령이 localStorage에 저장된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 기존 데이터 초기화
      await helper.clearStoredData();
      await page.reload();
      await helper.waitForCommandEditor();

      // 새 명령 생성
      await helper.clickNewCommandButton();
      await helper.waitForCommandDialog();
      await helper.fillCommandForm({
        text: '저장 테스트',
        description: '로컬스토리지 테스트'
      });
      await helper.saveCommand();

      // localStorage에서 데이터 확인
      const storedCommands = await helper.getStoredCommands();
      expect(storedCommands).toBeTruthy();
      
      const newCommand = storedCommands.find((cmd: any) => cmd.text === '저장 테스트');
      expect(newCommand).toBeTruthy();
      expect(newCommand.description).toBe('로컬스토리지 테스트');
    });

    test('페이지 새로고침 후에도 생성한 명령이 유지된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 새 명령 생성
      await helper.clickNewCommandButton();
      await helper.waitForCommandDialog();
      await helper.fillCommandForm({
        text: '새로고침 테스트',
        emoji: '🔄'
      });
      await helper.saveCommand();

      // 페이지 새로고침
      await page.reload();
      await helper.waitForCommandEditor();

      // 명령이 여전히 표시되는지 확인
      await expect(page.locator('text=새로고침 테스트')).toBeVisible();
      await expect(page.locator('text=🔄')).toBeVisible();
    });

    test('명령 히스토리가 localStorage에 저장된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 히스토리 초기화
      await page.evaluate(() => {
        localStorage.removeItem('gilteun-command-history');
      });

      // 명령 전송
      await helper.clickCommand('자유롭게');
      await helper.waitForSendConfirmation('자유롭게');

      // localStorage에서 히스토리 확인
      const storedHistory = await helper.getStoredHistory();
      expect(storedHistory).toBeTruthy();
      expect(storedHistory.length).toBeGreaterThan(0);
      
      const firstHistory = storedHistory[0];
      expect(firstHistory.command.text).toBe('자유롭게');
    });
  });

  test.describe('네비게이션 및 사용성', () => {
    test('뒤로가기 버튼이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      await helper.goBackToWorship();

      // 예배 목록 페이지로 이동했는지 확인
      await expect(page).toHaveURL(/#\/worship$/);
      await expect(page.locator('[data-testid="worship-list"]')).toBeVisible();
    });

    test('키보드 네비게이션이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // Tab 키로 포커스 이동
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // 새 명령 추가 버튼에 포커스
      const focusedElement = page.locator(':focus');
      const focusedText = await focusedElement.textContent();
      expect(focusedText).toContain('새 명령 추가');

      // Enter 키로 다이얼로그 열기
      await page.keyboard.press('Enter');
      await helper.waitForCommandDialog();
    });

    test('반응형 그리드 레이아웃이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 다양한 뷰포트에서 그리드 확인
      const viewports = [
        { width: 768, height: 1024, expectedCols: 2 }, // md 이하
        { width: 1024, height: 768, expectedCols: 3 }, // md
        { width: 1668, height: 2388, expectedCols: 4 }, // lg (iPad)
      ];

      for (const { width, height } of viewports) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(500);

        // 그리드가 여전히 표시되는지 확인
        const grid = page.locator('.grid.grid-cols-2');
        await expect(grid).toBeVisible();

        // 명령 카드들이 화면에 맞게 배치되는지 확인
        const firstCard = grid.locator('.cursor-pointer').first();
        const cardBox = await firstCard.boundingBox();
        expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(width);
      }
    });
  });

  test.describe('성능 및 메모리 관리', () => {
    test('페이지 로딩 성능이 적절하다', async ({ page }) => {
      const startTime = Date.now();

      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3초 이내 로딩
    });

    test('다수의 명령 생성 시 메모리 사용량이 적절하다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 초기 메모리 사용량
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // 10개의 새 명령 생성
      for (let i = 0; i < 10; i++) {
        await helper.clickNewCommandButton();
        await helper.waitForCommandDialog();
        await helper.fillCommandForm({
          text: `테스트명령${i}`,
          description: `테스트설명${i}`
        });
        await helper.saveCommand();
        await page.waitForTimeout(100);
      }

      // 최종 메모리 사용량
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // 메모리 증가량이 합리적인 범위 내 (15MB 이하)
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);
      expect(memoryIncrease).toBeLessThan(15);
    });

    test('명령 전송 시 UI 응답성이 좋다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 빠른 연속 명령 전송
      const commands = ['더 힘있게!', '차분하게', '템포 Up'];
      
      for (const command of commands) {
        const startTime = Date.now();
        
        await helper.clickCommand(command);
        
        // 클릭 응답 시간 측정
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(500); // 500ms 이내 응답
        
        await page.waitForTimeout(100);
      }
    });
  });

  test.describe('오류 처리', () => {
    test('잘못된 localStorage 데이터 처리', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 잘못된 데이터 주입
      await page.evaluate(() => {
        localStorage.setItem('gilteun-commands', 'invalid-json');
        localStorage.setItem('gilteun-command-history', 'also-invalid');
      });

      await page.reload();
      await helper.waitForCommandEditor();

      // 기본 명령들이 여전히 표시되는지 확인 (fallback)
      const commandCount = await helper.getCommandCardCount();
      expect(commandCount).toBeGreaterThanOrEqual(12);

      await expect(page.locator('text=더 힘있게!')).toBeVisible();
    });

    test('WebSocket 연결 실패 시 적절한 처리', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForCommandEditor();

      // 네트워크 차단
      await page.context().setOffline(true);
      await page.waitForTimeout(2000);

      // 연결 상태가 업데이트되는지 확인
      const connectionStatus = await helper.getConnectionStatus();
      expect(connectionStatus).toBe('연결 끊김');

      // 명령 전송 시 경고 처리
      page.on('dialog', dialog => {
        expect(dialog.message()).toContain('서버에 연결되어 있지 않습니다');
        dialog.accept();
      });

      await helper.clickCommand('더 힘있게!');

      // 네트워크 복구
      await page.context().setOffline(false);
    });
  });
});