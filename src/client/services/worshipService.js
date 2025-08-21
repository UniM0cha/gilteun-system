import { apiService } from './api';
export class WorshipApiService {
    async getWorships(date) {
        const endpoint = date ? `/worships?date=${encodeURIComponent(date)}` : '/worships';
        return apiService.get(endpoint);
    }
    async getWorshipById(id) {
        return apiService.get(`/worships/${id}`);
    }
    async createWorship(data) {
        return apiService.post('/worships', data);
    }
    async updateWorship(id, data) {
        return apiService.put(`/worships/${id}`, data);
    }
    async deleteWorship(id) {
        return apiService.delete(`/worships/${id}`);
    }
    async getWorshipTypes() {
        return apiService.get('/worship-types');
    }
}
export const worshipApiService = new WorshipApiService();
