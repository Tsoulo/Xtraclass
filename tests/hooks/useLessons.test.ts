import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLessons, useCreateLesson, useUpdateLesson, useDeleteLesson } from '@/hooks/useLessons'

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

const mockLessons = [
  {
    id: 1,
    date: '2025-07-18',
    grade: '8',
    subject: 'Mathematics',
    topicId: 1,
    themeId: 1,
    lessonTitle: 'Introduction to Linear Equations',
    description: 'Basic lesson on linear equations',
    duration: 60,
    objectives: ['Understand linear equations'],
    activities: null,
    videoLink: null,
    createdAt: '2025-07-18T00:00:00.000Z',
    updatedAt: '2025-07-18T00:00:00.000Z'
  },
  {
    id: 2,
    date: '2025-07-19',
    grade: '8',
    subject: 'Mathematics',
    topicId: 1,
    themeId: 1,
    lessonTitle: 'Solving Linear Equations',
    description: 'Methods to solve linear equations',
    duration: 60,
    objectives: ['Solve linear equations'],
    activities: null,
    videoLink: null,
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

describe('useLessons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch globally
    global.fetch = vi.fn()
  })

  it('fetches lessons successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLessons,
    } as Response)

    const { result } = renderHook(() => useLessons('2025-07-18', '8', 'Mathematics'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockLessons)
    expect(fetch).toHaveBeenCalledWith('/api/syllabus-calendar?date=2025-07-18&grade=8&subject=Mathematics')
  })

  it('handles fetch error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useLessons('2025-07-18', '8', 'Mathematics'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('does not fetch when date is not provided', async () => {
    const { result } = renderHook(() => useLessons('', '8', 'Mathematics'), {
      wrapper: createWrapper(),
    })

    // Should not trigger fetch
    expect(fetch).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('fetches all lessons when no filters provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLessons,
    } as Response)

    const { result } = renderHook(() => useLessons(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(fetch).toHaveBeenCalledWith('/api/syllabus-calendar')
  })
})

describe('useCreateLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a lesson successfully', async () => {
    const { apiRequest } = await import('@/lib/queryClient')
    const mockApiRequest = vi.mocked(apiRequest)
    
    const newLesson = {
      date: '2025-07-18',
      grade: '8',
      subject: 'Mathematics',
      topicId: 1,
      themeId: 1,
      lessonTitle: 'Test Lesson',
      description: 'Test description',
      duration: 60,
      objectives: ['Test objective'],
      activities: null,
      videoLink: null
    }

    const createdLesson = {
      id: 3,
      ...newLesson,
      createdAt: '2025-07-18T00:00:00.000Z',
      updatedAt: '2025-07-18T00:00:00.000Z'
    }

    mockApiRequest.mockResolvedValueOnce(createdLesson)

    const { result } = renderHook(() => useCreateLesson(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.mutate).toBeDefined()
    })

    result.current.mutate(newLesson)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiRequest).toHaveBeenCalledWith('/api/syllabus-calendar', {
      method: 'POST',
      body: JSON.stringify(newLesson)
    })
  })

  it('handles create error', async () => {
    const { apiRequest } = await import('@/lib/queryClient')
    const mockApiRequest = vi.mocked(apiRequest)
    
    const newLesson = {
      date: '2025-07-18',
      grade: '8',
      subject: 'Mathematics',
      topicId: 1,
      themeId: 1,
      lessonTitle: 'Test Lesson',
      description: 'Test description',
      duration: 60,
      objectives: ['Test objective'],
      activities: null,
      videoLink: null
    }

    mockApiRequest.mockRejectedValueOnce(new Error('Creation failed'))

    const { result } = renderHook(() => useCreateLesson(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.mutate).toBeDefined()
    })

    result.current.mutate(newLesson)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeTruthy()
  })
})

describe('useUpdateLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates a lesson successfully', async () => {
    const { apiRequest } = await import('@/lib/queryClient')
    const mockApiRequest = vi.mocked(apiRequest)
    
    const updateData = {
      id: 1,
      date: '2025-07-19',
      grade: '8',
      subject: 'Mathematics',
      topicId: 1,
      themeId: 1,
      lessonTitle: 'Updated Lesson',
      description: 'Updated description',
      duration: 90,
      objectives: ['Updated objective'],
      videoLink: 'https://example.com/video'
    }

    const updatedLesson = {
      ...updateData,
      createdAt: '2025-07-18T00:00:00.000Z',
      updatedAt: '2025-07-18T00:00:00.000Z'
    }

    mockApiRequest.mockResolvedValueOnce(updatedLesson)

    const { result } = renderHook(() => useUpdateLesson(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.mutate).toBeDefined()
    })

    result.current.mutate(updateData)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiRequest).toHaveBeenCalledWith('/api/syllabus-calendar/1', {
      method: 'PUT',
      body: JSON.stringify({
        date: '2025-07-19',
        grade: '8',
        subject: 'Mathematics',
        topicId: 1,
        themeId: 1,
        lessonTitle: 'Updated Lesson',
        description: 'Updated description',
        duration: 90,
        objectives: ['Updated objective'],
        videoLink: 'https://example.com/video'
      })
    })
  })
})

describe('useDeleteLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes a lesson successfully', async () => {
    const { apiRequest } = await import('@/lib/queryClient')
    const mockApiRequest = vi.mocked(apiRequest)
    
    mockApiRequest.mockResolvedValueOnce({ success: true })

    const { result } = renderHook(() => useDeleteLesson(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.mutate).toBeDefined()
    })

    result.current.mutate(1)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApiRequest).toHaveBeenCalledWith('/api/syllabus-calendar/1', {
      method: 'DELETE'
    })
  })

  it('handles delete error', async () => {
    const { apiRequest } = await import('@/lib/queryClient')
    const mockApiRequest = vi.mocked(apiRequest)
    
    mockApiRequest.mockRejectedValueOnce(new Error('Deletion failed'))

    const { result } = renderHook(() => useDeleteLesson(), {
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