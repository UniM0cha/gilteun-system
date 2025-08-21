import type { Score } from '@shared/types/score';
import { apiService } from './api';

export class ScoreApiService {
  async getScores(worshipId?: string): Promise<Score[]> {
    const endpoint = worshipId
      ? `/scores?worshipId=${encodeURIComponent(worshipId)}`
      : '/scores';
    return apiService.get<Score[]>(endpoint);
  }

  async getScoreById(id: string): Promise<Score> {
    return apiService.get<Score>(`/scores/${id}`);
  }

  async createScore(data: {
    worshipId: string;
    title: string;
    filePath: string;
    orderIndex: number;
  }): Promise<Score> {
    return apiService.post<Score>('/scores', data);
  }

  async updateScore(
    id: string,
    data: {
      title?: string;
      orderIndex?: number;
    }
  ): Promise<Score> {
    return apiService.put<Score>(`/scores/${id}`, data);
  }

  async deleteScore(id: string): Promise<{ message: string }> {
    return apiService.delete(`/scores/${id}`);
  }

  async uploadScore(formData: FormData): Promise<Score> {
    const response = await fetch('/api/scores/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '파일 업로드 실패');
    }

    return data.data;
  }

  getScoreImageUrl(score: Score, page: number = 1): string {
    const baseUrl = score.filePath;
    if (baseUrl.endsWith('.pdf')) {
      return `/api/scores/${score.id}/page/${page}/image`;
    }
    return `/api/scores/${score.id}/image`;
  }
}

export const scoreApiService = new ScoreApiService();
