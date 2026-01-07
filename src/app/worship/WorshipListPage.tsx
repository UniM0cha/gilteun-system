// 예배 목록 페이지

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Clock, MoreVertical, Trash2, Edit } from 'lucide-react';
import { useWorships, useDeleteWorship } from '@/api/worships';
import { useAppStore } from '@/store/appStore';
import { ROUTES } from '@/constants/routes';
import { formatDate, formatTime } from '@/lib/date';
import { Button, Card, CardContent, ConfirmModal } from '@/components/ui';
import { FullPageLoader, EmptyState } from '@/components/shared';
import type { Worship } from '@/types';

export function WorshipListPage() {
  const navigate = useNavigate();
  const setCurrentWorship = useAppStore((state) => state.setCurrentWorship);
  const [deleteTarget, setDeleteTarget] = useState<Worship | null>(null);

  const { data: worships, isLoading, error } = useWorships();
  const deleteWorship = useDeleteWorship();

  // 예배 선택
  const handleSelectWorship = (worship: Worship) => {
    setCurrentWorship(worship);
    navigate(ROUTES.SONG_LIST);
  };

  // 예배 삭제
  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteWorship.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return <FullPageLoader message="예배 목록을 불러오는 중..." />;
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600">예배 목록을 불러오는데 실패했습니다.</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          예배 목록 ({worships?.length || 0})
        </h2>
        <Button onClick={() => navigate(ROUTES.WORSHIP_CREATE)}>
          <Plus className="mr-1.5 h-4 w-4" />
          새 예배
        </Button>
      </div>

      {/* 예배 목록 */}
      {worships && worships.length > 0 ? (
        <div className="space-y-3">
          {worships.map((worship) => (
            <WorshipCard
              key={worship.id}
              worship={worship}
              onClick={() => handleSelectWorship(worship)}
              onDelete={() => setDeleteTarget(worship)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="예배가 없습니다"
          description="새 예배를 만들어 시작하세요"
          action={
            <Button onClick={() => navigate(ROUTES.WORSHIP_CREATE)}>
              <Plus className="mr-1.5 h-4 w-4" />
              새 예배 만들기
            </Button>
          }
        />
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="예배 삭제"
        message={`"${deleteTarget?.title}" 예배를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        variant="danger"
        isLoading={deleteWorship.isPending}
      />
    </div>
  );
}

// 예배 카드 컴포넌트
interface WorshipCardProps {
  worship: Worship;
  onClick: () => void;
  onDelete: () => void;
}

function WorshipCard({ worship, onClick, onDelete }: WorshipCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <button onClick={onClick} className="flex-1 text-left">
            <h3 className="font-semibold text-gray-900">{worship.title}</h3>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(worship.date)}
              </span>
              {worship.time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(worship.time)}
                </span>
              )}
            </div>
            {worship.memo && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{worship.memo}</p>
            )}
          </button>

          {/* 메뉴 */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="메뉴"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      // TODO: 수정 페이지로 이동
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4" />
                    수정
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
