import { NextRequest, NextResponse } from 'next/server';

const IS_PROD = process.env.NODE_ENV === 'production';

export async function POST(request: NextRequest) {
  const { accessToken, refreshToken } = await request.json();

  const response = NextResponse.json({ ok: true });

  if (accessToken) {
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });
  }

  if (refreshToken) {
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  return response;
}
