import type { NextConfig } from 'next';

/** サーバ側 rewrite 用（クイズ API を同一オリジンに集約 → CORS / ポート取り違えを減らす） */
const API_PROXY_TARGET = process.env.API_PROXY_URL ?? 'http://127.0.0.1:8080';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/http-quiz', destination: '/kairos-quiz', permanent: false },
      { source: '/http-quiz/admin', destination: '/kairos-quiz/admin', permanent: false },
    ];
  },
  async rewrites() {
    const host = API_PROXY_TARGET.replace(/\/$/, '');
    return [
      {
        source: '/api/quiz/:path*',
        destination: `${host}/api/quiz/:path*`,
      },
    ];
  },
};

export default nextConfig;
