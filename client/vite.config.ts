import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // 앱 셸: JS, CSS, HTML 자동 프리캐시
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 런타임 캐싱
        runtimeCaching: [
          {
            // 악보 이미지 (파일명이 nanoid라 immutable → CacheFirst 안전)
            urlPattern: /\/uploads\/sheets\/.+/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sheet-images',
              expiration: {
                maxEntries: 100, // iPad Safari ~50MB 제한 고려
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30일
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // API 응답 (온라인이면 최신 데이터, 오프라인이면 캐시)
            urlPattern: /\/api\/.+/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7일
              },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      manifest: {
        name: '길튼 시스템',
        short_name: '길튼',
        theme_color: '#1e293b',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [],
      },
      devOptions: {
        enabled: false, // 개발 시 SW 비활성
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
    allowedHosts: ["solstice-macbookpro.taile04fbf.ts.net"]
  },
});
