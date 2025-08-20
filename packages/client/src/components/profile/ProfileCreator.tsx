import { useState } from 'react';
import { Button } from '../ui/button';
import { InstrumentSelector } from './InstrumentSelector';
import { useProfile } from '../../hooks/useProfile';
import type { UserRole } from '@gilton/shared';

interface ProfileCreatorProps {
  onComplete: () => void;
}

export const ProfileCreator = ({ onComplete }: ProfileCreatorProps) => {
  const { availableInstruments, createProfile } = useProfile();
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('session');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !selectedInstrumentId) {
      return;
    }

    setIsSubmitting(true);
    try {
      createProfile(name.trim(), role, selectedInstrumentId);
      onComplete();
    } catch (error) {
      console.error('프로필 생성 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = name.trim() && selectedInstrumentId;

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center">새 프로필 생성</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 이름 입력 */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            이름
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={20}
            required
          />
        </div>

        {/* 역할 선택 */}
        <div className="space-y-3">
          <label className="text-sm font-medium">역할</label>
          <div className="grid grid-cols-1 gap-2">
            <Button
              type="button"
              variant={role === 'session' ? 'default' : 'outline'}
              onClick={() => setRole('session')}
              className="justify-start"
            >
              세션 (악보 열람, 마크업 가능)
            </Button>
            <Button
              type="button"
              variant={role === 'leader' ? 'default' : 'outline'}
              onClick={() => setRole('leader')}
              className="justify-start"
            >
              인도자 (명령 전송 가능)
            </Button>
            <Button
              type="button"
              variant={role === 'admin' ? 'default' : 'outline'}
              onClick={() => setRole('admin')}
              className="justify-start"
            >
              관리자 (전체 관리 권한)
            </Button>
          </div>
        </div>

        {/* 악기 선택 */}
        <InstrumentSelector
          instruments={availableInstruments}
          selectedInstrumentId={selectedInstrumentId}
          onSelect={setSelectedInstrumentId}
        />

        {/* 제출 버튼 */}
        <Button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? '생성 중...' : '프로필 생성'}
        </Button>
      </form>
    </div>
  );
};