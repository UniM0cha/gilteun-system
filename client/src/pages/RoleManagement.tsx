import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Plus, Edit, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { useRoleStore } from '@/store/roleStore';
import { useProfileStore } from '@/store/profileStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function RoleManagement() {
  const { roles, addRole, updateRole, deleteRole, fetchRoles } = useRoleStore();
  const { profiles, fetchProfiles } = useProfileStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: '' });

  useEffect(() => {
    fetchRoles();
    fetchProfiles();
  }, [fetchRoles, fetchProfiles]);

  const isRoleInUse = (roleId: string) =>
    profiles.some((p) => p.roleId === roleId);

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.icon.trim()) return;
    await addRole(formData.name, formData.icon);
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
    await updateRole(editingId, formData.name, formData.icon);
    setEditingId(null);
    setFormData({ name: '', icon: '' });
  };

  const handleDelete = async (id: string) => {
    await deleteRole(id);
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
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">역할 관리</h1>
            <p className="text-slate-600">팀원의 역할을 추가하고 관리하세요</p>
          </div>
          {!isAdding && !editingId && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="w-5 h-5" />
              새 역할 추가
            </Button>
          )}
        </div>

        {/* 추가 폼 */}
        {isAdding && (
          <Card className="mb-6 border-2 border-blue-200">
            <CardContent>
              <h3 className="text-lg font-bold text-slate-800 mb-4">새 역할 추가</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    역할 이름
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="예: 기타, 드럼, 보컬..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    이모지 아이콘
                  </label>
                  <Input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="text-2xl text-center"
                    placeholder="🎸"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="icon" onClick={handleCancel}>
                  <X className="w-5 h-5" />
                </Button>
                <Button size="icon" onClick={handleAdd}>
                  <Check className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 역할 목록 */}
        <div className="space-y-3">
          {roles.map((role) => {
            const inUse = isRoleInUse(role.id);
            const isEditing = editingId === role.id;
            return (
              <Card
                key={role.id}
                className={isEditing
                  ? 'border-2 border-blue-200'
                  : 'border-2 border-transparent hover:border-blue-100'
                }
              >
                <CardContent>
                  {isEditing ? (
                    <div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            역할 이름
                          </label>
                          <Input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            이모지 아이콘
                          </label>
                          <Input
                            type="text"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            className="text-2xl text-center"
                            maxLength={2}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" size="icon" onClick={handleCancel}>
                          <X className="w-5 h-5" />
                        </Button>
                        <Button size="icon" onClick={handleUpdate}>
                          <Check className="w-5 h-5" />
                        </Button>
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
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(role.id)}>
                          <Edit className="w-5 h-5" />
                        </Button>
                        {inUse ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled
                            className="text-slate-400 cursor-not-allowed"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        ) : (
                          <ConfirmDialog
                            trigger={
                              <Button variant="destructive" size="icon">
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            }
                            title="역할 삭제"
                            description="이 역할을 삭제하시겠습니까?"
                            confirmLabel="삭제"
                            onConfirm={() => handleDelete(role.id)}
                            destructive
                          />
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {roles.length > 0 && (
          <Card className="mt-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <CardContent>
              <div className="text-sm font-semibold text-blue-700 mb-1">전체 역할</div>
              <div className="text-3xl font-bold text-blue-900">{roles.length}개</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
