import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileSelector } from '@/components/profile/ProfileSelector';
import { ProfileCreator } from '@/components/profile/ProfileCreator';
import { WorshipSelector } from '@/components/worship/WorshipSelector';
import { useProfile } from '@/hooks/useProfile';
import { useWorshipStore } from '@/stores/worshipStore';
import type { Worship } from '@shared/types/worship';

type HomeStep = 'profile' | 'create-profile' | 'worship-select';

export const Home = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useProfile();
  const { setCurrentWorship } = useWorshipStore();
  const [currentStep, setCurrentStep] = useState<HomeStep>(isLoggedIn ? 'worship-select' : 'profile');

  const handleProfileComplete = () => {
    setCurrentStep('worship-select');
  };

  const handleWorshipSelect = (worship: Worship) => {
    // 선택된 예배 정보를 글로벌 상태에 저장
    setCurrentWorship(worship);
    console.log('Selected worship:', worship);
    navigate('/worship');
  };

  const handleCreateProfile = () => {
    setCurrentStep('create-profile');
  };

  const handleContinueWithProfile = () => {
    setCurrentStep('worship-select');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {currentStep === 'profile' && (
        <ProfileSelector onCreateNew={handleCreateProfile} onContinue={handleContinueWithProfile} />
      )}

      {currentStep === 'create-profile' && <ProfileCreator onComplete={handleProfileComplete} />}

      {currentStep === 'worship-select' && <WorshipSelector onSelect={handleWorshipSelect} />}
    </div>
  );
};
