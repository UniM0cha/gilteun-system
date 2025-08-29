/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 길튼 시스템 브랜드 컬러
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // 교회 테마 컬러
        sacred: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
      fontFamily: {
        // 한글 폰트 지원
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif KR', 'serif'],
      },
      spacing: {
        // iPad 최적화 간격
        18: '4.5rem',
        88: '22rem',
        128: '32rem',
      },
      screens: {
        // iPad 특화 브레이크포인트
        ipad: '768px',
        'ipad-pro': '1024px',
      },
      aspectRatio: {
        ipad: '4/3',
      },
    },
  },
  plugins: [],
};
