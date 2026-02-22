import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus, Calendar, Music, Edit, Trash2, Play, ArrowLeft, Filter, X } from 'lucide-react';
import { useWorships, useWorshipTypes, useDeleteWorship, useProfiles, useRoles } from '@/hooks/queries';
import { useAppStore } from '@/store/appStore';
import { getColorOption } from '@/lib/colors';

export default function WorshipList() {
  const { data: worships = [] } = useWorships();
  const { data: worshipTypes = [] } = useWorshipTypes();
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useRoles();
  const deleteWorshipMutation = useDeleteWorship();
  const currentProfileId = useAppStore((s) => s.currentProfileId);
  const navigate = useNavigate();

  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // 프로필 미선택 시 홈으로 리다이렉트
  useEffect(() => {
    if (!currentProfileId) {
      navigate('/');
    }
  }, [currentProfileId, navigate]);

  const currentProfile = profiles.find((p) => p.id === currentProfileId);
  const currentRole = currentProfile
    ? roles.find((r) => r.id === currentProfile.roleId)
    : undefined;

  const filteredWorships = worships.filter((worship) => {
    const matchesType = !selectedTypeId || worship.typeId === selectedTypeId;
    const matchesSearch = worship.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatLastEdited = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const handleDelete = async (id: string) => {
    if (confirm('이 예배를 삭제하시겠습니까?')) {
      await deleteWorshipMutation.mutateAsync(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">예배 목록</h1>
            <p className="text-slate-600">예배를 선택하거나 새로운 예배를 만드세요</p>
          </div>
          {currentProfile && (
            <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-xl shadow-md border-2 border-slate-200">
              <div
                className={`w-10 h-10 ${currentProfile.color} rounded-full flex items-center justify-center text-xl`}
              >
                {currentRole?.icon}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">{currentProfile.name}</div>
                <div className="text-xs text-slate-500">{currentRole?.name}</div>
              </div>
            </div>
          )}
          <Link
            to="/worship-edit/new"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
          >
            <Plus className="w-5 h-5" />
            새 예배 만들기
          </Link>
        </div>

        {/* 필터 섹션 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="font-bold text-slate-800">필터</h3>
          </div>

          {/* 검색 */}
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="예배 이름 검색..."
            />
            <Music className="absolute top-3.5 left-4 w-5 h-5 text-slate-400" />
            {searchQuery && (
              <button
                className="absolute top-3 right-3 p-1 hover:bg-slate-200 rounded-full transition-colors"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            )}
          </div>

          {/* 예배 유형 필터 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">예배 유형</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTypeId('')}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  !selectedTypeId
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                전체
              </button>
              {worshipTypes.map((type) => {
                const isSelected = selectedTypeId === type.id;
                const colorOption = getColorOption(type.color);
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedTypeId(type.id)}
                    className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                      isSelected
                        ? `${colorOption?.bg || 'bg-blue-500'} text-white shadow-md`
                        : `${colorOption?.badge || 'bg-blue-100 text-blue-700'} hover:shadow-md`
                    }`}
                  >
                    {type.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 예배 목록 */}
        <div className="space-y-4">
          {filteredWorships.map((worship) => {
            const worshipType = worshipTypes.find((t) => t.id === worship.typeId);
            return (
              <div
                key={worship.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border-2 border-transparent hover:border-blue-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-3">
                      <h3 className="text-xl font-bold text-slate-800">{worship.title}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar className="w-4 h-4" />
                          {formatDate(worship.date)}
                        </div>
                        <div className="text-sm text-slate-500">
                          악보 {worship.sheets?.length ?? 0}개
                        </div>
                        {worshipType && (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getColorOption(worshipType.color)?.badge || 'bg-blue-100 text-blue-700'}`}
                          >
                            {worshipType.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-slate-400">
                      마지막 수정: {formatLastEdited(worship.updatedAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/worship/${worship.id}`}
                      className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-md active:scale-95"
                    >
                      <Play className="w-5 h-5" />
                      시작
                    </Link>
                    <Link
                      to={`/worship-edit/${worship.id}`}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors active:scale-95"
                    >
                      <Edit className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(worship.id)}
                      className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors active:scale-95"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 빈 상태 */}
        {filteredWorships.length === 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-16 text-center">
            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Music className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              {searchQuery || selectedTypeId ? '검색 결과가 없습니다' : '아직 예배가 없습니다'}
            </h3>
            <p className="text-slate-600 mb-8">
              {searchQuery || selectedTypeId
                ? '다른 검색어나 필터를 시도해보세요'
                : '새 예배를 만들어 악보를 추가하세요'}
            </p>
            {!searchQuery && !selectedTypeId && (
              <Link
                to="/worship-edit/new"
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
              >
                <Plus className="w-5 h-5" />
                새 예배 만들기
              </Link>
            )}
          </div>
        )}

        {/* 통계 */}
        {worships.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
              <div className="text-sm font-semibold text-blue-700 mb-1">전체 예배</div>
              <div className="text-3xl font-bold text-blue-900">{worships.length}개</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200">
              <div className="text-sm font-semibold text-green-700 mb-1">필터링된 예배</div>
              <div className="text-3xl font-bold text-green-900">{filteredWorships.length}개</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200">
              <div className="text-sm font-semibold text-purple-700 mb-1">예배 유형</div>
              <div className="text-3xl font-bold text-purple-900">{worshipTypes.length}개</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
