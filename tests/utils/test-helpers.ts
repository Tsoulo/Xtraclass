import { QueryClient } from '@tanstack/react-query'
import { vi } from 'vitest'

// Test utilities and helpers

export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const mockFetch = (response: any, ok: boolean = true) => {
  return vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
  })
}

export const mockApiRequest = (response: any) => {
  return vi.fn().mockResolvedValue(response)
}

export const createMockTopic = (overrides: Partial<any> = {}) => {
  return {
    id: 1,
    name: 'Test Topic',
    description: 'Test topic description',
    grade: '8',
    subject: 'Mathematics',
    createdAt: '2025-07-18T00:00:00.000Z',
    updatedAt: '2025-07-18T00:00:00.000Z',
    ...overrides,
  }
}

export const createMockTheme = (overrides: Partial<any> = {}) => {
  return {
    id: 1,
    topicId: 1,
    name: 'Test Theme',
    description: 'Test theme description',
    createdAt: '2025-07-18T00:00:00.000Z',
    updatedAt: '2025-07-18T00:00:00.000Z',
    ...overrides,
  }
}

export const createMockLesson = (overrides: Partial<any> = {}) => {
  return {
    id: 1,
    date: '2025-07-18',
    grade: '8',
    subject: 'Mathematics',
    topicId: 1,
    themeId: 1,
    lessonTitle: 'Test Lesson',
    description: 'Test lesson description',
    duration: 60,
    objectives: ['Test objective'],
    activities: null,
    videoLink: null,
    createdAt: '2025-07-18T00:00:00.000Z',
    updatedAt: '2025-07-18T00:00:00.000Z',
    ...overrides,
  }
}

export const setupMockStorage = () => {
  const mockStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  }

  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  })

  Object.defineProperty(window, 'sessionStorage', {
    value: mockStorage,
    writable: true,
  })

  return mockStorage
}

export const setupMockRouter = () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    back: vi.fn(),
    forward: vi.fn(),
    reload: vi.fn(),
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }

  return mockRouter
}

export const setupMockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })

  Object.defineProperty(window, 'IntersectionObserver', {
    value: mockIntersectionObserver,
    writable: true,
  })

  return mockIntersectionObserver
}

export const setupMockResizeObserver = () => {
  const mockResizeObserver = vi.fn()
  mockResizeObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })

  Object.defineProperty(window, 'ResizeObserver', {
    value: mockResizeObserver,
    writable: true,
  })

  return mockResizeObserver
}

// Mock data generators
export const generateMockTopics = (count: number) => {
  return Array.from({ length: count }, (_, index) => createMockTopic({
    id: index + 1,
    name: `Topic ${index + 1}`,
    description: `Description for topic ${index + 1}`,
  }))
}

export const generateMockThemes = (count: number, topicId: number = 1) => {
  return Array.from({ length: count }, (_, index) => createMockTheme({
    id: index + 1,
    topicId,
    name: `Theme ${index + 1}`,
    description: `Description for theme ${index + 1}`,
  }))
}

export const generateMockLessons = (count: number, options: Partial<any> = {}) => {
  return Array.from({ length: count }, (_, index) => createMockLesson({
    id: index + 1,
    date: `2025-07-${String(18 + index).padStart(2, '0')}`,
    lessonTitle: `Lesson ${index + 1}`,
    description: `Description for lesson ${index + 1}`,
    ...options,
  }))
}

// Test data validation helpers
export const validateTopicStructure = (topic: any) => {
  expect(topic).toHaveProperty('id')
  expect(topic).toHaveProperty('name')
  expect(topic).toHaveProperty('description')
  expect(topic).toHaveProperty('grade')
  expect(topic).toHaveProperty('subject')
  expect(topic).toHaveProperty('createdAt')
  expect(topic).toHaveProperty('updatedAt')
}

export const validateThemeStructure = (theme: any) => {
  expect(theme).toHaveProperty('id')
  expect(theme).toHaveProperty('topicId')
  expect(theme).toHaveProperty('name')
  expect(theme).toHaveProperty('description')
  expect(theme).toHaveProperty('createdAt')
  expect(theme).toHaveProperty('updatedAt')
}

export const validateLessonStructure = (lesson: any) => {
  expect(lesson).toHaveProperty('id')
  expect(lesson).toHaveProperty('date')
  expect(lesson).toHaveProperty('grade')
  expect(lesson).toHaveProperty('subject')
  expect(lesson).toHaveProperty('topicId')
  expect(lesson).toHaveProperty('themeId')
  expect(lesson).toHaveProperty('lessonTitle')
  expect(lesson).toHaveProperty('description')
  expect(lesson).toHaveProperty('duration')
  expect(lesson).toHaveProperty('objectives')
  expect(lesson).toHaveProperty('createdAt')
  expect(lesson).toHaveProperty('updatedAt')
}

// Error simulation helpers
export const simulateNetworkError = () => {
  return new Error('Network error')
}

export const simulateValidationError = (field: string) => {
  return new Error(`Validation error: ${field} is required`)
}

export const simulateServerError = () => {
  return new Error('500: Internal server error')
}

export const simulateNotFoundError = () => {
  return new Error('404: Not found')
}

export const simulateUnauthorizedError = () => {
  return new Error('401: Unauthorized')
}