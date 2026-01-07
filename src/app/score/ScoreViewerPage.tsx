// 악보 뷰어 페이지 (실시간 협업 + 주석)

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAnnotationStore } from '@/store/annotationStore';
import { Card, CardContent, useToast } from '@/components/ui';
import { AnnotationCanvas, AnnotationToolbar, LayerPanel } from '@/features/annotation/components';
import {
  useWebSocket,
  ConnectionStatus,
  RemoteCursors,
  RemoteStrokes,
} from '@/features/realtime';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAnnotationsBySong,
  useMyAnnotations,
  useCreateAnnotation,
  useDeleteMyAnnotations,
} from '@/api/annotations';
import { queryKeys } from '@/lib/query-client';
import { useProfiles } from '@/api/profiles';
import { Music } from 'lucide-react';
import DOMPurify from 'dompurify';
import { CONFIG } from '@/constants/config';
import type { AnnotationTool } from '@/types';

// SVG 전용 DOMPurify 설정
const sanitizeSvg = (svg: string): string => {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use'],
  });
};

// 이미지 경로를 전체 URL로 변환
function getImageUrl(imagePath: string | null): string | undefined {
  if (!imagePath) return undefined;
  // 이미 http로 시작하면 그대로 반환
  if (imagePath.startsWith('http')) return imagePath;
  // /uploads/... 경로를 API 서버 URL로 변환
  // CONFIG.API_BASE_URL은 'http://localhost:3001/api'이므로 /api를 제거
  const baseUrl = CONFIG.API_BASE_URL.replace('/api', '');
  return `${baseUrl}${imagePath}`;
}

