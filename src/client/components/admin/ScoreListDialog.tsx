import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Eye, FileImage, Trash2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useWorshipStore } from '@/stores/worshipStore';
import type { Score } from '@shared/types/score';

interface ScoreListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ScoreListDialog = ({ open, onOpenChange }: ScoreListDialogProps) => {
  const { deleteScore, isLoading } = useAdmin();
  const { worships, scores, fetchScores } = useWorshipStore();

  const [selectedWorshipId, setSelectedWorshipId] = useState<string>('');
  const [filteredScores, setFilteredScores] = useState<Score[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // 예배별 악보 필터링
  useEffect(() => {
    if (selectedWorshipId) {
      const worshipScores = scores.filter((score) => score.worshipId === selectedWorshipId);
      setFilteredScores(worshipScores.sort((a, b) => a.orderIndex - b.orderIndex));
    } else {
      setFilteredScores(scores.sort((a, b) => a.orderIndex - b.orderIndex));
    }
  }, [selectedWorshipId, scores]);

  // 다이얼로그 열릴 때 악보 목록 새로고침
  useEffect(() => {
    if (open) {
      fetchScores();
    }
  }, [open, fetchScores]);

  const handleDelete = async (scoreId: string) => {
    if (deleteConfirm !== scoreId) {
      setDeleteConfirm(scoreId);
      return;
    }

    const success = await deleteScore(scoreId);
    if (success) {
      await fetchScores(); // 목록 새로고침
      setDeleteConfirm(null);
    }
  };

  const getWorshipName = (worshipId: string) => {
    const worship = worships.find((w) => w.id === worshipId);
    return worship ? `${worship.name} (${new Date(worship.date).toLocaleDateString('ko-KR')})` : '알 수 없는 예배';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>악보 목록 관리</DialogTitle>
          <DialogDescription>업로드된 악보를 확인하고 관리합니다.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* 예배 필터 */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">예배 필터:</label>
            <select
              value={selectedWorshipId}
              onChange={(e) => setSelectedWorshipId(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="">전체 악보</option>
              {worships.map((worship) => (
                <option key={worship.id} value={worship.id}>
                  {worship.name} ({new Date(worship.date).toLocaleDateString('ko-KR')})
                </option>
              ))}
            </select>
            <Badge variant="outline">총 {filteredScores.length}개</Badge>
          </div>

          {/* 악보 목록 */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {filteredScores.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>등록된 악보가 없습니다.</p>
                    {selectedWorshipId && <p className="text-sm mt-1">선택한 예배에 악보가 없습니다.</p>}
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredScores.map((score) => (
                <Card key={score.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* 악보 미리보기 */}
                        <div className="w-16 h-16 bg-muted rounded border flex items-center justify-center">
                          {score.filePath ? (
                            <img
                              src={score.filePath}
                              alt={score.title}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                // 이미지 로드 실패 시 아이콘 표시
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML =
                                  '<div class="text-muted-foreground"><svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                              }}
                            />
                          ) : (
                            <FileImage className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>

                        {/* 악보 정보 */}
                        <div className="flex-1">
                          <h3 className="font-semibold">{score.title}</h3>
                          <p className="text-sm text-muted-foreground">{getWorshipName(score.worshipId)}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              순서: {score.orderIndex + 1}
                            </Badge>
                            {score.createdAt && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(score.createdAt).toLocaleDateString('ko-KR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center space-x-2">
                        {score.filePath && (
                          <Button variant="outline" size="sm" onClick={() => window.open(score.filePath, '_blank')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant={deleteConfirm === score.id ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => handleDelete(score.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleteConfirm === score.id ? '확인' : ''}
                        </Button>

                        {deleteConfirm === score.id && (
                          <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                            취소
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
