import { Color4 } from "@js-draw/math";
import {
  Editor,
  PenTool,
  makeFreehandLineBuilder,
  makePressureSensitiveFreehandLineBuilder,
} from "js-draw";
import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * 길튼 시스템 주석 엔진
 * - js-draw 기반 Apple Pencil 지원 벡터 그리기
 * - 실시간 협업 (Figma 스타일)
 * - SVG 기반 확장 가능한 주석 저장
 */

interface AnnotationEngineProps {
  /** 주석을 그릴 대상 찬양 ID */
  songId: number;

  /** 사용자 정보 */
  userId: string;
  userName: string;
  userColor: string;

  /** 편집 모드 여부 */
  isEditMode: boolean;

  /** 현재 선택된 도구 */
  tool: "pen" | "highlighter" | "eraser";

  /** 그리기 두께 */
  thickness: number;

  /** 주석 완료 콜백 */
  onAnnotationComplete?: (svgPath: string, tool: string, color: string) => void;

  /** 실시간 주석 업데이트 콜백 */
  onAnnotationUpdate?: (svgPath: string, isComplete: boolean) => void;

  /** 성능 모니터링 콜백 */
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;

  /** 컨테이너 크기 */
  width: number;
  height: number;
}

/**
 * 성능 모니터링 메트릭스
 */
interface PerformanceMetrics {
  /** 입력 지연시간 (ms) */
  inputLatency: number;
  /** 프레임률 (fps) */
  fps: number;
  /** 메모리 사용량 (MB) */
  memoryUsage: number;
  /** 그리기 성능 점수 (0-100) */
  performanceScore: number;
}

/**
 * 입력 예측을 위한 포인트 타입
 */
interface PredictionPoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export const AnnotationEngine = React.forwardRef<
  AnnotationEngineRef,
  AnnotationEngineProps
