import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Pen, 
  Highlighter, 
  Eraser, 
  Palette,
  Eye,
  EyeOff
} from 'lucide-react';
import type { DrawingTool, DrawingToolSettings } from '@gilteun/shared';

interface DrawingToolbarProps {
  toolSettings: DrawingToolSettings;
  onToolSettingsChange: (settings: DrawingToolSettings) => void;
  isDrawingMode: boolean;
  onDrawingModeChange: (enabled: boolean) => void;
  className?: string;
}

const PRESET_COLORS = [
  '#000000', // 검정
  '#ff0000', // 빨강
  '#0000ff', // 파랑
  '#00ff00', // 초록
  '#ffff00', // 노랑
  '#ff6600', // 주황
  '#800080', // 보라
  '#008080', // 청록
];

const TOOL_CONFIG = {
  pen: {
    icon: Pen,
    name: '펜',
    defaultWidth: 2,
    widthRange: [1, 10]
  },
  highlighter: {
    icon: Highlighter,
    name: '형광펜',
    defaultWidth: 8,
    widthRange: [4, 20]
  },
  eraser: {
    icon: Eraser,
    name: '지우개',
    defaultWidth: 10,
    widthRange: [5, 30]
  }
};

export const DrawingToolbar = ({
  toolSettings,
  onToolSettingsChange,
  isDrawingMode,
  onDrawingModeChange,
  className
}: DrawingToolbarProps) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleToolChange = (tool: DrawingTool) => {
    const config = TOOL_CONFIG[tool];
    onToolSettingsChange({
      ...toolSettings,
      tool,
      strokeWidth: config.defaultWidth
    });
  };

  const handleColorChange = (color: string) => {
    onToolSettingsChange({
      ...toolSettings,
      color
    });
    setShowColorPicker(false);
  };

  const handleWidthChange = (width: number[]) => {
    onToolSettingsChange({
      ...toolSettings,
      strokeWidth: width[0]
    });
  };

  const currentToolConfig = TOOL_CONFIG[toolSettings.tool];

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          {/* 드로잉 모드 토글 */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">드로잉 모드</Label>
            <Button
              variant={isDrawingMode ? "default" : "outline"}
              size="sm"
              onClick={() => onDrawingModeChange(!isDrawingMode)}
              className="flex items-center space-x-2"
            >
              {isDrawingMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span>{isDrawingMode ? '활성화' : '비활성화'}</span>
            </Button>
          </div>

          {/* 도구 선택 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">도구 선택</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TOOL_CONFIG).map(([tool, config]) => {
                const Icon = config.icon;
                const isActive = toolSettings.tool === tool;

                return (
                  <Button
                    key={tool}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToolChange(tool as DrawingTool)}
                    className="flex flex-col items-center space-y-1 h-16"
                    disabled={!isDrawingMode}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{config.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 색상 선택 (펜과 형광펜에만 표시) */}
          {toolSettings.tool !== 'eraser' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">색상</Label>
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <Button
                      key={color}
                      variant="outline"
                      size="sm"
                      onClick={() => handleColorChange(color)}
                      className="h-8 p-0 relative"
                      style={{ backgroundColor: color }}
                      disabled={!isDrawingMode}
                    >
                      {toolSettings.color === color && (
                        <div className="absolute inset-0 border-2 border-white rounded" />
                      )}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-full flex items-center space-x-2"
                  disabled={!isDrawingMode}
                >
                  <Palette className="h-4 w-4" />
                  <span>사용자 색상</span>
                </Button>

                {showColorPicker && (
                  <div className="p-2 border rounded">
                    <input
                      type="color"
                      value={toolSettings.color}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-full h-8"
                      disabled={!isDrawingMode}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 굵기 설정 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {currentToolConfig.name} 굵기
              </Label>
              <span className="text-sm text-muted-foreground">
                {toolSettings.strokeWidth}px
              </span>
            </div>
            <Slider
              value={[toolSettings.strokeWidth]}
              onValueChange={handleWidthChange}
              min={currentToolConfig.widthRange[0]}
              max={currentToolConfig.widthRange[1]}
              step={1}
              className="w-full"
              disabled={!isDrawingMode}
            />
          </div>

          {/* 미리보기 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">미리보기</Label>
            <div className="h-12 bg-muted rounded flex items-center justify-center">
              <div
                className="rounded-full"
                style={{
                  width: `${toolSettings.strokeWidth}px`,
                  height: `${toolSettings.strokeWidth}px`,
                  backgroundColor: toolSettings.tool === 'eraser' ? '#666' : toolSettings.color,
                  opacity: toolSettings.tool === 'highlighter' ? 0.3 : 1
                }}
              />
            </div>
          </div>

          {/* 도구 설명 */}
          <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
            <strong>{currentToolConfig.name}:</strong>
            <br />
            {toolSettings.tool === 'pen' && '정밀한 드로잉에 적합합니다.'}
            {toolSettings.tool === 'highlighter' && '텍스트 강조에 적합합니다.'}
            {toolSettings.tool === 'eraser' && '그려진 내용을 지웁니다.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};