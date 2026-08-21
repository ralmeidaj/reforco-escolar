import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'changeme',
);
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const IS_PROD = process.env.NODE_ENV === 'production';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
  '/super-admin',
  '/api/auth',
  '/kiosk',
];

function withAuthHeaders(request: NextRequest, payload: { role: string; sub: string }) {
  const headers = new Headers(request.headers);
  headers.set('x-user-role', payload.role);
  headers.set('x-user-id', payload.sub);
  return NextResponse.next({ request: { headers } });
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return withAuthHeaders(request, payload as { role: string; sub: string });
    } catch {
      // access token expirado/invalido — tenta renovar com o refresh token abaixo
    }
  }

  // Access token ausente ou expirado: tenta renovar antes de derrubar a sessão
  // (access token dura só 15min; sem isso, qualquer navegação após 15min de
  // atividade normal jogava o usuário pro login mesmo com sessão válida)
  const refreshToken = request.cookies.get('refresh_token')?.value;
  if (!refreshToken) {
    return redirectToLogin(request);
  }

  try {
    const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error('refresh failed');

    const data = await res.json();
    const { payload } = await jwtVerify(data.accessToken, JWT_SECRET);
    const response = withAuthHeaders(request, payload as { role: string; sub: string });

    response.cookies.set('access_token', data.accessToken, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 15 * 60,
    });
    if (data.refreshToken) {
      response.cookies.set('refresh_token', data.refreshToken, {
        httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60,
      });
    }
    return response;
  } catch {
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
