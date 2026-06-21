import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // /api 요청을 백엔드(4000)로 프록시 → CORS 신경 안 써도 됨
    proxy: { "/api": "http://localhost:4000" },
  },
});
