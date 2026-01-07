// 찬양 목록 페이지

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Music, MoreVertical, Trash2, Edit, GripVertical, Upload, Image } from 'lucide-react';
import { useSongsByWorship, useDeleteSong, useCreateSong, useUploadSongImage, useUpdateSong } from '@/api/songs';
import { useAppStore } from '@/store/appStore';
import { getScoreViewerPath } from '@/constants/routes';
import { Button, Card, CardContent, Modal, ModalFooter, Input, ConfirmModal } from '@/components/ui';
import { useToast } from '@/components/ui';
import { FullPageLoader, EmptyState } from '@/components/shared';
import type { Song } from '@/types';

export function SongListPage() {
  const navigate = useNavigate();
  const currentWorship = useAppStore((state) => state.currentWorship);
  const setCurrentSong = useAppStore((state) => state.setCurrentSong);
  const toast = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [editTarget, setEditTarget] = useState<Song | null>(null);

  const { data: songs, isLoading, error } = useSongsByWorship(currentWorship?.id || '');
  const deleteSong = useDeleteSong();

  // 찬양 선택 → 악보 뷰어로 이동
  const handleSelectSong = (song: Song) => {
    setCurrentSong(song);
    navigate(getScoreViewerPath(song.id));
  };

  // 찬양 삭제
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSong.mutateAsync(deleteTarget.id);
      toast.success('찬양이 삭제되었습니다');
      setDeleteTarget(null);
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  };

  if (!currentWorship) {
    return null; // RequireWorship 가드가 처리
  }

  if (isLoading) {
    return <FullPageLoader message="찬양 목록을 불러오는 중..." />;
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600">찬양 목록을 불러오는데 실패했습니다.</p>
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
          찬양 목록 ({songs?.length || 0})
        </h2>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          찬양 추가
        </Button>
      </div>

      {/* 찬양 목록 */}
      {songs && songs.length > 0 ? (
        <div className="space-y-2">
          {songs.map((song, index) => (
            <SongCard
              key={song.id}
              song={song}
              index={index + 1}
              onClick={() => handleSelectSong(song)}
              onEdit={() => setEditTarget(song)}
              onDelete={() => setDeleteTarget(song)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Music}
          title="찬양이 없습니다"
          description="찬양을 추가해 시작하세요"
          action={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              찬양 추가하기
            </Button>
          }
        />
      )}

      {/* 찬양 생성 모달 */}
      <CreateSongModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        worshipId={currentWorship.id}
      />

      {/* 수정 모달 */}
      {editTarget && (
        <EditSongModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          song={editTarget}
          worshipId={currentWorship.id}
        />
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="찬양 삭제"
        message={`"${deleteTarget?.title}" 찬양을 삭제하시겠습니까?`}
        confirmText="삭제"
        variant="danger"
        isLoading={deleteSong.isPending}
      />
    </div>
  );
}

// 찬양 카드 컴포넌트
interface SongCardProps {
  song: Song;
  index: number;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SongCard({ song, index, onClick, onEdit, onDelete }: SongCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-3">
        {/* 드래그 핸들 (향후 재정렬용) */}
        <div className="cursor-grab text-gray-400">
          <GripVertical className="h-5 w-5" />
        </div>

        {/* 순서 번호 */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
          {index}
        </div>

        {/* 정보 */}
        <button onClick={onClick} className="flex-1 text-left">
          <h3 className="font-medium text-gray-900">{song.title}</h3>
          <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
            {song.key && <span>Key: {song.key}</span>}
            {song.memo && <span className="truncate">{song.memo}</span>}
          </div>
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
                    onEdit();
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
      </CardContent>
    </Card>
  );
}

// 찬양 생성 모달
interface CreateSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  worshipId: string;
}

function CreateSongModal({ isOpen, onClose, worshipId }: CreateSongModalProps) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [key, setKey] = useState('');
  const [memo, setMemo] = useState('');

  const createSong = useCreateSong();

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.warning('제목을 입력하세요');
      return;
    }

    try {
      await createSong.mutateAsync({
        worshipId,
        title: title.trim(),
        key: key || undefined,
        memo: memo.trim() || undefined,
      });

      toast.success('찬양이 추가되었습니다');
      resetForm();
      onClose();
    } catch {
      toast.error('찬양 추가에 실패했습니다');
    }
  };

  const resetForm = () => {
    setTitle('');
    setKey('');
    setMemo('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="찬양 추가">
      <div className="space-y-4">
        <Input
          label="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="찬양 제목"
          required
        />

        <Input
          label="Key (선택)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="예: C, D, E"
        />

        <Input
          label="메모 (선택)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모"
        />
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          취소
        </Button>
        <Button onClick={handleSubmit} disabled={!title.trim()} isLoading={createSong.isPending}>
          추가
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// 찬양 수정 모달 (이미지 업로드 포함)
interface EditSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  worshipId: string;
}

function EditSongModal({ isOpen, onClose, song, worshipId }: EditSongModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(song.title);
  const [key, setKey] = useState(song.key || '');
  const [memo, setMemo] = useState(song.memo || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(song.imagePath || null);

  const updateSong = useUpdateSong();
  const uploadImage = useUploadSongImage();

  // Blob URL 메모리 누수 방지
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 검증 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.warning('이미지 크기는 10MB 이하여야 합니다');
        return;
      }

      // 이미지 타입 검증
      if (!file.type.startsWith('image/')) {
        toast.warning('이미지 파일만 업로드 가능합니다');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.warning('제목을 입력하세요');
      return;
    }

    try {
      // 1. 찬양 정보 수정
      await updateSong.mutateAsync({
        id: song.id,
        worshipId,
        title: title.trim(),
        key: key || undefined,
        memo: memo.trim() || undefined,
      });

      // 2. 이미지 업로드 (선택된 경우)
      if (selectedFile) {
        await uploadImage.mutateAsync({
          songId: song.id,
          file: selectedFile,
        });
      }

      toast.success('찬양이 수정되었습니다');
      onClose();
    } catch {
      toast.error('찬양 수정에 실패했습니다');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="찬양 수정">
      <div className="space-y-4">
        <Input
          label="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="찬양 제목"
          required
        />

        <Input
          label="Key (선택)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="예: C, D, E"
        />

        <Input
          label="메모 (선택)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모"
        />

        {/* 이미지 업로드 영역 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            악보 이미지
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="악보 미리보기"
                className="h-48 w-full rounded-lg border border-gray-200 object-contain"
              />
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(song.imagePath || null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="absolute right-2 top-2 rounded-full bg-gray-900/70 p-1.5 text-white hover:bg-gray-900"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-sm font-medium shadow-md hover:bg-gray-50"
              >
                <Upload className="h-4 w-4" />
                변경
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-48 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
            >
              <Image className="mb-2 h-10 w-10 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">악보 이미지 업로드</span>
              <span className="mt-1 text-xs text-gray-400">클릭하여 파일 선택</span>
            </button>
          )}
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!title.trim()}
          isLoading={updateSong.isPending || uploadImage.isPending}
        >
          저장
        </Button>
      </ModalFooter>
    </Modal>
  );
}
