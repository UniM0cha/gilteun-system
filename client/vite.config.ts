import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// 워크트리 등에서 메인 dev와 충돌 없이 다른 포트로 띄울 때 사용:
// PORT로 client 포트, VITE_PROXY_TARGET으로 백엔드(server) 주소를 지정한다. 미지정 시 기본값.
const PROXY_TARGET = process.env.VITE_PROXY_TARGET || "http://localhost:3002";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 오프라인 캐시 제거: 자기파괴 SW를 배포해 기존 설치 기기의 SW를 unregister하고
      // 모든 Cache Storage를 삭제한다. 홈 화면 설치는 manifest만으로 계속 동작.
      // 실시간 협업 앱이라 오프라인 지원이 무의미하고, 캐싱은 브라우저 HTTP 캐시
      // (/uploads 1y immutable 등 서버 헤더)에 일임한다.
      selfDestroying: true,
      manifest: {
        name: "길튼 시스템",
        short_name: "길튼 시스템",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      devOptions: {
        enabled: false, // 개발 시 SW 비활성
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 5174,
    proxy: {
      "/api": PROXY_TARGET,
      "/uploads": PROXY_TARGET,
      "/socket.io": {
        target: PROXY_TARGET,
        ws: true,
      },
    },
    allowedHosts: ["solstice-macbookpro.taile04fbf.ts.net"],
  },
});
