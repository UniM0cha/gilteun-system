// 날짜 유틸리티

import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';

// 날짜 포맷 (YYYY-MM-DD)
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

// 날짜 + 시간 포맷
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm');
}

// 사용자 친화적 날짜 포맷
export function formatDateFriendly(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) return '오늘';
  if (isTomorrow(d)) return '내일';
  if (isYesterday(d)) return '어제';

  return format(d, 'M월 d일 (E)', { locale: ko });
}

// 요일 포함 날짜 포맷
export function formatDateWithDay(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy년 M월 d일 (E)', { locale: ko });
}

// 시간만 포맷
export function formatTime(time: string | null): string {
  if (!time) return '';
  return time;
}

// input[type="date"]용 날짜 포맷 (YYYY-MM-DD)
export function formatDateForInput(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// 상대 시간 (몇 분 전, 몇 시간 전 등)
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return formatDateFriendly(d);
}
