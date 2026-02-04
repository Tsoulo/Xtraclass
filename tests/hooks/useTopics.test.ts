import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTopics, useCreateTopic, useUpdateTopic, useDeleteTopic } from '@/hooks/useTopics'

// Mock the apiRequest function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  }),
}))

const mockTopics = [
  {
    id: 1,
    name: 'Algebra',
    description: 'Basic algebraic concepts',
    grade: '8',
    subject: 'Mathematics',
    createdAt: '2025-07-18T00:00:00.000Z',
    updatedAt: '2025-07-18T00:00:00.000Z'
  },
  {
    id: 2,
    name: 'Functions',
    description: 'Mathematical functions',
    grade: '8',
    subject: 'Mathematics',
    createdAt: '2025-07-18T00:00:00.000Z',
    updatedAt: '2025-07-18T00:00:00.000Z'
  }
]

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useTopics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch globally
    global.fetch = vi.fn()
  })

  it('fetches topics successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTopics,
    } as Response)

    const { result } = renderHook(() => useTopics('8', 'Mathematics'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockTopics)
    expect(fetch).toHaveBeenCalledWith('/api/topics?grade=8&subject=Mathematics')
  })

  it('handles fetch error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useTopics('8', 'Mathematics'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('fetches all topics when no grade or subject provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTopics,
    } as Response)

    const { result } = renderHook(() => useTopics(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(fetch).toHaveBeenCalledWith('/api/topics')
  })
})

describe('useCreateTopic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a topic successfully', async () => {
    const { apiRequest } = await import('@/lib/queryClient')
    const mockApiRequest = vi.mocked(apiRequest)
    
    const newTopic = {
      name: 'Geometry',
      description: 'Basic geometric concepts',
      grade: '8',
      subject: 'Mathematics'
    }

    const createdTopic = {
      id: 3,
      ...newTopic,
      createdAt: '2025-07-18T00:00:00.000Z',
      updatedAt: '2025-07-18T00:00:00.000Z'
    }

    mockApiRequest.mockResolvedValueOnce(createdTopic)

    const { result } = renderHook(() => useCreateTopic(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.mutate).toBeDefined()
    })

    result.current.mutate(newTopic)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiRequest).toHaveBeenCalledWith('/api/topics', {
      method: 'POST',
      body: JSON.stringify(newTopic)
    })
  })

  it('handles create error', async () => {
    const { apiRequest } = await import('@/lib/queryClient')
    const mockApiRequest = vi.mocked(apiRequest)
    
    const newTopic = {
      name: 'Geometry',
      description: 'Basic geometric concepts',
      grade: '8',
      subject: 'Mathematics'
    }

    mockApiRequest.mockRejectedValueOnce(new Error('Creation failed'))

    const { result } = renderHook(() => useCreateTopic(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.mutate).toBeDefined()
    })

    result.current.mutate(newTopic)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeTruthy()
  })
})

describe('useUpdateTopic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates a topic successfully', async () => {
    const { apiRequest } = await import('@/lib/queryClient')
    const mockApiRequest = vi.mocked(apiRequest)
    
    const updateData = {
      id: 1,
      name: 'Advanced Algebra',
      description: 'Advanced algebraic concepts',
      grade: '9',
      subject: 'Mathematics'
    }

    const updatedTopic = {
      ...updateData,
      createdAt: '2025-07-18T00:00:00.000Z',
      updatedAt: '2025-07-18T00:00:00.000Z'
    }

    mockApiRequest.mockResolvedValueOnce(updatedTopic)

    const { result } = renderHook(() => useUpdateTopic(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.mutate).toBeDefined()
    })

    result.current.mutate(updateData)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiRequest).toHaveBeenCalledWith('/api/topics/1', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Advanced Algebra',
        description: 'Advanced algebraic concepts',
        grade: '9',
        subject: 'Mathematics'
      })
    })
  })
})

describe('useDeleteTopic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes a topic successfully', async () => {
    const { apiRequest } = await import('@/lib/queryClient')
    const mockApiRequest = vi.mocked(apiRequest)
    
    mockApiRequest.mockResolvedValueOnce({ success: true })

    const { result } = renderHook(() => useDeleteTopic(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.mutate).toBeDefined()
    })

    result.current.mutate(1)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiRequest).toHaveBeenCalledWith('/api/topics/1', {
      method: 'DELETE'
    })
  })

  it('handles delete error', async () => {
    const { apiRequest } = await import('@/lib/queryClient')
    const mockApiRequest = vi.mocked(apiRequest)
    
    mockApiRequest.mockRejectedValueOnce(new Error('Cannot delete topic with existing themes'))

    const { result } = renderHook(() => useDeleteTopic(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.mutate).toBeDefined()
    })

    result.current.mutate(1)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeTruthy()
  })
})