export function ScoreViewerPage() {
  const currentSong = useAppStore((state) => state.currentSong);
  const currentProfile = useAppStore((state) => state.currentProfile);
  const toast = useToast();
  const queryClient = useQueryClient();

  // 레이어 패널 상태
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);

  // 주석 데이터 상태 (캔버스용)
  const [annotationSvg, setAnnotationSvg] = useState<string>('');

  // 현재 도구 상태
  const { currentTool, currentColor, strokeWidth, visibleLayers } = useAnnotationStore();

  // WebSocket 실시간 연결
  const {
    status: wsStatus,
    participants,
    remoteCursors,
    remoteStrokes,
    sendStrokeStart,
    sendStrokePoint,
    sendStrokeEnd,
    sendCursorMove,
  } = useWebSocket({
    profileId: currentProfile?.id ?? '',
    profileName: currentProfile?.name ?? '',
    profileColor: currentProfile?.color ?? '#000000',
    songId: currentSong?.id ?? '',
    // 다른 사용자 스트로크 완료 시 → 주석 목록 새로고침
    onStrokeEnded: (_profileId, _strokeId, _svgPath) => {
      if (currentSong?.id) {
        // React Query 캐시 무효화하여 새로운 주석 반영
        queryClient.invalidateQueries({
          queryKey: queryKeys.annotations.bySong(currentSong.id),
        });
      }
    },
  });

  // API 훅
  const { data: allAnnotations = [] } = useAnnotationsBySong(currentSong?.id ?? '');
  const { data: myAnnotations = [] } = useMyAnnotations(
    currentSong?.id ?? '',
    currentProfile?.id ?? ''
  );
  const { data: profiles = [] } = useProfiles();
  const createAnnotation = useCreateAnnotation();
  const deleteMyAnnotations = useDeleteMyAnnotations();

  // 주석이 있는 프로필 목록 (중복 제거)
  const profilesWithAnnotations = useMemo(() => {
    const profileIds = [...new Set(allAnnotations.map((a) => a.profileId))];
    return profiles.filter((p) => profileIds.includes(p.id));
  }, [allAnnotations, profiles]);

  // 내 주석 SVG 로드
  useEffect(() => {
    if (myAnnotations.length > 0) {
      // 가장 최근 주석의 SVG 사용 (단일 SVG 저장 방식)
      const latest = myAnnotations[myAnnotations.length - 1];
      setAnnotationSvg(latest.svgPath);
    }
  }, [myAnnotations]);

  // 디바운스 타이머 ref
  const saveTimeoutRef = useRef<number | null>(null);
  const pendingSvgRef = useRef<string>('');

  // 주석 변경 핸들러 (실시간 전송 + 디바운스 자동 저장)
  const handleAnnotationChange = useCallback((svgData: string) => {
    setAnnotationSvg(svgData);
    pendingSvgRef.current = svgData;

    // 실시간으로 스트로크 완료 전송
    if (wsStatus === 'connected') {
      const strokeId = `stroke-${Date.now()}`;
      sendStrokeEnd(strokeId, svgData);
    }

    // 기존 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 디바운스 자동 저장 (1초 후)
    if (currentSong && currentProfile && svgData) {
      saveTimeoutRef.current = window.setTimeout(async () => {
        try {
          // 기존 주석 삭제 후 새로 저장 (단일 SVG 방식)
          await deleteMyAnnotations.mutateAsync({
            songId: currentSong.id,
            profileId: currentProfile.id,
          });
          await createAnnotation.mutateAsync({
            songId: currentSong.id,
            profileId: currentProfile.id,
            svgPath: pendingSvgRef.current,
            color: currentColor,
            tool: currentTool as AnnotationTool,
          });
        } catch {
          toast.error('주석 저장에 실패했습니다');
        }
      }, 1000);
    }
  }, [
    wsStatus,
    sendStrokeEnd,
    currentSong,
    currentProfile,
    currentColor,
    currentTool,
    createAnnotation,
    deleteMyAnnotations,
    toast,
  ]);

  // 컴포넌트 언마운트 시 pending 데이터 저장 + 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // 미저장 데이터가 있으면 즉시 저장 시도
      const pendingSvg = pendingSvgRef.current;
      const song = currentSong;
      const profile = currentProfile;
      if (pendingSvg && song && profile) {
        // 동기적으로 저장 요청 (언마운트 중이라 await 불가)
        deleteMyAnnotations.mutate(
          { songId: song.id, profileId: profile.id },
          {
            onSuccess: () => {
              createAnnotation.mutate({
                songId: song.id,
                profileId: profile.id,
                svgPath: pendingSvg,
                color: currentColor,
                tool: currentTool as AnnotationTool,
              });
            },
          }
        );
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id, currentProfile?.id]);

  // 스트로크 시작 핸들러
  const handleStrokeStart = useCallback((strokeId: string) => {
    if (wsStatus === 'connected') {
      sendStrokeStart(strokeId, currentTool, currentColor, strokeWidth);
    }
  }, [wsStatus, sendStrokeStart, currentTool, currentColor, strokeWidth]);

  // 스트로크 포인트 핸들러
  const handleStrokePoint = useCallback((strokeId: string, x: number, y: number, pressure?: number) => {
    if (wsStatus === 'connected') {
      sendStrokePoint(strokeId, x, y, pressure);
    }
  }, [wsStatus, sendStrokePoint]);

  // 커서 이동 핸들러
  const handleCursorMove = useCallback((x: number, y: number) => {
    if (wsStatus === 'connected') {
      sendCursorMove(x, y);
    }
  }, [wsStatus, sendCursorMove]);


  // 다른 사용자 주석 목록 (레이어 on/off 반영)
  const visibleOtherAnnotations = useMemo(() => {
    return allAnnotations
      .filter((a) => a.profileId !== currentProfile?.id && visibleLayers.includes(a.profileId));
  }, [allAnnotations, currentProfile?.id, visibleLayers]);

  if (!currentSong) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <Music className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-600">찬양을 선택하세요</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* 악보 정보 헤더 */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{currentSong.title}</h2>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              {currentSong.key && <span>Key: {currentSong.key}</span>}
              {currentSong.memo && <span>{currentSong.memo}</span>}
            </div>
          </div>
          {/* 실시간 연결 상태 */}
          <ConnectionStatus
            status={wsStatus}
            participantCount={participants.length}
          />
        </div>
      </div>

      {/* 주석 캔버스 영역 */}
      <div className="relative flex-1 overflow-hidden bg-gray-100">
        {/* 레이어 패널 */}
        <LayerPanel
          profiles={profilesWithAnnotations}
          currentProfileId={currentProfile?.id ?? ''}
          isOpen={isLayerPanelOpen}
          onToggle={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
        />

        {/* 다른 사용자 커서 */}
        <RemoteCursors cursors={remoteCursors} />

        {/* 다른 사용자가 그리는 중인 스트로크 (실시간) */}
        <RemoteStrokes strokes={remoteStrokes} />

        {/* 다른 사용자의 완료된 주석 오버레이 */}
        {visibleOtherAnnotations.length > 0 && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: 5 }}
          >
            {visibleOtherAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                className="absolute inset-0"
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(annotation.svgPath) }}
              />
            ))}
          </div>
        )}

        {currentSong.imagePath ? (
          <AnnotationCanvas
            backgroundImage={getImageUrl(currentSong.imagePath)}
            initialSvg={annotationSvg || undefined}
            onChange={handleAnnotationChange}
            onStrokeStart={handleStrokeStart}
            onStrokePoint={handleStrokePoint}
            onCursorMove={handleCursorMove}
          />
        ) : (
          <div className="relative h-full w-full">
            {/* 안내 메시지 (오버레이) */}
            <div className="absolute left-4 top-4 z-10 rounded-lg bg-white/90 px-4 py-2 shadow-md">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">악보 이미지가 없습니다</p>
                  <p className="text-xs text-gray-400">
                    찬양을 수정하여 악보 이미지를 추가하세요
                  </p>
                </div>
              </div>
            </div>
            {/* 전체 화면 캔버스 */}
            <AnnotationCanvas
              onChange={handleAnnotationChange}
              onStrokeStart={handleStrokeStart}
              onStrokePoint={handleStrokePoint}
              onCursorMove={handleCursorMove}
            />
          </div>
        )}
      </div>

      {/* 하단 주석 도구 바 */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex justify-center">
          <AnnotationToolbar
            canUndo={false}
            canRedo={false}
          />
        </div>
      </div>
    </div>
  );
}
