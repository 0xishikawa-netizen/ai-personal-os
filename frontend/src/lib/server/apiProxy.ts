import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** ローカル / Render など上流 API のオリジン（末尾スラッシュなし） */
export function upstreamApiOrigin(): string {
  return (process.env.API_PROXY_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
}

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

const STRIP_FROM_RESPONSE = new Set([
  ...HOP_BY_HOP,
  'content-encoding',
  'content-length',
]);

function copyResponseHeaders(from: Headers): Headers {
  const out = new Headers();
  from.forEach((value, key) => {
    if (STRIP_FROM_RESPONSE.has(key.toLowerCase())) return;
    out.set(key, value);
  });
  return out;
}

export type ProxyApiOptions = {
  /** 上流のパス接頭辞（例: `/api/quiz`, `/api/chat`） */
  apiPathPrefix: string;
  /** JSON エラー時の code フィールド */
  errorCode: string;
  /** ユーザー向け日本語メッセージ（上流接続失敗時） */
  errorMessageJa: string;
};

/**
 * Next.js Route Handler から Spring Boot へリクエストを転送する。
 */
export async function proxyApiRequest(
  req: NextRequest,
  pathSegments: string[] | undefined,
  opts: ProxyApiOptions,
): Promise<NextResponse> {
  const base = upstreamApiOrigin();
  const suffix = pathSegments?.length ? `/${pathSegments.join('/')}` : '';
  const url = `${base}${opts.apiPathPrefix}${suffix}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.has(k)) return;
    if (k === 'accept-encoding') return;
    headers.set(key, value);
  });
  headers.set('Accept-Encoding', 'identity');

  const method = req.method;
  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 0) {
      body = buf;
    }
  }

  try {
    const res = await fetch(url, { method, headers, body, redirect: 'manual' });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: res.status,
      statusText: res.statusText,
      headers: copyResponseHeaders(res.headers),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        code: opts.errorCode,
        message: `${opts.errorMessageJa} (${base})。API_PROXY_URL を確認してください。`,
        detail: msg,
        status: 502,
      },
      { status: 502 },
    );
  }
}
