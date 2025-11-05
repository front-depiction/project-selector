import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock Clerk middleware
vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: vi.fn((handler) => handler),
  createRouteMatcher: vi.fn((routes) => {
    return (req: NextRequest) => {
      const pathname = req.nextUrl.pathname
      return routes.some((route: string) => {
        const pattern = route.replace('(.*)', '')
        return pathname.startsWith(pattern)
      })
    }
  })
}))

describe('Middleware Route Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should identify protected student routes', async () => {
    const { createRouteMatcher } = await import('@clerk/nextjs/server')
    
    const isProtectedRoute = createRouteMatcher([
      '/student(.*)',
      '/admin(.*)',
    ])
    
    // Student routes should be protected
    expect(isProtectedRoute({
      nextUrl: { pathname: '/student' }
    } as NextRequest)).toBe(true)
    
    expect(isProtectedRoute({
      nextUrl: { pathname: '/student/select' }
    } as NextRequest)).toBe(true)
  })

  it('should identify protected admin routes', async () => {
    const { createRouteMatcher } = await import('@clerk/nextjs/server')
    
    const isProtectedRoute = createRouteMatcher([
      '/student(.*)',
      '/admin(.*)',
    ])
    
    // Admin routes should be protected
    expect(isProtectedRoute({
      nextUrl: { pathname: '/admin' }
    } as NextRequest)).toBe(true)
    
    expect(isProtectedRoute({
      nextUrl: { pathname: '/admin/analytics' }
    } as NextRequest)).toBe(true)
  })

  it('should identify public routes', async () => {
    const { createRouteMatcher } = await import('@clerk/nextjs/server')
    
    const isPublicRoute = createRouteMatcher([
      '/',
      '/sign-in(.*)',
      '/sign-up(.*)',
      '/api/webhooks(.*)',
    ])
    
    // Home should be public
    expect(isPublicRoute({
      nextUrl: { pathname: '/' }
    } as NextRequest)).toBe(true)
    
    // Sign-in should be public
    expect(isPublicRoute({
      nextUrl: { pathname: '/sign-in' }
    } as NextRequest)).toBe(true)
    
    // Sign-up should be public
    expect(isPublicRoute({
      nextUrl: { pathname: '/sign-up' }
    } as NextRequest)).toBe(true)
    
    // Webhooks should be public
    expect(isPublicRoute({
      nextUrl: { pathname: '/api/webhooks/clerk' }
    } as NextRequest)).toBe(true)
  })

  it('should not identify protected routes as public', async () => {
    const { createRouteMatcher } = await import('@clerk/nextjs/server')
    
    const isPublicRoute = createRouteMatcher([
      '/',
      '/sign-in(.*)',
      '/sign-up(.*)',
      '/api/webhooks(.*)',
    ])
    
    // Protected routes should NOT be public
    expect(isPublicRoute({
      nextUrl: { pathname: '/student' }
    } as NextRequest)).toBe(false)
    
    expect(isPublicRoute({
      nextUrl: { pathname: '/admin' }
    } as NextRequest)).toBe(false)
  })
})

