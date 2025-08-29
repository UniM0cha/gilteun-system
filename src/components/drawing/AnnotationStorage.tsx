import React, { useCallback, useEffect, useRef } from 'react';
import { useAnnotations, useBulkCreateAnnotations, useCreateAnnotation } from '../../hooks/useAnnotationApi';
import { useWebSocketStore } from '../../store/websocketStore';
import { Annotation, CreateAnnotationRequest } from '../../types';

/**
 * 주석 데이터 저장소 컴포넌트
 * - SVG 패스 기반 벡터 데이터 저장
 * - 실시간 주석과 영구 저장소 연동
 * - 자동 저장 및 로드 기능
 */

interface AnnotationStorageProps {
  /** 찬양 ID */
  songId: number;

  /** 현재 사용자 정보 */
  userId: string;
  userName: string;

  /** 주석 저장 완료 콜백 */
  onAnnotationSaved?: (annotation: Annotation) => void;

  /** 주석 로드 완료 콜백 */
  onAnnotationsLoaded?: (annotations: Annotation[]) => void;

  /** 저장 오류 콜백 */
  onSaveError?: (error: Error) => void;
}

interface PendingAnnotation {
  svgPath: string;
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  timestamp: number;
}

export const AnnotationStorage = React.forwardRef<AnnotationStorageRef, AnnotationStorageProps>(
  ({ songId, userId, userName, onAnnotationSaved, onAnnotationsLoaded, onSaveError }, ref) => {
    // API 훅들
    const { data: annotations, isLoading, error } = useAnnotations(songId);
    const createAnnotationMutation = useCreateAnnotation();
    const bulkCreateMutation = useBulkCreateAnnotations();

    // WebSocket 스토어
    const { connectionStatus } = useWebSocketStore();

    // 미저장 주석들 (오프라인 대응)
    const pendingAnnotationsRef = useRef<PendingAnnotation[]>([]);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

    /**
     * 주석 데이터 로드 완료 처리
     */
    useEffect(() => {
      if (annotations && onAnnotationsLoaded) {
        onAnnotationsLoaded(annotations);
      }
    }, [annotations, onAnnotationsLoaded]);

    /**
     * 단일 주석 저장
     */
    const saveAnnotation = useCallback(
      async (svgPath: string, tool: 'pen' | 'highlighter' | 'eraser', color: string, layer?: string) => {
        const annotationData: CreateAnnotationRequest = {
          songId,
          userId,
          userName,
          layer: layer || `${userName}의 주석`,
          svgPath,
          color,
          tool,
        };

        try {
          const result = await createAnnotationMutation.mutateAsync(annotationData);
          if (result) {
            onAnnotationSaved?.(result);
            console.log('주석 저장 완료:', result.id);
            return result;
          }
          throw new Error('주석 저장 실패');
        } catch (error) {
          console.error('주석 저장 오류:', error);
          onSaveError?.(error as Error);

          // 오프라인이거나 저장 실패 시 대기열에 추가
          pendingAnnotationsRef.current.push({
            svgPath,
            tool,
            color,
            timestamp: Date.now(),
          });

          throw error;
        }
      },
      [songId, userId, userName, createAnnotationMutation, onAnnotationSaved, onSaveError],
    );

    /**
     * 여러 주석 한 번에 저장 (대기열 처리)
     */
    const savePendingAnnotations = useCallback(async () => {
      const pending = pendingAnnotationsRef.current;
      if (pending.length === 0) return;

      const annotationsToSave: CreateAnnotationRequest[] = pending.map((p) => ({
        songId,
        userId,
        userName,
        layer: `${userName}의 주석`,
        svgPath: p.svgPath,
        color: p.color,
        tool: p.tool,
      }));

      try {
        const results = await bulkCreateMutation.mutateAsync(annotationsToSave);

        // 성공한 항목들 대기열에서 제거
        pendingAnnotationsRef.current = [];

        console.log(`대기 중인 주석 ${results.length}개 저장 완료`);

        // 콜백 호출
        results.forEach((result) => {
          onAnnotationSaved?.(result);
        });

        return results;
      } catch (error) {
        console.error('벌크 주석 저장 오류:', error);
        onSaveError?.(error as Error);
        throw error;
      }
    }, [songId, userId, userName, bulkCreateMutation, onAnnotationSaved, onSaveError]);

    /**
     * 자동 저장 (디바운스)
     */
    const scheduleAutoSave = useCallback(() => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        if (pendingAnnotationsRef.current.length > 0 && connectionStatus === 'connected') {
          savePendingAnnotations().catch((error) => {
            console.error('자동 저장 실패:', error);
          });
        }
      }, 2000); // 2초 후 자동 저장
    }, [connectionStatus, savePendingAnnotations]);

    /**
     * 연결 상태 변경 시 대기중인 주석 저장 시도
     */
    useEffect(() => {
      if (connectionStatus === 'connected' && pendingAnnotationsRef.current.length > 0) {
        console.log(`연결 복구됨. 대기 중인 주석 ${pendingAnnotationsRef.current.length}개 저장 시도`);
        savePendingAnnotations().catch((error) => {
          console.error('연결 복구 후 저장 실패:', error);
        });
      }
    }, [connectionStatus, savePendingAnnotations]);

    /**
     * 컴포넌트 언마운트 시 정리
     */
    useEffect(() => {
      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
      };
    }, []);

    /**
     * SVG 데이터 검증
     */
    const validateSVGData = useCallback((svgPath: string): boolean => {
      if (!svgPath || typeof svgPath !== 'string') return false;

      // 기본적인 SVG 구조 검증
      return svgPath.trim().length > 0 && svgPath.includes('<') && svgPath.includes('>');
    }, []);

    /**
     * 주석 데이터 압축 (선택적)
     */
    const compressSVGData = useCallback((svgPath: string): string => {
      // SVG 데이터 최적화 (공백 제거, 불필요한 속성 제거 등)
      return svgPath.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
    }, []);

    /**
     * 외부 API - 주석 저장
     */
    const handleSaveAnnotation = useCallback(
      async (
        svgPath: string,
        tool: 'pen' | 'highlighter' | 'eraser',
        color: string,
        options: {
          autoSave?: boolean;
          compress?: boolean;
          layer?: string;
        } = {},
      ) => {
        const { autoSave = false, compress = true, layer } = options;

        // SVG 데이터 검증
        if (!validateSVGData(svgPath)) {
          console.warn('유효하지 않은 SVG 데이터:', svgPath);
          return null;
        }

        // 데이터 압축
        const processedSVGPath = compress ? compressSVGData(svgPath) : svgPath;

        if (autoSave) {
          // 대기열에 추가하고 자동 저장 예약
          pendingAnnotationsRef.current.push({
            svgPath: processedSVGPath,
            tool,
            color,
            timestamp: Date.now(),
          });

          scheduleAutoSave();
          return null;
        } else {
          // 즉시 저장
          return await saveAnnotation(processedSVGPath, tool, color, layer);
        }
      },
      [validateSVGData, compressSVGData, scheduleAutoSave, saveAnnotation],
    );

    /**
     * 외부 API - 대기중인 주석 강제 저장
     */
    const handleFlushPendingAnnotations = useCallback(async () => {
      if (pendingAnnotationsRef.current.length === 0) {
        return [];
      }

      return await savePendingAnnotations();
    }, [savePendingAnnotations]);

    /**
     * 외부 API - 저장 상태 조회
     */
    const getSaveStatus = useCallback(() => {
      return {
        isLoading: isLoading,
        isSaving: createAnnotationMutation.isPending || bulkCreateMutation.isPending,
        pendingCount: pendingAnnotationsRef.current.length,
        hasError: !!error,
        isConnected: connectionStatus === 'connected',
      };
    }, [isLoading, createAnnotationMutation.isPending, bulkCreateMutation.isPending, error, connectionStatus]);

    // 컴포넌트 API를 부모에서 사용할 수 있도록 ref 노출
    React.useImperativeHandle(ref, () => ({
      saveAnnotation: handleSaveAnnotation,
      flushPendingAnnotations: async () => {
        const result = await handleFlushPendingAnnotations();
        return result || [];
      },
      getSaveStatus,
      getPendingCount: () => pendingAnnotationsRef.current.length,
    }));

    // 이 컴포넌트는 UI를 렌더링하지 않음 (로직 컴포넌트)
    return null;
  },
);

// 컴포넌트 API 타입 정의
export interface AnnotationStorageRef {
  saveAnnotation: (
    svgPath: string,
    tool: 'pen' | 'highlighter' | 'eraser',
    color: string,
    options?: {
      autoSave?: boolean;
      compress?: boolean;
      layer?: string;
    },
  ) => Promise<Annotation | null>;

  flushPendingAnnotations: () => Promise<Annotation[]>;

  getSaveStatus: () => {
    isLoading: boolean;
    isSaving: boolean;
    pendingCount: number;
    hasError: boolean;
    isConnected: boolean;
  };

  getPendingCount: () => number;
}

export default AnnotationStorage;
