// Electron Preload 스크립트
// 메인 프로세스와 렌더러 프로세스 간 안전한 통신을 위한 브릿지

import { contextBridge, ipcRenderer } from 'electron';

// 렌더러에 노출할 API
const electronAPI = {
  // 앱 정보
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),

  // 플랫폼 정보
  platform: process.platform,

  // 파일 대화상자 (추후 구현)
  openFileDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFile'),

  // 디렉토리 대화상자 (추후 구현)
  openDirectoryDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
};

// 안전하게 렌더러에 노출
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript 타입 정의 (렌더러에서 사용)
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
