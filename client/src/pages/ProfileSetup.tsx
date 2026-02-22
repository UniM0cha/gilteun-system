import { Link } from 'react-router';
import { ArrowLeft, Edit, Plus, Trash2, User } from 'lucide-react';
import { useProfiles, useDeleteProfile, useRoles } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function ProfileSetup() {
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useRoles();
  const deleteProfileMutation = useDeleteProfile();

  const getRoleById = (roleId: string) => roles.find((r) => r.id === roleId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">프로필 관리</h1>
            <p className="text-slate-600">프로필을 추가하거나 수정하세요</p>
          </div>
          <Button asChild>
            <Link to="/profile-setup/new">
              <Plus className="w-5 h-5" />
              새 프로필
            </Link>
          </Button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            프로필 목록 ({profiles.length}개)
          </h2>

          {profiles.length > 0 ? (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl hover:shadow-md transition-all border-2 border-transparent hover:border-blue-200"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 ${profile.color} rounded-2xl flex items-center justify-center text-3xl shadow-md`}
                    >
                      {getRoleById(profile.roleId)?.icon}
                    </div>
                    <div>
                      <div className="font-bold text-lg text-slate-800">
                        {profile.name}
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        {getRoleById(profile.roleId)?.name}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/profile-setup/${profile.id}`}>
                        <Edit className="w-5 h-5" />
                      </Link>
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      }
                      title="프로필 삭제"
                      description="정말 이 프로필을 삭제하시겠습니까?"
                      onConfirm={() => deleteProfileMutation.mutate(profile.id)}
                      destructive
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                아직 프로필이 없습니다
              </h3>
              <p className="text-slate-500 mb-6">
                새 프로필 버튼을 눌러 프로필을 만드세요
              </p>
              <Button asChild>
                <Link to="/profile-setup/new">
                  <Plus className="w-5 h-5" />
                  새 프로필 추가
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
