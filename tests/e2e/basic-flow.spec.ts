import { test, expect } from '@playwright/test';

test.describe('길튼 시스템 기본 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('프로필 선택 페이지가 표시된다', async ({ page }) => {
    // 페이지 타이틀 확인
    await expect(page.locator('h1')).toContainText('길튼 시스템');
    
    // 프로필 카드들이 표시되는지 확인
    const profileCards = page.locator('[data-testid="profile-select"] >> .cursor-pointer');
    await expect(profileCards).toHaveCount(5); // 4개 프로필 + 새 프로필 카드
    
    // 기본 프로필들이 있는지 확인
    await expect(page.locator('text=김찬양')).toBeVisible();
    await expect(page.locator('text=이피아노')).toBeVisible();
    await expect(page.locator('text=박기타')).toBeVisible();
    await expect(page.locator('text=최드럼')).toBeVisible();
  });

  test('새 프로필 생성 다이얼로그가 열린다', async ({ page }) => {
    // 새 프로필 카드 클릭
    await page.locator('text=새 프로필').click();
    
    // 다이얼로그가 표시되는지 확인
    await expect(page.locator('text=새 프로필 생성')).toBeVisible();
    await expect(page.locator('input[placeholder="이름을 입력하세요"]')).toBeVisible();
    
    // 역할 선택 드롭다운 확인
    const roleSelect = page.locator('select').first();
    await expect(roleSelect).toBeVisible();
    
    // 아이콘 선택 그리드 확인
    const iconButtons = page.locator('.grid-cols-6 button');
    await expect(iconButtons).toHaveCount(12);
    
    // 취소 버튼 클릭
    await page.locator('button:has-text("취소")').click();
    await expect(page.locator('text=새 프로필 생성')).not.toBeVisible();
  });

  test('프로필 선택 후 예배 목록으로 이동한다', async ({ page }) => {
    // 김찬양 프로필 선택
    await page.locator('text=김찬양').click();
    
    // 예배 목록 페이지로 이동했는지 확인
    await expect(page).toHaveURL(/#\/worship$/);
    await expect(page.locator('[data-testid="worship-list"]')).toBeVisible();
    
    // 사용자 이름이 표시되는지 확인
    await expect(page.locator('text=/환영합니다.*김찬양/')).toBeVisible();
  });

  test('명령 에디터 페이지로 이동할 수 있다', async ({ page }) => {
    // 프로필 선택
    await page.locator('text=김찬양').click();
    await page.waitForURL(/#\/worship$/);
    
    // 명령 에디터로 이동
    await page.goto('http://localhost:5173/#/command');
    
    // 명령 에디터 페이지 확인
    await expect(page.locator('text=명령 패널 편집')).toBeVisible();
    
    // 기본 명령들이 표시되는지 확인
    await expect(page.locator('text=더 힘있게!')).toBeVisible();
    await expect(page.locator('text=차분하게')).toBeVisible();
    await expect(page.locator('text=템포 Up')).toBeVisible();
  });

  test('관리자 페이지의 탭이 작동한다', async ({ page }) => {
    // 프로필 선택
    await page.locator('text=김찬양').click();
    await page.waitForURL(/#\/worship$/);
    
    // 관리자 페이지로 이동
    await page.goto('http://localhost:5173/#/admin');
    
    // 관리자 패널 확인
    await expect(page.locator('text=관리자 패널')).toBeVisible();
    
    // 탭 전환 테스트
    await page.locator('button:has-text("서버상태")').click();
    await expect(page.locator('text=연결 상태')).toBeVisible();
    
    await page.locator('button:has-text("데이터 관리")').click();
    await expect(page.locator('text=데이터 백업 및 복구')).toBeVisible();
    
    await page.locator('button:has-text("멤버")').click();
    await expect(page.locator('th:has-text("이름")')).toBeVisible();
  });

  test('설정 페이지의 다크모드 토글이 작동한다', async ({ page }) => {
    // 프로필 선택
    await page.locator('text=김찬양').click();
    await page.waitForURL(/#\/worship$/);
    
    // 설정 페이지로 이동
    await page.goto('http://localhost:5173/#/settings');
    
    // 설정 페이지 확인
    await expect(page.locator('h1:has-text("설정")')).toBeVisible();
    
    // 다크모드 토글 찾기
    const darkModeSection = page.locator('text=다크 모드').locator('..');
    const toggleButton = darkModeSection.locator('button').first();
    
    // 다크모드 토글
    await toggleButton.click();
    
    // html 요소에 dark 클래스가 추가되었는지 확인
    await expect(page.locator('html')).toHaveClass(/dark/);
    
    // 다시 토글하여 라이트모드로
    await toggleButton.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('프로필 설정 저장이 작동한다', async ({ page }) => {
    // 프로필 선택
    await page.locator('text=김찬양').click();
    await page.waitForURL(/#\/worship$/);
    
    // 설정 페이지로 이동
    await page.goto('http://localhost:5173/#/settings');
    
    // 이름 변경
    const nameInput = page.locator('input[placeholder="닉네임"]');
    await nameInput.clear();
    await nameInput.fill('테스트유저');
    
    // 저장 버튼이 활성화되는지 확인
    const saveButton = page.locator('button:has-text("프로필 저장")');
    await expect(saveButton).not.toHaveClass(/cursor-not-allowed/);
    
    // 저장 클릭
    await saveButton.click();
    
    // 알림 다이얼로그 처리
    page.on('dialog', dialog => dialog.accept());
  });

  test('새 명령 추가 다이얼로그가 작동한다', async ({ page }) => {
    // 프로필 선택
    await page.locator('text=김찬양').click();
    await page.waitForURL(/#\/worship$/);
    
    // 명령 에디터로 이동
    await page.goto('http://localhost:5173/#/command');
    
    // 새 명령 추가 버튼 클릭
    await page.locator('button:has-text("새 명령 추가")').click();
    
    // 다이얼로그 확인
    await expect(page.locator('text=새 명령 만들기')).toBeVisible();
    
    // 명령 텍스트 입력
    await page.locator('input[placeholder="예: 더 힘있게!"]').fill('테스트 명령');
    
    // 이모지 선택
    await page.locator('button:has-text("🚀")').click();
    
    // 색상 선택
    await page.locator('.bg-green-500').first().click();
    
    // 저장
    await page.locator('button:has-text("저장")').last().click();
    
    // 다이얼로그가 닫혔는지 확인
    await expect(page.locator('text=새 명령 만들기')).not.toBeVisible();
  });

  test('네비게이션이 작동한다', async ({ page }) => {
    // 프로필 선택
    await page.locator('text=김찬양').click();
    await page.waitForURL(/#\/worship$/);
    
    // 설정 페이지로 이동
    await page.goto('http://localhost:5173/#/settings');
    
    // 뒤로가기 버튼 클릭
    await page.locator('[aria-label="뒤로가기"], button:has(svg)').first().click();
    
    // 예배 목록 페이지로 돌아왔는지 확인
    await expect(page).toHaveURL(/#\/worship$/);
    await expect(page.locator('[data-testid="worship-list"]')).toBeVisible();
  });
});