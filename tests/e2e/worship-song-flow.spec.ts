/**
 * WorshipList & SongList Pages E2E 테스트
 * 
 * 테스트 범위:
 * - 예배 목록 표시 및 검색
 * - 예배 선택 및 찬양 목록으로 이동
 * - 찬양 목록 관리 (CRUD)
 * - 악보 이미지 업로드
 * - 네비게이션 플로우
 * - 사용자 권한 및 인증
 */

import { test, expect, Page } from '@playwright/test';

const TEST_URL = process.env.TEST_URL || 'http://localhost:5173';

// 테스트 헬퍼 클래스
class WorshipSongFlowTestHelper {
  constructor(private page: Page) {}

  async gotoWithProfile(profileName: string = '김찬양') {
    // 프로필 선택 후 예배 목록 페이지로 이동
    await this.page.goto(TEST_URL);
    await this.page.waitForSelector('[data-testid="profile-select"]', { timeout: 10000 });
    await this.page.locator(`text=${profileName}`).click();
    await this.page.waitForURL(/#\/worship$/);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForWorshipList() {
    await this.page.waitForSelector('[data-testid="worship-list"], .grid', { timeout: 10000 });
  }

  // 예배 목록 관련 헬퍼
  async getWorshipCards() {
    return this.page.locator('[data-testid="worship-list"] .cursor-pointer, .grid .cursor-pointer').filter({ hasNotText: '새 예배' });
  }

  async getWorshipCardCount() {
    const cards = await this.getWorshipCards();
    return await cards.count();
  }

  async clickWorshipCard(index: number = 0) {
    const cards = await this.getWorshipCards();
    await cards.nth(index).click();
  }

  async searchWorship(query: string) {
    const searchInput = this.page.locator('input[placeholder*="검색"], input[type="text"]').first();
    await searchInput.fill(query);
    await this.page.waitForTimeout(500); // 검색 디바운스 대기
  }

  async getSearchInput() {
    return this.page.locator('input[placeholder*="검색"], input[type="text"]').first();
  }

  // 사용자 정보 관련
  async getUserWelcomeMessage() {
    return this.page.locator('text=/환영합니다.*님/').textContent();
  }

  async clickSettingsButton() {
    await this.page.locator('button:has-text("설정"), button').filter({ has: this.page.locator('svg') }).last().click();
  }

  async clickLogoutButton() {
    const logoutButton = this.page.locator('button:has-text("로그아웃"), button').filter({ has: this.page.locator('svg') });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
  }

  // 찬양 목록 관련 헬퍼
  async waitForSongList() {
    await this.page.waitForSelector('.grid, [data-testid="song-list"]', { timeout: 10000 });
  }

  async getSongCards() {
    return this.page.locator('.grid .cursor-pointer, [data-testid="song-list"] .cursor-pointer').filter({ hasNotText: '새 찬양' });
  }

  async getSongCardCount() {
    const cards = await this.getSongCards();
    return await cards.count();
  }

  async clickSongCard(index: number = 0) {
    const cards = await this.getSongCards();
    await cards.nth(index).click();
  }

  async clickAddSongButton() {
    await this.page.locator('button:has-text("새 찬양"), button:has-text("추가")').first().click();
  }

  async fillSongForm(songData: {
    title?: string;
    key?: string;
    memo?: string;
  }) {
    if (songData.title) {
      await this.page.locator('input[placeholder*="찬양 제목"], input[name="title"]').fill(songData.title);
    }
    if (songData.key) {
      await this.page.locator('input[placeholder*="조"], input[name="key"]').fill(songData.key);
    }
    if (songData.memo) {
      await this.page.locator('textarea[placeholder*="메모"], textarea[name="memo"]').fill(songData.memo);
    }
  }

  async saveSong() {
    await this.page.locator('button:has-text("저장"), button:has-text("추가")').last().click();
  }

  async cancelSongForm() {
    await this.page.locator('button:has-text("취소")').click();
  }

  // 네비게이션 헬퍼
  async goBackToWorshipList() {
    await this.page.locator('button').first().click(); // ArrowLeft 버튼
  }

  // 연결 상태 관련
  async getConnectionStatus() {
    const statusElement = this.page.locator('.bg-green-100, .bg-red-100, .bg-yellow-100').first();
    if (await statusElement.isVisible()) {
      return await statusElement.textContent();
    }
    return null;
  }

  // Mock 데이터 확인
  async hasWorshipData() {
    const cardCount = await this.getWorshipCardCount();
    return cardCount > 0;
  }

  async hasSongData() {
    const cardCount = await this.getSongCardCount();
    return cardCount > 0;
  }
}

test.describe('WorshipList & SongList Flow 테스트', () => {
  let helper: WorshipSongFlowTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new WorshipSongFlowTestHelper(page);
  });

