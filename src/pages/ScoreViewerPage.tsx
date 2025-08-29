import {
  Activity,
  ArrowLeft,
  Edit3,
  Eraser,
  Eye,
  EyeOff,
  Highlighter,
  Layers,
  Maximize2,
  Minimize2,
  Palette,
  Pencil,
  RotateCcw,
  Save,
  Settings,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnnotationEngine, AnnotationEngineRef, PerformanceMetrics } from '../components/drawing/AnnotationEngine';
import { AnnotationStorage, AnnotationStorageRef } from '../components/drawing/AnnotationStorage';
import { LayerManager, LayerVisibility } from '../components/drawing/LayerManager';
import { RealTimeCursors, RealTimeDrawingPaths } from '../components/drawing/RealTimeCursors';
import { Button, LoadingOverlay, LoadingSpinner } from '../components/ui';
import { PerformanceMonitor } from '../components/ui/PerformanceMonitor';
import { useSong, useWorship } from '../hooks/useApi';
import { useAppStore } from '../store/appStore';
import { useWebSocketStore } from '../store/websocketStore';
import { Annotation } from '../types';

/**
 * 악보 뷰어 페이지
 * - 찬양 악보 이미지 표시
 * - iPad 터치 제스처 지원 (핀치 줌, 팬)
 * - 주석 레이어 관리 (Phase 2에서 완전 구현)
 * - 전체화면 모드 지원
 */
