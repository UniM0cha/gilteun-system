import { startApiServer } from './server';

// Express API 서버만 실행 (Electron 없이)
async function startStandaloneServer() {
  try {
    console.log('길튼 시스템 API 서버를 시작합니다...');
    await startApiServer();
    console.log('API 서버가 성공적으로 시작되었습니다.');
  } catch (error) {
    console.error('API 서버 시작 실패:', error);
    process.exit(1);
  }
}

startStandaloneServer();