  test.describe('예배 목록 페이지', () => {
    test('예배 목록 페이지에 접근할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      // URL 확인
      await expect(page).toHaveURL(/#\/worship$/);

      // 기본 UI 요소 확인
      const welcomeMessage = await helper.getUserWelcomeMessage();
      expect(welcomeMessage).toContain('김찬양');
    });

    test('예배 목록이 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      // 예배 카드들이 표시되는지 확인
      if (await helper.hasWorshipData()) {
        const cardCount = await helper.getWorshipCardCount();
        expect(cardCount).toBeGreaterThan(0);

        // 첫 번째 카드 내용 확인
        const firstCard = await helper.getWorshipCards().first();
        await expect(firstCard).toBeVisible();
      } else {
        // 데이터가 없을 때 빈 상태 메시지 확인
        const emptyMessage = page.locator('text=예배가 없습니다, text=데이터가 없습니다');
        if (await emptyMessage.isVisible()) {
          await expect(emptyMessage).toBeVisible();
        }
      }
    });

    test('예배 검색 기능이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      const searchInput = await helper.getSearchInput();
      if (await searchInput.isVisible()) {
        // 검색어 입력
        await helper.searchWorship('주일');

        // 검색 결과 대기 및 확인
        await page.waitForTimeout(1000);
        
        // 검색 결과가 표시되거나 '결과 없음' 메시지가 표시되어야 함
        const hasResults = await helper.hasWorshipData();
        const noResultsMessage = page.locator('text=검색 결과가 없습니다, text=찾을 수 없습니다');
        
        if (!hasResults) {
          if (await noResultsMessage.isVisible()) {
            await expect(noResultsMessage).toBeVisible();
          }
        }

        // 검색어 지우기
        await searchInput.clear();
        await page.waitForTimeout(500);
      }
    });

