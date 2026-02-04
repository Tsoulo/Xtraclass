import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { BrowserRouter } from '@tanstack/react-router';

// Import components to test
import Calendar from '../client/src/components/Calendar';
import TutorialFlow from '../client/src/components/TutorialFlow';
import TutorialCard from '../client/src/components/TutorialCard';
import HomeworkFeedback from '../client/src/pages/HomeworkFeedback';

/**
 * Frontend Integration Tests for AI Exercise Flow
 * 
 * These tests validate the complete frontend workflow:
 * 1. Calendar displays generated exercises correctly
 * 2. Tutorial flow guides students through step-by-step learning
 * 3. Cache invalidation updates UI in real-time
 * 4. Exercise completion triggers proper navigation
 * 5. Feedback display shows personalized recommendations
 * 
 * Created to preserve frontend behavior and UI interactions
 * for the AI-driven educational system.
 */

// Mock API responses
const mockApiRequest = vi.fn();
vi.mock('../client/src/lib/queryClient', () => ({
  apiRequest: mockApiRequest
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock useLocation hook
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
  Link: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
  Router: ({ children }: any) => <div>{children}</div>
}));

// Mock toast notifications
const mockToast = vi.fn();
vi.mock('../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

describe('Frontend AI Exercise Flow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
    
    // Setup default localStorage values
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      switch (key) {
        case 'userGrade': return '8';
        case 'userRole': return 'student';
        case 'authToken': return 'mock-token';
        default: return null;
      }
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Router>
          {component}
        </Router>
      </QueryClientProvider>
    );
  };

  describe('1. Calendar Exercise Display', () => {
    beforeEach(() => {
      // Mock API responses for calendar data
      mockApiRequest.mockImplementation((url: string) => {
        if (url.includes('/api/exercises')) {
          return Promise.resolve([
            {
              id: 1,
              title: 'Math Practice: Algebra (14:30)',
              subject: 'mathematics',
              difficulty: 'medium',
              hasInitialTutorial: true,
              tutorialContent: JSON.stringify({
                steps: [
                  {
                    stepNumber: 1,
                    title: 'Understanding Algebraic Expressions',
                    explanation: 'Learn to combine like terms',
                    example: {
                      problem: '3x + 5x',
                      solution: '8x',
                      keyPoint: 'Combine coefficients of same variables'
                    }
                  }
                ]
              }),
              questions: [
                {
                  id: 'q1',
                  question: 'Simplify: 2x + 3x',
                  answer: '5x',
                  marks: 5
                }
              ]
            }
          ]);
        }
        if (url.includes('/api/homework')) {
          return Promise.resolve([]);
        }
        if (url.includes('/api/student/daily-exercise-generations')) {
          return Promise.resolve({ count: 1, date: '2025-08-15' });
        }
        return Promise.resolve([]);
      });
    });

    it('should display AI-generated tutorial exercises in calendar', async () => {
      renderWithProviders(<Calendar />);

      await waitFor(() => {
        expect(screen.getByText('AI-Generated Tutorial Exercises')).toBeInTheDocument();
        expect(screen.getByText('Math Practice: Algebra (14:30)')).toBeInTheDocument();
        expect(screen.getByText('medium')).toBeInTheDocument();
        expect(screen.getByText('Tutorial Exercise')).toBeInTheDocument();
      });
    });

    it('should show generation counter and remaining limit', async () => {
      renderWithProviders(<Calendar />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Generation count
        expect(screen.getByText(/remaining today/)).toBeInTheDocument();
      });
    });

    it('should expand exercise details when clicked', async () => {
      renderWithProviders(<Calendar />);

      await waitFor(() => {
        const expandButton = screen.getByRole('button', { name: /expand/i });
        fireEvent.click(expandButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Learning Guide')).toBeInTheDocument();
        expect(screen.getByText('Practice Questions')).toBeInTheDocument();
        expect(screen.getByText('Simplify: 2x + 3x')).toBeInTheDocument();
      });
    });

    it('should navigate to tutorial flow when starting AI exercise', async () => {
      renderWithProviders(<Calendar />);

      await waitFor(() => {
        const startButton = screen.getByText(/start.*tutorial/i);
        fireEvent.click(startButton);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'tutorialFlowData',
        expect.stringContaining('"generatedFrom":"ai-tutorial-exercise"')
      );
      expect(mockSetLocation).toHaveBeenCalledWith('/tutorial-flow');
    });
  });

  describe('2. Tutorial Flow Experience', () => {
    const mockTutorialData = {
      id: 'tutorial-1',
      title: 'Algebra Fundamentals',
      description: 'Learn algebraic expressions step by step',
      totalSteps: 2,
      steps: [
        {
          stepNumber: 1,
          title: 'Understanding Variables',
          explanation: 'Variables represent unknown values in mathematics',
          example: {
            problem: 'What is x in: x + 3 = 7?',
            solution: 'x = 4',
            keyPoint: 'Subtract 3 from both sides'
          },
          tips: ['Always do the same operation to both sides']
        },
        {
          stepNumber: 2,
          title: 'Combining Like Terms',
          explanation: 'Terms with the same variable can be combined',
          example: {
            problem: '3x + 5x',
            solution: '8x',
            keyPoint: 'Add the coefficients: 3 + 5 = 8'
          },
          tips: ['Only combine terms with identical variables']
        }
      ],
      context: {
        grade: '8',
        subject: 'mathematics',
        topic: 'Algebra',
        syllabus: 'CAPS'
      }
    };

    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'tutorialFlowData') {
          return JSON.stringify({
            tutorial: mockTutorialData,
            exercise: { id: 1, title: 'Practice Exercise' },
            generatedFrom: 'ai-tutorial-exercise'
          });
        }
        return null;
      });
    });

    it('should display tutorial steps with Brilliant-style UI', () => {
      renderWithProviders(<TutorialFlow />);

      expect(screen.getByText('Algebra Fundamentals')).toBeInTheDocument();
      expect(screen.getByText('Understanding Variables')).toBeInTheDocument();
      expect(screen.getByText('Variables represent unknown values in mathematics')).toBeInTheDocument();
      expect(screen.getByText('What is x in: x + 3 = 7?')).toBeInTheDocument();
      expect(screen.getByText('x = 4')).toBeInTheDocument();
    });

    it('should navigate between tutorial steps', () => {
      renderWithProviders(<TutorialCard tutorial={mockTutorialData} onComplete={vi.fn()} />);

      // Should start at step 1
      expect(screen.getByText('Understanding Variables')).toBeInTheDocument();

      // Click next to go to step 2
      const nextButton = screen.getByText('Next Step');
      fireEvent.click(nextButton);

      expect(screen.getByText('Combining Like Terms')).toBeInTheDocument();
      expect(screen.getByText('3x + 5x')).toBeInTheDocument();
    });

    it('should show progress indicator', () => {
      renderWithProviders(<TutorialCard tutorial={mockTutorialData} onComplete={vi.fn()} />);

      expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
      
      // Progress bar should be visible
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should trigger completion callback on final step', () => {
      const mockOnComplete = vi.fn();
      renderWithProviders(<TutorialCard tutorial={mockTutorialData} onComplete={mockOnComplete} />);

      // Navigate to final step
      const nextButton = screen.getByText('Next Step');
      fireEvent.click(nextButton);

      // Complete the tutorial
      const completeButton = screen.getByText('Complete Tutorial');
      fireEvent.click(completeButton);

      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('3. Homework Feedback and Exercise Generation', () => {
    const mockFeedbackData = {
      title: 'Algebra Practice',
      score: 15,
      totalMarks: 25,
      totalQuestions: 5,
      strengths: [
        'Good understanding of basic algebra',
        'Correctly solved linear equations'
      ],
      improvements: [
        'Practice combining like terms',
        'Review distributive property',
        'Work on factoring techniques'
      ]
    };

    beforeEach(() => {
      // Mock homework feedback API response
      mockApiRequest.mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/generate-tutorial-exercise')) {
          return Promise.resolve({
            tutorial: mockTutorialData,
            exercise: { id: 2, title: 'Generated Practice Exercise' }
          });
        }
        return Promise.resolve({});
      });
    });

    it('should display AI feedback with strengths and improvements', () => {
      renderWithProviders(<HomeworkFeedback {...mockFeedbackData} />);

      expect(screen.getByText('Good understanding of basic algebra')).toBeInTheDocument();
      expect(screen.getByText('Practice combining like terms')).toBeInTheDocument();
      expect(screen.getByText('15 / 25')).toBeInTheDocument(); // Score display
    });

    it('should show color-coded performance indicators', () => {
      renderWithProviders(<HomeworkFeedback {...mockFeedbackData} />);

      // Should show yellow/amber for 60% score (15/25)
      const scoreCard = screen.getByText('60%').closest('div');
      expect(scoreCard).toHaveClass(/yellow|amber/);
    });

    it('should generate personalized exercise from improvement areas', async () => {
      renderWithProviders(<HomeworkFeedback {...mockFeedbackData} />);

      const generateButton = screen.getByText(/generate.*exercise/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          '/api/generate-tutorial-exercise',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"weaknessAreas"')
          })
        );
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Practice Exercise Created!',
            description: expect.stringContaining('calendar')
          })
        );
      });
    });

    it('should navigate to calendar after exercise generation', async () => {
      renderWithProviders(<HomeworkFeedback {...mockFeedbackData} />);

      const generateButton = screen.getByText(/generate.*exercise/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockSetLocation).toHaveBeenCalledWith('/calendar');
      });
    });
  });

  describe('4. Cache Invalidation and Real-Time Updates', () => {
    it('should invalidate cache when tutorial is completed', async () => {
      const mockInvalidateQueries = vi.fn();
      const mockRefetchQueries = vi.fn();
      const mockRemoveQueries = vi.fn();

      const mockQueryClient = {
        invalidateQueries: mockInvalidateQueries,
        refetchQueries: mockRefetchQueries,
        removeQueries: mockRemoveQueries,
        getQueryCache: () => ({
          getAll: () => [
            { queryKey: ['/api/exercises?date=2025-08-15&grade=8'] },
            { queryKey: ['/api/student/daily-exercise-generations'] }
          ]
        })
      };

      // Mock the query client context
      vi.mock('@tanstack/react-query', async () => {
        const actual = await vi.importActual('@tanstack/react-query');
        return {
          ...actual,
          useQueryClient: () => mockQueryClient
        };
      });

      renderWithProviders(<TutorialFlow />);

      // Complete the tutorial
      const completeButton = screen.getByText(/complete/i);
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalled();
        expect(mockRefetchQueries).toHaveBeenCalled();
        expect(mockRemoveQueries).toHaveBeenCalled();
      });
    });

    it('should show loading states during exercise generation', async () => {
      // Mock slow API response
      mockApiRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderWithProviders(<HomeworkFeedback {...mockFeedbackData} />);

      const generateButton = screen.getByText(/generate.*exercise/i);
      fireEvent.click(generateButton);

      // Should show loading state
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
    });
  });

  describe('5. Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      mockApiRequest.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<HomeworkFeedback {...mockFeedbackData} />);

      const generateButton = screen.getByText(/generate.*exercise/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to generate/i)).toBeInTheDocument();
      });
    });

    it('should handle missing tutorial data', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      renderWithProviders(<TutorialFlow />);

      expect(screen.getByText(/no tutorial data/i)).toBeInTheDocument();
    });

    it('should validate exercise generation limits', async () => {
      mockApiRequest.mockResolvedValueOnce({ error: 'Daily limit reached' });

      renderWithProviders(<HomeworkFeedback {...mockFeedbackData} />);

      const generateButton = screen.getByText(/generate.*exercise/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/daily limit/i)).toBeInTheDocument();
      });
    });
  });

  describe('6. Accessibility and User Experience', () => {
    it('should have proper ARIA labels and roles', () => {
      renderWithProviders(<TutorialCard tutorial={mockTutorialData} onComplete={vi.fn()} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next step/i })).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 2')).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<TutorialCard tutorial={mockTutorialData} onComplete={vi.fn()} />);

      const nextButton = screen.getByRole('button', { name: /next step/i });
      
      // Should be focusable
      nextButton.focus();
      expect(document.activeElement).toBe(nextButton);

      // Should respond to Enter key
      fireEvent.keyDown(nextButton, { key: 'Enter', code: 'Enter' });
      expect(screen.getByText('Combining Like Terms')).toBeInTheDocument();
    });

    it('should provide clear visual feedback for user actions', async () => {
      renderWithProviders(<HomeworkFeedback {...mockFeedbackData} />);

      const generateButton = screen.getByText(/generate.*exercise/i);
      
      // Button should change appearance when clicked
      fireEvent.click(generateButton);
      expect(generateButton).toHaveClass(/disabled|loading/);
    });
  });
});

