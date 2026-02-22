import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useWorshipStore } from '@/store/worshipStore';
import { COLOR_OPTIONS, getColorOption } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function WorshipTypeSettings() {
  const { worshipTypes, addWorshipType, updateWorshipType, deleteWorshipType, fetchWorshipTypes } =
    useWorshipStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', color: 'blue' });

  useEffect(() => {
    fetchWorshipTypes();
  }, [fetchWorshipTypes]);

  const handleEdit = (type: { id: string; name: string; color: string }) => {
    setEditingTypeId(type.id);
    setFormData({ name: type.name, color: type.color });
    setIsEditing(true);
  };

  const handleAdd = () => {
    setEditingTypeId(null);
    setFormData({ name: '', color: 'blue' });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('예배 유형 이름을 입력해주세요.');
      return;
    }
    if (editingTypeId) {
      await updateWorshipType(editingTypeId, formData.name.trim(), formData.color);
    } else {
      await addWorshipType(formData.name.trim(), formData.color);
    }
    setIsEditing(false);
    setEditingTypeId(null);
    setFormData({ name: '', color: 'blue' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingTypeId(null);
    setFormData({ name: '', color: 'blue' });
  };

  const handleDelete = async (id: string) => {
    await deleteWorshipType(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">예배 유형 관리</h1>
            <p className="text-slate-600">예배 유형을 추가하고 관리하세요</p>
          </div>
          {!isEditing && (
            <Button onClick={handleAdd}>
              <Plus className="w-5 h-5" />
              새 유형 추가
            </Button>
          )}
        </div>

        {/* 편집 폼 */}
        {isEditing && (
          <Card className="mb-6 border-2 border-blue-200">
            <CardContent>
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                {editingTypeId ? '예배 유형 수정' : '새 예배 유형 추가'}
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    예배 유형 이름 *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="예: 주일 1부 예배"
                    className="text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    색상 선택
                  </label>
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setFormData({ ...formData, color: c.name })}
                        className={`w-12 h-12 rounded-xl transition-all ${c.bg} ${
                          formData.color === c.name
                            ? 'ring-4 ring-offset-2 ring-slate-400 scale-110'
                            : 'hover:scale-105'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">미리보기</label>
                  <span className={`inline-block px-4 py-2 rounded-full font-semibold text-white ${getColorOption(formData.color)?.bg || 'bg-blue-500'}`}>
                    {formData.name || '예배 유형 이름'}
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSave}>
                    <Save className="w-5 h-5" />
                    저장하기
                  </Button>
                  <Button variant="secondary" onClick={handleCancel}>
                    <X className="w-5 h-5" />
                    취소
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 유형 목록 */}
        <Card>
          <CardContent>
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              현재 예배 유형 ({worshipTypes.length}개)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {worshipTypes.map((type) => (
                <div
                  key={type.id}
                  className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-5 border-2 border-slate-200 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-4 py-2 rounded-full font-semibold text-white ${getColorOption(type.color)?.bg || 'bg-blue-500'}`}>
                      {type.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                        <Edit className="w-5 h-5" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="destructive" size="icon">
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        }
                        title="예배 유형 삭제"
                        description="이 예배 유형을 삭제하시겠습니까?"
                        confirmLabel="삭제"
                        onConfirm={() => handleDelete(type.id)}
                        destructive
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {worshipTypes.length === 0 && (
              <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                <Plus className="w-8 h-8 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  아직 예배 유형이 없습니다
                </h3>
                <p className="text-slate-500">새 유형 추가 버튼을 눌러 예배 유형을 만드세요</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
