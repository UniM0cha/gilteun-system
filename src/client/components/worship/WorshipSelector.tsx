import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useWorshipStore } from '@/stores/worshipStore';
import type { Worship } from '@shared/types/worship';

interface WorshipSelectorProps {
  onSelect: (worship: Worship) => void;
}

export const WorshipSelector = ({ onSelect }: WorshipSelectorProps) => {
  const { worships, isLoadingWorships, fetchWorships } = useWorshipStore();
  const [selectedWorshipId, setSelectedWorshipId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorships = async () => {
      try {
        setError(null);
        await fetchWorships();
      } catch (err) {
        setError('예배 목록을 불러오는데 실패했습니다.');
        console.error('예배 목록 조회 실패:', err);
      }
    };

    loadWorships();
  }, [fetchWorships]);

  const handleSelect = () => {
    const selectedWorship = worships.find((w) => w.id === selectedWorshipId);
    if (selectedWorship) {
      onSelect(selectedWorship);
    }
  };

  if (isLoadingWorships) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold text-center">예배 목록 로딩 중...</h3>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-destructive">오류</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="w-full">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">참여할 예배 선택</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {worships.length === 0 ? (
            <p className="text-muted-foreground text-center">현재 진행 중인 예배가 없습니다.</p>
          ) : (
            worships.map((worship) => (
              <Button
                key={worship.id}
                variant={selectedWorshipId === worship.id ? 'default' : 'outline'}
                className="w-full p-4 h-auto justify-start"
                onClick={() => setSelectedWorshipId(worship.id)}
              >
                <div className="text-left">
                  <p className="font-semibold">{worship.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(worship.date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    })}
                  </p>
                </div>
              </Button>
            ))
          )}
        </div>

        {selectedWorshipId && (
          <Button onClick={handleSelect} className="w-full">
            예배 참여하기
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