/**
 * Frontend Test Documentation
 * 
 * These tests validate the complete frontend AI exercise flow:
 * 
 * 1. CALENDAR INTEGRATION:
 *    - AI-generated exercises appear with proper styling
 *    - Generation counters and limits are displayed
 *    - Exercise expansion shows tutorial content
 *    - Navigation to tutorial flow works correctly
 * 
 * 2. TUTORIAL EXPERIENCE:
 *    - Brilliant-style step-by-step presentation
 *    - Progress tracking and navigation
 *    - Interactive examples and explanations
 *    - Proper completion flow
 * 
 * 3. FEEDBACK SYSTEM:
 *    - AI feedback display with strengths/improvements
 *    - Color-coded performance indicators
 *    - Exercise generation from weakness areas
 *    - Real-time cache invalidation
 * 
 * 4. ERROR HANDLING:
 *    - Graceful API error handling
 *    - Missing data validation
 *    - Generation limit enforcement
 *    - Loading states and user feedback
 * 
 * 5. ACCESSIBILITY:
 *    - ARIA labels and roles
 *    - Keyboard navigation support
 *    - Visual feedback for actions
 *    - Screen reader compatibility
 * 
 * These tests ensure the frontend correctly implements the complex
 * AI-driven educational workflow and maintains usability standards.
 */