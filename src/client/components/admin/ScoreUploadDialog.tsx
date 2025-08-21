import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Card, CardContent } from '../ui/card';
import { Upload, X, FileImage } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { useWorshipStore } from '../../stores/worshipStore';

interface ScoreUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ScoreUploadDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: ScoreUploadDialogProps) => {
  const { uploadScore, isLoading } = useAdmin();
  const { worships } = useWorshipStore();

  const [title, setTitle] = useState('');
  const [selectedWorshipId, setSelectedWorshipId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB 제한
      setUploadError('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);

    // 미리보기 URL 생성
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // 파일명을 기본 제목으로 설정
    if (!title) {
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // 확장자 제거
      setTitle(fileName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !title || !selectedWorshipId) {
      setUploadError('모든 필드를 입력해주세요.');
      return;
    }

    try {
      await uploadScore(selectedFile, title, selectedWorshipId);

      // 성공 시 초기화
      setTitle('');
      setSelectedWorshipId('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadError(null);

      onSuccess?.();
      onOpenChange(false);
    } catch {
      setUploadError('업로드에 실패했습니다.');
    }
  };

  const handleClose = () => {
    setTitle('');
    setSelectedWorshipId('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>악보 업로드</DialogTitle>
          <DialogDescription>
            새로운 악보 파일을 업로드합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 파일 업로드 영역 */}
          <div className="space-y-2">
            <Label>악보 이미지</Label>
            <Card
              className={`border-2 border-dashed transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <CardContent className="p-6">
                {selectedFile && previewUrl ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="미리보기"
                        className="w-full h-32 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          if (previewUrl) URL.revokeObjectURL(previewUrl);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <FileImage className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        이미지를 드래그하거나 클릭하여 선택
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG 파일 (최대 10MB)
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
                          if (file) handleFileSelect(file);
                        };
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      파일 선택
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 제목 입력 */}
          <div className="space-y-2">
            <Label htmlFor="title">악보 제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 놀라운 은혜"
              required
            />
          </div>

          {/* 예배 선택 */}
          <div className="space-y-2">
            <Label htmlFor="worship">예배 선택</Label>
            <select
              id="worship"
              value={selectedWorshipId}
              onChange={(e) => setSelectedWorshipId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              required
            >
              <option value="">예배를 선택하세요</option>
              {worships.map((worship) => (
                <option key={worship.id} value={worship.id}>
                  {worship.name} (
                  {new Date(worship.date).toLocaleDateString('ko-KR')})
                </option>
              ))}
            </select>
          </div>

          {/* 오류 메시지 */}
          {uploadError && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {uploadError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={
                !selectedFile || !title || !selectedWorshipId || isLoading
              }
            >
              {isLoading ? '업로드 중...' : '업로드'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