export const ScoreViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const { worshipId, songId } = useParams<{
    worshipId: string;
    songId: string;
  }>();
  const worshipIdNum = worshipId ? parseInt(worshipId) : null;
  const songIdNum = songId ? parseInt(songId) : null;

  // 스토어 상태
  const { currentWorship, currentSong, currentUser, setCurrentWorship, setCurrentSong, isLoading } = useAppStore();

  // 로컬 상태
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState<{ x: number; y: number } | null>(null);

  // Phase 2: 주석 관련 상태
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [strokeThickness, setStrokeThickness] = useState(3);
  const [showToolbar, setShowToolbar] = useState(false);

  // Phase 2: 레이어 관리 상태
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({});
  const [showAllLayers, setShowAllLayers] = useState(true);
  const [showLayerManager, setShowLayerManager] = useState(false);

  // 참조
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const annotationEngineRef = useRef<AnnotationEngineRef>(null);
  const annotationStorageRef = useRef<AnnotationStorageRef>(null);

  // Phase 2: 로드된 주석 데이터 콜백용 setter
  const setLoadedAnnotations = useState<Annotation[]>([])[1];

  // Phase 2: 성능 모니터링 상태
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    inputLatency: 0,
    fps: 60,
    memoryUsage: 0,
    performanceScore: 100,
  });
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  // WebSocket 스토어
  const { sendAnnotationUpdate, sendAnnotationComplete } = useWebSocketStore();

  // API 훅
  const {
    data: worship,
    isLoading: isLoadingWorship,
    error: worshipError,
  } = useWorship(worshipIdNum, {
    enabled: !!worshipIdNum,
  });

  const { data: song, isLoading: isLoadingSong, error: songError } = useSong(songIdNum || 0);

  // 상태 동기화
  useEffect(() => {
    if (worship && (!currentWorship || currentWorship.id !== worship.id)) {
      setCurrentWorship(worship);
    }
  }, [worship, currentWorship, setCurrentWorship]);

  useEffect(() => {
    if (song && (!currentSong || currentSong.id !== song.id)) {
      setCurrentSong(song);
    }
  }, [song, currentSong, setCurrentSong]);

  // 커서 이동 실시간 전송 기능은 요구사항에서 제외됨 (삭제)

  // 뒤로 가기
  const handleGoBack = () => {
    navigate(`/worship/${worshipId}`);
  };

  // Phase 2: 주석 관련 핸들러 - 데이터베이스 저장과 실시간 동기화
  const handleAnnotationComplete = useCallback(
    async (svgPath: string, tool: string, color: string) => {
      if (songIdNum && currentUser && annotationStorageRef.current) {
        try {
          // 1. 데이터베이스에 저장 (AnnotationStorage 사용)
          await annotationStorageRef.current.saveAnnotation(svgPath, tool as 'pen' | 'highlighter' | 'eraser', color, {
            autoSave: false, // 즉시 저장
            compress: true, // SVG 압축
            layer: `${currentUser.name}의 주석`,
          });

          // 2. 실시간 동기화를 위해 WebSocket으로 전송
          sendAnnotationComplete(songIdNum, svgPath, tool, color, `${currentUser.name}의 주석`);
        } catch (error) {
          console.error('주석 저장 실패:', error);
          // 저장 실패 시에도 실시간 동기화는 유지
          sendAnnotationComplete(songIdNum, svgPath, tool, color, `${currentUser.name}의 주석`);
        }
      }
    },
    [songIdNum, currentUser, sendAnnotationComplete],
  );

  const handleAnnotationUpdate = useCallback(
    (svgPath: string, isComplete: boolean) => {
      if (songIdNum && currentUser && !isComplete) {
        // 실시간 동기화를 위해 WebSocket으로 전송 (Figma 스타일)
        sendAnnotationUpdate(songIdNum, svgPath, selectedTool, currentUser.color || '#2563eb');
      }
    },
    [songIdNum, currentUser, selectedTool, sendAnnotationUpdate],
  );

  // 커서 위치 추적 및 실시간 전송 기능은 제거됨

  const toggleAnnotationMode = useCallback(() => {
    setIsAnnotationMode(!isAnnotationMode);
    if (!isAnnotationMode) {
      setShowToolbar(true);
    }
  }, [isAnnotationMode]);

  const handleToolChange = useCallback((tool: 'pen' | 'highlighter' | 'eraser') => {
    setSelectedTool(tool);
  }, []);

  // Phase 2: 레이어 관리 핸들러
  const handleLayerVisibilityChange = useCallback((visibility: LayerVisibility) => {
    setLayerVisibility(visibility);
  }, []);

  const handleToggleAllLayers = useCallback(
    (show: boolean) => {
      setShowAllLayers(show);
      if (!show) {
        // 모든 레이어 숨김
        const allHidden: LayerVisibility = {};
        Object.keys(layerVisibility).forEach((userId) => {
          allHidden[userId] = false;
        });
        setLayerVisibility(allHidden);
      } else {
        // 모든 레이어 표시
        const allVisible: LayerVisibility = {};
        Object.keys(layerVisibility).forEach((userId) => {
          allVisible[userId] = true;
        });
        setLayerVisibility(allVisible);
      }
    },
    [layerVisibility],
  );

  // Phase 2: AnnotationStorage 콜백들
  const handleAnnotationsLoaded = useCallback(
    async (annotations: Annotation[]) => {
      console.log(`기존 주석 ${annotations.length}개 로드됨`);
      setLoadedAnnotations(annotations);

      // AnnotationEngine에 기존 주석들 로드
      if (annotationEngineRef.current && annotations.length > 0) {
        try {
          // 모든 주석을 하나의 SVG로 병합하여 로드
          const combinedSVG = `
          <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
            ${annotations
              .map(
                (annotation) => `
              <g data-annotation-id="${annotation.id}" data-user-id="${
                annotation.userId
              }" opacity="${annotation.opacity || 1.0}">
                ${annotation.svgPath}
              </g>
            `,
              )
              .join('')}
          </svg>
        `;

          await annotationEngineRef.current.loadAnnotationData(combinedSVG);
        } catch (error) {
          console.error('기존 주석 로드 실패:', error);
        }
      }
    },
    [setLoadedAnnotations],
  );

  const handleAnnotationSaved = useCallback(
    (annotation: Annotation) => {
      console.log('주석 저장 완료:', annotation.id);
      // 로드된 주석 목록 업데이트
      setLoadedAnnotations((prev) => [...prev, annotation]);
    },
    [setLoadedAnnotations],
  );

  const handleSaveError = useCallback((error: Error) => {
    console.error('주석 저장 오류:', error);
    // 사용자에게 오류 알림 (추후 토스트 등으로 구현)
  }, []);

  // Phase 2: 성능 모니터링 콜백
  const handlePerformanceUpdate = useCallback(
    (metrics: PerformanceMetrics) => {
      setPerformanceMetrics(metrics);

      // 성능 점수가 낮을 때 경고 로그
      if (metrics.performanceScore < 60) {
        console.warn('성능 저하 감지:', {
          inputLatency: `${metrics.inputLatency.toFixed(1)}ms`,
          fps: `${metrics.fps}fps`,
          memoryUsage: `${metrics.memoryUsage}MB`,
          score: metrics.performanceScore,
        });
      }

      // Apple Pencil 지연시간 목표 달성 체크
      if (metrics.inputLatency > 16 && isAnnotationMode) {
        console.warn(`Apple Pencil 지연시간 목표 초과: ${metrics.inputLatency.toFixed(1)}ms (목표: <16ms)`);
      }
    },
    [isAnnotationMode],
  );

  // 줌 제어
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev / 1.2, 0.1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const image = imageRef.current;

    const scaleX = container.width / image.naturalWidth;
    const scaleY = container.height / image.naturalHeight;
    const newScale = Math.min(scaleX, scaleY, 1);

    setScale(newScale);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 전체화면 모드
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // 터치 제스처 핸들러
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1) {
      // 단일 터치 - 드래그 시작
      const touch = e.touches[0];
      setLastTouch({ x: touch.clientX, y: touch.clientY });
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      // 두 손가락 터치 - 핀치 줌 준비
      setIsDragging(false);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 1 && isDragging && lastTouch) {
        // 드래그
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastTouch.x;
        const deltaY = touch.clientY - lastTouch.y;

        setPosition((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));

        setLastTouch({ x: touch.clientX, y: touch.clientY });
      } else if (e.touches.length === 2) {
        // 핀치 줌 (기본 브라우저 핀치 줌 사용)
        // 추가 구현은 Phase 2에서 진행
      }

      // 커서 위치 실시간 전송 기능 제거
    },
    [isDragging, lastTouch],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setLastTouch(null);
  }, []);

  // 마우스 이벤트 (데스크톱 지원)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      // 좌클릭
      setLastTouch({ x: e.clientX, y: e.clientY });
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && lastTouch) {
        const deltaX = e.clientX - lastTouch.x;
        const deltaY = e.clientY - lastTouch.y;

        setPosition((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));

        setLastTouch({ x: e.clientX, y: e.clientY });
      }

      // 커서 위치 실시간 전송 기능 제거
    },
    [isDragging, lastTouch],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setLastTouch(null);
  }, []);

  // 더블 탭으로 줌 토글
  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      handleResetZoom();
    } else {
      handleZoomIn();
    }
  }, [scale, handleResetZoom, handleZoomIn]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleResetZoom();
          break;
        case 'f':
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleResetZoom, toggleFullscreen, isFullscreen]);

  // 에러 상태 처리
  if (!worshipIdNum || !songIdNum) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">잘못된 접근</h2>
          <p className="mb-4 text-gray-600">올바르지 않은 찬양 정보입니다.</p>
          <Button onClick={handleGoBack}>찬양 목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" data-testid="score-viewer">
      {/* 헤더 (전체화면이 아닐 때만 표시) */}
      {!isFullscreen && (
        <div className="border-b border-gray-700 bg-gray-900 px-4 py-3">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoBack}
                  className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div>
                  <h1 className="text-lg font-semibold text-white">{song?.title || '악보 뷰어'}</h1>
                  <p className="text-sm text-gray-300">
                    {worship?.title} • {worship?.date}
                    {song?.key && ` • Key: ${song.key}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* 주석 토글 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAnnotations(!showAnnotations)}
                  className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-800"
                >
                  {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>

                {/* 주석 레이어 관리 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLayerManager(!showLayerManager)}
                  className={`min-h-[44px] min-w-[44px] text-white hover:bg-gray-800 ${
                    showLayerManager ? 'bg-blue-600 hover:bg-blue-700' : ''
                  }`}
                  title="레이어 관리"
                  data-testid="layer-manager-button"
                >
                  <Layers className="h-4 w-4" />
                </Button>

                {/* 주석 모드 토글 (Phase 2) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAnnotationMode}
                  data-testid="draw-mode-button"
                  className={`min-h-[44px] min-w-[44px] text-white hover:bg-gray-800 ${
                    isAnnotationMode ? 'bg-blue-600 hover:bg-blue-700' : ''
                  }`}
                  title="주석 모드 토글"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>

                {/* 성능 모니터링 토글 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
                  className={`min-h-[44px] min-w-[44px] text-white hover:bg-gray-800 ${
                    showPerformanceMonitor ? 'bg-green-600 hover:bg-green-700' : ''
                  }`}
                  title="성능 모니터링"
                >
                  <Activity className="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-800">
                  <Settings className="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-800">
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 컨트롤 패널 (전체화면이 아닐 때만 표시) */}
      {!isFullscreen && (
        <div className="bg-gray-800 px-4 py-3">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-700"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <span className="min-w-[60px] text-center text-sm text-gray-300">{Math.round(scale * 100)}%</span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-700"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetZoom}
                  className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFitToScreen}
                  className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-700"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-700"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메인 뷰어 */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-black ${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen flex-1'} `}
        style={{
          height: isFullscreen ? '100vh' : 'calc(100vh - 120px)',
          touchAction: 'none', // 기본 터치 제스처 비활성화
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <LoadingOverlay isLoading={isLoading} text="악보를 불러오는 중...">
          <div className="flex h-full items-center justify-center">
            {isLoadingWorship || isLoadingSong ? (
              <LoadingSpinner size="lg" text="악보를 불러오는 중..." />
            ) : worshipError || songError ? (
              <div className="text-center text-white">
                <h3 className="mb-2 text-lg font-medium">오류가 발생했습니다</h3>
                <p className="mb-4 text-gray-300">
                  {worshipError?.message || songError?.message || '악보를 불러올 수 없습니다'}
                </p>
                <Button onClick={handleGoBack} variant="outline">
                  찬양 목록으로 돌아가기
                </Button>
              </div>
            ) : !song?.imagePath ? (
              <div className="text-center text-white">
                <h3 className="mb-2 text-lg font-medium">악보가 없습니다</h3>
                <p className="mb-4 text-gray-300">이 찬양에는 업로드된 악보가 없습니다</p>
                <Button onClick={handleGoBack} variant="outline">
                  찬양 목록으로 돌아가기
                </Button>
              </div>
            ) : (
              <div
                className="relative"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
              >
                <img
                  ref={imageRef}
                  src={song.imagePath}
                  alt={`${song.title} 악보`}
                  className="max-w-none select-none"
                  style={{
                    maxHeight: '90vh',
                    maxWidth: '90vw',
                  }}
                  onLoad={handleFitToScreen}
                  onError={() => {
                    console.error('악보 이미지 로딩 실패');
                  }}
                />

                {/* 주석 레이어 - js-draw 기반 실시간 협업 주석 시스템 */}
                {showAnnotations && imageRef.current && currentUser && songIdNum && (
                  <>
                    {/* 주석 데이터 저장소 - 데이터베이스 영구 저장 및 로드 */}
                    <AnnotationStorage
                      ref={annotationStorageRef}
                      songId={songIdNum}
                      userId={currentUser.id}
                      userName={currentUser.name}
                      onAnnotationsLoaded={handleAnnotationsLoaded}
                      onAnnotationSaved={handleAnnotationSaved}
                      onSaveError={handleSaveError}
                    />

                    <AnnotationEngine
                      ref={annotationEngineRef}
                      songId={songIdNum}
                      userId={currentUser.id}
                      userName={currentUser.name}
                      userColor={currentUser.color || '#2563eb'}
                      isEditMode={isAnnotationMode}
                      tool={selectedTool}
                      thickness={strokeThickness}
                      width={imageRef.current.offsetWidth || 800}
                      height={imageRef.current.offsetHeight || 600}
                      onAnnotationComplete={handleAnnotationComplete}
                      onAnnotationUpdate={handleAnnotationUpdate}
                      onPerformanceUpdate={handlePerformanceUpdate}
                    />

                    {/* 실시간 그리기 패스 표시 (다른 사용자가 그리는 중인 선) */}
                    <RealTimeDrawingPaths
                      currentUserId={currentUser.id}
                      width={imageRef.current.offsetWidth || 800}
                      height={imageRef.current.offsetHeight || 600}
                      layerVisibility={layerVisibility}
                    />

                    {/* 실시간 커서 표시 (Figma 스타일) */}
                    <RealTimeCursors
                      currentUserId={currentUser.id}
                      width={imageRef.current.offsetWidth || 800}
                      height={imageRef.current.offsetHeight || 600}
                      layerVisibility={layerVisibility}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </LoadingOverlay>

        {/* 전체화면 모드 컨트롤 */}
        {isFullscreen && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-opacity-75 flex items-center space-x-2 rounded-lg bg-black px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-700"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>

              <span className="min-w-[60px] text-center text-sm text-white">{Math.round(scale * 100)}%</span>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-700"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="min-h-[44px] min-w-[44px] text-white hover:bg-gray-700"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 레이어 관리 패널 - Phase 2 */}
        {showLayerManager && !isFullscreen && (
          <div className="absolute top-4 right-4 z-30">
            <LayerManager
              currentUserId={currentUser?.id || ''}
              layerVisibility={layerVisibility}
              onLayerVisibilityChange={handleLayerVisibilityChange}
              showAllLayers={showAllLayers}
              onToggleAllLayers={handleToggleAllLayers}
            />
          </div>
        )}

        {/* 저장 상태 표시기 */}
        {annotationStorageRef.current && !isFullscreen && (
          <div className="absolute top-4 left-4 z-30">
            <div className="bg-opacity-75 rounded-lg bg-black px-3 py-2 text-sm text-white">
              {(() => {
                const status = annotationStorageRef.current?.getSaveStatus?.();
                if (!status) return null;

                if (status.isSaving) {
                  return (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
                      <span>저장 중...</span>
                    </div>
                  );
                }

                if (status.pendingCount > 0) {
                  return (
                    <div className="flex items-center space-x-2 text-yellow-400">
                      <Save className="h-4 w-4" />
                      <span>미저장 {status.pendingCount}개</span>
                    </div>
                  );
                }

                if (!status.isConnected) {
                  return (
                    <div className="flex items-center space-x-2 text-red-400">
                      <span>●</span>
                      <span>오프라인</span>
                    </div>
                  );
                }

                return (
                  <div className="flex items-center space-x-2 text-green-400">
                    <span>●</span>
                    <span>저장됨</span>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 성능 모니터링 */}
        <PerformanceMonitor
          metrics={performanceMetrics}
          visible={showPerformanceMonitor && !isFullscreen}
          compact={false}
          position="bottom-left"
        />

        {/* 주석 도구 패널 - Phase 2 */}
        {isAnnotationMode && showToolbar && !isFullscreen && (
          <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 transform">
            <div className="bg-opacity-95 flex items-center space-x-3 rounded-2xl border bg-white px-6 py-4 shadow-xl backdrop-blur-sm">
              {/* 펜 도구 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolChange('pen')}
                className={`min-h-[48px] min-w-[48px] rounded-xl ${
                  selectedTool === 'pen'
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="펜 도구 (Apple Pencil 압력 감지)"
              >
                <Pencil className="h-5 w-5" />
              </Button>

              {/* 하이라이터 도구 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolChange('highlighter')}
                className={`min-h-[48px] min-w-[48px] rounded-xl ${
                  selectedTool === 'highlighter'
                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="하이라이터"
              >
                <Highlighter className="h-5 w-5" />
              </Button>

              {/* 지우개 도구 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolChange('eraser')}
                className={`min-h-[48px] min-w-[48px] rounded-xl ${
                  selectedTool === 'eraser'
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="지우개"
              >
                <Eraser className="h-5 w-5" />
              </Button>

              <div className="h-8 w-px bg-gray-300"></div>

              {/* 두께 조절 */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">두께</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={strokeThickness}
                  onChange={(e) => setStrokeThickness(Number(e.target.value))}
                  className="h-2 w-20 cursor-pointer appearance-none rounded-lg bg-gray-200"
                  title={`선 두께: ${strokeThickness}px`}
                />
                <span className="w-6 text-center text-xs text-gray-500">{strokeThickness}</span>
              </div>

              <div className="h-8 w-px bg-gray-300"></div>

              {/* 색상 선택 (현재는 사용자 고정 색상) */}
              <div className="flex items-center space-x-2">
                <Palette className="h-4 w-4 text-gray-500" />
                <div
                  className="h-8 w-8 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: currentUser?.color || '#2563eb' }}
                  title={`내 색상: ${currentUser?.name}`}
                />
              </div>

              <div className="h-8 w-px bg-gray-300"></div>

              {/* 도구 패널 닫기 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowToolbar(false)}
                className="min-h-[48px] min-w-[48px] rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="도구 패널 숨기기"
              >
                ✕
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
