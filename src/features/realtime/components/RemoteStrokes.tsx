// 다른 사용자의 진행 중인 스트로크를 실시간으로 렌더링

import { useMemo } from 'react';
import type { RemoteStroke } from '../types';
import { pointsToPath } from '../utils/pointsToPath';

interface RemoteStrokesProps {
  // 진행 중인 원격 스트로크 맵
  strokes: Map<string, RemoteStroke>;
}

/**
 * 다른 사용자가 그리는 중인 스트로크를 실시간으로 표시
 * 캔버스 위에 오버레이로 렌더링
 */
export function RemoteStrokes({ strokes }: RemoteStrokesProps) {
  // Map을 배열로 변환
  const strokeList = useMemo(() => {
    return Array.from(strokes.values());
  }, [strokes]);

  if (strokeList.length === 0) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 10 }}
    >
      {strokeList.map((stroke) => {
        const pathD = pointsToPath(stroke.points);
        if (!pathD) return null;

        // 도구에 따른 스타일 결정
        const isHighlighter = stroke.tool === 'highlighter';
        const opacity = isHighlighter ? 0.4 : 0.7; // 진행 중인 스트로크는 약간 투명하게

        return (
          <g key={`${stroke.profileId}:${stroke.strokeId}`}>
            {/* 스트로크 */}
            <path
              d={pathD}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.thickness}
              strokeOpacity={opacity}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 그리는 중 표시 (끝점에 작은 원) */}
            {stroke.points.length > 0 && (
              <circle
                cx={stroke.points[stroke.points.length - 1].x}
                cy={stroke.points[stroke.points.length - 1].y}
                r={stroke.thickness / 2 + 2}
                fill={stroke.profileColor}
                fillOpacity={0.5}
              >
                {/* 펄스 애니메이션 */}
                <animate
                  attributeName="r"
                  values={`${stroke.thickness / 2 + 2};${stroke.thickness / 2 + 6};${stroke.thickness / 2 + 2}`}
                  dur="1s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="fill-opacity"
                  values="0.5;0.2;0.5"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default RemoteStrokes;
