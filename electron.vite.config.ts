import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  // Main Process
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts'),
        },
      },
    },
    plugins: [externalizeDepsPlugin()],
  },

  // Preload Script
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts'),
        },
      },
    },
    plugins: [externalizeDepsPlugin()],
  },

  // Renderer (React)
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/icon.svg'],
        manifest: {
          name: 'Gilteun System',
          short_name: 'Gilteun',
          description: '교회 찬양팀 실시간 협업 예배 지원 플랫폼',
          theme_color: '#1f2937',
          background_color: '#1f2937',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          // 오프라인 캐싱 설정
          runtimeCaching: [
            {
              // API 요청은 네트워크 우선
              urlPattern: /^http:\/\/localhost:3001\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60, // 1시간
                },
              },
            },
            {
              // 악보 이미지는 캐시 우선
              urlPattern: /^http:\/\/localhost:3001\/uploads\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24시간
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  },
});
