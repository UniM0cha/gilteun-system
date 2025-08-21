import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
// PWA Service Worker 등록
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[PWA] Service Worker 등록 성공:', registration.scope);
            // 새 Service Worker 업데이트 감지
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // 새 버전 사용 가능
                            console.log('[PWA] 새 버전이 사용 가능합니다. 페이지를 새로고침해주세요.');
                            // 자동으로 새 SW 활성화 (선택사항)
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                }
            });
        }
        catch (error) {
            console.error('[PWA] Service Worker 등록 실패:', error);
        }
    });
    // Service Worker 메시지 수신
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_ACTIVATED') {
            // 새 Service Worker 활성화됨 - 페이지 새로고침
            window.location.reload();
        }
    });
}
createRoot(document.getElementById('root')).render(<StrictMode>
    <App />
  </StrictMode>);
