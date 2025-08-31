import { defineConfig, devices } from '@playwright/test';

/**
 * 길튼 시스템 E2E 테스트 설정
 * - iPad 세로 방향 최적화
 * - 실제 터치 이벤트 지원
 * - 병렬 실행 제한 (안정성 확보)
 * - 상세한 리포팅
 */

export default defineConfig({
  testDir: './tests/e2e',
  
  /* 전역 설정 */
  fullyParallel: false, // 순차 실행으로 안정성 확보
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2, // CI에서는 1개, 로컬에서는 2개 워커
  
  /* 리포터 설정 */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }]
  ],

  /* 전역 테스트 설정 */
  use: {
    /* 기본 URL */
    baseURL: process.env.TEST_URL || 'http://localhost:5173',

    /* 스크린샷 및 비디오 */
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    /* 네트워크 */
    ignoreHTTPSErrors: true,
    
    /* 타임아웃 */
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  /* 프로젝트별 설정 */
  projects: [
    {
      name: 'iPad Pro 11 Portrait',
      use: {
        ...devices['iPad Pro 11'],
        viewport: { width: 1668, height: 2388 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      },
    },
    
    {
      name: 'iPad Pro 11 Landscape', 
      use: {
        ...devices['iPad Pro 11 landscape'],
        viewport: { width: 2388, height: 1668 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2,
      },
    },

    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  /* 로컬 개발 서버 설정 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    env: {
      NODE_ENV: 'test',
    },
  },

  /* 타임아웃 설정 */
  timeout: 60000, // 전체 테스트 타임아웃: 1분
  expect: {
    timeout: 10000, // expect 타임아웃: 10초
  },

  /* 테스트 병렬성 설정 */
  maxFailures: process.env.CI ? 5 : undefined,
});