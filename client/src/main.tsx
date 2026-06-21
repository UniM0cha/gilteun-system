import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { queryClient, asyncStoragePersister } from "./lib/queryClient";
import { router } from "./routes";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
        buster: "v3", // 스키마 변경 시 이 값을 올리면 캐시 자동 무효화 (v3: worships 무한쿼리 페이지네이션 응답)
        dehydrateOptions: {
          // drawings는 실시간으로 바뀌는 ephemeral 데이터 — 디스크에 영속화하면
          // 다음 세션에서 오래되거나 이미 지워진 stroke 스냅샷이 되살아남
          shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) && query.queryKey[0] !== "drawings",
        },
      }}
    >
      <RouterProvider router={router} />
      <Toaster richColors position="top-center" />
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  </StrictMode>,
);
