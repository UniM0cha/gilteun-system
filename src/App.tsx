import { HashRouter } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AppInitializer, StoreProvider } from './store/StoreProvider';
import { AppRouter } from './components/AppRouter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';

/**
 * 길튼 시스템 메인 App 컴포넌트
 * PWA 구조로 iPad 최적화
 * HashRouter 사용 (Electron file:// 프로토콜 호환)
 */
function App() {
  return (
    <HashRouter>
      <QueryProvider>
        <StoreProvider>
          <ErrorBoundary>
            <AppInitializer>
              <div className="app-container fullscreen-portrait">
                <AppRouter />
                <ToastContainer />
              </div>
            </AppInitializer>
          </ErrorBoundary>
        </StoreProvider>
      </QueryProvider>
    </HashRouter>
  );
}

export default App;
