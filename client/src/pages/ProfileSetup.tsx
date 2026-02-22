import { Link } from 'react-router';
import { ArrowLeft, Edit, Plus, Trash2, User } from 'lucide-react';
import { useProfiles, useDeleteProfile, useRoles } from '@/hooks/queries';

export default function ProfileSetup() {
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useRoles();
  const deleteProfileMutation = useDeleteProfile();

  const getRoleById = (roleId: string) => roles.find((r) => r.id === roleId);

  const handleDelete = (id: string) => {
    if (confirm('이 프로필을 삭제하시겠습니까?')) {
      deleteProfileMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">프로필 관리</h1>
            <p className="text-slate-600">프로필을 추가하거나 수정하세요</p>
          </div>
          <Link
            to="/profile-setup/new"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
          >
            <Plus className="w-5 h-5" />
            새 프로필
          </Link>
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
                      <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 bg-slate-200 text-slate-700">
                        {getRoleById(profile.roleId)?.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/profile-setup/${profile.id}`}
                      className="p-3 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl transition-colors active:scale-95"
                    >
                      <Edit className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(profile.id)}
                      className="p-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-colors active:scale-95"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
              <Link
                to="/profile-setup/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md active:scale-95"
              >
                <Plus className="w-5 h-5" />
                새 프로필 추가
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
