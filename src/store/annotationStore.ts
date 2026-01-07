// 주석 상태 (Zustand)

import { create } from 'zustand';
import type { AnnotationTool } from '@/types';
import { CONFIG } from '@/constants/config';

// 주석 상태 타입
interface AnnotationState {
  // 현재 선택된 도구
  currentTool: AnnotationTool;

  // 현재 색상
  currentColor: string;

  // 선 두께
  strokeWidth: number;

  // 표시할 레이어 (프로필 ID 목록)
  visibleLayers: string[];

  // 편집 모드
  isEditMode: boolean;

  // 액션
  setCurrentTool: (tool: AnnotationTool) => void;
  setCurrentColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  toggleLayer: (profileId: string) => void;
  setVisibleLayers: (layers: string[]) => void;
  showAllLayers: (profileIds: string[]) => void;
  hideAllLayers: () => void;
  setEditMode: (isEdit: boolean) => void;
  reset: () => void;
}

// 초기 상태
const initialState = {
  currentTool: 'pen' as AnnotationTool,
  currentColor: CONFIG.DEFAULT_PEN_COLOR,
  strokeWidth: CONFIG.DEFAULT_STROKE_WIDTH,
  visibleLayers: [] as string[],
  isEditMode: false,
};

// 스토어 생성
export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  ...initialState,

  setCurrentTool: (tool) => {
    // 도구에 따른 기본 색상 설정
    const color =
      tool === 'highlighter'
        ? CONFIG.DEFAULT_HIGHLIGHTER_COLOR
        : tool === 'pen'
          ? CONFIG.DEFAULT_PEN_COLOR
          : get().currentColor;

    set({ currentTool: tool, currentColor: color });
  },

  setCurrentColor: (color) => set({ currentColor: color }),

  setStrokeWidth: (width) => set({ strokeWidth: width }),

  toggleLayer: (profileId) => {
    const { visibleLayers } = get();
    const isVisible = visibleLayers.includes(profileId);

    if (isVisible) {
      set({ visibleLayers: visibleLayers.filter((id) => id !== profileId) });
    } else {
      set({ visibleLayers: [...visibleLayers, profileId] });
    }
  },

  setVisibleLayers: (layers) => set({ visibleLayers: layers }),

  showAllLayers: (profileIds) => set({ visibleLayers: profileIds }),

  hideAllLayers: () => set({ visibleLayers: [] }),

  setEditMode: (isEdit) => set({ isEditMode: isEdit }),

  reset: () => set(initialState),
}));
