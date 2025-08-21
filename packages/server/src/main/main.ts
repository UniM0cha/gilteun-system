import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'path';
import { startApiServer } from '../api/server';

const isDev = process.env.NODE_ENV === 'development';

class ElectronApp {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // 앱이 준비되면 창 생성
    app.whenReady().then(async () => {
      console.log('Electron 앱이 준비되었습니다.');
      console.log('NODE_ENV:', process.env.NODE_ENV);
      
      try {
        this.createWindow();
        this.setupMenu();
        await this.startServer();
      } catch (error) {
        console.error('앱 초기화 중 오류:', error);
      }

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    }).catch(error => {
      console.error('앱 준비 중 오류:', error);
    });

    // 모든 창이 닫히면 앱 종료 (macOS 제외)
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // 예외 처리
    process.on('uncaughtException', (error) => {
      console.error('처리되지 않은 예외:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('처리되지 않은 Promise 거부:', reason, 'at', promise);
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
      titleBarStyle: 'hiddenInset',
      show: false,
    });

    // 관리자 UI 로드 (개발 시에는 React 개발 서버, 프로덕션에서는 빌드된 파일)
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:5174/admin'); // 클라이언트 개발 서버의 Admin 페이지
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
    }

    // 창이 준비되면 표시
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // 외부 링크는 기본 브라우저에서 열기
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // 개발 중에는 DevTools 자동 열기
    if (isDev) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: '길튼 시스템',
        submenu: [
          { label: '길튼 시스템 정보', role: 'about' },
          { type: 'separator' },
          { label: '서비스 숨기기', role: 'hide' },
          { label: '다른 앱 숨기기', role: 'hideOthers' },
          { label: '모두 보이기', role: 'unhide' },
          { type: 'separator' },
          { label: '종료', role: 'quit' },
        ],
      },
      {
        label: '편집',
        submenu: [
          { label: '취소', role: 'undo' },
          { label: '다시 실행', role: 'redo' },
          { type: 'separator' },
          { label: '잘라내기', role: 'cut' },
          { label: '복사', role: 'copy' },
          { label: '붙여넣기', role: 'paste' },
        ],
      },
      {
        label: '보기',
        submenu: [
          { label: '새로고침', role: 'reload' },
          { label: '강제 새로고침', role: 'forceReload' },
          { label: '개발자 도구', role: 'toggleDevTools' },
          { type: 'separator' },
          { label: '실제 크기', role: 'resetZoom' },
          { label: '확대', role: 'zoomIn' },
          { label: '축소', role: 'zoomOut' },
          { type: 'separator' },
          { label: '전체 화면', role: 'togglefullscreen' },
        ],
      },
      {
        label: '창',
        submenu: [
          { label: '최소화', role: 'minimize' },
          { label: '닫기', role: 'close' },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private async startServer(): Promise<void> {
    try {
      await startApiServer();
      console.log('길튼 시스템 서버가 시작되었습니다.');
    } catch (error) {
      console.error('서버 시작 중 오류 발생:', error);
      // API 서버 실패 시에도 Electron 창은 유지
      if (this.mainWindow) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.mainWindow.webContents.executeJavaScript(`
          console.error('API 서버 연결 실패:', ${JSON.stringify(errorMessage)});
          alert('API 서버 연결에 실패했습니다. 네트워크를 확인하고 다시 시도해주세요.');
        `);
      }
    }
  }
}

// 앱 인스턴스 생성
new ElectronApp();