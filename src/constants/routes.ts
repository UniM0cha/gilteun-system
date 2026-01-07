// 라우트 상수

export const ROUTES = {
  // 프로필 선택
  PROFILE_SELECT: '/',

  // 예배
  WORSHIP_LIST: '/worships',
  WORSHIP_CREATE: '/worships/new',

  // 찬양 (예배 선택 후 접근)
  SONG_LIST: '/songs',
  SONG_UPLOAD: '/songs/new',

  // 악보 뷰어
  SCORE_VIEWER: '/score/:songId',
} as const;

// 동적 라우트 헬퍼
export function getScoreViewerPath(songId: string): string {
  return `/score/${songId}`;
}
