import { apiService } from './api';
export class ScoreApiService {
    async getScores(worshipId) {
        const endpoint = worshipId ? `/scores?worshipId=${encodeURIComponent(worshipId)}` : '/scores';
        return apiService.get(endpoint);
    }
    async getScoreById(id) {
        return apiService.get(`/scores/${id}`);
    }
    async createScore(data) {
        return apiService.post('/scores', data);
    }
    async updateScore(id, data) {
        return apiService.put(`/scores/${id}`, data);
    }
    async deleteScore(id) {
        return apiService.delete(`/scores/${id}`);
    }
    async uploadScore(formData) {
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
    getScoreImageUrl(score, page = 1) {
        const baseUrl = score.filePath;
        if (baseUrl.endsWith('.pdf')) {
            return `/api/scores/${score.id}/page/${page}/image`;
        }
        return `/api/scores/${score.id}/image`;
    }
}
export const scoreApiService = new ScoreApiService();
