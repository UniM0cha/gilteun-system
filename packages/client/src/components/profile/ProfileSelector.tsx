import { Button } from '../ui/button';
import { useProfile } from '../../hooks/useProfile';

interface ProfileSelectorProps {
  onCreateNew: () => void;
  onContinue: () => void;
}

export const ProfileSelector = ({ onCreateNew, onContinue }: ProfileSelectorProps) => {
  const { currentUser, getCurrentInstrument, clearProfile } = useProfile();
  const currentInstrument = getCurrentInstrument();

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center">길튼 시스템에 오신 것을 환영합니다</h2>
        <p className="text-gray-600 text-center">
          찬양팀 예배 진행을 지원하는 앱입니다.
          먼저 프로필을 생성해주세요.
        </p>
        <Button onClick={onCreateNew} className="w-full">
          새 프로필 생성
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center">기존 프로필</h2>
      
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center space-x-3">
          {currentInstrument && (
            <span className="text-3xl">{currentInstrument.icon}</span>
          )}
          <div>
            <p className="font-semibold text-lg">{currentUser.name}</p>
            <p className="text-sm text-gray-600">
              {currentUser.role === 'session' && '세션'}
              {currentUser.role === 'leader' && '인도자'}
              {currentUser.role === 'admin' && '관리자'}
              {currentInstrument && ` • ${currentInstrument.name}`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Button onClick={onContinue} className="w-full">
          이 프로필로 계속하기
        </Button>
        <div className="flex space-x-3">
          <Button onClick={onCreateNew} variant="outline" className="flex-1">
            새 프로필 생성
          </Button>
          <Button 
            onClick={clearProfile} 
            variant="outline" 
            className="flex-1"
          >
            프로필 삭제
          </Button>
        </div>
      </div>
    </div>
  );
};