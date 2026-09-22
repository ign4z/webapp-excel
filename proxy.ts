import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isValidAdminToken, isValidBasicAuth } from '@/lib/auth'

function mwLog(level: 'info' | 'warn' | 'debug', msg: string, data?: Record<string, string>) {
  const entry = { ts: new Date().toISOString(), level, ctx: 'proxy', msg, ...data };
  if (level === 'warn') console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

// Pagine /admin: token in URL + HTTP Basic Auth.
// Le API /api/admin/* verificano invece il Bearer token con requireAdmin() (lib/auth.ts).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isValidAdminToken(request.nextUrl.searchParams.get('token'))) {
    mwLog('warn', 'Admin access denied: invalid token', { path: pathname });
    return new NextResponse('Unauthorized - Invalid Token', { status: 401 })
  }

  if (!isValidBasicAuth(request.headers.get('authorization'))) {
    mwLog('warn', 'Admin access denied: missing or wrong Basic Auth', { path: pathname });
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' }
    })
  }

  mwLog('debug', 'Admin access granted', { path: pathname });
  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*'
}
