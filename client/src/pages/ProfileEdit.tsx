import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Save, Trash2, User, Users } from 'lucide-react';
import { useProfiles, useAddProfile, useUpdateProfile, useDeleteProfile, useRoles } from '@/hooks/queries';
import { PROFILE_COLORS } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function ProfileEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useRoles();
  const addProfileMutation = useAddProfile();
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();

  const isNewProfile = id === 'new';
  const existingProfile = isNewProfile
    ? null
    : profiles.find((p) => p.id === id);

  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [color, setColor] = useState('bg-blue-500');

  useEffect(() => {
    if (existingProfile) {
      setName(existingProfile.name);
      setRoleId(existingProfile.roleId);
      setColor(existingProfile.color);
    } else if (roles.length > 0 && !roleId) {
      setRoleId(roles[0].id);
    }
  }, [existingProfile, roles, roleId]);

  const getRoleById = (rid: string) => roles.find((r) => r.id === rid);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }
    if (isNewProfile) {
      await addProfileMutation.mutateAsync({ name: name.trim(), roleId, color });
    } else if (id) {
      await updateProfileMutation.mutateAsync({ id, name: name.trim(), roleId, color });
    }
    navigate('/profile-setup');
  };

  const handleDelete = async () => {
    if (id && !isNewProfile) {
      await deleteProfileMutation.mutateAsync(id);
      navigate('/profile-setup');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link to="/profile-setup">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">
              {isNewProfile ? '새 프로필 추가' : '프로필 수정'}
            </h1>
            <p className="text-slate-600">프로필 정보를 입력하세요</p>
          </div>
        </div>

        <Card className="rounded-3xl p-8">
          <CardContent className="p-0">
            {/* 프로필 미리보기 */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div
                  className={`w-32 h-32 ${color} rounded-3xl flex items-center justify-center text-7xl shadow-xl`}
                >
                  {getRoleById(roleId)?.icon}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
                  <User className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>

            {/* 이름 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                이름 *
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="text-lg"
              />
            </div>

            {/* 역할 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                역할 *
              </label>
              {roles.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setRoleId(role.id)}
                      className={`flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all ${
                        roleId === role.id
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span className="text-2xl">{role.icon}</span>
                      <span>{role.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="w-full px-5 py-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-yellow-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5" />
                    <span className="font-semibold">역할이 없습니다</span>
                  </div>
                  <p className="text-sm mb-3">먼저 역할을 생성해주세요.</p>
                  <Button asChild size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                    <Link to="/role-management">
                      <Users className="w-4 h-4" />
                      역할 관리
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* 색상 선택 */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                배경 색상
              </label>
              <div className="grid grid-cols-6 gap-3">
                {PROFILE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`aspect-square ${c} rounded-xl transition-all hover:scale-110 ${
                      color === c
                        ? 'ring-4 ring-offset-4 ring-slate-400 scale-110'
                        : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 액션 */}
            <div className="flex gap-4">
              <Button
                size="lg"
                className="flex-1"
                onClick={handleSave}
                disabled={roles.length === 0}
              >
                <Save className="w-5 h-5" />
                저장하기
              </Button>
              {!isNewProfile && (
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive" size="lg">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  }
                  title="프로필 삭제"
                  description="이 프로필을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                  confirmLabel="삭제"
                  onConfirm={handleDelete}
                  destructive
                />
              )}
              <Button variant="secondary" size="lg" asChild>
                <Link to="/profile-setup">취소</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
