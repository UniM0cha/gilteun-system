// 기본 악기 목록
export const DEFAULT_INSTRUMENTS = [
  { name: '드럼', icon: '🥁' },
  { name: '베이스', icon: '🎸' },
  { name: '기타', icon: '🎸' },
  { name: '키보드', icon: '🎹' },
  { name: '보컬', icon: '🎤' },
] as const;

// 기본 예배 유형
export const DEFAULT_WORSHIP_TYPES = ['주일 1부예배', '주일 2부예배', '주일 3부예배', '청년예배', '수요예배'] as const;

// 기본 명령 템플릿
export const DEFAULT_COMMANDS = [
  '다음 곡으로',
  '반복',
  '1절로',
  '2절로',
  '후렴으로',
  '브릿지로',
  '잠시 정지',
  '마무리',
] as const;

// 시스템 설정
export const SYSTEM_CONFIG = {
  COMMAND_EXPIRE_TIME: 3000, // 3초
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  DEFAULT_SERVER_PORT: 3001,
} as const;
