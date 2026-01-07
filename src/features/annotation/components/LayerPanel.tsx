// 레이어 패널 컴포넌트 (다른 사용자 주석 on/off)

import { Eye, EyeOff, Users, Layers } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAnnotationStore } from '@/store/annotationStore';
import type { Profile } from '@/types';

interface LayerPanelProps {
  // 주석이 있는 프로필 목록
  profiles: Profile[];
  // 현재 프로필 ID
  currentProfileId: string;
  // 패널 열림/닫힘 상태
  isOpen: boolean;
  // 패널 토글 콜백
  onToggle: () => void;
}

export function LayerPanel({
  profiles,
  currentProfileId,
  isOpen,
  onToggle,
}: LayerPanelProps) {
  const { visibleLayers, toggleLayer, showAllLayers, hideAllLayers } =
    useAnnotationStore();

  // 다른 사용자 프로필만 필터링 (내 주석은 항상 표시)
  const otherProfiles = profiles.filter((p) => p.id !== currentProfileId);

  // 모든 레이어 표시 여부
  const allVisible = otherProfiles.every((p) => visibleLayers.includes(p.id));

  // 모두 표시/숨기기 토글
  const handleToggleAll = () => {
    if (allVisible) {
      hideAllLayers();
    } else {
      showAllLayers(otherProfiles.map((p) => p.id));
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-4 top-4 z-10 bg-white/90 shadow-sm"
        onClick={onToggle}
        title="레이어 패널 열기"
      >
        <Layers className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="absolute right-4 top-4 z-10 w-56 rounded-lg bg-white shadow-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">레이어</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          ✕
        </Button>
      </div>

      {/* 레이어 목록 */}
      <div className="max-h-64 overflow-y-auto p-2">
        {otherProfiles.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            다른 사용자의 주석이 없습니다
          </p>
        ) : (
          <>
            {/* 전체 토글 버튼 */}
            <button
              onClick={handleToggleAll}
              className="mb-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-100"
            >
              <span className="font-medium text-gray-700">
                {allVisible ? '모두 숨기기' : '모두 표시'}
              </span>
              {allVisible ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>

            <div className="border-t pt-2">
              {otherProfiles.map((profile) => {
                const isVisible = visibleLayers.includes(profile.id);

                return (
                  <button
                    key={profile.id}
                    onClick={() => toggleLayer(profile.id)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      {/* 프로필 색상 표시 */}
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: profile.color }}
                      />
                      <span className={isVisible ? 'text-gray-900' : 'text-gray-400'}>
                        {profile.name}
                      </span>
                    </div>
                    {isVisible ? (
                      <Eye className="h-4 w-4 text-blue-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 푸터 정보 */}
      <div className="border-t px-3 py-2 text-xs text-gray-500">
        내 주석은 항상 표시됩니다
      </div>
    </div>
  );
}

export default LayerPanel;
