import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function mwLog(level: 'info' | 'warn' | 'debug', msg: string, data?: Record<string, string>) {
  const entry = { ts: new Date().toISOString(), level, ctx: 'middleware', msg, ...data };
  level === 'warn' ? console.warn(JSON.stringify(entry)) : console.log(JSON.stringify(entry));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    const token = request.nextUrl.searchParams.get('token')
    if (token !== process.env.ADMIN_TOKEN) {
      mwLog('warn', 'Admin access denied: invalid token', { path: pathname });
      return new NextResponse('Unauthorized - Invalid Token', { status: 401 })
    }

    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      mwLog('warn', 'Admin access denied: missing Basic Auth', { path: pathname });
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' }
      })
    }

    const auth = authHeader.split(' ')[1]
    const [username, password] = Buffer.from(auth, 'base64').toString().split(':')

    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      mwLog('warn', 'Admin access denied: wrong credentials', { path: pathname });
      return new NextResponse('Invalid credentials', { status: 401 })
    }

    mwLog('debug', 'Admin access granted', { path: pathname });
  }

  return NextResponse.next()
}

// Applica il middleware SOLO alle route /admin
export const config = {
  matcher: '/admin/:path*'
}
