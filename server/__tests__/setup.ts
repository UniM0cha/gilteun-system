// 실제 라우터 통합 테스트가 개발 DB를 건드리지 않도록 모듈 로드 전에 격리 DB를 지정한다.
process.env.DB_PATH = ":memory:";
delete process.env.AUTH_PIN;
