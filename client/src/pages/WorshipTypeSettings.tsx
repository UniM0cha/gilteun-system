import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Tag } from 'lucide-react';
import { useWorshipTypes, useAddWorshipType, useUpdateWorshipType, useDeleteWorshipType } from '@/hooks/queries';
import { COLOR_OPTIONS, getColorOption } from '@/lib/colors';

export default function WorshipTypeSettings() {
  const { data: worshipTypes = [] } = useWorshipTypes();
  const addMutation = useAddWorshipType();
  const updateMutation = useUpdateWorshipType();
  const deleteMutation = useDeleteWorshipType();

  const [isEditing, setIsEditing] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', color: 'blue' });

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
      await updateMutation.mutateAsync({ id: editingTypeId, name: formData.name.trim(), color: formData.color });
    } else {
      await addMutation.mutateAsync({ name: formData.name.trim(), color: formData.color });
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
    if (confirm('이 예배 유형을 삭제하시겠습니까?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">예배 유형 관리</h1>
            <p className="text-slate-600">예배 유형을 추가하고 관리하세요</p>
          </div>
          {!isEditing && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
            >
              <Plus className="w-5 h-5" />
              새 유형 추가
            </button>
          )}
        </div>

        {/* 편집 폼 */}
        {isEditing && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {editingTypeId ? '예배 유형 수정' : '새 예배 유형 추가'}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  예배 유형 이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 주일 1부 예배"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg transition-colors"
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
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md active:scale-95"
                >
                  <Save className="w-5 h-5" />
                  저장하기
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors active:scale-95"
                >
                  <X className="w-5 h-5" />
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 유형 목록 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
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
                    <button
                      onClick={() => handleEdit(type)}
                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors active:scale-95"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors active:scale-95"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {worshipTypes.length === 0 && (
            <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Tag className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                아직 예배 유형이 없습니다
              </h3>
              <p className="text-slate-500 mb-6">새 유형 추가 버튼을 눌러 예배 유형을 만드세요</p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors active:scale-95"
              >
                <Plus className="w-5 h-5" />
                새 유형 추가
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
