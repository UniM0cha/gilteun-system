import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { DrawingCanvas } from './DrawingCanvas';
import type {
  Score,
  ScoreViewport,
  DrawingEvent,
  DrawingToolSettings,
} from '@shared/types/score';

interface ScoreViewerProps {
  score?: Score;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  viewport: ScoreViewport;
  onViewportChange: (viewport: ScoreViewport) => void;
  drawingEvents: DrawingEvent[];
  isDrawingMode: boolean;
  toolSettings: DrawingToolSettings;
  onDrawingEvent: (event: DrawingEvent) => void;
  userId: string;
}

export const ScoreViewer = ({
  score,
  currentPage,
  totalPages,
  viewport,
  onViewportChange,
  drawingEvents,
  isDrawingMode,
  toolSettings,
  onDrawingEvent,
  userId,
}: ScoreViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });

  // 이미지 로드 처리
  useEffect(() => {
    if (!score || !imageRef.current) return;

    const img = imageRef.current;

    const handleLoad = () => {
      setIsImageLoaded(true);
      setImageError(null);
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    const handleError = () => {
      setIsImageLoaded(false);
      setImageError('악보 이미지를 불러올 수 없습니다.');
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [score]);

  // 줌 및 팬 처리
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // 줌 처리
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.1, Math.min(3, viewport.zoom + delta));

      onViewportChange({
        ...viewport,
        zoom: newZoom,
      });
    } else {
      // 스크롤 처리
      onViewportChange({
        ...viewport,
        offsetX: viewport.offsetX - e.deltaX,
        offsetY: viewport.offsetY - e.deltaY,
      });
    }
  };

  if (!score) {
    return (
      <Card className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">악보를 선택하세요</p>
      </Card>
    );
  }

  const scoreImageUrl = `/api/scores/${score.id}/pages/${currentPage}`;

  return (
    <Card className="relative overflow-hidden">
      <div
        ref={containerRef}
        className="relative w-full h-96 md:h-[600px] lg:h-[800px]"
        onWheel={handleWheel}
      >
        {/* 악보 이미지 */}
        <img
          ref={imageRef}
          src={scoreImageUrl}
          alt={`${score.title} - 페이지 ${currentPage}`}
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            transform: `scale(${viewport.zoom}) translate(${viewport.offsetX}px, ${viewport.offsetY}px)`,
            cursor: isDrawingMode ? 'crosshair' : 'grab',
          }}
          draggable={false}
          onLoad={() => setIsImageLoaded(true)}
          onError={() => setImageError('이미지를 불러올 수 없습니다.')}
        />

        {/* Drawing Canvas 오버레이 */}
        {isImageLoaded && (
          <DrawingCanvas
            width={imageDimensions.width}
            height={imageDimensions.height}
            viewport={viewport}
            toolSettings={toolSettings}
            isDrawingMode={isDrawingMode}
            onDrawingEvent={onDrawingEvent}
            drawingEvents={drawingEvents}
            currentPage={currentPage}
            scoreId={score?.id || ''}
            userId={userId}
          />
        )}

        {/* 로딩 상태 */}
        {!isImageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <p className="text-muted-foreground">악보를 불러오는 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <p className="text-destructive">{imageError}</p>
          </div>
        )}

        {/* 페이지 정보 */}
        <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
          {currentPage} / {totalPages}
        </div>

        {/* 줌 정보 */}
        <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
          {Math.round(viewport.zoom * 100)}%
        </div>
      </div>
    </Card>
  );
};
