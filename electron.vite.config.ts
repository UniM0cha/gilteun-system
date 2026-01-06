import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  // Main Process (CJS 기본값 사용)
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts'),
        },
        external: [
          'electron',
          'express',
          'better-sqlite3',
          'cors',
          'helmet',
          'kysely',
          'ws',
        ],
        output: {
          format: 'cjs',
          interop: 'default', // CommonJS interop 설정
        },
      },
    },
    plugins: [], // externalizeDepsPlugin 제거
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

  // Renderer (React PWA)
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
        },
      },
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  },
});
