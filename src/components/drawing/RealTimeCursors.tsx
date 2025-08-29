import React, { useEffect, useState } from 'react';
import { useActiveCursors, useActiveAnnotations } from '../../store/websocketStore';

/**
 * 실시간 커서 표시 컴포넌트 (Figma 스타일)
 * - 다른 사용자들의 실시간 그리기 과정 표시
 * - 사용자별 색상 구분 및 이름 표시
 * - 커서 위치 및 그리기 상태 실시간 동기화
 */

interface CursorPosition {
  x: number;
  y: number;
}

interface RealTimeCursorsProps {
  /** 현재 사용자 ID (자신의 커서는 표시하지 않음) */
  currentUserId: string;

  /** 컨테이너 크기 */
  width: number;
  height: number;

  /** 레이어 가시성 설정 (선택적) */
  layerVisibility?: Record<string, boolean>;
}

interface UserCursor {
  userId: string;
  userName: string;
  color: string;
  position: CursorPosition;
  isDrawing: boolean;
  tool: string;
  lastSeen: number;
}

export const RealTimeCursors: React.FC<RealTimeCursorsProps> = ({
  currentUserId,
  width,
  height,
  layerVisibility = {},
}) => {
  const activeCursors = useActiveCursors();
  const [userCursors, setUserCursors] = useState<Map<string, UserCursor>>(new Map());

  // 활성 커서 정보를 렌더링용 커서 정보로 변환
  useEffect(() => {
    const cursors = new Map<string, UserCursor>();

    activeCursors.forEach((cursor, userId) => {
      if (userId === currentUserId) return; // 자신의 커서는 제외

      // 레이어 가시성 확인 (기본값은 true)
      const isLayerVisible = layerVisibility[userId] !== false;
      if (!isLayerVisible) return;

      cursors.set(userId, {
        userId,
        userName: cursor.userName,
        color: cursor.color,
        position: { x: cursor.x, y: cursor.y },
        isDrawing: cursor.isDrawing,
        tool: cursor.tool,
        lastSeen: cursor.lastUpdate,
      });
    });

    setUserCursors(cursors);
  }, [activeCursors, currentUserId, layerVisibility]);

  // 비활성 커서 정리 (5초 후 자동 제거)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const updated = new Map(userCursors);
      let hasChanges = false;

      updated.forEach((cursor, userId) => {
        if (now - cursor.lastSeen > 5000) {
          // 5초
          updated.delete(userId);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setUserCursors(updated);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userCursors]);

  return (
    <div
      className="real-time-cursors"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {Array.from(userCursors.values()).map((cursor) => (
        <UserCursor key={cursor.userId} cursor={cursor} containerWidth={width} containerHeight={height} />
      ))}
    </div>
  );
};

/**
 * 개별 사용자 커서 컴포넌트
 */
interface UserCursorProps {
  cursor: UserCursor;
  containerWidth: number;
  containerHeight: number;
}

const UserCursor: React.FC<UserCursorProps> = ({ cursor, containerWidth, containerHeight }) => {
  const [isVisible, setIsVisible] = useState(true);

  // 커서 깜박임 효과 (그리기 중일 때)
  useEffect(() => {
    if (!cursor.isDrawing) return;

    const interval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [cursor.isDrawing]);

  // 커서 위치가 컨테이너 밖이면 숨김
  const isOutOfBounds =
    cursor.position.x < 0 ||
    cursor.position.x > containerWidth ||
    cursor.position.y < 0 ||
    cursor.position.y > containerHeight;

  if (isOutOfBounds) return null;

  // 도구별 커서 모양
  const getCursorIcon = (tool: string) => {
    switch (tool) {
      case 'pen':
        return '✏️';
      case 'highlighter':
        return '🖍️';
      case 'eraser':
        return '🧹';
      default:
        return '👆';
    }
  };

  return (
    <div
      className="user-cursor"
      style={{
        position: 'absolute',
        left: cursor.position.x,
        top: cursor.position.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 30,
        opacity: isVisible ? 1 : 0.3,
        transition: 'all 0.1s ease-out',
      }}
    >
      {/* 커서 포인터 */}
      <div
        className="cursor-pointer"
        style={{
          position: 'relative',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: cursor.color,
          border: '2px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
        }}
      >
        {getCursorIcon(cursor.tool)}
      </div>

      {/* 사용자 이름 라벨 */}
      <div
        className="cursor-label"
        style={{
          position: 'absolute',
          top: '28px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: cursor.color,
          color: 'white',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '500',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {cursor.userName}
      </div>

      {/* 그리기 중일 때 펄스 효과 */}
      {cursor.isDrawing && (
        <div
          className="cursor-pulse"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: `2px solid ${cursor.color}`,
            opacity: 0.4,
            animation: 'pulse 1s infinite',
            zIndex: -1,
          }}
        />
      )}

      <style>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0;
          }
        }
        
        .cursor-pulse {
          animation: pulse 1s infinite;
        }
      `}</style>
    </div>
  );
};

/**
 * 실시간 그리기 패스 표시 컴포넌트 (Figma 스타일)
 * 다른 사용자가 그리는 선을 실시간으로 부드럽게 표시
 */
interface RealTimeDrawingPathsProps {
  currentUserId: string;
  width: number;
  height: number;

  /** 레이어 가시성 설정 (선택적) */
  layerVisibility?: Record<string, boolean>;
}

export const RealTimeDrawingPaths: React.FC<RealTimeDrawingPathsProps> = ({
  currentUserId,
  width,
  height,
  layerVisibility = {},
}) => {
  const activeAnnotations = useActiveAnnotations();
  const [animatedPaths, setAnimatedPaths] = useState<
    Map<
      string,
      {
        path: string;
        animationProgress: number;
        lastUpdate: number;
      }
    >
  >(new Map());

  // 실시간 애니메이션 업데이트
  useEffect(() => {
    const updatedPaths = new Map();

    activeAnnotations.forEach((annotation, userId) => {
      if (userId === currentUserId) return;

      const existing = animatedPaths.get(userId);
      const now = Date.now();

      // 새로운 패스이거나 업데이트된 경우
      if (!existing || existing.path !== annotation.currentPath) {
        updatedPaths.set(userId, {
          path: annotation.currentPath,
          animationProgress: 0,
          lastUpdate: now,
        });
      } else {
        // 기존 패스 유지
        updatedPaths.set(userId, existing);
      }
    });

    setAnimatedPaths(updatedPaths);
  }, [activeAnnotations, currentUserId, animatedPaths]);

  // 애니메이션 프로그레스 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let hasUpdates = false;

      const updated = new Map(animatedPaths);
      updated.forEach((pathData, userId) => {
        const elapsed = now - pathData.lastUpdate;
        const newProgress = Math.min(1, pathData.animationProgress + elapsed / 1000); // 1초에 완료

        if (newProgress !== pathData.animationProgress) {
          updated.set(userId, {
            ...pathData,
            animationProgress: newProgress,
            lastUpdate: now,
          });
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        setAnimatedPaths(updated);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [animatedPaths]);

  return (
    <svg
      className="real-time-drawing-paths"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 15,
      }}
      viewBox={`0 0 ${width} ${height}`}
    >
      {Array.from(activeAnnotations.entries()).map(([userId, annotation]) => {
        if (userId === currentUserId) return null; // 자신의 그리기는 제외

        // 레이어 가시성 확인 (기본값은 true)
        const isLayerVisible = layerVisibility[userId] !== false;
        if (!isLayerVisible) return null;

        const animatedPath = animatedPaths.get(userId);

        return (
          <g key={userId}>
            {/* 완료된 그리기 (고정된 선) */}
            <path
              d={annotation.currentPath}
              stroke={annotation.color}
              strokeWidth="2"
              fill="none"
              opacity="0.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 실시간 그리기 중인 선 (애니메이션) */}
            {animatedPath && (
              <path
                d={animatedPath.path}
                stroke={annotation.color}
                strokeWidth="3"
                fill="none"
                opacity="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${animatedPath.animationProgress * 100} 100`}
                style={{
                  filter: `drop-shadow(0 0 3px ${annotation.color}40)`,
                  transition: 'stroke-dasharray 0.1s ease-out',
                }}
              />
            )}

            {/* 사용자 이름 라벨 (그리기 중일 때만 표시) */}
            <foreignObject x="10" y="10" width="150" height="30">
              <div
                style={{
                  backgroundColor: annotation.color,
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500',
                  display: 'inline-block',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  opacity: 0.9,
                }}
              >
                {annotation.userName} 그리는 중...
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
};
