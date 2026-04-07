import Constants from 'expo-constants';

/**
 * Spring Boot API のオリジン（例: http://192.168.1.5:8080）。
 * 実機では .env の EXPO_PUBLIC_API_BASE_URL に PC の LAN IP を指定してください。
 */
export function getApiOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '').trim();
  if (fromEnv) return fromEnv;
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  const fromExtra = extra?.apiBaseUrl?.replace(/\/$/, '').trim();
  if (fromExtra) return fromExtra;
  return 'http://127.0.0.1:8080';
}

export function apiUrl(path: string): string {
  const origin = getApiOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}
