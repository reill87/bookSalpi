import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";

// 어댑터는 환경변수로 결정.
// - Vercel 배포(VERCEL=1 자동 설정): vercel adapter
// - 그 외(로컬 dev/preview, Docker, 셀프호스팅): node adapter
const adapter = process.env.VERCEL ? vercel() : node({ mode: "standalone" });

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? "https://booksalpi.local",
  output: "server",
  adapter,
  vite: {
    plugins: [tailwindcss()],
  },
});
