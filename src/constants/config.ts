// 설정 상수

export const CONFIG = {
  // API 서버
  API_BASE_URL: 'http://localhost:3001/api',

  // WebSocket 서버
  WS_URL: 'ws://localhost:3001',

  // 주석 도구 기본값
  DEFAULT_STROKE_WIDTH: 2,
  DEFAULT_PEN_COLOR: '#000000',
  DEFAULT_HIGHLIGHTER_COLOR: '#FFFF00',

  // 페이지네이션
  DEFAULT_PAGE_SIZE: 20,

  // 토스트 메시지 표시 시간 (ms)
  TOAST_DURATION: 3000,
} as const;

// 프로필 아이콘 옵션
export const PROFILE_ICONS = [
  '🎵', '🎹', '🎸', '🥁', '🎤',
  '🎷', '🎺', '🎻', '🪕', '🎼',
] as const;

// 프로필 색상 옵션
export const PROFILE_COLORS = [
  { value: '#EF4444', label: 'red', bg: 'bg-red-500' },
  { value: '#F97316', label: 'orange', bg: 'bg-orange-500' },
  { value: '#EAB308', label: 'yellow', bg: 'bg-yellow-500' },
  { value: '#22C55E', label: 'green', bg: 'bg-green-500' },
  { value: '#14B8A6', label: 'teal', bg: 'bg-teal-500' },
  { value: '#3B82F6', label: 'blue', bg: 'bg-blue-500' },
  { value: '#8B5CF6', label: 'violet', bg: 'bg-violet-500' },
  { value: '#EC4899', label: 'pink', bg: 'bg-pink-500' },
] as const;

// 음악 키 옵션
export const MUSIC_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm',
  'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
] as const;
