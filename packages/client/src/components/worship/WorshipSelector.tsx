import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { useWorshipStore } from '../../stores/worshipStore';
import type { Worship } from '@gilteun/shared';

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
    const selectedWorship = worships.find(w => w.id === selectedWorshipId);
    if (selectedWorship) {
      onSelect(selectedWorship);
    }
  };

  if (isLoadingWorships) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6 bg-white rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-center">예배 목록 로딩 중...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6 bg-white rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-center text-red-600">오류</h3>
        <p className="text-center text-gray-600">{error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          className="w-full"
        >
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold text-center">참여할 예배 선택</h3>
      
      <div className="space-y-3">
        {worships.length === 0 ? (
          <p className="text-gray-600 text-center">
            현재 진행 중인 예배가 없습니다.
          </p>
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
                <p className="text-sm opacity-70">
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
    </div>
  );
};