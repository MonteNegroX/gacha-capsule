import { NextResponse } from 'next/server'
import { LAB_COOKIE, labConfigured, labToken, passwordMatches } from '@/lib/gacha/lab-session'

export async function POST(request: Request) {
  if (!labConfigured()) {
    return NextResponse.json({ error: 'Lab is off. Set GACHA_LAB_SECRET.' }, { status: 503 })
  }

  let password = ''
  try {
    const body = (await request.json()) as { password?: unknown }
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  if (!passwordMatches(password)) {
    return NextResponse.json({ error: 'Wrong lab password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(LAB_COOKIE, labToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
