import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DrawingTool, GestureState, ViewMode } from '../types';

/**
 * UI 상태 인터페이스
 */
interface UIState {
  // 그리기 모드
  isDrawingMode: boolean;
  selectedTool: DrawingTool;
  selectedColor: string;
  brushSize: number;
  layerName: string;

  // 확대/축소 및 뷰
  zoomLevel: number;
  viewMode: ViewMode;
  viewportX: number;
  viewportY: number;

  // 제스처 상태
  gestureState: GestureState;

  // UI 표시 상태
  showToolbar: boolean;
  showLayerPanel: boolean;
  showCommandPanel: boolean;
  showUserList: boolean;
  showSettings: boolean;

  // 모달 및 다이얼로그
  activeModal: string | null;
  modalProps: any;

  // 터치 및 Apple Pencil
  isPencilActive: boolean;
  touchDisabled: boolean; // 손바닥 거치 방지
  pressureSensitivity: boolean;

  // 키보드 및 접근성
  keyboardVisible: boolean;
  highContrastMode: boolean;
  reduceMotion: boolean;

  // 오프라인 상태
  isOffline: boolean;
  offlineQueueSize: number;

  // 액션들
  // 그리기 모드 관리
  toggleDrawingMode: () => void;
  setDrawingTool: (tool: DrawingTool) => void;
  setDrawingColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setLayerName: (name: string) => void;

  // 뷰 관리
  setZoomLevel: (level: number) => void;
  resetZoom: () => void;
  setViewMode: (mode: ViewMode) => void;
  setViewport: (x: number, y: number) => void;
  fitToScreen: () => void;

  // 제스처 관리
  updateGestureState: (state: Partial<GestureState>) => void;
  resetGestureState: () => void;

  // UI 패널 토글
  toggleToolbar: () => void;
  toggleLayerPanel: () => void;
  toggleCommandPanel: () => void;
  toggleUserList: () => void;
  toggleSettings: () => void;

  // 모달 관리
  openModal: (modalId: string, props?: any) => void;
  closeModal: () => void;

  // Apple Pencil 및 터치
  setPencilActive: (active: boolean) => void;
  setTouchDisabled: (disabled: boolean) => void;
  togglePressureSensitivity: () => void;

  // 접근성
  setKeyboardVisible: (visible: boolean) => void;
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;

  // 오프라인 관리
  setOfflineStatus: (offline: boolean) => void;
  updateOfflineQueue: (size: number) => void;

  // UI 초기화
  resetUI: () => void;
}

/**
 * 기본 제스처 상태
 */
const defaultGestureState: GestureState = {
  scale: 1,
  x: 0,
  y: 0,
  rotating: false,
  scaling: false,
  dragging: false,
};

/**
 * UI 상태 스토어
 */
