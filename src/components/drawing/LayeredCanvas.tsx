import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Annotation } from '../../types';

/**
 * 레이어별 Canvas 분리 시스템
 * - 각 사용자별 독립 Canvas 레이어 생성
 * - 변경된 레이어만 재렌더링
 * - 메모리 효율적인 레이어 관리
 */

interface LayeredCanvasProps {
  annotations: Map<string, Annotation[]>;
  width: number;
  height: number;
  layerVisibility: Record<string, boolean>;
  viewportBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface LayerState {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  isDirty: boolean;
  lastUpdate: number;
}

export const LayeredCanvas: React.FC<LayeredCanvasProps> = ({
  annotations,
  width,
  height,
  layerVisibility,
  viewportBounds,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const layersRef = useRef<Map<string, LayerState>>(new Map());
  const rafRef = useRef<number | null>(null);
  const [renderMetrics, setRenderMetrics] = useState({
    layerCount: 0,
    renderedLayers: 0,
    culledElements: 0,
    memoryUsage: 0,
  });

  // OffscreenCanvas 지원 확인
  const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

  // 레이어 생성 또는 가져오기
  const getOrCreateLayer = useCallback(
    (userId: string): LayerState => {
      if (!layersRef.current.has(userId)) {
        let canvas: OffscreenCanvas | HTMLCanvasElement;
        let context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

        if (supportsOffscreenCanvas) {
          canvas = new OffscreenCanvas(width, height);
          context = canvas.getContext('2d');
        } else {
          canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          context = canvas.getContext('2d');
        }

        if (!context) {
          throw new Error('Failed to create canvas context');
        }

        layersRef.current.set(userId, {
          canvas,
          context,
          isDirty: true,
          lastUpdate: Date.now(),
        });
      }

      return layersRef.current.get(userId)!;
    },
    [width, height, supportsOffscreenCanvas],
  );

  // Viewport Culling - 화면 밖 요소 제외
  const isInViewport = useCallback(
    (svgPath: string): boolean => {
      if (!viewportBounds) return true;

      // SVG 패스를 파싱하여 대략적인 바운딩 박스 계산
      // 실제 구현에서는 더 정교한 계산 필요
      const pathMatch = svgPath.match(/M\s*([\d.]+)\s+([\d.]+)/);
      if (!pathMatch) return true;

      const x = parseFloat(pathMatch[1]);
      const y = parseFloat(pathMatch[2]);

      return (
        x >= viewportBounds.x - 100 &&
        x <= viewportBounds.x + viewportBounds.width + 100 &&
        y >= viewportBounds.y - 100 &&
        y <= viewportBounds.y + viewportBounds.height + 100
      );
    },
    [viewportBounds],
  );

  // 개별 레이어 렌더링
  const renderLayer = useCallback(
    (userId: string, userAnnotations: Annotation[]) => {
      const layer = getOrCreateLayer(userId);
      const { context } = layer;

      // 레이어가 더티 상태가 아니면 스킵
      if (!layer.isDirty) return;

      // 캔버스 초기화
      context.clearRect(0, 0, width, height);

      let culledCount = 0;
      let renderedCount = 0;

      // 주석 렌더링
      userAnnotations.forEach((annotation) => {
        // Viewport culling
        if (!isInViewport(annotation.svgPath)) {
          culledCount++;
          return;
        }

        // SVG 패스를 Canvas Path2D로 변환
        const path = new Path2D(annotation.svgPath);

        // 스타일 설정
        context.strokeStyle = annotation.color;
        context.globalAlpha = annotation.opacity || 1;
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';

        // 도구별 렌더링
        if (annotation.tool === 'highlighter') {
          context.globalAlpha = 0.4;
          context.lineWidth = 10;
        } else if (annotation.tool === 'eraser') {
          context.globalCompositeOperation = 'destination-out';
        }

        // 패스 그리기
        context.stroke(path);

        // 설정 초기화
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = 1;

        renderedCount++;
      });

      // 레이어 상태 업데이트
      layer.isDirty = false;
      layer.lastUpdate = Date.now();

      return { culledCount, renderedCount };
    },
    [getOrCreateLayer, width, height, isInViewport],
  );

  // 메인 캔버스에 레이어 합성
  const compositeLayersToMainCanvas = useCallback(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;

    const mainContext = mainCanvas.getContext('2d');
    if (!mainContext) return;

    // 메인 캔버스 초기화
    mainContext.clearRect(0, 0, width, height);

    let totalRenderedLayers = 0;
    let totalCulledElements = 0;

    // 레이어 순서대로 합성
    annotations.forEach((userAnnotations, userId) => {
      // 레이어 가시성 확인
      if (layerVisibility[userId] === false) return;

      // 레이어 렌더링
      const stats = renderLayer(userId, userAnnotations);
      if (stats) {
        totalCulledElements += stats.culledCount;
      }

      // 레이어를 메인 캔버스에 합성
      const layer = layersRef.current.get(userId);
      if (layer) {
        if (layer.canvas instanceof HTMLCanvasElement) {
          mainContext.drawImage(layer.canvas, 0, 0);
        } else {
          // OffscreenCanvas의 경우 ImageBitmap으로 변환 필요
          (layer.canvas as OffscreenCanvas).convertToBlob().then((blob) => {
            createImageBitmap(blob).then((bitmap) => {
              mainContext.drawImage(bitmap, 0, 0);
              bitmap.close(); // 메모리 해제
            });
          });
        }
        totalRenderedLayers++;
      }
    });

    // 렌더링 메트릭스 업데이트
    setRenderMetrics({
      layerCount: layersRef.current.size,
      renderedLayers: totalRenderedLayers,
      culledElements: totalCulledElements,
      memoryUsage: estimateMemoryUsage(),
    });
  }, [annotations, layerVisibility, width, height, renderLayer]);

  // 메모리 사용량 추정
  const estimateMemoryUsage = useCallback((): number => {
    // 각 캔버스는 width * height * 4 bytes (RGBA) 사용
    const bytesPerCanvas = width * height * 4;
    const totalCanvases = layersRef.current.size;
    const totalBytes = bytesPerCanvas * totalCanvases;
    return Math.round(totalBytes / (1024 * 1024)); // MB 단위
  }, [width, height]);

  // 렌더링 루프
  const renderLoop = useCallback(() => {
    compositeLayersToMainCanvas();
    rafRef.current = requestAnimationFrame(renderLoop);
  }, [compositeLayersToMainCanvas]);

  // 주석 변경 시 해당 레이어만 더티 마킹
  useEffect(() => {
    annotations.forEach((_, userId) => {
      const layer = layersRef.current.get(userId);
      if (layer) {
        layer.isDirty = true;
      }
    });
  }, [annotations]);

  // 레이어 가시성 변경 시 재렌더링
  useEffect(() => {
    compositeLayersToMainCanvas();
  }, [layerVisibility, compositeLayersToMainCanvas]);

  // 렌더링 루프 시작/종료
  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      // 메모리 정리
      layersRef.current.forEach((layer) => {
        // OffscreenCanvas는 자동으로 GC됨
        if (layer.canvas instanceof HTMLCanvasElement) {
          layer.canvas.width = 0;
          layer.canvas.height = 0;
        }
      });
      layersRef.current.clear();
    };
  }, [renderLoop]);

  // 메모리 임계값 관리
  useEffect(() => {
    const checkMemoryThreshold = () => {
      const currentMemory = estimateMemoryUsage();
      if (currentMemory > 500) {
        // 500MB 임계값
        // 오래된 레이어 정리
        const now = Date.now();
        const threshold = 60000; // 1분간 사용하지 않은 레이어

        layersRef.current.forEach((layer, userId) => {
          if (now - layer.lastUpdate > threshold && !layerVisibility[userId]) {
            layersRef.current.delete(userId);
          }
        });
      }
    };

    const memoryCheckInterval = setInterval(checkMemoryThreshold, 30000); // 30초마다 체크
    return () => clearInterval(memoryCheckInterval);
  }, [estimateMemoryUsage, layerVisibility]);

  return (
    <div ref={containerRef} className="layered-canvas-container" style={{ position: 'relative' }}>
      <canvas
        ref={mainCanvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />

      {/* 성능 메트릭스 디버그 표시 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}
        >
          <div>
            Layers: {renderMetrics.renderedLayers}/{renderMetrics.layerCount}
          </div>
          <div>Culled: {renderMetrics.culledElements} elements</div>
          <div>Memory: ~{renderMetrics.memoryUsage}MB</div>
        </div>
      )}
    </div>
  );
};

export default LayeredCanvas;
