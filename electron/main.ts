import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GilteunServer } from './server/index.js';
import { databaseManager } from './server/database/connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;
let server: GilteunServer;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '길튼 시스템 - 관리자',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  // 개발 모드에서 DevTools 열기
  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools();
  }

  // 서버 정보를 렌더러로 전송
  win.webContents.on('did-finish-load', () => {
    const serverInfo = {
      host: server?.getHost() || 'localhost',
      port: server?.getPort() || 3001,
      status: 'running',
      timestamp: new Date().toISOString(),
    };
    win?.webContents.send('server-info', serverInfo);
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

// 서버 시작 및 창 생성
async function initialize() {
  try {
    // 데이터베이스 초기화
    console.log('🔄 데이터베이스 초기화 중...');
    await databaseManager.initialize();
    console.log('✅ 데이터베이스 초기화 완료');

    // Express 서버 시작
    console.log('🔄 서버 시작 중...');
    server = new GilteunServer(3001);
    await server.start();
    console.log('✅ 길튼 시스템 서버가 시작되었습니다');

    // Electron 창 생성
    createWindow();
  } catch (error) {
    console.error('❌ 초기화 실패:', error);
    app.quit();
  }
}

// 서버 종료
async function shutdown() {
  try {
    if (server) {
      console.log('🔄 서버 종료 중...');
      await server.stop();
      console.log('✅ 길튼 시스템 서버가 종료되었습니다');
    }

    // 데이터베이스 연결 종료
    console.log('🔄 데이터베이스 연결 종료 중...');
    databaseManager.close();
    console.log('✅ 데이터베이스 연결 종료 완료');
  } catch (error) {
    console.error('❌ 종료 실패:', error);
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await shutdown();
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async (event) => {
  event.preventDefault();
  await shutdown();
  app.exit(0);
});

app.whenReady().then(initialize);
