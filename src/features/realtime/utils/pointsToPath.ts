// 포인트 배열을 SVG path로 변환하는 유틸

import type { StrokePoint } from '../types';

/**
 * 포인트 배열을 SVG path 문자열로 변환
 * 간단한 직선 보간 사용 (성능 우선)
 */
export function pointsToPath(points: StrokePoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    // 단일 포인트는 작은 원으로 표시
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y + 0.1}`;
  }

  // 시작점
  const pathParts: string[] = [`M ${points[0].x} ${points[0].y}`];

  // 나머지 포인트들은 lineTo
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    pathParts.push(`L ${p.x} ${p.y}`);
  }

  return pathParts.join(' ');
}

/**
 * 포인트 배열을 부드러운 곡선 SVG path로 변환
 * Catmull-Rom 스플라인 사용 (더 자연스러운 곡선)
 */
export function pointsToSmoothPath(points: StrokePoint[]): string {
  if (points.length < 2) return pointsToPath(points);
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const pathParts: string[] = [`M ${points[0].x} ${points[0].y}`];

  // Catmull-Rom to Bezier 변환
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // 컨트롤 포인트 계산
    const tension = 0.5;
    const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

    pathParts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  return pathParts.join(' ');
}

export default pointsToPath;
