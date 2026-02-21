import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Proteggi solo le route /admin/*
  if (pathname.startsWith('/admin')) {
    // 1. Verifica token nell'URL
    const token = request.nextUrl.searchParams.get('token')
    if (token !== process.env.ADMIN_TOKEN) {
      return new NextResponse('Unauthorized - Invalid Token', { status: 401 })
    }

    // 2. Verifica Basic Auth
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"'
        }
      })
    }

    const auth = authHeader.split(' ')[1]
    const [username, password] = Buffer.from(auth, 'base64').toString().split(':')

    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return new NextResponse('Invalid credentials', { status: 401 })
    }
  }

  return NextResponse.next()
}

// Applica il middleware SOLO alle route /admin
export const config = {
  matcher: '/admin/:path*'
}
