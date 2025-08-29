import { defineConfig, devices } from '@playwright/test';

/**
 * 길튼 시스템 E2E 테스트 설정
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 테스트 디렉토리
  testDir: './tests/e2e',
  
  // 전체 타임아웃
  timeout: 120 * 1000,
  
  // 기대치 타임아웃
  expect: {
    timeout: 10000
  },
  
  // 병렬 실행 비활성화 (순차 실행)
  fullyParallel: false,
  
  // CI 환경에서만 .only 금지
  forbidOnly: !!process.env.CI,
  
  // CI에서만 재시도
  retries: process.env.CI ? 2 : 0,
  
  // 단일 워커로 실행
  workers: 1,
  
  // 리포터 설정
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }]
  ],
  
  // 공통 설정
  use: {
    // 베이스 URL
    baseURL: process.env.TEST_URL || 'http://localhost:5173',
    
    // 트레이스 (실패 시 재실행할 때만)
    trace: 'on-first-retry',
    
    // 스크린샷 (실패 시에만)
    screenshot: 'only-on-failure',
    
    // 비디오 녹화 (실패 시에만)
    video: 'retain-on-failure',
    
    // 기본 뷰포트 (iPad Pro 11")
    viewport: { width: 1668, height: 2388 },
    
    // User Agent (iPad Safari)
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    
    // 액션 타임아웃
    actionTimeout: 15000,
    
    // 네비게이션 타임아웃
    navigationTimeout: 30000,
  },
  
  // 프로젝트 설정 (브라우저별)
  projects: [
    {
      name: 'chromium-ipad',
      use: {
        ...devices['iPad Pro 11'],
        hasTouch: true,
        isMobile: true,
        contextOptions: {
          // PWA 설정
          permissions: ['notifications', 'geolocation'],
          colorScheme: 'light',
        }
      }
    },
    
    {
      name: 'webkit-ipad',
      use: {
        ...devices['iPad Pro 11 landscape'],
        browserName: 'webkit',
        hasTouch: true,
        isMobile: true,
      }
    },
    
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      }
    }
  ],
  
  // 개발 서버 설정
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  
  // 출력 폴더
  outputDir: 'test-results/',
});