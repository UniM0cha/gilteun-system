import React, { useCallback, useState } from 'react';
import { Eye, EyeOff, Layers, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Button } from '../ui';
import { useConnectedUsers, useActiveAnnotations } from '../../store/websocketStore';

/**
 * 개인별 레이어 관리 컴포넌트
 * - 사용자별 주석 레이어 on/off 토글
 * - 실시간 연결된 사용자 및 활성 주석 표시
 * - 사용자 색상 구분 및 식별
 */

export interface LayerVisibility {
  [userId: string]: boolean;
}

interface LayerManagerProps {
  /** 현재 사용자 ID */
  currentUserId: string;

  /** 레이어 가시성 상태 */
  layerVisibility: LayerVisibility;

  /** 레이어 가시성 변경 콜백 */
  onLayerVisibilityChange: (visibility: LayerVisibility) => void;

  /** 모든 레이어 표시 여부 */
  showAllLayers: boolean;

  /** 모든 레이어 표시 토글 콜백 */
  onToggleAllLayers: (show: boolean) => void;
}

interface UserLayerInfo {
  userId: string;
  userName: string;
  color: string;
  isConnected: boolean;
  isDrawing: boolean;
  annotationCount: number;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  currentUserId,
  layerVisibility,
  onLayerVisibilityChange,
  showAllLayers,
  onToggleAllLayers,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const connectedUsers = useConnectedUsers();
  const activeAnnotations = useActiveAnnotations();

  // 사용자별 레이어 정보 생성
  const getUserLayers = useCallback((): UserLayerInfo[] => {
    const userMap = new Map<string, UserLayerInfo>();

    // 연결된 사용자들 추가
    connectedUsers.users.forEach((user) => {
      if (user.id === currentUserId) return; // 자신은 제외

      userMap.set(user.id, {
        userId: user.id,
        userName: user.name,
        color: '#6b7280', // 기본 색상
        isConnected: true,
        isDrawing: false,
        annotationCount: 0,
      });
    });

    // 활성 주석 사용자들 추가/업데이트
    activeAnnotations.forEach((annotation, userId) => {
      if (userId === currentUserId) return; // 자신은 제외

      const existing = userMap.get(userId);
      if (existing) {
        userMap.set(userId, {
          ...existing,
          color: annotation.color,
          isDrawing: true,
          annotationCount: existing.annotationCount + 1,
        });
      } else {
        userMap.set(userId, {
          userId,
          userName: annotation.userName,
          color: annotation.color,
          isConnected: false,
          isDrawing: true,
          annotationCount: 1,
        });
      }
    });

    return Array.from(userMap.values()).sort((a, b) => {
      // 그리기 중인 사용자를 먼저 표시
      if (a.isDrawing && !b.isDrawing) return -1;
      if (!a.isDrawing && b.isDrawing) return 1;
      // 연결된 사용자를 먼저 표시
      if (a.isConnected && !b.isConnected) return -1;
      if (!a.isConnected && b.isConnected) return 1;
      // 이름 순으로 정렬
      return a.userName.localeCompare(b.userName);
    });
  }, [connectedUsers.users, activeAnnotations, currentUserId]);

  const userLayers = getUserLayers();

  // 개별 레이어 토글
  const handleLayerToggle = useCallback(
    (userId: string) => {
      const newVisibility = {
        ...layerVisibility,
        [userId]: !layerVisibility[userId],
      };
      onLayerVisibilityChange(newVisibility);
    },
    [layerVisibility, onLayerVisibilityChange],
  );

  // 모든 레이어 토글
  const handleToggleAll = useCallback(() => {
    onToggleAllLayers(!showAllLayers);
  }, [showAllLayers, onToggleAllLayers]);

  // 가시성 레이어가 있는지 확인
  const visibleLayersCount = userLayers.filter((layer) => layerVisibility[layer.userId] !== false).length;

  return (
    <div className="layer-manager max-w-sm rounded-lg border bg-white shadow-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center space-x-2">
          <Layers className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">레이어 관리</h3>
          <span className="text-sm text-gray-500">
            ({visibleLayersCount}/{userLayers.length})
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* 모든 레이어 토글 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleAll}
            className="min-h-[32px] min-w-[32px]"
            title={showAllLayers ? '모든 레이어 숨기기' : '모든 레이어 표시'}
          >
            {showAllLayers ? <Eye className="h-4 w-4 text-blue-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
          </Button>

          {/* 확장/축소 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="min-h-[32px] min-w-[32px]"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* 레이어 목록 */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {userLayers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm">연결된 사용자가 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {userLayers.map((layer) => {
                const isVisible = layerVisibility[layer.userId] !== false;

                return (
                  <div
                    key={layer.userId}
                    className={`flex items-center justify-between p-3 hover:bg-gray-50 ${
                      layer.isDrawing ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* 사용자 정보 */}
                    <div className="flex flex-1 items-center space-x-3">
                      {/* 사용자 색상 표시 */}
                      <div
                        className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: layer.color }}
                      />

                      {/* 사용자 이름 및 상태 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="truncate text-sm font-medium text-gray-900">{layer.userName}</span>

                          {/* 상태 표시 */}
                          {layer.isDrawing && (
                            <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                              그리는 중
                            </span>
                          )}

                          {layer.isConnected && !layer.isDrawing && (
                            <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              온라인
                            </span>
                          )}

                          {!layer.isConnected && (
                            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              오프라인
                            </span>
                          )}
                        </div>

                        {layer.annotationCount > 0 && (
                          <p className="mt-0.5 text-xs text-gray-500">주석 {layer.annotationCount}개</p>
                        )}
                      </div>
                    </div>

                    {/* 가시성 토글 버튼 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLayerToggle(layer.userId)}
                      className={`min-h-[32px] min-w-[32px] ${
                        isVisible ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      data-testid={`layer-toggle-${layer.userId}`}
                      title={isVisible ? `${layer.userName} 레이어 숨기기` : `${layer.userName} 레이어 표시`}
                    >
                      {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 요약 정보 (축소된 상태) */}
      {!isExpanded && userLayers.length > 0 && (
        <div className="p-3 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>총 {userLayers.length}명의 사용자</span>
            <span>표시 중: {visibleLayersCount}개</span>
          </div>

          {userLayers.filter((l) => l.isDrawing).length > 0 && (
            <div className="mt-1 flex items-center space-x-1">
              <span className="text-blue-600">●</span>
              <span className="text-blue-600">{userLayers.filter((l) => l.isDrawing).length}명이 그리는 중</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
