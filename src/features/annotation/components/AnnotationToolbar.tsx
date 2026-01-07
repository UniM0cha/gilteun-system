// 주석 도구 바

import { Pen, Highlighter, Eraser, Undo, Redo, Save } from 'lucide-react';
import { useAnnotationStore } from '@/store/annotationStore';
import { cn } from '@/lib/cn';
import type { AnnotationTool } from '@/types';

// 색상 팔레트
const COLORS = [
  { value: '#000000', label: '검정' },
  { value: '#ef4444', label: '빨강' },
  { value: '#f97316', label: '주황' },
  { value: '#eab308', label: '노랑' },
  { value: '#22c55e', label: '초록' },
  { value: '#3b82f6', label: '파랑' },
  { value: '#8b5cf6', label: '보라' },
];

// 선 두께 옵션
const STROKE_WIDTHS = [
  { value: 2, label: '가늘게' },
  { value: 4, label: '보통' },
  { value: 8, label: '굵게' },
];

interface AnnotationToolbarProps {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function AnnotationToolbar({
  onSave,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: AnnotationToolbarProps) {
  const {
    currentTool,
    currentColor,
    strokeWidth,
    setCurrentTool,
    setCurrentColor,
    setStrokeWidth,
  } = useAnnotationStore();

  // 도구 버튼 정의
  const tools: { id: AnnotationTool; icon: typeof Pen; label: string }[] = [
    { id: 'pen', icon: Pen, label: '펜' },
    { id: 'highlighter', icon: Highlighter, label: '형광펜' },
    { id: 'eraser', icon: Eraser, label: '지우개' },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      {/* 도구 선택 */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
              title={tool.label}
              aria-label={tool.label}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>

      {/* 색상 선택 */}
      {currentTool !== 'eraser' && (
        <div className="flex items-center gap-1 border-r border-gray-200 px-2">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setCurrentColor(color.value)}
              className={cn(
                'h-6 w-6 rounded-full border-2 transition-transform',
                currentColor === color.value
                  ? 'scale-110 border-gray-900'
                  : 'border-transparent hover:scale-105'
              )}
              style={{ backgroundColor: color.value }}
              title={color.label}
              aria-label={color.label}
            />
          ))}
        </div>
      )}

      {/* 선 두께 */}
      {currentTool !== 'eraser' && (
        <div className="flex items-center gap-1 border-r border-gray-200 px-2">
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width.value}
              onClick={() => setStrokeWidth(width.value)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                strokeWidth === width.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
              title={width.label}
              aria-label={width.label}
            >
              <div
                className="rounded-full bg-current"
                style={{
                  width: `${width.value * 2}px`,
                  height: `${width.value * 2}px`,
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* 실행취소/다시실행 */}
      <div className="flex items-center gap-1 border-r border-gray-200 px-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
            canUndo
              ? 'text-gray-600 hover:bg-gray-100'
              : 'cursor-not-allowed text-gray-300'
          )}
          title="실행취소"
          aria-label="실행취소"
        >
          <Undo className="h-5 w-5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
            canRedo
              ? 'text-gray-600 hover:bg-gray-100'
              : 'cursor-not-allowed text-gray-300'
          )}
          title="다시실행"
          aria-label="다시실행"
        >
          <Redo className="h-5 w-5" />
        </button>
      </div>

      {/* 저장 */}
      {onSave && (
        <button
          onClick={onSave}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Save className="h-4 w-4" />
          저장
        </button>
      )}
    </div>
  );
}

export default AnnotationToolbar;
