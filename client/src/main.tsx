import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { registerSW } from "virtual:pwa-register";
import { queryClient } from "./lib/queryClient";
import { router } from "./routes";
import "pretendard/dist/web/variable/pretendardvariable.css";
import "./globals.css";

// 과거 IndexedDB 쿼리 캐시(idb-keyval) 잔재 정리 — DB가 없으면 no-op라 무해.
// IndexedDB 미지원/차단 환경(일부 웹뷰·프라이버시 모드)에서 동기 예외가 부팅을 막지 않게 가드.
// 모든 기기가 한 번씩 접속해 정리된 뒤(몇 배포 후) 이 블록은 제거해도 된다.
try {
  indexedDB.deleteDatabase("keyval-store");
} catch {
  /* IndexedDB 차단 환경 무시 */
}

// Persistent Storage 요청 — localStorage(선택 프로필·기기 설정)가 브라우저 저장소
// 정리(quota eviction)로 지워지지 않게 보호한다. 쿼리 캐시는 더 이상 디스크에 없음.
navigator.storage?.persist?.().catch(() => {});

// 자기파괴 SW의 activate 정리는 waitUntil 없이 돌아 iPadOS가 워커를 조기 종료하면
// 캐시 삭제가 미완료될 수 있음 — 페이지에서도 SW 캐시 삭제를 병행해 정리를 보장한다.
// (activate까지 온 자기파괴 SW는 fetch 핸들러가 없어 어떤 부분 실패 상태여도 stale 콘텐츠를
// 다시 서빙할 수 없고, 다음 실행은 항상 네트워크에서 새 번들을 받아 이 정리가 마무리된다.
// 최악의 경우도 "열려 있던 세션이 재시작 전까지 옛 UI로 남는" 일회성 현상뿐)
if ("caches" in window) {
  caches
    .keys()
    .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    .catch(() => {});
}

// SW는 selfDestroying 모드 — 등록되면 기존 SW를 대체한 뒤 스스로 unregister하고
// 모든 Cache Storage를 삭제한다(오프라인 캐시 제거, 홈 화면 설치는 manifest로 유지).
// 갱신 폴링은 두지 않는다: 이 배포를 발견하는 폴링은 이전 배포 번들에 이미 들어 있고,
// 이 번들을 받은 클라이언트는 등록 즉시 SW가 자기파괴되므로 폴링할 대상이 없다.
// 모든 기기가 정리된 뒤(몇 주 후)에는 registerSW 호출과 vite-plugin-pwa의 SW 생성을
// 완전히 제거해도 된다.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-center" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
);
