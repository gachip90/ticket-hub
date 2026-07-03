import { translateApiError } from './api-error';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

export type ApiError = {
  success: false;
  error: {
    statusCode: number;
    message: string;
  };
  timestamp: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const ACCESS_TOKEN_KEY = 'mini-ticketbox.accessToken';
const USER_KEY = 'mini-ticketbox.user';
const AUTH_STORE_EVENT = 'mini-ticketbox.auth-change';

let cachedUserRaw: string | null | undefined;
let cachedUserSnapshot: AuthUser | null = null;

function isApiError(payload: unknown): payload is ApiError {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'object' &&
    payload.error !== null &&
    'message' in payload.error
  );
}

async function readJson<TResponse>(response: Response, path: string) {
  const payload = (await response.json()) as TResponse | ApiError;

  if (!response.ok) {
    const message = isApiError(payload) ? payload.error.message : 'Request failed.';
    const statusCode = isApiError(payload) ? payload.error.statusCode : response.status;
    throw new Error(translateApiError(statusCode, message, path));
  }

  return payload as TResponse;
}

function buildHeaders(withAuth?: boolean) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (withAuth) {
    const token = getAccessToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

function emitAuthStoreChange() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_STORE_EVENT));
}

export async function apiGet<TResponse>(
  path: string,
  options?: { withAuth?: boolean },
): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: buildHeaders(options?.withAuth),
    cache: 'no-store',
  });

  return readJson<TResponse>(response, path);
}

export async function apiPost<TResponse>(
  path: string,
  body: Record<string, string | number | boolean | null>,
  options?: { withAuth?: boolean },
): Promise<TResponse extends object ? TResponse : never> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: buildHeaders(options?.withAuth),
    body: JSON.stringify(body),
  });

  return readJson<TResponse extends object ? TResponse : never>(response, path);
}

export function storeAuthSession(auth: AuthResponse) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, auth.accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  cachedUserRaw = JSON.stringify(auth.user);
  cachedUserSnapshot = auth.user;
  emitAuthStoreChange();
}

export function getAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredAuthUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = window.localStorage.getItem(USER_KEY);

  if (rawUser === cachedUserRaw) {
    return cachedUserSnapshot;
  }

  if (!rawUser) {
    cachedUserRaw = null;
    cachedUserSnapshot = null;
    return null;
  }

  try {
    cachedUserRaw = rawUser;
    cachedUserSnapshot = JSON.parse(rawUser) as AuthUser;
    return cachedUserSnapshot;
  } catch {
    cachedUserRaw = rawUser;
    cachedUserSnapshot = null;
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  cachedUserRaw = null;
  cachedUserSnapshot = null;
  emitAuthStoreChange();
}

export function subscribeAuthStore(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = () => onStoreChange();
  window.addEventListener('storage', handler);
  window.addEventListener(AUTH_STORE_EVENT, handler);

  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(AUTH_STORE_EVENT, handler);
  };
}
