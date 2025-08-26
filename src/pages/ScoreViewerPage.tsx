import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button, LoadingOverlay, LoadingSpinner } from '../components/ui';
import { useAppStore } from '../store/appStore';
import { useSong, useWorship } from '../hooks/useApi';

/**
 * 악보 뷰어 페이지
 * - 찬양 악보 이미지 표시
 * - iPad 터치 제스처 지원 (핀치 줌, 팬)
 * - 주석 레이어 관리 (Phase 2에서 완전 구현)
 * - 전체화면 모드 지원
 */
export const ScoreViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const { worshipId, songId } = useParams<{ worshipId: string; songId: string }>();
  const worshipIdNum = worshipId ? parseInt(worshipId) : null;
  const songIdNum = songId ? parseInt(songId) : null;

  // 스토어 상태
  const {
    currentWorship,
    currentSong,
    setCurrentWorship,
    setCurrentSong,
    isLoading,
  } = useAppStore();

  // 로컬 상태
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState<{ x: number; y: number } | null>(null);

  // 참조
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // API 훅
  const {
    data: worship,
    isLoading: isLoadingWorship,
    error: worshipError,
  } = useWorship(worshipIdNum, {
    enabled: !!worshipIdNum,
  });

  const {
    data: song,
    isLoading: isLoadingSong,
    error: songError,
  } = useSong(songIdNum || 0);

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

  // 뒤로 가기
  const handleGoBack = () => {
    navigate(`/worship/${worshipId}`);
  };

  // 줌 제어
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
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

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1 && isDragging && lastTouch) {
      // 드래그
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastTouch.x;
      const deltaY = touch.clientY - lastTouch.y;

      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setLastTouch({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      // 핀치 줌 (기본 브라우저 핀치 줌 사용)
      // 추가 구현은 Phase 2에서 진행
    }
  }, [isDragging, lastTouch]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setLastTouch(null);
  }, []);

  // 마우스 이벤트 (데스크톱 지원)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // 좌클릭
      setLastTouch({ x: e.clientX, y: e.clientY });
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && lastTouch) {
      const deltaX = e.clientX - lastTouch.x;
      const deltaY = e.clientY - lastTouch.y;

      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setLastTouch({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, lastTouch]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">잘못된 접근</h2>
          <p className="text-gray-600 mb-4">올바르지 않은 찬양 정보입니다.</p>
          <Button onClick={handleGoBack}>찬양 목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 헤더 (전체화면이 아닐 때만 표시) */}
      {!isFullscreen && (
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-3">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoBack}
                  className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>

                <div>
                  <h1 className="text-lg font-semibold text-white">
                    {song?.title || '악보 뷰어'}
                  </h1>
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
                  className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-800"
                >
                  {showAnnotations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>

                {/* 주석 레이어 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-800"
                >
                  <Layers className="w-4 h-4" />
                </Button>

                {/* 편집 모드 (Phase 2) */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-800"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-800"
                >
                  <Settings className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-800"
                >
                  <Users className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 컨트롤 패널 (전체화면이 아닐 때만 표시) */}
      {!isFullscreen && (
        <div className="bg-gray-800 px-4 py-3">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-700"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>

                <span className="text-sm text-gray-300 min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-700"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetZoom}
                  className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-700"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFitToScreen}
                  className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-700"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-700"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메인 뷰어 */}
      <div
        ref={containerRef}
        className={`
          relative overflow-hidden bg-black
          ${isFullscreen ? 'fixed inset-0 z-50' : 'flex-1 h-screen'}
        `}
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
          <div className="flex items-center justify-center h-full">
            {(isLoadingWorship || isLoadingSong) ? (
              <LoadingSpinner size="lg" text="악보를 불러오는 중..." />
            ) : (worshipError || songError) ? (
              <div className="text-center text-white">
                <h3 className="text-lg font-medium mb-2">오류가 발생했습니다</h3>
                <p className="text-gray-300 mb-4">
                  {worshipError?.message || songError?.message || '악보를 불러올 수 없습니다'}
                </p>
                <Button onClick={handleGoBack} variant="outline">
                  찬양 목록으로 돌아가기
                </Button>
              </div>
            ) : !song?.imagePath ? (
              <div className="text-center text-white">
                <h3 className="text-lg font-medium mb-2">악보가 없습니다</h3>
                <p className="text-gray-300 mb-4">
                  이 찬양에는 업로드된 악보가 없습니다
                </p>
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

                {/* 주석 레이어 - Phase 2에서 구현 */}
                {showAnnotations && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* SVG 주석들이 여기에 렌더링됩니다 */}
                  </div>
                )}
              </div>
            )}
          </div>
        </LoadingOverlay>

        {/* 전체화면 모드 컨트롤 */}
        {isFullscreen && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center space-x-2 bg-black bg-opacity-75 rounded-lg px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-700"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>

              <span className="text-sm text-white min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-700"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="min-w-[44px] min-h-[44px] text-white hover:bg-gray-700"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
