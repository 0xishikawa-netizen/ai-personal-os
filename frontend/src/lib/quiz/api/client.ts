/**
 * クイズ REST API への HTTP クライアント。
 * ブラウザでは既定で同一オリジン `/api/quiz`（Route Handler → API_PROXY_URL 先）。
 * `NEXT_PUBLIC_API_BASE_URL` を指定した場合のみブラウザからバックエンドを直叩き（CORS 要）。
 */
export function quizApiOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '').trim();
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return '';
  return 'http://127.0.0.1:8080';
}

export function quizApiBaseUrl(): string {
  const origin = quizApiOrigin();
  return origin ? `${origin}/api/quiz` : '/api/quiz';
}

export async function quizFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${quizApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}
