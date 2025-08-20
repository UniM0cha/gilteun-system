import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import type { Worship } from '@gilton/shared';

interface WorshipSelectorProps {
  onSelect: (worship: Worship) => void;
}

export const WorshipSelector = ({ onSelect }: WorshipSelectorProps) => {
  const [worships, setWorships] = useState<Worship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorshipId, setSelectedWorshipId] = useState<string>('');

  useEffect(() => {
    // TODO: 실제 API 호출로 예배 목록 가져오기
    const mockWorships: Worship[] = [
      {
        id: 'worship_1',
        type: '주일 1부예배',
        date: new Date(),
        name: '2024년 1월 7일 주일 1부예배',
        scoreIds: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'worship_2',
        type: '주일 2부예배',
        date: new Date(),
        name: '2024년 1월 7일 주일 2부예배',
        scoreIds: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    setTimeout(() => {
      setWorships(mockWorships);
      setLoading(false);
    }, 500);
  }, []);

  const handleSelect = () => {
    const selectedWorship = worships.find(w => w.id === selectedWorshipId);
    if (selectedWorship) {
      onSelect(selectedWorship);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6 bg-white rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-center">예배 목록 로딩 중...</h3>
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