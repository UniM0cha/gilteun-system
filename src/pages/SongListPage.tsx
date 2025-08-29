import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Music, Plus, Settings, Trash2, Upload, Users } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FileUpload,
  FileUploadFile,
  Input,
  LoadingOverlay,
  LoadingSpinner,
} from '../components/ui';
import { useAppStore } from '../store/appStore';
import { useCreateSong, useDeleteSong, useSongs, useUpdateSong, useWorship } from '../hooks/useApi';
import type { CreateSongRequest, Song } from '../types';

/**
 * 찬양 목록 페이지
 * - 특정 예배의 찬양 목록 표시
 * - 찬양 추가, 편집, 삭제
 * - 악보 이미지 업로드
 * - 찬양 선택 시 ScoreViewerPage로 이동
 */
export const SongListPage: React.FC = () => {
  const navigate = useNavigate();
  const { worshipId } = useParams<{ worshipId: string }>();
  const worshipIdNum = worshipId ? parseInt(worshipId) : null;

  // 스토어 상태
  const { currentWorship, setCurrentWorship, isLoading } = useAppStore();

  // 로컬 상태
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  const [newSongForm, setNewSongForm] = useState({
    title: '',
    key: '',
    memo: '',
    order: 1,
  });

  // API 훅
  const {
    data: worshipResponse,
    isLoading: isLoadingWorship,
    error: worshipError,
  } = useWorship(worshipIdNum, {
    enabled: !!worshipIdNum,
  });

  const {
    data: songsResponse,
    isLoading: isLoadingSongs,
    error: songsError,
    refetch: refetchSongs,
  } = useSongs(worshipIdNum ? { worshipId: worshipIdNum } : undefined, {
    enabled: !!worshipIdNum,
  });

  const createSongMutation = useCreateSong();
  const updateSongMutation = useUpdateSong();
  const deleteSongMutation = useDeleteSong();

  // 데이터 추출
  const worship = worshipResponse;
  const songs = songsResponse?.songs || [];

  // 예배 정보가 현재 상태와 다르면 업데이트
  React.useEffect(() => {
    if (worship && (!currentWorship || currentWorship.id !== worship.id)) {
      setCurrentWorship(worship);
    }
  }, [worship, currentWorship, setCurrentWorship]);

  // 뒤로 가기
  const handleGoBack = () => {
    navigate('/worship');
  };

  // 찬양 선택
  const handleSongSelect = (song: Song) => {
    navigate(`/worship/${worshipId}/song/${song.id}`);
  };

  // 새 찬양 생성 폼 제출
  const handleCreateSong = useCallback(async () => {
    if (!worshipIdNum || !newSongForm.title.trim()) return;

    try {
      const createData: CreateSongRequest = {
        worshipId: worshipIdNum,
        title: newSongForm.title.trim(),
        key: newSongForm.key.trim() || undefined,
        memo: newSongForm.memo.trim() || undefined,
        order: newSongForm.order,
      };

      await createSongMutation.mutateAsync(createData);

      // 폼 초기화 및 닫기
      setNewSongForm({ title: '', key: '', memo: '', order: songs.length + 1 });
      setShowCreateForm(false);

      // 목록 새로고침
      refetchSongs();
    } catch (error) {
      console.error('찬양 생성 실패:', error);
    }
  }, [worshipIdNum, newSongForm, createSongMutation, songs.length, refetchSongs]);

  // 찬양 편집 모달 열기
  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    setNewSongForm({
      title: song.title,
      key: song.key || '',
      memo: song.memo || '',
      order: song.order || 1,
    });
  };

  // 찬양 편집 제출
  const handleUpdateSong = useCallback(async () => {
    if (!editingSong) return;

    try {
      await updateSongMutation.mutateAsync({
        id: editingSong.id,
        title: newSongForm.title.trim(),
        key: newSongForm.key.trim() || undefined,
        memo: newSongForm.memo.trim() || undefined,
        order: newSongForm.order,
      });

      // 편집 모달 닫기
      setEditingSong(null);
      setNewSongForm({ title: '', key: '', memo: '', order: 1 });

      // 목록 새로고침
      refetchSongs();
    } catch (error) {
      console.error('찬양 수정 실패:', error);
    }
  }, [editingSong, newSongForm, updateSongMutation, refetchSongs]);

  // 찬양 삭제
  const handleDeleteSong = useCallback(
    async (songId: number) => {
      if (!confirm('이 찬양을 삭제하시겠습니까? 관련된 주석도 모두 삭제됩니다.')) return;

      try {
        await deleteSongMutation.mutateAsync(songId);
        refetchSongs();
      } catch (error) {
        console.error('찬양 삭제 실패:', error);
      }
    },
    [deleteSongMutation, refetchSongs],
  );

  // 파일 업로드 핸들러 (Phase 3에서 구현)
  const handleFileUpload = useCallback(async (_file: FileUploadFile): Promise<string> => {
    // TODO: Phase 3에서 실제 파일 업로드 API 구현
    throw new Error('파일 업로드 기능은 Phase 3에서 구현됩니다');
  }, []);

  // 찬양 카드 컴포넌트
  const SongCard: React.FC<{ song: Song; index: number }> = ({ song, index }) => (
    <Card
      shadow="sm"
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => handleSongSelect(song)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          {/* 찬양 정보 */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center space-x-2">
              <span className="rounded bg-gray-100 px-2 py-1 text-sm font-medium text-gray-500">
                #{song.order || index + 1}
              </span>
              {song.key && <span className="rounded bg-blue-50 px-2 py-1 text-sm text-blue-600">Key: {song.key}</span>}
            </div>

            <h3 className="mb-1 truncate text-lg font-semibold text-gray-900">{song.title}</h3>

            {song.memo && <p className="mb-2 line-clamp-2 text-sm text-gray-600">{song.memo}</p>}

            {/* 악보 상태 표시 */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              {song.imagePath ? (
                <span className="flex items-center text-green-600">
                  <Music className="mr-1 h-3 w-3" />
                  악보 있음
                </span>
              ) : (
                <span className="flex items-center text-orange-600">
                  <Upload className="mr-1 h-3 w-3" />
                  악보 없음
                </span>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="ml-3 flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setShowUploadModal(song.id.toString());
              }}
              className="min-h-[44px] min-w-[44px]"
            >
              <Upload className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleEditSong(song);
              }}
              className="min-h-[44px] min-w-[44px]"
            >
              <Edit2 className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSong(song.id);
              }}
              className="min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 찬양 폼 컴포넌트
  const SongForm: React.FC<{
    title: string;
    onSubmit: () => void;
    onCancel: () => void;
    loading?: boolean;
  }> = ({ title, onSubmit, onCancel, loading = false }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            label="찬양 제목"
            value={newSongForm.title}
            onChange={(e) => setNewSongForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="찬양 제목을 입력하세요"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="조 (Key)"
            value={newSongForm.key}
            onChange={(e) => setNewSongForm((prev) => ({ ...prev, key: e.target.value }))}
            placeholder="G, Am 등"
          />
          <Input
            label="순서"
            type="number"
            value={newSongForm.order}
            onChange={(e) =>
              setNewSongForm((prev) => ({
                ...prev,
                order: parseInt(e.target.value) || 1,
              }))
            }
            min="1"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">메모</label>
          <textarea
            value={newSongForm.memo}
            onChange={(e) => setNewSongForm((prev) => ({ ...prev, memo: e.target.value }))}
            placeholder="찬양 관련 메모 (선택사항)"
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            취소
          </Button>
          <Button variant="primary" onClick={onSubmit} loading={loading} disabled={!newSongForm.title.trim()}>
            {title.includes('수정') ? '수정' : '추가'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (!worshipIdNum) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">잘못된 접근</h2>
          <p className="mb-4 text-gray-600">올바르지 않은 예배 ID입니다.</p>
          <Button onClick={handleGoBack}>예배 목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="song-list">
      {/* 헤더 */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="min-h-[44px] min-w-[44px]">
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div>
                <h1 className="text-lg font-semibold text-gray-900">{worship?.title || '예배 찬양'}</h1>
                <p className="text-sm text-gray-600">
                  {worship?.date} {worship?.time && `• ${worship.time}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]">
                <Users className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-4xl p-4">
        <LoadingOverlay isLoading={isLoading} text="데이터를 불러오는 중...">
          <div className="space-y-6">
            {/* 액션 바 */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">찬양 목록</h2>
                <p className="text-sm text-gray-600">총 {songs.length}곡</p>
              </div>

              <Button variant="primary" onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
                <Plus className="mr-2 h-4 w-4" />
                찬양 추가
              </Button>
            </div>

            {/* 에러 표시 */}
            {(worshipError || songsError) && (
              <Card shadow="sm" className="border-red-200 bg-red-50">
                <CardContent>
                  <p className="text-red-700">
                    {worshipError?.message || songsError?.message || '데이터를 불러오는 중 오류가 발생했습니다'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 찬양 추가 폼 */}
            {showCreateForm && (
              <SongForm
                title="새 찬양 추가"
                onSubmit={handleCreateSong}
                onCancel={() => {
                  setShowCreateForm(false);
                  setNewSongForm({
                    title: '',
                    key: '',
                    memo: '',
                    order: songs.length + 1,
                  });
                }}
                loading={createSongMutation.isPending}
              />
            )}

            {/* 찬양 편집 폼 */}
            {editingSong && (
              <SongForm
                title="찬양 정보 수정"
                onSubmit={handleUpdateSong}
                onCancel={() => {
                  setEditingSong(null);
                  setNewSongForm({ title: '', key: '', memo: '', order: 1 });
                }}
                loading={updateSongMutation.isPending}
              />
            )}

            {/* 찬양 목록 */}
            <div className="space-y-4">
              {isLoadingSongs || isLoadingWorship ? (
                <div className="py-8 text-center">
                  <LoadingSpinner size="lg" text="찬양 목록을 불러오는 중..." />
                </div>
              ) : songs.length === 0 ? (
                <Card shadow="sm">
                  <CardContent className="py-8 text-center">
                    <Music className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900">등록된 찬양이 없습니다</h3>
                    <p className="mb-4 text-gray-600">첫 번째 찬양을 추가해보세요</p>
                    <Button variant="primary" onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
                      <Plus className="mr-2 h-4 w-4" />첫 찬양 추가하기
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {songs.map((song: Song, index: number) => (
                    <SongCard key={song.id} song={song} index={index} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </LoadingOverlay>
      </div>

      {/* 파일 업로드 모달 - Phase 3에서 완전 구현 */}
      {showUploadModal && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
          <div className="w-full max-w-lg rounded-lg bg-white">
            <div className="border-b p-4">
              <h3 className="text-lg font-semibold">악보 이미지 업로드</h3>
            </div>
            <div className="p-4">
              <FileUpload
                accept="image/*"
                maxFiles={1}
                maxSize={10 * 1024 * 1024}
                onUpload={handleFileUpload}
                placeholder="악보 이미지를 업로드하세요"
              />
            </div>
            <div className="flex justify-end space-x-2 border-t p-4">
              <Button variant="outline" onClick={() => setShowUploadModal(null)}>
                취소
              </Button>
              <Button variant="primary">업로드</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
