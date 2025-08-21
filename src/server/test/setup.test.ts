import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

// 테스트용 환경 변수 설정
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0'; // 랜덤 포트 사용
  process.env.DB_PATH = ':memory:'; // 메모리 내 SQLite DB 사용
});

// 각 테스트 전후 정리
beforeEach(() => {
  // 테스트별 초기화 로직
});

afterEach(() => {
  // 테스트별 정리 로직
  vi.clearAllMocks();
});

afterAll(() => {
  // 전체 정리
});
