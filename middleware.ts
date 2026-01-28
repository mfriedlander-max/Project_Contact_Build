import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // If user is authenticated, allow the request
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

// Protect all routes under (app) group
export const config = {
  matcher: [
    // Match all routes under the (app) group
    '/home/:path*',
    '/sheets/:path*',
    '/settings/:path*',
    '/contacts/:path*',
    '/campaigns/:path*',
    // Protect API routes except auth
    '/api/campaigns/:path*',
    '/api/settings/:path*',
    '/api/templates/:path*',
    '/api/saved-views/:path*',
    '/api/custom-fields/:path*',
    '/api/integrations/:path*',
  ],
}
