import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { registerSW } from "virtual:pwa-register";
import { queryClient, asyncStoragePersister } from "./lib/queryClient";
import { router } from "./routes";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "./globals.css";

// PWA 업데이트: 빌드 산출물 해시(프리캐시 manifest)가 곧 UI 버전 키 — 배포로 키가 바뀌면
// 새 SW가 감지되고, autoUpdate 모드라 skipWaiting → 자동 리로드로 즉시 새 UI가 반영된다.
// 문제는 감지 시점 — 설치형 PWA는 내비게이션이 없으면 브라우저가 SW 갱신을 며칠씩 확인하지
// 않을 수 있어, 주기 체크 + 포그라운드 복귀 시 체크를 명시적으로 건다.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(() => registration.update(), 60 * 60 * 1000); // 1시간마다
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) registration.update(); // 앱 전환/화면잠금 복귀 시
    });
  },
});

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
