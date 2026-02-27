import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 60 * 24, // 24시간 (persist와 호환되도록 충분히 길게)
    },
    mutations: {
      retry: 0,
    },
  },
});

// IndexedDB persister (Safari 프라이빗 모드 등에서 실패해도 앱 정상 작동)
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      try {
        return (await get(key)) ?? null;
      } catch {
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        await set(key, value);
      } catch {
        /* Safari 프라이빗 모드 등 */
      }
    },
    removeItem: async (key) => {
      try {
        await del(key);
      } catch {
        /* IndexedDB 미지원 환경 무시 */
      }
    },
  },
  key: "gilteun-query-cache",
});
