import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/apiProxy';

export const runtime = 'nodejs';

/**
 * チャット API をバックエンドへ転送する（ブラウザは同一オリジンの /api/chat のみ叩く）。
 */
const CHAT_PROXY_OPTS = {
  apiPathPrefix: '/api/chat',
  errorCode: 'CHAT_PROXY_UPSTREAM',
  errorMessageJa: 'チャット API に接続できません',
} as const;

type RouteCtx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyApiRequest(req, path, CHAT_PROXY_OPTS);
}

export async function HEAD(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyApiRequest(req, path, CHAT_PROXY_OPTS);
}

export async function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyApiRequest(req, path, CHAT_PROXY_OPTS);
}
