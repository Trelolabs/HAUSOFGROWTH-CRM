import { NextResponse } from 'next/server'
import { AUTH_COOKIE, SESSION_TOKEN, CREDENTIALS } from '@/lib/auth'

export async function POST(req: Request) {
  const { username, password } = await req.json()

  if (username !== CREDENTIALS.username || password !== CREDENTIALS.password) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, SESSION_TOKEN, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return res
}
