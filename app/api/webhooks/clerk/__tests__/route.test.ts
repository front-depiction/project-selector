import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "../route"

// Mock dependencies
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      const mockHeaders: Record<string, string> = {
        'svix-id': 'msg_test_123',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,test_signature'
      }
      return mockHeaders[key]
    })
  }))
}))

vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(() => ({
    verify: vi.fn((body: string, headers: any) => ({
      type: 'user.created',
      data: {
        id: 'clerk_test_123',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'Test',
        last_name: 'User'
      }
    }))
  }))
}))

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    mutation: vi.fn().mockResolvedValue('mock_user_id')
  }))
}))

describe('Clerk Webhook Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test_secret'
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test.convex.cloud'
  })

  it('should process valid user.created webhook', async () => {
    const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({
        type: 'user.created',
        data: {
          id: 'clerk_test_123',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'Test',
          last_name: 'User'
        }
      })
    })

    const response = await POST(mockRequest)
    
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toBe('Webhook processed')
  })

  it('should return 400 when webhook secret is missing', async () => {
    delete process.env.CLERK_WEBHOOK_SECRET

    const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({})
    })

    await expect(POST(mockRequest)).rejects.toThrow('Please add CLERK_WEBHOOK_SECRET to .env')
  })

  it('should return 400 when svix headers are missing', async () => {
    const { headers } = await import('next/headers')
    
    vi.mocked(headers).mockReturnValue({
      get: vi.fn(() => null) // Missing headers
    } as any)

    const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(mockRequest)
    
    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toBe('Error: Missing svix headers')
  })

  it('should handle user.updated webhook', async () => {
    const { Webhook } = await import('svix')
    
    vi.mocked(Webhook).mockImplementation(() => ({
      verify: vi.fn(() => ({
        type: 'user.updated',
        data: {
          id: 'clerk_updated_123',
          email_addresses: [{ email_address: 'updated@example.com' }],
          first_name: 'Updated',
          last_name: 'User'
        }
      }))
    } as any))

    const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({
        type: 'user.updated',
        data: {
          id: 'clerk_updated_123',
          email_addresses: [{ email_address: 'updated@example.com' }]
        }
      })
    })

    const response = await POST(mockRequest)
    
    expect(response.status).toBe(200)
  })

  it('should return 400 when signature verification fails', async () => {
    const { Webhook } = await import('svix')
    
    vi.mocked(Webhook).mockImplementation(() => ({
      verify: vi.fn(() => {
        throw new Error('Invalid signature')
      })
    } as any))

    const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(mockRequest)
    
    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toBe('Error: Verification failed')
  })

  it('should ignore non-user events', async () => {
    const { Webhook } = await import('svix')
    const { ConvexHttpClient } = await import('convex/browser')
    
    const mockMutation = vi.fn().mockResolvedValue('mock_id')
    
    vi.mocked(Webhook).mockImplementation(() => ({
      verify: vi.fn(() => ({
        type: 'session.created', // Different event type
        data: {
          id: 'session_123'
        }
      }))
    } as any))
    
    vi.mocked(ConvexHttpClient).mockImplementation(() => ({
      mutation: mockMutation
    } as any))

    const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({
        type: 'session.created'
      })
    })

    const response = await POST(mockRequest)
    
    expect(response.status).toBe(200)
    // Mutation should NOT be called for non-user events
    expect(mockMutation).not.toHaveBeenCalled()
  })

  it('should handle webhook with missing email', async () => {
    const { Webhook } = await import('svix')
    
    vi.mocked(Webhook).mockImplementation(() => ({
      verify: vi.fn(() => ({
        type: 'user.created',
        data: {
          id: 'clerk_no_email',
          email_addresses: [], // Empty email array
          first_name: 'NoEmail'
        }
      }))
    } as any))

    const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({
        type: 'user.created',
        data: { id: 'clerk_no_email' }
      })
    })

    const response = await POST(mockRequest)
    
    // Should still succeed with empty email
    expect(response.status).toBe(200)
  })

  it('should handle webhook with optional fields missing', async () => {
    const { Webhook } = await import('svix')
    
    vi.mocked(Webhook).mockImplementation(() => ({
      verify: vi.fn(() => ({
        type: 'user.created',
        data: {
          id: 'clerk_minimal',
          email_addresses: [{ email_address: 'minimal@example.com' }],
          // No first_name or last_name
        }
      }))
    } as any))

    const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({
        type: 'user.created',
        data: {
          id: 'clerk_minimal',
          email_addresses: [{ email_address: 'minimal@example.com' }]
        }
      })
    })

    const response = await POST(mockRequest)
    
    expect(response.status).toBe(200)
  })
})

