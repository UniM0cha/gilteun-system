import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorshipType {
  id: string;
  name: string;
  color: string;
}

export interface Sheet {
  id: number;
  fileName: string;
  title: string;
  thumbnail: string;
  order: number;
  imageUrl?: string; // 실제 이미지 데이터 URL
  drawingPaths?: any[]; // 드로잉 경로 데이터
}

export interface Worship {
  id: string;
  title: string;
  date: string;
  typeId: string;
  sheets: Sheet[];
  createdAt: string;
  updatedAt: string;
}

interface WorshipStore {
  worshipTypes: WorshipType[];
  worships: Worship[];
  
  // 예배 유형 관련
  addWorshipType: (type: Omit<WorshipType, 'id'>) => void;
  updateWorshipType: (id: string, type: Partial<WorshipType>) => void;
  deleteWorshipType: (id: string) => void;
  
  // 예배 관련
  addWorship: (worship: Omit<Worship, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWorship: (id: string, worship: Partial<Worship>) => void;
  deleteWorship: (id: string) => void;
  getWorshipById: (id: string) => Worship | undefined;
}

const defaultWorshipTypes: WorshipType[] = [
  { id: '1', name: '주일 1부 예배', color: 'blue' },
  { id: '2', name: '주일 2부 예배', color: 'purple' },
  { id: '3', name: '주일 3부 예배', color: 'green' },
  { id: '4', name: '수요예배', color: 'orange' },
  { id: '5', name: '청년예배', color: 'pink' },
  { id: '6', name: '특별예배', color: 'red' },
];

const mockWorships: Worship[] = [
  {
    id: '1',
    title: '2024년 1월 첫째주 주일예배',
    date: '2024-01-07',
    typeId: '1',
    sheets: [],
    createdAt: '2024-01-06T10:00:00Z',
    updatedAt: '2024-01-06T10:00:00Z',
  },
  {
    id: '2',
    title: '2024년 1월 둘째주 주일예배',
    date: '2024-01-14',
    typeId: '2',
    sheets: [],
    createdAt: '2024-01-13T10:00:00Z',
    updatedAt: '2024-01-13T10:00:00Z',
  },
  {
    id: '3',
    title: '2024년 1월 수요예배',
    date: '2024-01-10',
    typeId: '4',
    sheets: [],
    createdAt: '2024-01-09T10:00:00Z',
    updatedAt: '2024-01-09T10:00:00Z',
  },
];

export const useWorshipStore = create<WorshipStore>()(
  persist(
    (set, get) => ({
      worshipTypes: defaultWorshipTypes,
      worships: mockWorships,

      // 예배 유형 관련
      addWorshipType: (type) => {
        const id = Date.now().toString();
        set((state) => ({
          worshipTypes: [...state.worshipTypes, { ...type, id }],
        }));
      },

      updateWorshipType: (id, updatedType) => {
        set((state) => ({
          worshipTypes: state.worshipTypes.map((type) =>
            type.id === id ? { ...type, ...updatedType } : type
          ),
        }));
      },

      deleteWorshipType: (id) => {
        set((state) => ({
          worshipTypes: state.worshipTypes.filter((type) => type.id !== id),
        }));
      },

      // 예배 관련
      addWorship: (worship) => {
        const id = Date.now().toString();
        const now = new Date().toISOString();
        set((state) => ({
          worships: [
            ...state.worships,
            { ...worship, id, createdAt: now, updatedAt: now },
          ],
        }));
        return id;
      },

      updateWorship: (id, updatedWorship) => {
        const now = new Date().toISOString();
        set((state) => ({
          worships: state.worships.map((worship) =>
            worship.id === id
              ? { ...worship, ...updatedWorship, updatedAt: now }
              : worship
          ),
        }));
      },

      deleteWorship: (id) => {
        set((state) => ({
          worships: state.worships.filter((worship) => worship.id !== id),
        }));
      },

      getWorshipById: (id) => {
        return get().worships.find((worship) => worship.id === id);
      },
    }),
    {
      name: 'worship-storage',
    }
  )
);