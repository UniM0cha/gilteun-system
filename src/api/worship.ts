import { ApiClient } from './client';
import type { Song, Worship } from '../types';

/**
 * 예배 생성 요청 타입
 */
export interface CreateWorshipRequest {
  title: string;
  date: string;
  time?: string;
  description?: string;
}

/**
 * 예배 수정 요청 타입
 */
export type UpdateWorshipRequest = Partial<CreateWorshipRequest>;

/**
 * 예배 목록 응답 타입
 */
export interface WorshipsResponse {
  worships: Worship[];
  total: number;
}

/**
 * 예배 API 서비스
 * - 예배 CRUD 작업
 * - 예배 관련 찬양 관리
 */
export class WorshipApi {
  constructor(private client: ApiClient) {}

  /**
   * 예배 목록 조회
   */
  async getWorships(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    sortBy?: 'date' | 'title' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<WorshipsResponse> {
    return this.client.get('/api/worships', params);
  }

  /**
   * 특정 예배 조회
   */
  async getWorship(id: number): Promise<Worship> {
    return this.client.get(`/api/worships/${id}`);
  }

  /**
   * 예배 생성
   */
  async createWorship(data: CreateWorshipRequest): Promise<Worship> {
    return this.client.post('/api/worships', data);
  }

  /**
   * 예배 수정
   */
  async updateWorship(id: number, data: UpdateWorshipRequest): Promise<Worship> {
    return this.client.patch(`/api/worships/${id}`, data);
  }

  /**
   * 예배 삭제
   */
  async deleteWorship(id: number): Promise<void> {
    return this.client.delete(`/api/worships/${id}`);
  }

  /**
   * 예배에 속한 찬양 목록 조회
   */
  async getWorshipSongs(worshipId: number): Promise<Song[]> {
    return this.client.get(`/api/worships/${worshipId}/songs`);
  }

  /**
   * 예배에 찬양 추가
   */
  async addSongToWorship(
    worshipId: number,
    songData: {
      title: string;
      key?: string;
      memo?: string;
      order?: number;
    },
  ): Promise<Song> {
    return this.client.post(`/api/worships/${worshipId}/songs`, songData);
  }

  /**
   * 예배의 찬양 순서 변경
   */
  async reorderWorshipSongs(
    worshipId: number,
    songOrders: Array<{
      songId: number;
      order: number;
    }>,
  ): Promise<void> {
    return this.client.patch(`/api/worships/${worshipId}/songs/reorder`, {
      songOrders,
    });
  }

  /**
   * 예배에서 찬양 제거
   */
  async removeSongFromWorship(worshipId: number, songId: number): Promise<void> {
    return this.client.delete(`/api/worships/${worshipId}/songs/${songId}`);
  }

  /**
   * 최근 예배 목록 조회 (빠른 액세스용)
   */
  async getRecentWorships(limit: number = 5): Promise<Worship[]> {
    const response = await this.getWorships({
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    return response.worships;
  }

  /**
   * 오늘 예배 조회
   */
  async getTodayWorship(): Promise<Worship | null> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const response = await this.getWorships({
      search: today,
      limit: 1,
    });

    return response.worships.length > 0 ? response.worships[0] : null;
  }

  /**
   * 예배 통계 조회
   */
  async getWorshipStats(): Promise<{
    totalWorships: number;
    totalSongs: number;
    averageSongsPerWorship: number;
    recentWorshipsCount: number;
  }> {
    return this.client.get('/api/worships/stats');
  }
}