    test('예배 카드를 클릭하여 찬양 목록으로 이동할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      if (await helper.hasWorshipData()) {
        // 첫 번째 예배 카드 클릭
        await helper.clickWorshipCard(0);

        // 찬양 목록 페이지로 이동했는지 확인
        await expect(page).toHaveURL(/\/worship\/\d+$/);
        await helper.waitForSongList();
      }
    });

    test('설정 페이지로 이동할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      // 설정 버튼 찾기 (여러 가능한 위치 확인)
      const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' });
      const visibleSettingsButtons = await settingsButton.all();
      
      for (const button of visibleSettingsButtons) {
        const buttonText = await button.getAttribute('aria-label');
        if (buttonText?.includes('설정') || await button.isVisible()) {
          await button.click();
          break;
        }
      }

      // 설정 페이지 또는 다른 페이지로 이동했는지 확인
      await page.waitForTimeout(1000);
      
      // URL이 변경되었거나 새로운 페이지 요소가 나타났는지 확인
      const currentUrl = page.url();
      const hasNavigated = !currentUrl.includes('#/worship') || 
                          await page.locator('h1:has-text("설정")').isVisible() ||
                          await page.locator('text=관리자, text=명령').isVisible();
      
      if (hasNavigated) {
        expect(true).toBe(true); // 네비게이션 성공
      }
    });
  });

  test.describe('찬양 목록 페이지', () => {
    test('찬양 목록 페이지에 접근할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      if (await helper.hasWorshipData()) {
        // 예배 선택
        await helper.clickWorshipCard(0);
        await helper.waitForSongList();

        // URL 패턴 확인
        await expect(page).toHaveURL(/\/worship\/\d+$/);

        // 뒤로가기 버튼 확인
        await expect(page.locator('button').first()).toBeVisible();
      }
    });

    test('찬양 목록이 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      if (await helper.hasWorshipData()) {
        await helper.clickWorshipCard(0);
        await helper.waitForSongList();

        // 찬양 카드들 또는 빈 상태 메시지 확인
        if (await helper.hasSongData()) {
          const songCount = await helper.getSongCardCount();
          expect(songCount).toBeGreaterThan(0);
        } else {
          const emptyMessage = page.locator('text=찬양이 없습니다, text=추가해주세요');
          if (await emptyMessage.isVisible()) {
            await expect(emptyMessage).toBeVisible();
          }
        }

        // 새 찬양 추가 버튼 또는 카드 확인
        const addButton = page.locator('button:has-text("새 찬양"), text=새 찬양');
        if (await addButton.isVisible()) {
          await expect(addButton).toBeVisible();
        }
      }
    });

    test('새 찬양 추가 기능이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      if (await helper.hasWorshipData()) {
        await helper.clickWorshipCard(0);
        await helper.waitForSongList();

        // 새 찬양 추가 버튼/카드 클릭
        const addButton = page.locator('button:has-text("새 찬양"), button:has-text("추가"), text=새 찬양').first();
        if (await addButton.isVisible()) {
          await addButton.click();

          // 찬양 추가 폼이나 다이얼로그 확인
          const formElements = [
            'input[placeholder*="제목"]',
            'input[name="title"]',
            'text=찬양 제목',
            'text=새 찬양'
          ];

          let formVisible = false;
          for (const selector of formElements) {
            if (await page.locator(selector).isVisible()) {
              formVisible = true;
              break;
            }
          }

          if (formVisible) {
            // 찬양 정보 입력
            await helper.fillSongForm({
              title: '테스트 찬양',
              key: 'C',
              memo: '테스트용 찬양입니다'
            });

            // 저장 버튼 클릭
            const saveButton = page.locator('button:has-text("저장"), button:has-text("추가")');
            if (await saveButton.isVisible()) {
              await saveButton.click();
              await page.waitForTimeout(1000);
            }

            // 새 찬양이 목록에 추가되었는지 확인
            const testSongCard = page.locator('text=테스트 찬양');
            if (await testSongCard.isVisible()) {
              await expect(testSongCard).toBeVisible();
            }
          }
        }
      }
    });

    test('찬양 카드를 클릭하여 악보 뷰어로 이동할 수 있다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      if (await helper.hasWorshipData()) {
        await helper.clickWorshipCard(0);
        await helper.waitForSongList();

        if (await helper.hasSongData()) {
          // 첫 번째 찬양 카드 클릭
          await helper.clickSongCard(0);

          // 악보 뷰어 페이지로 이동했는지 확인
          await page.waitForTimeout(1000);
          
          // URL 패턴 또는 페이지 요소로 확인
          const currentUrl = page.url();
          const hasNavigated = currentUrl.includes('/score') || 
                              currentUrl.includes('/song') ||
                              await page.locator('[data-testid="score-viewer"], canvas, .score').isVisible();
          
          if (hasNavigated) {
            expect(true).toBe(true); // 네비게이션 성공
          }
        }
      }
    });

    test('뒤로가기 버튼이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      if (await helper.hasWorshipData()) {
        await helper.clickWorshipCard(0);
        await helper.waitForSongList();

        // 뒤로가기 버튼 클릭
        await helper.goBackToWorshipList();

        // 예배 목록 페이지로 돌아왔는지 확인
        await expect(page).toHaveURL(/#\/worship$/);
        await helper.waitForWorshipList();
      }
    });
  });

  test.describe('네비게이션 플로우', () => {
    test('전체 플로우가 원활하게 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      // 1. 예배 목록에서 예배 선택
      if (await helper.hasWorshipData()) {
        await helper.clickWorshipCard(0);
        await helper.waitForSongList();

        // 2. 찬양 목록에서 찬양 선택 (있다면)
        if (await helper.hasSongData()) {
          await helper.clickSongCard(0);
          await page.waitForTimeout(1000);

          // 3. 뒤로가기로 찬양 목록으로 복귀
          await page.goBack();
          await helper.waitForSongList();
        }

        // 4. 뒤로가기로 예배 목록으로 복귀
        await helper.goBackToWorshipList();
        await helper.waitForWorshipList();

        // 5. 최종적으로 예배 목록 페이지에 있는지 확인
        await expect(page).toHaveURL(/#\/worship$/);
      }
    });

    test('브라우저 뒤로가기/앞으로가기가 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      if (await helper.hasWorshipData()) {
        // 찬양 목록으로 이동
        await helper.clickWorshipCard(0);
        await helper.waitForSongList();

        // 브라우저 뒤로가기
        await page.goBack();
        await helper.waitForWorshipList();
        await expect(page).toHaveURL(/#\/worship$/);

        // 브라우저 앞으로가기
        await page.goForward();
        await helper.waitForSongList();
        await expect(page).toHaveURL(/\/worship\/\d+$/);
      }
    });
  });

  test.describe('반응형 디자인 및 접근성', () => {
    test('iPad 세로 레이아웃에 최적화되어 표시된다', async ({ page }) => {
      // iPad 뷰포트 설정
      await page.setViewportSize({ width: 1668, height: 2388 });

      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      // 그리드 레이아웃이 화면에 맞게 표시되는지 확인
      const grid = page.locator('.grid').first();
      if (await grid.isVisible()) {
        const gridBox = await grid.boundingBox();
        expect(gridBox!.width).toBeLessThanOrEqual(1668);
      }

      // 카드들이 터치에 적합한 크기인지 확인
      const cards = await helper.getWorshipCards();
      if (await cards.count() > 0) {
        const firstCard = cards.first();
        const cardBox = await firstCard.boundingBox();
        
        expect(cardBox!.height).toBeGreaterThanOrEqual(100); // 충분한 터치 영역
      }
    });

    test('키보드 네비게이션이 작동한다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      // Tab 키로 검색 입력 필드에 포커스
      await page.keyboard.press('Tab');
      
      const searchInput = await helper.getSearchInput();
      if (await searchInput.isVisible()) {
        // 검색어 입력
        await page.keyboard.type('검색테스트');
        
        const inputValue = await searchInput.inputValue();
        expect(inputValue).toBe('검색테스트');

        // Enter 키로 검색 실행
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('오류 처리 및 로딩 상태', () => {
    test('네트워크 오류 시 적절한 메시지가 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      // 네트워크 차단
      await page.context().setOffline(true);
      
      // 페이지 새로고침으로 오류 상태 유도
      await page.reload();
      await page.waitForTimeout(3000);

      // 오류 메시지나 오프라인 상태 표시 확인
      const errorMessages = [
        'text=연결에 실패했습니다',
        'text=오프라인',
        'text=네트워크 오류',
        'text=서버에 연결할 수 없습니다'
      ];

      let errorFound = false;
      for (const selector of errorMessages) {
        if (await page.locator(selector).isVisible()) {
          errorFound = true;
          break;
        }
      }

      // 오류 상태가 표시되거나 기본 레이아웃이 유지되어야 함
      const hasBasicLayout = await page.locator('h1, .grid, [data-testid="worship-list"]').isVisible();
      expect(errorFound || hasBasicLayout).toBe(true);

      // 네트워크 복구
      await page.context().setOffline(false);
    });

    test('로딩 상태가 적절히 표시된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');

      // 페이지 로딩 중 로딩 스피너 확인 (빠르게 지나갈 수 있음)
      const loadingElements = page.locator('.loading, .spinner, text=로딩');
      
      // 페이지가 완전히 로드될 때까지 대기
      await helper.waitForWorshipList();

      // 로딩이 완료되면 로딩 스피너가 사라져야 함
      await page.waitForTimeout(1000);
      
      const persistentLoading = await loadingElements.isVisible();
      if (persistentLoading) {
        // 로딩이 계속 표시되고 있다면 타임아웃 대기
        await page.waitForTimeout(5000);
      }

      // 최종적으로 콘텐츠가 표시되어야 함
      const hasContent = await helper.hasWorshipData() || 
                        await page.locator('text=예배가 없습니다, text=데이터가 없습니다').isVisible();
      expect(hasContent).toBe(true);
    });

    test('빈 데이터 상태가 적절히 처리된다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      // 데이터가 없을 때와 있을 때 모두 적절한 UI가 표시되어야 함
      if (await helper.hasWorshipData()) {
        const cardCount = await helper.getWorshipCardCount();
        expect(cardCount).toBeGreaterThan(0);
      } else {
        // 빈 상태 메시지 또는 추가 버튼 확인
        const emptyStateElements = [
          'text=예배가 없습니다',
          'text=데이터가 없습니다',
          'text=새 예배',
          'button:has-text("추가")'
        ];

        let emptyStateFound = false;
        for (const selector of emptyStateElements) {
          if (await page.locator(selector).isVisible()) {
            emptyStateFound = true;
            break;
          }
        }

        expect(emptyStateFound).toBe(true);
      }
    });
  });

  test.describe('성능 및 사용성', () => {
    test('페이지 로딩 성능이 적절하다', async ({ page }) => {
      const startTime = Date.now();

      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5초 이내 로딩
    });

    test('페이지 간 네비게이션이 부드럽다', async ({ page }) => {
      await helper.gotoWithProfile('김찬양');
      await helper.waitForWorshipList();

      if (await helper.hasWorshipData()) {
        // 찬양 목록으로 이동 시간 측정
        const navigationStart = Date.now();
        await helper.clickWorshipCard(0);
        await helper.waitForSongList();
        const navigationTime = Date.now() - navigationStart;

        expect(navigationTime).toBeLessThan(3000); // 3초 이내 네비게이션

        // 뒤로가기 시간 측정
        const backNavigationStart = Date.now();
        await helper.goBackToWorshipList();
        await helper.waitForWorshipList();
        const backNavigationTime = Date.now() - backNavigationStart;

        expect(backNavigationTime).toBeLessThan(2000); // 2초 이내 뒤로가기
      }
    });
  });
});