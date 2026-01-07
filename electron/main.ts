// Electron 메인 프로세스

import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { createServer } from 'node:http';
import { createApp } from './server/app.js';
import { initializeDatabase, closeDatabase } from './server/database/connection.js';
import { initWebSocketServer } from './server/websocket/server.js';

// 개발/프로덕션 환경 구분
const isDev = process.env.NODE_ENV === 'development';

// Express 서버 포트
const PORT = 3001;

let mainWindow: BrowserWindow | null = null;

// 메인 윈도우 생성
async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset', // macOS 스타일
    show: false, // 준비될 때까지 숨김
  });

  // 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 개발 환경
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 프로덕션 환경
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 서버 시작
async function startServer(): Promise<void> {
  try {
    // 데이터베이스 초기화
    await initializeDatabase();

    // Express 앱 생성
    const expressApp = createApp();

    // HTTP 서버 생성 (Express + WebSocket 공유)
    const httpServer = createServer(expressApp);

    // WebSocket 서버 초기화 (HTTP 서버에 연결)
    initWebSocketServer(httpServer);

    // HTTP 서버 시작
    httpServer.listen(PORT, () => {
      console.log(`[Server] HTTP 서버 시작: http://localhost:${PORT}`);
      console.log(`[Server] WebSocket 경로: ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('[Server] 서버 시작 실패:', error);
    throw error;
  }
}

// 앱 준비 완료
app.whenReady().then(async () => {
  try {
    await startServer();
    await createWindow();

    // macOS: 모든 창이 닫혀도 앱은 유지
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('[App] 앱 시작 실패:', error);
    app.quit();
  }
});

// 모든 창 닫힘
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 앱 종료 전 정리
app.on('before-quit', async () => {
  await closeDatabase();
});