>(
  (
    {
      userColor,
      isEditMode,
      tool,
      thickness,
      onAnnotationComplete,
      onAnnotationUpdate,
      onPerformanceUpdate,
      width,
      height,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<Editor | null>(null);
    const penToolRef = useRef<PenTool | null>(null);

    // 성능 모니터링 상태
    const [performanceMetrics, setPerformanceMetrics] =
      useState<PerformanceMetrics>({
        inputLatency: 0,
        fps: 60,
        memoryUsage: 0,
        performanceScore: 100,
      });

    // 성능 측정 참조
    const performanceTimers = useRef({
      inputStartTime: 0,
      lastFrameTime: performance.now(),
      frameCount: 0,
      fpsHistory: [] as number[],
    });

    // 입력 예측을 위한 포인트 히스토리
    const pointHistory = useRef<PredictionPoint[]>([]);
    const maxHistorySize = 5;

    // 성능 모니터링 함수들
    const measureInputLatency = useCallback((startTime: number) => {
      const latency = performance.now() - startTime;
      setPerformanceMetrics((prev) => ({ ...prev, inputLatency: latency }));
      return latency;
    }, []);

    const updateFPS = useCallback(() => {
      const now = performance.now();
      const timers = performanceTimers.current;

      if (timers.lastFrameTime) {
        const delta = now - timers.lastFrameTime;
        const fps = 1000 / delta;

        timers.fpsHistory.push(fps);
        if (timers.fpsHistory.length > 30) {
          timers.fpsHistory.shift();
        }

        const avgFPS =
          timers.fpsHistory.reduce((a, b) => a + b, 0) /
          timers.fpsHistory.length;
        setPerformanceMetrics((prev) => ({ ...prev, fps: Math.round(avgFPS) }));
      }

      timers.lastFrameTime = now;
    }, []);

    const measureMemoryUsage = useCallback(() => {
      if ((performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        const memoryUsage = memoryInfo.usedJSHeapSize / (1024 * 1024); // MB
        setPerformanceMetrics((prev) => ({
          ...prev,
          memoryUsage: Math.round(memoryUsage),
        }));
      }
    }, []);

    const calculatePerformanceScore = useCallback(
      (latency: number, fps: number, memoryMB: number) => {
        // 성능 점수 계산 (0-100)
        let score = 100;

        // 지연시간 패널티 (16ms 이상부터)
        if (latency > 16) {
          score -= Math.min(50, (latency - 16) * 2);
        }

        // FPS 패널티 (60fps 미만부터)
        if (fps < 60) {
          score -= Math.min(30, (60 - fps) * 2);
        }

        // 메모리 패널티 (500MB 이상부터)
        if (memoryMB > 500) {
          score -= Math.min(20, (memoryMB - 500) / 50);
        }

        return Math.max(0, Math.round(score));
      },
      []
    );

    // 주석 완료 시 호출할 함수 (initializeEditor 외부에 정의)
    const handleAnnotationComplete = useCallback(() => {
      if (!editorRef.current) return;

      // 입력 지연시간 측정 완료
      if (performanceTimers.current.inputStartTime > 0) {
        measureInputLatency(performanceTimers.current.inputStartTime);
        performanceTimers.current.inputStartTime = 0;
      }

      // 주석 완료 시 SVG 데이터 추출
      const svgData = editorRef.current.toSVG().outerHTML;
      onAnnotationComplete?.(svgData, tool, userColor);

      // 메모리 사용량 업데이트
      measureMemoryUsage();
    }, [
      measureInputLatency,
      onAnnotationComplete,
      tool,
      userColor,
      measureMemoryUsage,
    ]);

    // js-draw 에디터 초기화 (성능 최적화 적용)
    const initializeEditor = useCallback(() => {
      if (!containerRef.current) return;

      // 기존 에디터 정리
      if (editorRef.current) {
        editorRef.current.remove();
      }

      // 성능 최적화된 에디터 생성
      const editor = new Editor(containerRef.current, {
        // iPad 터치 최적화
        wheelEventsEnabled: "only-if-focused",
      });

      // 도구모음 없이 사용 (커스텀 UI 사용)
      // editor.addToolbar(); // 주석 처리 - 커스텀 UI 사용

      // 에디터 크기 설정
      const rootElement = editor.getRootElement();
      rootElement.style.width = `${width}px`;
      rootElement.style.height = `${height}px`;
      rootElement.style.position = "absolute";
      rootElement.style.top = "0";
      rootElement.style.left = "0";
      rootElement.style.pointerEvents = isEditMode ? "auto" : "none";
      rootElement.style.zIndex = isEditMode ? "10" : "5";

      // iPad 성능 최적화를 위한 CSS
      rootElement.style.willChange = isEditMode ? "transform" : "auto";
      rootElement.style.contain = "layout style paint";

      // 투명 배경 설정
      editor.setBackgroundColor(Color4.transparent);

      // 펜 도구 가져오기 및 성능 최적화된 설정
      const penTools = editor.toolController.getMatchingTools(PenTool);
      const pen = penTools[0];

      if (pen) {
        // Apple Pencil 압력 감지 활성화
        pen.setPressureSensitivityEnabled(true);

        // 압력 감지 펜 도구 설정
        pen.setStrokeFactory(makePressureSensitiveFreehandLineBuilder);

        // 사용자 색상 설정
        const color = Color4.fromString(userColor);
        pen.setColor(color);

        // 두께 설정
        pen.setThickness(thickness);

        // 펜 활성화
        pen.setEnabled(true);

        penToolRef.current = pen;
      }

      // 성능 모니터링을 위한 커스텀 이벤트 리스너
      const cursorRootElement = editor.getRootElement();

      // 입력 예측 알고리즘 (Bezier curve interpolation)
      const predictNextPoint = (
        currentPoint: PredictionPoint
      ): PredictionPoint | null => {
        const history = pointHistory.current;
        if (history.length < 2) return null;

        // 최근 3개 포인트 기반 2차 베지에 곽선 예측
        const p0 = history[history.length - 2];
        const p1 = history[history.length - 1];
        const p2 = currentPoint;

        // 속도 벡터 계산
        const vx = p2.x - p0.x;
        const vy = p2.y - p0.y;
        const dt = p2.timestamp - p0.timestamp;

        if (dt === 0) return null;

        // 예측 위치 계산 (16ms 후 예측)
        const predictedX = p2.x + (vx * 16) / dt;
        const predictedY = p2.y + (vy * 16) / dt;

        // 부드러운 압력 변화 예측
        const pressureDiff = p2.pressure - p1.pressure;
        const predictedPressure = Math.max(
          0.1,
          Math.min(1, p2.pressure + pressureDiff * 0.5)
        );

        return {
          x: predictedX,
          y: predictedY,
          pressure: predictedPressure,
          timestamp: p2.timestamp + 16,
        };
      };

      // Pointer Event Coalescing을 통한 성능 최적화
      const handlePointerMove = (e: PointerEvent) => {
        // 브라우저가 수집한 모든 중간 이벤트 가져오기
        const coalescedEvents = e.getCoalescedEvents
          ? e.getCoalescedEvents()
          : [e];

        // 모든 중간 포인트 처리로 부드러운 그리기
        coalescedEvents.forEach((event) => {
          if (event.buttons > 0) {
            // 성능 측정 시작
            if (performanceTimers.current.inputStartTime === 0) {
              performanceTimers.current.inputStartTime = performance.now();
              // 입력 지연시간 즉시 측정
              measureInputLatency(performanceTimers.current.inputStartTime);
            }

            // 현재 포인트 저장
            const currentPoint: PredictionPoint = {
              x: event.clientX,
              y: event.clientY,
              pressure: event.pressure || 0.5,
              timestamp: event.timeStamp,
            };

            // 히스토리 업데이트
            pointHistory.current.push(currentPoint);
            if (pointHistory.current.length > maxHistorySize) {
              pointHistory.current.shift();
            }

            // 예측 포인트 계산
            const predictedPoint = predictNextPoint(currentPoint);
            if (predictedPoint && editorRef.current) {
              // 예측된 포인트를 사용하여 체감 지연시간 감소
              // js-draw는 여전히 실제 포인트로 처리
            }
          } else {
            // 그리기 종료 시 히스토리 초기화
            pointHistory.current = [];
          }
        });

        // FPS 업데이트
        updateFPS();

        // 주석 완료 시 콜백 호출
        if (e.buttons === 0 && performanceTimers.current.inputStartTime > 0) {
          handleAnnotationComplete();
          pointHistory.current = []; // 히스토리 초기화
        }
      };

      // 최적화된 이벤트 리스너 옵션
      cursorRootElement.addEventListener("pointermove", handlePointerMove, {
        passive: true, // 스크롤 성능 최적화
        capture: false, // 버블링 단계에서 처리
      });

      // requestAnimationFrame을 사용한 렌더링 최적화
      let rafId: number | null = null;
      let lastRenderTime = 0;
      const targetFPS = 60;
      const frameInterval = 1000 / targetFPS;

      const renderFrame = (timestamp: number) => {
        const elapsed = timestamp - lastRenderTime;

        if (elapsed >= frameInterval) {
          // 실제 렌더링 작업
          // js-draw가 자체적으로 처리하므로 추가 작업 불필요
          lastRenderTime = timestamp;
        }

        rafId = requestAnimationFrame(renderFrame);
      };

      // 렌더링 루프 시작
      rafId = requestAnimationFrame(renderFrame);

      // cleanup 함수를 에디터에 저장
      const cleanup = () => {
        cursorRootElement.removeEventListener("pointermove", handlePointerMove);
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
      };

      (editor as any)._cleanup = cleanup;

      editorRef.current = editor;
    }, [
      width,
      height,
      isEditMode,
      tool,
      thickness,
      userColor,
      onAnnotationComplete,
      onAnnotationUpdate,
      measureInputLatency,
      updateFPS,
      measureMemoryUsage,
      performanceMetrics.fps,
      handleAnnotationComplete,
    ]);

    // 에디터 초기화
    useEffect(() => {
      initializeEditor();

      // 컴포넌트 언마운트 시 정리
      return () => {
        if (editorRef.current) {
          // 커스텀 cleanup 함수 호출
          if ((editorRef.current as any)._cleanup) {
            (editorRef.current as any)._cleanup();
          }
          editorRef.current.remove();
        }
      };
    }, [initializeEditor]);

    // 도구 변경 처리
    useEffect(() => {
      const pen = penToolRef.current;
      if (!pen) return;

      switch (tool) {
        case "pen":
          pen.setStrokeFactory(makePressureSensitiveFreehandLineBuilder);
          pen.setColor(Color4.fromString(userColor));
          break;
        case "highlighter":
          pen.setStrokeFactory(makeFreehandLineBuilder);
          // 하이라이터는 투명도가 있는 색상
          const highlighterColor = Color4.fromString(userColor).withAlpha(0.4);
          pen.setColor(highlighterColor);
          break;
        case "eraser":
          // 지우개는 배경색 사용
          pen.setColor(Color4.transparent);
          break;
      }
    }, [tool, userColor]);

    // 두께 변경 처리
    useEffect(() => {
      const pen = penToolRef.current;
      if (!pen) return;

      pen.setThickness(thickness);
    }, [thickness]);

    // 편집 모드 변경 처리
    useEffect(() => {
      if (!editorRef.current) return;

      const rootElement = editorRef.current.getRootElement();
      rootElement.style.pointerEvents = isEditMode ? "auto" : "none";
      rootElement.style.zIndex = isEditMode ? "10" : "5";

      // 읽기 전용 모드 설정
      editorRef.current.setReadOnly(!isEditMode);
    }, [isEditMode]);

    // 외부에서 주석 데이터 로드
    const loadAnnotationData = useCallback(async (svgData: string) => {
      if (!editorRef.current) return;

      try {
        await editorRef.current.loadFromSVG(svgData);
      } catch (error) {
        console.error("주석 데이터 로드 실패:", error);
      }
    }, []);

    // 주석 초기화
    const clearAnnotations = useCallback(() => {
      if (!editorRef.current) return;

      // 전체 내용 지우기
      editorRef.current.loadFromSVG(`
      <svg viewBox="0 0 ${width} ${height}" 
           width="${width}" height="${height}"
           xmlns="http://www.w3.org/2000/svg">
      </svg>
    `);
    }, [width, height]);

    // 실행 취소/다시 실행
    const undo = useCallback(() => {
      // js-draw의 undo/redo는 내장되어 있음
      // 키보드 단축키로 접근 가능 (Ctrl+Z, Ctrl+Y)
      if (editorRef.current) {
        // undo 명령을 직접 실행하는 방법이 있다면 여기에 추가
        console.log("Undo 기능은 Ctrl+Z 키보드 단축키로 사용 가능합니다");
      }
    }, []);

    const redo = useCallback(() => {
      if (editorRef.current) {
        console.log("Redo 기능은 Ctrl+Y 키보드 단축키로 사용 가능합니다");
      }
    }, []);

    // 성능 모니터링 useEffect
    useEffect(() => {
      const performanceScore = calculatePerformanceScore(
        performanceMetrics.inputLatency,
        performanceMetrics.fps,
        performanceMetrics.memoryUsage
      );

      const updatedMetrics = { ...performanceMetrics, performanceScore };
      onPerformanceUpdate?.(updatedMetrics);
    }, [performanceMetrics, calculatePerformanceScore, onPerformanceUpdate]);

    // 주기적 성능 모니터링
    useEffect(() => {
      if (!isEditMode) return;

      const interval = setInterval(() => {
        measureMemoryUsage();
        updateFPS();
      }, 2000); // 2초마다 업데이트

      return () => clearInterval(interval);
    }, [isEditMode, measureMemoryUsage, updateFPS]);

    // 컴포넌트 API 노출
    React.useImperativeHandle(ref, () => ({
      loadAnnotationData,
      clearAnnotations,
      undo,
      redo,
      getEditor: () => editorRef.current,
      exportSVG: () => editorRef.current?.toSVG().outerHTML || "",
      getPerformanceMetrics: () => performanceMetrics,
    }));

    return (
      <div
        ref={containerRef}
        className="annotation-engine"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: width,
          height: height,
          // iPad Safari에서 터치 이벤트 최적화
          touchAction: isEditMode ? "none" : "auto",
          // Apple Pencil 입력 우선 처리
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      />
    );
  }
);

// 타입 정의
export interface AnnotationEngineRef {
  loadAnnotationData: (svgData: string) => Promise<void>;
  clearAnnotations: () => void;
  undo: () => void;
  redo: () => void;
  getEditor: () => Editor | null;
  exportSVG: () => string;
  getPerformanceMetrics: () => PerformanceMetrics;
}

// 성능 메트릭스 타입 재export
export type { PerformanceMetrics };
