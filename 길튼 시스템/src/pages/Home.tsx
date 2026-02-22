import { Link } from "react-router";
import { Plus, UserCircle, Music, Settings, Tag, Users } from "lucide-react";
import { useProfileStore } from "../store/profileStore";
import { useRoleStore } from "../store/roleStore";

export default function Home() {
  const { profiles, setCurrentProfile } = useProfileStore();
  const { getRoleById } = useRoleStore();

  const handleProfileSelect = (profileId: string) => {
    setCurrentProfile(profileId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-lg">
            <Music className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-slate-800 mb-3">길튼 시스템</h1>
          <p className="text-xl text-slate-600">예배 찬양 지원 시스템</p>
        </div>

        {/* 프로필 선택 섹션 */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">프로필 선택</h2>
            <Link
              to="/profile-setup"
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-md active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">새 프로필</span>
            </Link>
          </div>

          {profiles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => {
                const role = getRoleById(profile.roleId);
                return (
                  <Link
                    key={profile.id}
                    to="/worship-list"
                    onClick={() => handleProfileSelect(profile.id)}
                    className="group relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-blue-300 active:scale-95"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 ${profile.color} rounded-2xl flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform`}>
                        {role?.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-800 mb-1">
                          {profile.name}
                        </h3>
                        <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-slate-200 text-slate-700">
                          {role?.name}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                프로필이 없습니다
              </h3>
              <p className="text-slate-500 mb-6">
                먼저 프로필을 생성해주세요
              </p>
              <Link
                to="/profile-setup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md active:scale-95"
              >
                <Plus className="w-5 h-5" />
                프로필 만들기
              </Link>
            </div>
          )}
        </div>

        {/* 빠른 설정 버튼들 */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/profile-setup"
            className="flex items-center justify-center gap-3 bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <UserCircle className="w-6 h-6 text-slate-600" />
            <span className="text-lg font-semibold text-slate-700">프로필 관리</span>
          </Link>
          <Link
            to="/role-management"
            className="flex items-center justify-center gap-3 bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <Users className="w-6 h-6 text-slate-600" />
            <span className="text-lg font-semibold text-slate-700">역할 관리</span>
          </Link>
          <Link
            to="/command-setup"
            className="flex items-center justify-center gap-3 bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <Settings className="w-6 h-6 text-slate-600" />
            <span className="text-lg font-semibold text-slate-700">명령 설정</span>
          </Link>
          <Link
            to="/worship-type-settings"
            className="flex items-center justify-center gap-3 bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <Tag className="w-6 h-6 text-slate-600" />
            <span className="text-lg font-semibold text-slate-700">예배 유형 관리</span>
          </Link>
        </div>
      </div>
    </div>
  );
}