import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Plus, Edit, Trash2, Check, X, AlertCircle, Users } from 'lucide-react';
import { useRoles, useAddRole, useUpdateRole, useDeleteRole } from '@/hooks/queries';
import { useProfiles } from '@/hooks/queries';

export default function RoleManagement() {
  const { data: roles = [] } = useRoles();
  const { data: profiles = [] } = useProfiles();
  const addRoleMutation = useAddRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: '' });

  const isRoleInUse = (roleId: string) =>
    profiles.some((p) => p.roleId === roleId);

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.icon.trim()) return;
    await addRoleMutation.mutateAsync({ name: formData.name, icon: formData.icon });
    setFormData({ name: '', icon: '' });
    setIsAdding(false);
  };

  const handleEdit = (id: string) => {
    const role = roles.find((r) => r.id === id);
    if (role) {
      setEditingId(id);
      setFormData({ name: role.name, icon: role.icon });
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.name.trim() || !formData.icon.trim()) return;
    await updateRoleMutation.mutateAsync({ id: editingId, name: formData.name, icon: formData.icon });
    setEditingId(null);
    setFormData({ name: '', icon: '' });
  };

  const handleDelete = async (id: string) => {
    if (isRoleInUse(id)) {
      alert('이 역할을 사용하는 프로필이 있습니다. 먼저 프로필의 역할을 변경해주세요.');
      return;
    }
    if (confirm('이 역할을 삭제하시겠습니까?')) {
      await deleteRoleMutation.mutateAsync(id);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', icon: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">역할 관리</h1>
            <p className="text-slate-600">팀원의 역할을 추가하고 관리하세요</p>
          </div>
          {!isAdding && !editingId && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
            >
              <Plus className="w-5 h-5" />
              새 역할 추가
            </button>
          )}
        </div>

        {/* 추가 폼 */}
        {isAdding && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-2 border-blue-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">새 역할 추가</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  역할 이름
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="예: 기타, 드럼, 보컬..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  이모지 아이콘
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-2xl text-center"
                  placeholder="🎸"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors active:scale-95"
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 역할 목록 */}
        {roles.length > 0 ? (
        <div className="space-y-3">
          {roles.map((role) => {
            const inUse = isRoleInUse(role.id);
            const isEditing = editingId === role.id;
            return (
              <div
                key={role.id}
                className={`bg-white rounded-2xl shadow-lg p-6 transition-all ${
                  isEditing
                    ? 'border-2 border-blue-200'
                    : 'border-2 border-transparent hover:border-blue-100'
                }`}
              >
                {isEditing ? (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          역할 이름
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          이모지 아이콘
                        </label>
                        <input
                          type="text"
                          value={formData.icon}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-2xl text-center"
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={handleCancel} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors active:scale-95">
                        <X className="w-5 h-5" />
                      </button>
                      <button onClick={handleUpdate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors active:scale-95">
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-3xl shadow-md">
                        {role.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">{role.name}</h3>
                        {inUse && (
                          <div className="flex items-center gap-1 text-sm text-blue-600 mt-1">
                            <AlertCircle className="w-4 h-4" />
                            사용 중
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(role.id)} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors active:scale-95">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
                        className={`p-3 rounded-xl transition-colors active:scale-95 ${
                          inUse ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                        disabled={inUse}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        ) : (
          <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              아직 역할이 없습니다
            </h3>
            <p className="text-slate-500 mb-6">
              새 역할 추가 버튼을 눌러 역할을 만드세요
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md active:scale-95"
            >
              <Plus className="w-5 h-5" />
              새 역할 추가
            </button>
          </div>
        )}

        {roles.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
            <div className="text-sm font-semibold text-blue-700 mb-1">전체 역할</div>
            <div className="text-3xl font-bold text-blue-900">{roles.length}개</div>
          </div>
        )}
      </div>
    </div>
  );
}
