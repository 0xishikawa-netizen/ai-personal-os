import type { NextRequest } from 'next/server';
import { proxyApiRequest } from '@/lib/server/apiProxy';

/** ローカル API への fetch を確実にする（Edge では localhost 転送が使えない環境がある） */
export const runtime = 'nodejs';

/**
 * クイズ API をバックエンドへ転送する。
 * next.config の rewrites だけだと、開発環境で PUT/POST のボディが落ちることがあるため、
 * Route Handler で明示的に body を読み取って転送する。
 */
const QUIZ_PROXY_OPTS = {
  apiPathPrefix: '/api/quiz',
  errorCode: 'QUIZ_PROXY_UPSTREAM',
  errorMessageJa: 'クイズ API に接続できません',
} as const;

type RouteCtx = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyApiRequest(req, path, QUIZ_PROXY_OPTS);
}

export async function HEAD(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyApiRequest(req, path, QUIZ_PROXY_OPTS);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyApiRequest(req, path, QUIZ_PROXY_OPTS);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyApiRequest(req, path, QUIZ_PROXY_OPTS);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyApiRequest(req, path, QUIZ_PROXY_OPTS);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyApiRequest(req, path, QUIZ_PROXY_OPTS);
}

export async function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxyApiRequest(req, path, QUIZ_PROXY_OPTS);
}
