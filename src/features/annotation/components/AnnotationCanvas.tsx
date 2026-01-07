// 주석 캔버스 컴포넌트 (js-draw 기반)

import { useEffect, useRef } from 'react';
import {
  Editor,
  EditorEventType,
  PenTool,
  EraserTool,
  Color4,
  Rect2,
} from 'js-draw';
import { MaterialIconProvider } from '@js-draw/material-icons';
import 'js-draw/styles';
import { useAnnotationStore } from '@/store/annotationStore';
import type { AnnotationTool } from '@/types';

interface AnnotationCanvasProps {
  // 배경 이미지 URL (악보)
  backgroundImage?: string;
  // 초기 SVG 데이터 (저장된 주석)
  initialSvg?: string;
  // 변경 시 콜백
  onChange?: (svgData: string) => void;
  // 읽기 전용 모드
  readOnly?: boolean;
  // 실시간 협업 콜백
  onStrokeStart?: (strokeId: string) => void;
  onStrokePoint?: (strokeId: string, x: number, y: number, pressure?: number) => void;
  onCursorMove?: (x: number, y: number) => void;
}

export function AnnotationCanvas({
  backgroundImage,
  initialSvg,
  onChange,
  readOnly = false,
  onStrokeStart,
  onStrokePoint,
  onCursorMove,
}: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const currentStrokeIdRef = useRef<string | null>(null);

  const { currentTool, currentColor, strokeWidth } = useAnnotationStore();

  // initialSvg를 ref로 추적 (재초기화 방지)
  const initialSvgRef = useRef<string | undefined>(initialSvg);
  const isInitializedRef = useRef(false);

  // 콜백들을 ref로 안정화 (useEffect 재실행 방지)
  const onChangeRef = useRef(onChange);
  const onStrokeStartRef = useRef(onStrokeStart);
  const onStrokePointRef = useRef(onStrokePoint);
  const onCursorMoveRef = useRef(onCursorMove);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onStrokeStartRef.current = onStrokeStart;
  }, [onStrokeStart]);
  useEffect(() => {
    onStrokePointRef.current = onStrokePoint;
  }, [onStrokePoint]);
  useEffect(() => {
    onCursorMoveRef.current = onCursorMove;
  }, [onCursorMove]);

  // 에디터 초기화 (한 번만 실행)
  useEffect(() => {
    if (!containerRef.current) return;

    // 이미 초기화되었으면 스킵
    if (isInitializedRef.current && editorRef.current) {
      return;
    }

    const settings = {
      iconProvider: new MaterialIconProvider(),
      wheelEventsEnabled: 'only-if-focused' as const,
    };

    const editor = new Editor(containerRef.current, settings);
    editorRef.current = editor;
    isInitializedRef.current = true;

    // 에디터 스타일 설정
    const rootElement = editor.getRootElement();
    rootElement.style.width = '100%';
    rootElement.style.height = '100%';
    rootElement.style.touchAction = 'none';

    // 초기 SVG 로드 (최초 1회만)
    const svg = initialSvgRef.current;
    const loadAndFit = async () => {
      try {
        if (svg) {
          await editor.loadFromSVG(svg);
        } else if (backgroundImage) {
          // 배경 이미지만 있는 경우 빈 캔버스 생성
          try {
            await createEmptyCanvas(editor, backgroundImage);
          } catch (error) {
            console.error('배경 이미지 로드 실패:', error);
            // 실패 시 기본 캔버스로 폴백
            await createDefaultCanvas(editor);
          }
        } else {
          // 악보 이미지도 없고 초기 SVG도 없는 경우 기본 캔버스 생성
          await createDefaultCanvas(editor);
        }

        // 로드 완료 후 뷰포트를 캔버스에 맞춤
        fitToScreen(editor);
      } catch (error) {
        console.error('SVG 로드 실패:', error);
      }
    };
    loadAndFit();

    // 변경 이벤트 리스너 (onChangeRef 사용으로 재초기화 방지)
    if (!readOnly) {
      const handleChange = () => {
        const svgData = editor.toSVG().outerHTML;
        onChangeRef.current?.(svgData);
      };

      // 드로잉 완료 시 저장 (CommandDone: 스트로크 완료 시)
      editor.notifier.on(EditorEventType.CommandDone, handleChange);
    }

    // 실시간 협업 이벤트 리스너 (에디터 초기화 후 바로 부착)
    let cleanupPointerEvents: (() => void) | null = null;
    if (!readOnly) {
      const container = containerRef.current;
      if (container) {
        // 포인터 이벤트 핸들러
        const handlePointerDown = (e: PointerEvent) => {
          // 마우스의 경우 왼쪽 버튼(button === 0)만 처리, 펜/터치는 모두 허용
          if (e.pointerType === 'mouse' && e.button !== 0) return;

          const strokeId = `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          currentStrokeIdRef.current = strokeId;

          const rect = container.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          onStrokeStartRef.current?.(strokeId);
          onStrokePointRef.current?.(strokeId, x, y, e.pressure);
        };

        const handlePointerMove = (e: PointerEvent) => {
          const rect = container.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          onCursorMoveRef.current?.(x, y);

          if (currentStrokeIdRef.current && e.buttons > 0) {
            onStrokePointRef.current?.(currentStrokeIdRef.current, x, y, e.pressure);
          }
        };

        const handlePointerUp = () => {
          currentStrokeIdRef.current = null;
        };

        // js-draw 에디터 루트에 capture: true로 이벤트 캡처
        rootElement.addEventListener('pointerdown', handlePointerDown, { capture: true });
        rootElement.addEventListener('pointermove', handlePointerMove, { capture: true });
        rootElement.addEventListener('pointerup', handlePointerUp, { capture: true });
        rootElement.addEventListener('pointerleave', handlePointerUp, { capture: true });

        cleanupPointerEvents = () => {
          rootElement.removeEventListener('pointerdown', handlePointerDown, { capture: true });
          rootElement.removeEventListener('pointermove', handlePointerMove, { capture: true });
          rootElement.removeEventListener('pointerup', handlePointerUp, { capture: true });
          rootElement.removeEventListener('pointerleave', handlePointerUp, { capture: true });
        };
      }
    }

    return () => {
      cleanupPointerEvents?.();
      editor.remove();
      editorRef.current = null;
      isInitializedRef.current = false;
    };
  }, [backgroundImage, readOnly]); // onChange 제거 - ref로 안정화됨

  // 도구 변경 시 에디터 업데이트
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || readOnly) return;

    applyTool(editor, currentTool, currentColor, strokeWidth);
  }, [currentTool, currentColor, strokeWidth, readOnly]);

  return (
    <div
      ref={containerRef}
      className="annotation-canvas relative h-full w-full overflow-hidden"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

// 기본 빈 캔버스 생성 (악보 이미지 없을 때)
async function createDefaultCanvas(editor: Editor) {
  const width = 800;
  const height = 600;
  // js-draw는 <rect> 등 일부 SVG 요소를 지원하지 않음
  // 빈 SVG만 생성하고 배경은 CSS로 처리
  const svgTemplate = `
    <svg
      viewBox="0 0 ${width} ${height}"
      width="${width}" height="${height}"
      version="1.1" baseProfile="full"
      xmlns="http://www.w3.org/2000/svg"
    ></svg>
  `;
  await editor.loadFromSVG(svgTemplate);
}

// 빈 캔버스 생성 (배경 이미지 포함)
async function createEmptyCanvas(editor: Editor, backgroundImage: string) {
  // CORS 이슈 해결: fetch로 이미지를 Blob URL로 변환
  // 브라우저 캐시 문제로 crossOrigin이 무시될 수 있으므로 fetch 사용
  const response = await fetch(backgroundImage, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`이미지 로드 실패: ${response.status}`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  // 이미지 크기 가져오기
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = blobUrl;
  });

  const width = img.width || 800;
  const height = img.height || 600;

  const svgTemplate = `
    <svg
      viewBox="0 0 ${width} ${height}"
      width="${width}" height="${height}"
      version="1.1" baseProfile="full"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
    >
      <image
        xlink:href="${blobUrl}"
        x="0" y="0"
        width="${width}" height="${height}"
        class="js-draw-image-background"
      />
    </svg>
  `;

  await editor.loadFromSVG(svgTemplate);

  // Blob URL 메모리 해제 (SVG에 로드된 후에는 불필요)
  URL.revokeObjectURL(blobUrl);
}

// 도구 적용
function applyTool(
  editor: Editor,
  tool: AnnotationTool,
  color: string,
  strokeWidth: number
) {
  const toolController = editor.toolController;

  // 색상 변환
  const drawColor = Color4.fromHex(color);

  // 모든 도구 비활성화
  const allPenTools = toolController.getMatchingTools(PenTool);
  const allEraserTools = toolController.getMatchingTools(EraserTool);
  allPenTools.forEach((t) => t.setEnabled(false));
  allEraserTools.forEach((t) => t.setEnabled(false));

  switch (tool) {
    case 'pen': {
      if (allPenTools.length > 0) {
        const pen = allPenTools[0];
        pen.setColor(drawColor);
        pen.setThickness(strokeWidth);
        pen.setEnabled(true);
      }
      break;
    }

    case 'highlighter': {
      if (allPenTools.length > 0) {
        const pen = allPenTools[0];
        // 형광펜은 반투명 색상
        const highlighterColor = drawColor.withAlpha(0.4);
        pen.setColor(highlighterColor);
        pen.setThickness(strokeWidth * 3); // 더 두꺼운 선
        pen.setEnabled(true);
      }
      break;
    }

    case 'eraser': {
      if (allEraserTools.length > 0) {
        allEraserTools[0].setEnabled(true);
      }
      break;
    }

    default:
      break;
  }
}

// 뷰포트를 캔버스 크기에 맞춤
function fitToScreen(editor: Editor) {
  const imageRect = editor.image.getImportExportRect();
  if (imageRect.width > 0 && imageRect.height > 0) {
    // 약간의 패딩을 추가하여 여백 확보
    const padding = 20;
    const paddedRect = new Rect2(
      imageRect.x - padding,
      imageRect.y - padding,
      imageRect.width + padding * 2,
      imageRect.height + padding * 2
    );
    const zoomCommand = editor.viewport.zoomTo(paddedRect, true, true);
    editor.dispatch(zoomCommand);
  }
}

export default AnnotationCanvas;
