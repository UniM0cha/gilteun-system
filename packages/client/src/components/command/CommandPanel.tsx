import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Send, Plus, Settings } from 'lucide-react';
import type { CommandTarget, CommandTemplate } from '@gilton/shared';

interface CommandPanelProps {
  userRole: 'session' | 'leader' | 'admin';
  onSendCommand: (command: {
    content: string;
    icon?: string;
    target: CommandTarget;
  }) => void;
  commandTemplates: CommandTemplate[];
  onManageTemplates?: () => void;
  className?: string;
}

const DEFAULT_TEMPLATES: CommandTemplate[] = [
  {
    id: 'verse-1',
    name: '1절로',
    content: '1절로 이동',
    icon: '1️⃣',
    userId: 'system',
    isGlobal: true,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'verse-2',
    name: '2절로',
    content: '2절로 이동',
    icon: '2️⃣',
    userId: 'system',
    isGlobal: true,
    order: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'chorus',
    name: '후렴',
    content: '후렴으로 이동',
    icon: '🎵',
    userId: 'system',
    isGlobal: true,
    order: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'bridge',
    name: '브릿지',
    content: '브릿지로 이동',
    icon: '🌉',
    userId: 'system',
    isGlobal: true,
    order: 4,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'repeat',
    name: '반복',
    content: '다시 한번',
    icon: '🔄',
    userId: 'system',
    isGlobal: true,
    order: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'stop',
    name: '정지',
    content: '연주 정지',
    icon: '⏹️',
    userId: 'system',
    isGlobal: true,
    order: 6,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'slower',
    name: '천천히',
    content: '템포 천천히',
    icon: '🐌',
    userId: 'system',
    isGlobal: true,
    order: 7,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'faster',
    name: '빨리',
    content: '템포 빠르게',
    icon: '🏃',
    userId: 'system',
    isGlobal: true,
    order: 8,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const CommandPanel = ({
  userRole,
  onSendCommand,
  commandTemplates,
  onManageTemplates,
  className
}: CommandPanelProps) => {
  const [customCommand, setCustomCommand] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<CommandTarget>('all');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // 권한 체크
  const canSendCommands = userRole === 'leader' || userRole === 'admin';
  
  if (!canSendCommands) {
    return null; // 권한이 없으면 패널을 표시하지 않음
  }

  // 사용할 템플릿 (기본 + 사용자 정의)
  const allTemplates = [
    ...DEFAULT_TEMPLATES,
    ...commandTemplates.filter(template => !template.isGlobal)
  ].sort((a, b) => a.order - b.order);

  const handleTemplateClick = (template: CommandTemplate) => {
    onSendCommand({
      content: template.content,
      icon: template.icon,
      target: selectedTarget
    });
  };

  const handleCustomSend = () => {
    if (!customCommand.trim()) return;
    
    onSendCommand({
      content: customCommand.trim(),
      target: selectedTarget
    });
    
    setCustomCommand('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCustomSend();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">명령 전송</CardTitle>
            <CardDescription>
              팀원들에게 실시간으로 지시사항을 전달하세요
            </CardDescription>
          </div>
          {onManageTemplates && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageTemplates}
              className="p-2"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 대상 선택 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">대상 선택</Label>
          <RadioGroup
            value={selectedTarget}
            onValueChange={(value) => setSelectedTarget(value as CommandTarget)}
            className="flex flex-row space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="target-all" />
              <Label htmlFor="target-all" className="text-sm">전체</Label>
            </div>
            {userRole === 'admin' && (
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="leaders" id="target-leaders" />
                <Label htmlFor="target-leaders" className="text-sm">인도자만</Label>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sessions" id="target-sessions" />
              <Label htmlFor="target-sessions" className="text-sm">세션만</Label>
            </div>
          </RadioGroup>
        </div>

        {/* 모드 전환 */}
        <div className="flex space-x-2">
          <Button
            variant={!isCustomMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsCustomMode(false)}
            className="flex-1"
          >
            빠른 명령
          </Button>
          <Button
            variant={isCustomMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsCustomMode(true)}
            className="flex-1"
          >
            직접 입력
          </Button>
        </div>

        {!isCustomMode ? (
          /* 빠른 명령 버튼들 */
          <div className="space-y-3">
            <Label className="text-sm font-medium">빠른 명령</Label>
            <div className="grid grid-cols-2 gap-2">
              {allTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  onClick={() => handleTemplateClick(template)}
                  className="h-12 flex flex-col items-center justify-center space-y-1 text-xs"
                >
                  {template.icon && (
                    <span className="text-base">{template.icon}</span>
                  )}
                  <span>{template.name}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          /* 직접 입력 모드 */
          <div className="space-y-3">
            <Label className="text-sm font-medium">직접 입력</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="명령을 입력하세요..."
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                onKeyPress={handleKeyPress}
                maxLength={100}
                className="flex-1"
              />
              <Button
                onClick={handleCustomSend}
                disabled={!customCommand.trim()}
                size="sm"
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter를 눌러서 전송하거나 전송 버튼을 클릭하세요
            </p>
          </div>
        )}

        {/* 사용자 정의 템플릿 추가 */}
        {onManageTemplates && (
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onManageTemplates}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              사용자 정의 명령 관리
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};