import { useRef, useEffect, useCallback, useState } from 'react';
import type {
  DrawingEvent,
  DrawingToolSettings,
  ScoreViewport,
} from '@shared/types/score';

interface DrawingCanvasProps {
  width: number;
  height: number;
  viewport: ScoreViewport;
  toolSettings: DrawingToolSettings;
  isDrawingMode: boolean;
  onDrawingEvent: (event: DrawingEvent) => void;
  drawingEvents: DrawingEvent[];
  currentPage: number;
  scoreId: string;
  userId: string;
}

interface Point {
  x: number;
  y: number;
}

export const DrawingCanvas = ({
  width,
  height,
  viewport,
  toolSettings,
  isDrawingMode,
  onDrawingEvent,
  drawingEvents,
  currentPage,
  scoreId,
  userId,
}: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);

  // Canvas에 드로잉 이벤트 렌더링
  const renderDrawings = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 현재 페이지의 완료된 드로잉만 렌더링
    const pageDrawings = drawingEvents.filter(
      (event) => event.pageNumber === currentPage && event.isComplete
    );

    pageDrawings.forEach((drawing) => {
      if (drawing.points.length < 2) return;

      ctx.save();

      // 도구에 따른 설정
      if (drawing.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = drawing.settings.color;
        ctx.globalAlpha = drawing.settings.opacity || 1;

        if (drawing.tool === 'highlighter') {
          ctx.globalAlpha = 0.3;
        }
      }

      ctx.lineWidth = drawing.settings.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(drawing.points[0]?.x || 0, drawing.points[0]?.y || 0);

      for (let i = 1; i < drawing.points.length; i++) {
        ctx.lineTo(drawing.points[i]?.x || 0, drawing.points[i]?.y || 0);
      }

      ctx.stroke();
      ctx.restore();
    });

    // 현재 그리고 있는 스트로크 렌더링
    if (currentStroke.length > 1) {
      ctx.save();

      if (toolSettings.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = toolSettings.color;
        ctx.globalAlpha = toolSettings.opacity || 1;

        if (toolSettings.tool === 'highlighter') {
          ctx.globalAlpha = 0.3;
        }
      }

      ctx.lineWidth = toolSettings.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(currentStroke[0]?.x || 0, currentStroke[0]?.y || 0);

      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i]?.x || 0, currentStroke[i]?.y || 0);
      }

      ctx.stroke();
      ctx.restore();
    }
  }, [drawingEvents, currentPage, currentStroke, toolSettings]);

  // Canvas 크기 및 드로잉 업데이트
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    renderDrawings();
  }, [width, height, renderDrawings]);

  // 좌표 변환 함수 (뷰포트를 고려한 실제 좌표)
  const getCanvasCoordinates = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // 드로잉 시작
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode) return;

    const point =
      'touches' in e
        ? getCanvasCoordinates(
            e.touches[0]?.clientX || 0,
            e.touches[0]?.clientY || 0
          )
        : getCanvasCoordinates(e.clientX, e.clientY);

    setIsDrawing(true);
    setCurrentStroke([point]);

    // 새 드로잉 이벤트 ID 생성
    const eventId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentEventId(eventId);

    // 드로잉 시작 이벤트 발송
    const drawingEvent: DrawingEvent = {
      id: eventId,
      scoreId,
      pageNumber: currentPage,
      userId,
      tool: toolSettings.tool,
      points: [point],
      settings: toolSettings,
      isComplete: false,
      timestamp: new Date(),
    };

    onDrawingEvent(drawingEvent);
  };

  // 드로잉 중
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawingMode || !currentEventId) return;

    e.preventDefault();

    const point =
      'touches' in e
        ? getCanvasCoordinates(
            e.touches[0]?.clientX || 0,
            e.touches[0]?.clientY || 0
          )
        : getCanvasCoordinates(e.clientX, e.clientY);

    const newStroke = [...currentStroke, point];
    setCurrentStroke(newStroke);

    // 드로잉 업데이트 이벤트 발송
    const drawingEvent: DrawingEvent = {
      id: currentEventId,
      scoreId,
      pageNumber: currentPage,
      userId,
      tool: toolSettings.tool,
      points: newStroke,
      settings: toolSettings,
      isComplete: false,
      timestamp: new Date(),
    };

    onDrawingEvent(drawingEvent);
  };

  // 드로잉 종료
  const stopDrawing = () => {
    if (!isDrawing || !currentEventId) return;

    setIsDrawing(false);

    // 드로잉 완료 이벤트 발송
    const drawingEvent: DrawingEvent = {
      id: currentEventId,
      scoreId,
      pageNumber: currentPage,
      userId,
      tool: toolSettings.tool,
      points: currentStroke,
      settings: toolSettings,
      isComplete: true,
      timestamp: new Date(),
    };

    onDrawingEvent(drawingEvent);

    // 상태 초기화
    setCurrentStroke([]);
    setCurrentEventId(null);
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 touch-none"
      style={{
        cursor: isDrawingMode ? 'crosshair' : 'default',
        pointerEvents: isDrawingMode ? 'auto' : 'none',
        transform: `scale(${viewport.zoom}) translate(${viewport.offsetX}px, ${viewport.offsetY}px)`,
        transformOrigin: 'top left',
      }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
    />
  );
};
