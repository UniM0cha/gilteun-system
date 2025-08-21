import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { worshipApiService } from '../services/worshipService';
import { scoreApiService } from '../services/scoreService';
export const useWorshipStore = create()(persist((set, get) => ({
    // 초기 상태
    currentWorship: null,
    currentScore: null,
    currentPage: 1,
    worships: [],
    scores: [],
    isLoadingWorships: false,
    isLoadingScores: false,
    // 상태 설정
    setCurrentWorship: (worship) => {
        set({
            currentWorship: worship,
            currentScore: null,
            currentPage: 1,
        });
        // 예배가 선택되면 해당 예배의 악보들을 가져옴
        if (worship) {
            get().fetchScores(worship.id);
        }
    },
    setCurrentScore: (score) => {
        set({
            currentScore: score,
            currentPage: 1,
        });
    },
    setCurrentPage: (page) => {
        set({ currentPage: page });
    },
    // API 호출
    fetchWorships: async (date) => {
        set({ isLoadingWorships: true });
        try {
            const worships = await worshipApiService.getWorships(date);
            set({ worships });
        }
        catch (error) {
            console.error('예배 목록 조회 실패:', error);
        }
        finally {
            set({ isLoadingWorships: false });
        }
    },
    fetchScores: async (worshipId) => {
        set({ isLoadingScores: true });
        try {
            const scores = await scoreApiService.getScores(worshipId);
            set({ scores });
            // 첫 번째 악보를 자동으로 선택
            if (scores.length > 0 && !get().currentScore) {
                set({ currentScore: scores[0] });
            }
        }
        catch (error) {
            console.error('악보 목록 조회 실패:', error);
        }
        finally {
            set({ isLoadingScores: false });
        }
    },
    fetchWorshipById: async (id) => {
        try {
            const worship = await worshipApiService.getWorshipById(id);
            return worship;
        }
        catch (error) {
            console.error('예배 조회 실패:', error);
            return null;
        }
    },
    // 초기화
    clearCurrentWorship: () => {
        set({
            currentWorship: null,
            currentScore: null,
            currentPage: 1,
            scores: [],
        });
    },
}), {
    name: 'worship-store',
    // 민감하지 않은 정보만 저장 (현재 선택된 예배 ID 등)
    partialize: (state) => ({
        currentWorship: state.currentWorship,
        currentScore: state.currentScore,
        currentPage: state.currentPage,
    }),
}));
