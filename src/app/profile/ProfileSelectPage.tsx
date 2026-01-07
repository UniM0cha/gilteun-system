// 프로필 선택 페이지

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User } from 'lucide-react';
import { useProfiles, useCreateProfile } from '@/api/profiles';
import { useAppStore } from '@/store/appStore';
import { ROUTES } from '@/constants/routes';
import { PROFILE_COLORS, PROFILE_ICONS } from '@/constants/config';
import { cn } from '@/lib/cn';
import { Button, Card, CardContent, Input, Modal, ModalFooter } from '@/components/ui';
import { FullPageLoader, EmptyState } from '@/components/shared';
import type { Profile, ProfileRole } from '@/types';

export function ProfileSelectPage() {
  const navigate = useNavigate();
  const setCurrentProfile = useAppStore((state) => state.setCurrentProfile);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: profiles, isLoading, error } = useProfiles();

  // 프로필 선택
  const handleSelectProfile = (profile: Profile) => {
    setCurrentProfile(profile);
    navigate(ROUTES.WORSHIP_LIST);
  };

  if (isLoading) {
    return <FullPageLoader message="프로필을 불러오는 중..." />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-red-600">프로필을 불러오는데 실패했습니다.</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">길튼 시스템</h1>
          <p className="mt-2 text-gray-600">프로필을 선택하세요</p>
        </div>

        {/* 프로필 목록 */}
        {profiles && profiles.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onClick={() => handleSelectProfile(profile)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={User}
            title="프로필이 없습니다"
            description="새 프로필을 만들어 시작하세요"
          />
        )}

        {/* 프로필 추가 버튼 */}
        <div className="mt-6 text-center">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            새 프로필
          </Button>
        </div>
      </div>

      {/* 프로필 생성 모달 */}
      <CreateProfileModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(profile) => {
          setIsCreateModalOpen(false);
          handleSelectProfile(profile);
        }}
      />
    </div>
  );
}

// 프로필 카드 컴포넌트
interface ProfileCardProps {
  profile: Profile;
  onClick: () => void;
}

function ProfileCard({ profile, onClick }: ProfileCardProps) {
  const colorConfig = PROFILE_COLORS.find((c) => c.value === profile.color);
  const bgColor = colorConfig?.bg || 'bg-gray-500';

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      <div
        className={cn(
          'mb-3 flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white transition-transform group-hover:scale-105',
          bgColor
        )}
      >
        {profile.icon}
      </div>
      <span className="font-medium text-gray-900">{profile.name}</span>
      <span className="mt-1 text-xs text-gray-500">
        {profile.role === 'leader' ? '리더' : profile.role === 'admin' ? '관리자' : '멤버'}
      </span>
    </button>
  );
}

// 프로필 생성 모달
interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: Profile) => void;
}

function CreateProfileModal({ isOpen, onClose, onSuccess }: CreateProfileModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<ProfileRole>('member');
  const [selectedIcon, setSelectedIcon] = useState<string>(PROFILE_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(PROFILE_COLORS[0].value);

  const createProfile = useCreateProfile();

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const result = await createProfile.mutateAsync({
      name: name.trim(),
      role,
      icon: selectedIcon,
      color: selectedColor,
    });

    onSuccess(result);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setRole('member');
    setSelectedIcon(PROFILE_ICONS[0]);
    setSelectedColor(PROFILE_COLORS[0].value);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="새 프로필">
      <div className="space-y-4">
        {/* 이름 */}
        <Input
          label="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요"
          maxLength={20}
        />

        {/* 역할 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">역할</label>
          <div className="flex gap-2">
            {[
              { value: 'member', label: '멤버' },
              { value: 'leader', label: '리더' },
              { value: 'admin', label: '관리자' },
            ].map((r) => (
              <button
                key={r.value}
                onClick={() => setRole(r.value as ProfileRole)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  role === r.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 아이콘 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">아이콘</label>
          <div className="flex flex-wrap gap-2">
            {PROFILE_ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => setSelectedIcon(icon)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg border text-xl transition-colors',
                  selectedIcon === icon
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* 색상 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">색상</label>
          <div className="flex flex-wrap gap-2">
            {PROFILE_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={cn(
                  'h-8 w-8 rounded-full transition-transform',
                  color.bg,
                  selectedColor === color.value && 'scale-110 ring-2 ring-offset-2 ring-blue-500'
                )}
                aria-label={color.label}
              />
            ))}
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!name.trim()}
          isLoading={createProfile.isPending}
        >
          만들기
        </Button>
      </ModalFooter>
    </Modal>
  );
}
