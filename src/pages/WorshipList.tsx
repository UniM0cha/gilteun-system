import { Calendar, Clock, LogOut, Music, Plus, RefreshCw, Search, Settings, Users } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Input, LoadingOverlay, LoadingSpinner } from '../components/ui';
import { useHealthCheck, useWorships } from '../hooks/useApi';
import { useAppStore } from '../store/appStore';
import type { Worship } from '../types';

/**
 * 예배 목록 페이지
 * - 예배 목록 조회 및 표시
 * - 예배 선택 및 찬양 목록으로 이동
 * - 새 예배 생성 (관리자)
 * - 사용자 프로필 및 설정 관리
 */
export const WorshipListPage: React.FC = () => {
  const navigate = useNavigate();

  // 스토어 상태
  const { currentUser, serverInfo, isLoading, setCurrentWorship } = useAppStore();

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('');

  // API 훅 사용
  const {
    data: worshipsResponse,
    isLoading: isLoadingWorships,
    error: worshipsError,
    refetch: refetchWorships,
  } = useWorships({
    search: searchQuery.length > 0 ? searchQuery : undefined,
  });

  const { data: healthData, isError: isHealthError } = useHealthCheck();

  // 예배 목록 (API 응답에서 추출)
  const worships = worshipsResponse?.worships || [];

  // 검색 필터링된 예배 목록 (로컬 필터링 추가)
  const filteredWorships = worships.filter(
    (worship) =>
      worship.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worship.date.includes(searchQuery) ||
      worship.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 사용자가 로그인되어 있지 않으면 프로필 선택 페이지로 이동
  React.useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // 예배 선택
  const handleWorshipSelect = (worship: Worship) => {
    setCurrentWorship(worship);
    navigate(`/worship/${worship.id}`);
  };

  // 새 예배 생성 (관리자 기능)
  const handleCreateWorship = () => {
    navigate('/admin');
  };

  // 설정 페이지로 이동
  const handleSettings = () => {
    navigate('/settings');
  };

  // 로그아웃 (프로필 선택 페이지로 이동)
  const handleLogout = () => {
    navigate('/');
  };

  // 예배 카드 컴포넌트
  const WorshipCard: React.FC<{ worship: Worship }> = ({ worship }) => (
    <Card
      shadow="sm"
      className="cursor-pointer transition-shadow hover:shadow-md"
      dataTestId="worship-item"
      onClick={() => handleWorshipSelect(worship)}
    >
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-lg leading-6 font-semibold text-gray-900">{worship.title}</h3>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Music className="h-4 w-4" />
            <span>{worship.songsCount || 0}</span>
          </div>
        </div>

        <div className="space-y-2">
          {/* 날짜 및 시간 */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(worship.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </span>
          </div>

          {worship.time && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{worship.time}</span>
            </div>
          )}

          {/* 설명 */}
          {worship.description && <p className="line-clamp-2 text-sm text-gray-700">{worship.description}</p>}
        </div>

        {/* 생성 시간 */}
        <div className="border-t border-gray-100 pt-2 text-xs text-gray-500">
          생성일: {new Date(worship.createdAt).toLocaleDateString('ko-KR')}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50" data-testid="worship-list">
      {/* 헤더 */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">길튼 시스템</h1>
                <p className="text-sm text-gray-600">환영합니다, {currentUser?.name}님</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 새로고침 버튼 */}
              <Button variant="ghost" size="sm" onClick={() => refetchWorships()} disabled={isLoadingWorships}>
                <RefreshCw className={`h-4 w-4 ${isLoadingWorships ? 'animate-spin' : ''}`} />
              </Button>

              {/* 설정 버튼 */}
              <Button variant="ghost" size="sm" onClick={handleSettings}>
                <Settings className="h-4 w-4" />
              </Button>

              {/* 로그아웃 버튼 */}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-4xl p-4">
        <LoadingOverlay isLoading={isLoading} text="데이터를 불러오는 중...">
          <div className="space-y-6">
            {/* 페이지 헤더 */}
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold text-gray-900">예배 목록</h2>
              <p className="text-gray-600">참여할 예배를 선택하세요</p>
            </div>

            {/* 검색 및 액션 바 */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Input
                  placeholder="예배 제목, 날짜, 설명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <Button variant="primary" onClick={handleCreateWorship} className="sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />새 예배 생성
              </Button>
            </div>

            {/* 서버 연결 상태 표시 */}
            {serverInfo && (
              <Card
                shadow="sm"
                className={`${
                  healthData?.status === 'healthy' && !isHealthError
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          healthData?.status === 'healthy' && !isHealthError ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      ></div>
                      <span
                        className={`text-sm ${
                          healthData?.status === 'healthy' && !isHealthError ? 'text-blue-700' : 'text-red-700'
                        }`}
                      >
                        {healthData?.status === 'healthy' && !isHealthError
                          ? `서버 연결됨: ${new URL(serverInfo.url).host}`
                          : `서버 연결 불안정: ${new URL(serverInfo.url).host}`}
                      </span>
                    </div>
                    <span
                      className={`text-sm ${
                        healthData?.status === 'healthy' && !isHealthError ? 'text-blue-600' : 'text-red-600'
                      }`}
                    >
                      접속자: {healthData?.connectedUsers || 0}명
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 로딩 에러 표시 */}
            {worshipsError && (
              <Card shadow="sm" className="border-red-200 bg-red-50">
                <CardContent>
                  <p className="text-red-700">
                    {worshipsError instanceof Error
                      ? worshipsError.message
                      : '예배 목록을 불러오는 중 오류가 발생했습니다'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetchWorships()} className="mt-2">
                    다시 시도
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 예배 목록 */}
            <div className="space-y-4">
              {isLoadingWorships ? (
                <div className="py-8 text-center">
                  <LoadingSpinner size="lg" text="예배 목록을 불러오는 중..." />
                </div>
              ) : filteredWorships.length === 0 ? (
                <Card shadow="sm">
                  <CardContent className="py-8 text-center">
                    <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900">
                      {searchQuery ? '검색 결과가 없습니다' : '등록된 예배가 없습니다'}
                    </h3>
                    <p className="mb-4 text-gray-600">
                      {searchQuery ? '다른 검색어로 시도해보세요' : '새 예배를 생성하여 시작하세요'}
                    </p>
                    {!searchQuery && (
                      <Button variant="primary" onClick={handleCreateWorship}>
                        <Plus className="mr-2 h-4 w-4" />첫 예배 생성하기
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredWorships.map((worship) => (
                    <WorshipCard key={worship.id} worship={worship} />
                  ))}
                </div>
              )}
            </div>

            {/* 검색 결과 카운트 */}
            {searchQuery && filteredWorships.length > 0 && (
              <p className="text-center text-sm text-gray-600">{filteredWorships.length}개의 예배가 검색되었습니다</p>
            )}
          </div>
        </LoadingOverlay>
      </div>
    </div>
  );
};