export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // 초기 상태
      isDrawingMode: false,
      selectedTool: 'pen',
      selectedColor: '#ff0000',
      brushSize: 3,
      layerName: '',

      zoomLevel: 1,
      viewMode: 'fit',
      viewportX: 0,
      viewportY: 0,

      gestureState: defaultGestureState,

      showToolbar: true,
      showLayerPanel: false,
      showCommandPanel: false,
      showUserList: false,
      showSettings: false,

      activeModal: null,
      modalProps: null,

      isPencilActive: false,
      touchDisabled: false,
      pressureSensitivity: true,

      keyboardVisible: false,
      highContrastMode: false,
      reduceMotion: false,

      isOffline: false,
      offlineQueueSize: 0,

      // 그리기 모드 관리
      toggleDrawingMode: () => {
        const { isDrawingMode, setTouchDisabled } = get();
        const newDrawingMode = !isDrawingMode;

        set({ isDrawingMode: newDrawingMode });

        // 그리기 모드일 때는 터치 제스처 비활성화
        setTouchDisabled(newDrawingMode);
      },

      setDrawingTool: (tool) => {
        set({ selectedTool: tool });
      },

      setDrawingColor: (color) => {
        set({ selectedColor: color });
      },

      setBrushSize: (size) => {
        // 브러시 크기는 1-10 범위로 제한
        const clampedSize = Math.max(1, Math.min(10, size));
        set({ brushSize: clampedSize });
      },

      setLayerName: (name) => {
        set({ layerName: name });
      },

      // 뷰 관리
      setZoomLevel: (level) => {
        // 줌 레벨은 0.1-5.0 범위로 제한
        const clampedLevel = Math.max(0.1, Math.min(5.0, level));
        set({
          zoomLevel: clampedLevel,
          viewMode: 'custom', // 수동으로 줌을 조정하면 커스텀 모드로
        });
      },

      resetZoom: () => {
        set({
          zoomLevel: 1,
          viewMode: 'fit',
          viewportX: 0,
          viewportY: 0,
        });
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });

        // 모드에 따른 자동 조정
        if (mode === 'fit') {
          get().fitToScreen();
        }
      },

      setViewport: (x, y) => {
        set({
          viewportX: x,
          viewportY: y,
          viewMode: 'custom',
        });
      },

      fitToScreen: () => {
        // 화면에 맞게 조정 (구현은 컴포넌트에서)
        set({
          zoomLevel: 1,
          viewportX: 0,
          viewportY: 0,
          viewMode: 'fit',
        });
      },

      // 제스처 관리
      updateGestureState: (newState) => {
        set((state) => ({
          gestureState: { ...state.gestureState, ...newState },
        }));
      },

      resetGestureState: () => {
        set({ gestureState: defaultGestureState });
      },

      // UI 패널 토글
      toggleToolbar: () => {
        set((state) => ({ showToolbar: !state.showToolbar }));
      },

      toggleLayerPanel: () => {
        set((state) => ({ showLayerPanel: !state.showLayerPanel }));
      },

      toggleCommandPanel: () => {
        set((state) => ({ showCommandPanel: !state.showCommandPanel }));
      },

      toggleUserList: () => {
        set((state) => ({ showUserList: !state.showUserList }));
      },

      toggleSettings: () => {
        set((state) => ({ showSettings: !state.showSettings }));
      },

      // 모달 관리
      openModal: (modalId, props = null) => {
        set({
          activeModal: modalId,
          modalProps: props,
        });
      },

      closeModal: () => {
        set({
          activeModal: null,
          modalProps: null,
        });
      },

      // Apple Pencil 및 터치
      setPencilActive: (active) => {
        set({ isPencilActive: active });

        // Apple Pencil이 활성화되면 자동으로 그리기 모드로
        if (active && !get().isDrawingMode) {
          get().toggleDrawingMode();
        }
      },

      setTouchDisabled: (disabled) => {
        set({ touchDisabled: disabled });
      },

      togglePressureSensitivity: () => {
        set((state) => ({
          pressureSensitivity: !state.pressureSensitivity,
        }));
      },

      // 접근성
      setKeyboardVisible: (visible) => {
        set({ keyboardVisible: visible });
      },

      toggleHighContrast: () => {
        set((state) => ({
          highContrastMode: !state.highContrastMode,
        }));
      },

      toggleReduceMotion: () => {
        set((state) => ({
          reduceMotion: !state.reduceMotion,
        }));
      },

      // 오프라인 관리
      setOfflineStatus: (offline) => {
        set({ isOffline: offline });
      },

      updateOfflineQueue: (size) => {
        set({ offlineQueueSize: size });
      },

      // UI 초기화
      resetUI: () => {
        set({
          isDrawingMode: false,
          selectedTool: 'pen',
          selectedColor: '#ff0000',
          brushSize: 3,
          layerName: '',

          zoomLevel: 1,
          viewMode: 'fit',
          viewportX: 0,
          viewportY: 0,

          gestureState: defaultGestureState,

          showToolbar: true,
          showLayerPanel: false,
          showCommandPanel: false,
          showUserList: false,
          showSettings: false,

          activeModal: null,
          modalProps: null,

          isPencilActive: false,
          touchDisabled: false,

          keyboardVisible: false,
          offlineQueueSize: 0,
        });
      },
    }),
    {
      name: 'gilteun-ui-store',
    },
  ),
);

// 편의용 훅들
export const useDrawingState = () =>
  useUIStore((state) => ({
    isDrawingMode: state.isDrawingMode,
    selectedTool: state.selectedTool,
    selectedColor: state.selectedColor,
    brushSize: state.brushSize,
    layerName: state.layerName,
    isPencilActive: state.isPencilActive,
    pressureSensitivity: state.pressureSensitivity,
  }));

export const useViewState = () =>
  useUIStore((state) => ({
    zoomLevel: state.zoomLevel,
    viewMode: state.viewMode,
    viewportX: state.viewportX,
    viewportY: state.viewportY,
    gestureState: state.gestureState,
  }));

export const useUIPanel = () =>
  useUIStore((state) => ({
    showToolbar: state.showToolbar,
    showLayerPanel: state.showLayerPanel,
    showCommandPanel: state.showCommandPanel,
    showUserList: state.showUserList,
    showSettings: state.showSettings,
  }));

export const useModal = () =>
  useUIStore((state) => ({
    activeModal: state.activeModal,
    modalProps: state.modalProps,
  }));

// 개별 프로퍼티로 분리하여 참조 안정성 확보
export const useIsOffline = () => useUIStore((state) => state.isOffline);
export const useOfflineQueueSize = () => useUIStore((state) => state.offlineQueueSize);

// 기존 훅 유지 (메모이제이션 제거 - 개별 훅 사용 권장)
export const useOfflineState = () => {
  const isOffline = useUIStore((state) => state.isOffline);
  const queueSize = useUIStore((state) => state.offlineQueueSize);

  return { isOffline, queueSize };
};
