import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  GripVertical, 
  Save
} from 'lucide-react';
import type { CommandTemplate } from '@gilton/shared';

interface CommandTemplateManagerProps {
  templates: CommandTemplate[];
  onAdd: (template: Omit<CommandTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (templateId: string, updates: Partial<CommandTemplate>) => void;
  onDelete: (templateId: string) => void;
  onReorder: (templateIds: string[]) => void;
}

interface TemplateFormData {
  name: string;
  content: string;
  icon: string;
  isGlobal: boolean;
}

const EMOJI_SUGGESTIONS = [
  '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣',
  '🎵', '🎶', '🎤', '🎹', '🎸',
  '🔄', '⏸️', '⏹️', '⏭️', '⏮️',
  '🏃', '🐌', '👆', '👇', '✋',
  '❤️', '👍', '👎', '🔥', '⭐'
];

export const CommandTemplateManager = ({
  templates,
  onAdd,
  onUpdate,
  onDelete,
  onReorder
}: CommandTemplateManagerProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommandTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    content: '',
    icon: '',
    isGlobal: false
  });

  // 사용자 정의 템플릿만 필터링 (시스템 기본 템플릿 제외)
  const userTemplates = templates.filter(template => !template.isGlobal);

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      icon: '',
      isGlobal: false
    });
  };

  const handleAdd = () => {
    if (!formData.name.trim() || !formData.content.trim()) return;

    onAdd({
      name: formData.name.trim(),
      content: formData.content.trim(),
      icon: formData.icon,
      isGlobal: false,
      order: userTemplates.length
    });

    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEdit = (template: CommandTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      icon: template.icon || '',
      isGlobal: template.isGlobal
    });
  };

  const handleUpdate = () => {
    if (!editingTemplate || !formData.name.trim() || !formData.content.trim()) return;

    onUpdate(editingTemplate.id, {
      name: formData.name.trim(),
      content: formData.content.trim(),
      icon: formData.icon
    });

    resetForm();
    setEditingTemplate(null);
  };

  const handleCancel = () => {
    resetForm();
    setEditingTemplate(null);
    setIsAddDialogOpen(false);
  };

  const handleDelete = (template: CommandTemplate) => {
    if (confirm(`"${template.name}" 템플릿을 삭제하시겠습니까?`)) {
      onDelete(template.id);
    }
  };

  const handleIconSelect = (emoji: string) => {
    setFormData(prev => ({ ...prev, icon: emoji }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">명령 템플릿 관리</CardTitle>
            <CardDescription>
              자주 사용하는 명령을 템플릿으로 저장하고 관리하세요
            </CardDescription>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 명령 템플릿 추가</DialogTitle>
                <DialogDescription>
                  자주 사용할 명령을 템플릿으로 저장하세요
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">템플릿 이름</Label>
                  <Input
                    id="template-name"
                    placeholder="예: 1절로"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    maxLength={20}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-content">명령 내용</Label>
                  <Input
                    id="template-content"
                    placeholder="예: 1절로 이동"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label>아이콘 선택 (선택사항)</Label>
                  <div className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                    {EMOJI_SUGGESTIONS.map((emoji) => (
                      <Button
                        key={emoji}
                        type="button"
                        variant={formData.icon === emoji ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleIconSelect(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                  <Input
                    placeholder="또는 직접 입력"
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    maxLength={2}
                    className="text-center"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCancel}>
                  취소
                </Button>
                <Button 
                  onClick={handleAdd}
                  disabled={!formData.name.trim() || !formData.content.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {userTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-2">사용자 정의 템플릿이 없습니다</p>
            <p className="text-sm">위의 추가 버튼을 클릭하여 새 템플릿을 만들어보세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {userTemplates.map((template) => (
              <Card key={template.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GripVertical 
                      className="h-4 w-4 text-muted-foreground cursor-grab" 
                      onClick={() => {
                        // 간단한 순서 변경 (위로 이동)
                        const currentIndex = userTemplates.findIndex(t => t.id === template.id);
                        if (currentIndex > 0) {
                          const reordered = [...userTemplates];
                          [reordered[currentIndex - 1], reordered[currentIndex]] = 
                          [reordered[currentIndex], reordered[currentIndex - 1]];
                          onReorder(reordered.map(t => t.id));
                        }
                      }}
                    />
                    
                    <div className="flex items-center space-x-2">
                      {template.icon && (
                        <span className="text-lg">{template.icon}</span>
                      )}
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {template.content}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {template.isGlobal && (
                      <Badge variant="secondary" className="text-xs">
                        기본
                      </Badge>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="p-1"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      className="p-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* 편집 다이얼로그 */}
      <Dialog open={editingTemplate !== null} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>템플릿 편집</DialogTitle>
            <DialogDescription>
              템플릿 정보를 수정하세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-template-name">템플릿 이름</Label>
              <Input
                id="edit-template-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-template-content">명령 내용</Label>
              <Input
                id="edit-template-content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>아이콘 선택 (선택사항)</Label>
              <div className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                {EMOJI_SUGGESTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    variant={formData.icon === emoji ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleIconSelect(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="또는 직접 입력"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                maxLength={2}
                className="text-center"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              취소
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={!formData.name.trim() || !formData.content.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};