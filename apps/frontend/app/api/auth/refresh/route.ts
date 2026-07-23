import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const IS_PROD = process.env.NODE_ENV === 'production';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'Refresh token ausente' }, { status: 401 });
  }

  const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    const response = NextResponse.json({ message: 'Sessão expirada' }, { status: 401 });
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  const data = await res.json();
  const response = NextResponse.json({ accessToken: data.accessToken });

  response.cookies.set('access_token', data.accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });

  if (data.refreshToken) {
    response.cookies.set('refresh_token', data.refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  return response;
}
