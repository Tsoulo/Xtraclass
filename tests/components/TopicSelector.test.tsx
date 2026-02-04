import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TopicSelector from '@/components/TopicSelector'
import { useTopics } from '@/hooks/useTopics'

// Mock the useTopics hook
vi.mock('@/hooks/useTopics')

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

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('TopicSelector', () => {
  const mockOnTopicSelect = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useTopics).mockReturnValue({
      data: mockTopics,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isPending: false,
      isSuccess: true
    })
  })

  it('renders topic selector with loading state', () => {
    vi.mocked(useTopics).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isPending: true,
      isSuccess: false
    })

    render(
      <TestWrapper>
        <TopicSelector 
          grade="8" 
          subject="Mathematics" 
          selectedTopicId={0}
          onTopicSelect={mockOnTopicSelect}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Loading topics...')).toBeInTheDocument()
  })

  it('renders topic selector with topics', () => {
    render(
      <TestWrapper>
        <TopicSelector 
          grade="8" 
          subject="Mathematics" 
          selectedTopicId={0}
          onTopicSelect={mockOnTopicSelect}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Select Topic')).toBeInTheDocument()
    
    // Click to open dropdown
    fireEvent.click(screen.getByText('Select Topic'))
    
    expect(screen.getByText('Algebra')).toBeInTheDocument()
    expect(screen.getByText('Functions')).toBeInTheDocument()
  })

  it('calls onTopicSelect when topic is selected', async () => {
    render(
      <TestWrapper>
        <TopicSelector 
          grade="8" 
          subject="Mathematics" 
          selectedTopicId={0}
          onTopicSelect={mockOnTopicSelect}
        />
      </TestWrapper>
    )

    // Open dropdown
    fireEvent.click(screen.getByText('Select Topic'))
    
    // Select a topic
    fireEvent.click(screen.getByText('Algebra'))
    
    await waitFor(() => {
      expect(mockOnTopicSelect).toHaveBeenCalledWith(1)
    })
  })

  it('shows selected topic name when topic is selected', () => {
    render(
      <TestWrapper>
        <TopicSelector 
          grade="8" 
          subject="Mathematics" 
          selectedTopicId={1}
          onTopicSelect={mockOnTopicSelect}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Algebra')).toBeInTheDocument()
  })

  it('renders error state when there is an error', () => {
    vi.mocked(useTopics).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load topics'),
      refetch: vi.fn(),
      isError: true,
      isPending: false,
      isSuccess: false
    })

    render(
      <TestWrapper>
        <TopicSelector 
          grade="8" 
          subject="Mathematics" 
          selectedTopicId={0}
          onTopicSelect={mockOnTopicSelect}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Error loading topics')).toBeInTheDocument()
  })

  it('renders empty state when no topics available', () => {
    vi.mocked(useTopics).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isPending: false,
      isSuccess: true
    })

    render(
      <TestWrapper>
        <TopicSelector 
          grade="8" 
          subject="Mathematics" 
          selectedTopicId={0}
          onTopicSelect={mockOnTopicSelect}
        />
      </TestWrapper>
    )

    expect(screen.getByText('No topics available')).toBeInTheDocument()
  })

  it('fetches topics with correct parameters', () => {
    const mockUseTopics = vi.mocked(useTopics)
    
    render(
      <TestWrapper>
        <TopicSelector 
          grade="9" 
          subject="Physical Science" 
          selectedTopicId={0}
          onTopicSelect={mockOnTopicSelect}
        />
      </TestWrapper>
    )

    expect(mockUseTopics).toHaveBeenCalledWith('9', 'Physical Science')
  })
})