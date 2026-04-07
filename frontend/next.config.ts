import type { NextConfig } from 'next';

/**
 * クイズ API は `src/app/api/quiz/[[...path]]/route.ts` でプロキシする（PUT/POST ボディが確実に届く）。
 * 旧来の rewrites だけだと開発時にボディが落ちることがある。
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/http-quiz', destination: '/kairos-quiz', permanent: false },
      { source: '/http-quiz/admin', destination: '/kairos-quiz/admin', permanent: false },
    ];
  },
};

export default nextConfig;
