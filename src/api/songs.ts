import { ApiClient } from './client';
import type { Annotation, Song } from '../types';

/**
 * 찬양 생성 요청 타입
 */
export interface CreateSongRequest {
  worshipId: number;
  title: string;
  key?: string;
  memo?: string;
  order?: number;
}

/**
 * 찬양 수정 요청 타입
 */
export interface UpdateSongRequest extends Partial<Omit<CreateSongRequest, 'worshipId'>> {}

/**
 * 악보 업로드 요청 타입
 */
export interface UploadScoreRequest {
  songId: number;
  file: File;
}

/**
 * 주석 생성 요청 타입
 */
export interface CreateAnnotationRequest {
  songId: number;
  userId: string;
  userName: string;
  layer: string;
  svgPath: string;
  color?: string;
  tool?: 'pen' | 'highlighter' | 'eraser';
}

/**
 * 주석 수정 요청 타입
 */
export interface UpdateAnnotationRequest extends Partial<Omit<CreateAnnotationRequest, 'songId' | 'userId'>> {}

/**
 * 찬양 API 서비스
 * - 찬양 CRUD 작업
 * - 악보 이미지 관리
 * - 주석 관리
 */
export class SongApi {
  constructor(private client: ApiClient) {}

  /**
   * 찬양 조회
   */
  async getSong(id: number): Promise<Song> {
    return this.client.get(`/api/songs/${id}`);
  }

  /**
   * 찬양 생성
   */
  async createSong(data: CreateSongRequest): Promise<Song> {
    return this.client.post('/api/songs', data);
  }

  /**
   * 찬양 수정
   */
  async updateSong(id: number, data: UpdateSongRequest): Promise<Song> {
    return this.client.patch(`/api/songs/${id}`, data);
  }

  /**
   * 찬양 삭제
   */
  async deleteSong(id: number): Promise<void> {
    return this.client.delete(`/api/songs/${id}`);
  }

  /**
   * 악보 이미지 업로드
   */
  async uploadScore(
    songId: number,
    file: File,
  ): Promise<{
    imagePath: string;
    originalName: string;
    size: number;
  }> {
    const formData = new FormData();
    formData.append('score', file);
    formData.append('songId', songId.toString());

    return this.client.upload(`/api/songs/${songId}/score`, formData);
  }

  /**
   * 악보 이미지 삭제
   */
  async deleteScore(songId: number): Promise<void> {
    return this.client.delete(`/api/songs/${songId}/score`);
  }

  /**
   * 찬양의 주석 목록 조회
   */
  async getAnnotations(
    songId: number,
    params?: {
      userId?: string;
      layer?: string;
    },
  ): Promise<Annotation[]> {
    return this.client.get(`/api/songs/${songId}/annotations`, params);
  }

  /**
   * 주석 생성
   */
  async createAnnotation(data: CreateAnnotationRequest): Promise<Annotation> {
    return this.client.post(`/api/songs/${data.songId}/annotations`, data);
  }

  /**
   * 주석 수정
   */
  async updateAnnotation(songId: number, annotationId: number, data: UpdateAnnotationRequest): Promise<Annotation> {
    return this.client.patch(`/api/songs/${songId}/annotations/${annotationId}`, data);
  }

  /**
   * 주석 삭제
   */
  async deleteAnnotation(songId: number, annotationId: number): Promise<void> {
    return this.client.delete(`/api/songs/${songId}/annotations/${annotationId}`);
  }

  /**
   * 사용자의 모든 주석 삭제 (레이어 초기화)
   */
  async clearUserAnnotations(songId: number, userId: string): Promise<void> {
    return this.client.delete(`/api/songs/${songId}/annotations/user/${userId}`);
  }

  /**
   * 주석 레이어 목록 조회 (현재 활성 사용자들)
   */
  async getAnnotationLayers(songId: number): Promise<
    Array<{
      userId: string;
      userName: string;
      layer: string;
      count: number;
      lastUpdated: string;
    }>
  > {
    return this.client.get(`/api/songs/${songId}/annotations/layers`);
  }

  /**
   * 실시간 주석 동기화를 위한 최신 주석 조회
   */
  async getLatestAnnotations(songId: number, since?: string): Promise<Annotation[]> {
    return this.client.get(`/api/songs/${songId}/annotations/latest`, {
      since, // ISO timestamp
    });
  }

  /**
   * 찬양 검색 (제목, 키, 메모 기준)
   */
  async searchSongs(
    query: string,
    params?: {
      worshipId?: number;
      limit?: number;
    },
  ): Promise<Song[]> {
    return this.client.get('/api/songs/search', {
      q: query,
      ...params,
    });
  }

  /**
   * 인기 찬양 조회 (사용 빈도 기준)
   */
  async getPopularSongs(limit: number = 10): Promise<
    Array<
      Song & {
        usageCount: number;
        lastUsed: string;
      }
    >
  > {
    return this.client.get('/api/songs/popular', { limit });
  }

  /**
   * 찬양 복사 (다른 예배로)
   */
  async copySong(songId: number, targetWorshipId: number): Promise<Song> {
    return this.client.post(`/api/songs/${songId}/copy`, {
      targetWorshipId,
    });
  }

  /**
   * 찬양 통계 조회
   */
  async getSongStats(songId: number): Promise<{
    annotationCount: number;
    layerCount: number;
    activeUsers: number;
    lastModified: string;
  }> {
    return this.client.get(`/api/songs/${songId}/stats`);
  }

  /**
   * 벌크 주석 업데이트 (실시간 동기화용)
   */
  async bulkUpdateAnnotations(
    songId: number,
    annotations: Array<{
      id?: number;
      action: 'create' | 'update' | 'delete';
      data?: Partial<CreateAnnotationRequest>;
    }>,
  ): Promise<Annotation[]> {
    return this.client.post(`/api/songs/${songId}/annotations/bulk`, {
      annotations,
    });
  }
}
