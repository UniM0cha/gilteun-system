import { ApiClient } from './client';
import type { Song } from '../types';

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
export type UpdateSongRequest = Partial<Omit<CreateSongRequest, 'worshipId'>>;

/**
 * 악보 업로드 요청 타입
 */
export interface UploadScoreRequest {
  songId: number;
  file: File;
}

/**
 * 찬양 API 서비스
 * - 찬양 CRUD 작업
 * - 악보 이미지 관리
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
}
