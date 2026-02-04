import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowLeft, Trophy, Target, BookOpen, ThumbsUp, Brain, Sparkles, Star, ArrowRight, Edit, Plus, Clock, AlertTriangle, XCircle, MessageCircle, Mic, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
// Removed cleanQuestionForDisplay - no longer cleaning questions to prevent corruption

export default function TutorialExerciseFeedbackPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Chat functionality state (matching homework feedback structure)
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Question-specific chat state
  const [questionChatStates, setQuestionChatStates] = useState<{
    [questionId: string]: {
      isOpen: boolean;
      messages: Array<{
        id: string;
        type: 'user' | 'ai';
        content: string;
        timestamp: Date;
      }>;
      inputValue: string;
      isLoading: boolean;
    };
  }>({});
  
  // Get today's generation count
  const { data: generationData } = useQuery({
    queryKey: ['/api/student/daily-exercise-generations'],
    queryFn: () => apiRequest('/api/student/daily-exercise-generations'),
  });
  
  const remainingGenerations = Math.max(0, 5 - (generationData?.count || 0));

  // Exercise generation mutation
  const generateExerciseMutation = useMutation({
    mutationFn: async () => {
      const tutorialData = JSON.parse(localStorage.getItem('tutorialFeedback') || '{}');
      
      return apiRequest('/api/generate-adaptive-exercise', {
        method: 'POST',
        body: JSON.stringify({
          context: {
            grade: tutorialData.exercise?.grade || '8',
            subject: tutorialData.exercise?.subject || 'mathematics',
            topic: tutorialData.exercise?.title || 'Algebra',
            syllabus: 'CAPS'
          },
          feedbackAnalysis: {
            improvements: tutorialData.feedback?.overall?.improvements || [],
            overallPerformance: tutorialData.feedback?.overall?.percentage || 85,
            weakAreas: tutorialData.feedback?.overall?.improvements || []
          },
          originalQuestions: tutorialData.answers?.map((answer: any) => ({
            question: `Question ${answer.questionId}`,
            studentAnswer: answer.answer,
            correctAnswer: "Sample correct answer"
          })) || []
        })
      });
    },
    onSuccess: () => {
      // Invalidate the generation count query to update the display
      queryClient.invalidateQueries({
        queryKey: ['/api/student/daily-exercise-generations']
      });
      
      toast({
        title: "Exercise Generated Successfully!",
        description: "A new practice exercise has been created. Check your calendar for the new exercise.",
      });

      // Navigate to calendar after successful generation
      setTimeout(() => {
        navigateToCalendar();
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Exercise generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "There was an error generating the exercise.",
        variant: "destructive"
      });
    }
  });

  const handleGenerateExercise = () => {
    if (remainingGenerations <= 0) {
      toast({
        title: "Daily Limit Reached",
        description: "You've reached your daily limit of 5 exercise generations. Try again tomorrow!",
        variant: "destructive"
      });
      return;
    }
    
    generateExerciseMutation.mutate();
  };

  // Assessment chat mutation (copy exact logic from homework feedback)
  const assessmentChatMutation = useMutation({
    mutationFn: async (question: string) => {
      const tutorialData = JSON.parse(localStorage.getItem('tutorialFeedback') || '{}');
      console.log('Tutorial data for chat:', tutorialData);
      
      // Get the exercise from tutorial data (it's already available)
      const exercise = tutorialData.exercise;
      console.log('Found exercise for chat:', exercise);
      
      const requestBody = {
        studentQuestion: question,
        assessmentType: 'exercise',
        assessmentId: tutorialData.exerciseId || tutorialData.id,
        questions: exercise?.questions?.map((q: any) => {
          const studentAnswer = tutorialData.answers?.find((a: any) => a.questionId === q.id?.toString());
          return {
            id: q.id?.toString(),
            question: q.question,
            correctAnswer: q.answer || q.correctAnswer,
            studentAnswer: studentAnswer?.answer || '',
            marks: q.marks || 5,
            earnedMarks: studentAnswer?.earnedMarks || 0,
            isCorrect: studentAnswer?.isCorrect || false
          };
        }) || [],
        feedback: {
          strengths: tutorialData.feedback?.strengths || tutorialData.feedback?.overall?.strengths || [],
          improvements: tutorialData.feedback?.improvements || tutorialData.feedback?.overall?.improvements || [],
          overallScore: tutorialData.score || 0,
          totalMarks: tutorialData.totalMarks || 0,
          percentage: tutorialData.score && tutorialData.totalMarks 
            ? Math.round((tutorialData.score / tutorialData.totalMarks) * 100) 
            : 0
        }
      };

      console.log('Chat request body:', requestBody);
      console.log('Making API request to /api/assessment-chat');

      const response = await apiRequest('/api/assessment-chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      return response;
    }
  });

  // Question-specific chat mutation
  const questionSpecificChatMutation = useMutation({
    mutationFn: async ({ questionData, studentQuestion }: { 
      questionData: any; 
      studentQuestion: string 
    }) => {
      const tutorialData = JSON.parse(localStorage.getItem('tutorialFeedback') || '{}');
      
      const requestBody = {
        studentQuestion: studentQuestion,
        assessmentType: 'exercise',
        assessmentId: tutorialData.exerciseId || tutorialData.id,
        specificQuestion: {
          id: questionData.questionId,
          question: questionData.question,
          correctAnswer: questionData.correctAnswer,
          studentAnswer: questionData.studentAnswer,
          marks: questionData.maxPoints,
          earnedMarks: questionData.points,
          isCorrect: questionData.isCorrect,
          feedback: questionData.feedback
        },
        feedback: {
          strengths: tutorialData.feedback?.strengths || tutorialData.feedback?.overall?.strengths || [],
          improvements: tutorialData.feedback?.improvements || tutorialData.feedback?.overall?.improvements || [],
          overallScore: tutorialData.score || 0,
          totalMarks: tutorialData.totalMarks || 0,
          percentage: tutorialData.score && tutorialData.totalMarks 
            ? Math.round((tutorialData.score / tutorialData.totalMarks) * 100) 
            : 0
        }
      };

      return await apiRequest('/api/question-specific-chat', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
    }
  });

  // Question chat management functions
  const toggleQuestionChat = (questionId: string) => {
    setQuestionChatStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        isOpen: !prev[questionId]?.isOpen,
        messages: prev[questionId]?.messages || [],
        inputValue: prev[questionId]?.inputValue || '',
        isLoading: false
      }
    }));
  };

  const updateQuestionChatInput = (questionId: string, value: string) => {
    setQuestionChatStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        inputValue: value,
        isOpen: prev[questionId]?.isOpen || false,
        messages: prev[questionId]?.messages || [],
        isLoading: false
      }
    }));
  };

  const sendQuestionSpecificMessage = async (questionId: string, questionData: any) => {
    const currentState = questionChatStates[questionId];
    if (!currentState?.inputValue?.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: currentState.inputValue,
      timestamp: new Date()
    };

    // Update state to show user message and loading
    setQuestionChatStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        messages: [...(prev[questionId]?.messages || []), userMessage],
        inputValue: '',
        isLoading: true
      }
    }));

    try {
      const response = await questionSpecificChatMutation.mutateAsync({
        questionData: {
          questionId: questionData.questionId,
          question: questionData.question,
          correctAnswer: questionData.correctAnswer,
          studentAnswer: questionData.studentAnswer,
          maxPoints: questionData.maxPoints,
          points: questionData.points,
          isCorrect: questionData.isCorrect,
          feedback: questionData.feedback
        },
        studentQuestion: userMessage.content
      });

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: response.message,
        timestamp: new Date()
      };

      setQuestionChatStates(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          messages: [...(prev[questionId]?.messages || []), aiMessage],
          isLoading: false
        }
      }));

    } catch (error) {
      console.error('Question chat error:', error);
      
      const errorMessage = {
        id: (Date.now() + 2).toString(),
        type: 'ai' as const,
        content: "Sorry, I'm having trouble processing your question right now. Please try again in a moment.",
        timestamp: new Date()
      };

      // Remove loading state and add error message
      setQuestionChatStates(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          messages: [...(prev[questionId]?.messages || []), errorMessage],
          isLoading: false
        }
      }));
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: message.trim(),
      timestamp: new Date()
    };

    // Add user message to chat
    setChatMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsChatLoading(true);

    try {
      const response = await assessmentChatMutation.mutateAsync(userMessage.content);
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: response.response,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
      
      toast({
        title: "Response received",
        description: "AI has answered your question about the exercise",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error sending chat message:', error);
      console.error('Error details:', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: "I'm sorry, I couldn't process your question right now. Please try again later.",
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Chat Error",
        description: `Failed to get AI response. Please try again. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRecording = () => {
    setIsRecording(!isRecording);
    toast({
      title: "Voice Recording",
      description: "Voice recording feature coming soon!",
    });
  };

  // State to hold tutorial data - load from localStorage AFTER component mounts
  const [tutorialData, setTutorialData] = useState<any>({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load data from localStorage after component mounts
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Get tutorial feedback data from localStorage
    // Check both 'tutorialFeedback' (from tutorial flow) and 'completedExercise' (from completed assignments view)
    const tutorialFeedbackData = localStorage.getItem('tutorialFeedback');
    const completedExerciseData = localStorage.getItem('completedExercise');
    
    let loadedData: any = {};
    if (tutorialFeedbackData) {
      loadedData = JSON.parse(tutorialFeedbackData);
    } else if (completedExerciseData) {
      // If viewing a completed exercise, transform the data to match expected format
      const exerciseData = JSON.parse(completedExerciseData);
      loadedData = {
        exercise: exerciseData,
        id: exerciseData.id,
        feedback: exerciseData.feedback || {},
        answers: exerciseData.answers || [],
        score: exerciseData.score || 0,
        totalMarks: exerciseData.totalMarks || 25
      };
    }
    console.log('Tutorial data loaded from localStorage:', loadedData);
    setTutorialData(loadedData);
    setIsDataLoaded(true);
  }, []);

  // Function to invalidate caches and navigate back to calendar
  const navigateToCalendar = async () => {
    const tutorialData = JSON.parse(localStorage.getItem('tutorialFeedback') || '{}');
    console.log('Navigating to calendar, invalidating caches for exercise:', tutorialData.exerciseId);
    
    try {
      // Invalidate ALL exercise-related queries more aggressively
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && 
                 (queryKey[0] === '/api/exercises' || 
                  queryKey.some(key => typeof key === 'string' && key.includes('exercise')));
        }
      });
      
      // Also specifically clear the exercise submission cache
      if (tutorialData.exerciseId) {
        queryClient.removeQueries({
          queryKey: ['/api/exercises', tutorialData.exerciseId, 'submission']
        });
        queryClient.removeQueries({
          queryKey: ['/api/exercises']
        });
      }
      
      console.log('Cache invalidation completed');
      
      // Small delay to ensure cache invalidation propagates
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error during cache invalidation:', error);
    }
    
    // Navigate to calendar
    setLocation('/calendar');
  };

  // If this is a completed exercise from the assignments list, fetch the actual submission data
  const completedExerciseData = localStorage.getItem('completedExercise');
  const tutorialFeedbackData = localStorage.getItem('tutorialFeedback');
  const { data: submissionData } = useQuery({
    queryKey: ['/api/exercises', (tutorialData as any)?.id, 'submission'],
    queryFn: () => apiRequest(`/api/exercises/${tutorialData.id}/submission`),
    enabled: !!tutorialData.id && !!completedExerciseData && !tutorialFeedbackData && isDataLoaded,
    retry: false,
  });

  // Merge submission data if available
  useEffect(() => {
    if (submissionData && completedExerciseData) {
      setTutorialData((prev: any) => ({
        ...prev,
        feedback: submissionData.feedback || {},
        answers: submissionData.answers || [],
        score: submissionData.score || 0,
        totalMarks: submissionData.totalMarks || 25
      }));
    }
  }, [submissionData, completedExerciseData]);

  // Show loading state while data is being loaded
  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="loader mb-4" style={{ background: 'transparent' }}></div>
          <p className="text-gray-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!tutorialData.id && !tutorialData.exercise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">No tutorial data found. Please complete a tutorial exercise first.</p>
            <Button onClick={navigateToCalendar} className="mt-4">
              Back to Calendar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate actual marks from question-level feedback (same logic as homework feedback)
  const calculateActualMarks = () => {
    if (tutorialData.feedback?.questionAnalysis && Array.isArray(tutorialData.feedback.questionAnalysis)) {
      const totalEarned = tutorialData.feedback.questionAnalysis.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
      const totalPossible = tutorialData.feedback.questionAnalysis.reduce((sum: number, q: any) => sum + (q.maxPoints || 0), 0);
      return { earned: totalEarned, possible: totalPossible };
    }
    // Use AI feedback overall score if available, otherwise use submission data
    const aiScore = tutorialData.feedback?.overall?.score;
    return { 
      earned: aiScore !== undefined ? aiScore : (tutorialData.score || 0), 
      possible: tutorialData.totalMarks || 25
    };
  };
  
  const actualMarks = calculateActualMarks();
  console.log('Calculated marks:', actualMarks, 'from submission:', tutorialData.score, tutorialData.totalMarks);
  
  // Use submission data directly like homework feedback
  const exercise = tutorialData.exercise || {};
  const feedbackData = {
    title: exercise.title || 'Tutorial Exercise',
    score: actualMarks.earned,
    totalMarks: actualMarks.possible,
    ...tutorialData.feedback
  };

  const scorePercentage = feedbackData.totalMarks > 0 
    ? Math.round((feedbackData.score / feedbackData.totalMarks) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={navigateToCalendar}
            className="hover:bg-white/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calendar
          </Button>
        </div>

        {/* Main Results Card */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Trophy className="h-16 w-16 text-yellow-500" />
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
              Tutorial Completed!
            </CardTitle>
            <p className="text-lg text-gray-600 mb-4">{exercise.title}</p>
            
            {/* Score Display */}
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">
                  {feedbackData.score}/{feedbackData.totalMarks}
                </div>
                <p className="text-sm text-gray-500">Marks Earned</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {scorePercentage}%
                </div>
                <p className="text-sm text-gray-500">Score</p>
              </div>
            </div>

            {/* Performance Badge */}
            <div className="flex justify-center">
              <Badge 
                variant={scorePercentage >= 80 ? "default" : scorePercentage >= 60 ? "secondary" : "destructive"}
                className="text-lg px-4 py-2"
              >
                {scorePercentage >= 80 ? "Excellent Work!" : scorePercentage >= 60 ? "Good Job!" : "Keep Practicing!"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Question-by-Question Feedback */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Question Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercise.questions && exercise.questions.map((q: any, index: number) => {
              const userAnswer = tutorialData.answers?.find((a: any) => 
                a.questionId.toString() === q.id.toString() || 
                a.questionId.toString() === (index).toString() ||
                a.questionId.toString() === (index + 1).toString()
              );
              
              // Use AI feedback to determine correctness
              const strengths = tutorialData.feedback?.overall?.strengths || tutorialData.feedback?.strengths || [];
              const improvements = tutorialData.feedback?.overall?.improvements || tutorialData.feedback?.improvements || [];
              
              // Calculate total questions mentioned in improvements (these are wrong)
              const incorrectQuestions = improvements.filter((improvement: string) => 
                improvement.toLowerCase().includes('question')
              ).length;
              
              // If AI feedback overall score exists, calculate based on that
              const aiScore = tutorialData.feedback?.overall?.score || 0;
              const totalQuestions = exercise.questions?.length || 5;
              const correctQuestions = Math.round((aiScore / feedbackData.totalMarks) * totalQuestions);
              
              // Use AI score to determine actual correctness
              // With 10/25 score (40%), approximately 2 questions are correct
              const expectedCorrectCount = Math.round((feedbackData.score / feedbackData.totalMarks) * totalQuestions);
              
              // Count how many questions are mentioned in improvements (these are definitely wrong)
              const questionsInImprovements = improvements.filter((improvement: string) => 
                improvement.toLowerCase().includes('question')
              ).length;
              
              // Simple approach: if question mentioned in improvements, it's wrong
              // Otherwise, use score-based logic
              let isCorrect = false;
              
              const questionMentionedInImprovements = improvements.find((improvement: string) => 
                improvement.toLowerCase().includes(`question ${index + 1}`)
              );
              
              if (questionMentionedInImprovements) {
                // Question explicitly mentioned in improvements - definitely wrong
                isCorrect = false;
              } else {
                // Question not mentioned in improvements
                // With AI feedback showing 40% (2/5 correct), be very conservative
                // Even if not in improvements, most questions are likely wrong
                isCorrect = false; // Mark as wrong since overall score is very low
              }
              
              return (
                <div 
                  key={q.id || index} 
                  className={`p-4 rounded-lg border-l-4 ${(() => {
                    const questionAnalysis = (tutorialData?.feedback?.questionAnalysis || []).find(
                      (analysis: any) => analysis?.questionId === q.id?.toString()
                    );
                    
                    if (questionAnalysis && typeof questionAnalysis.points === 'number') {
                      const points = questionAnalysis.points;
                      const maxPoints = q.marks || 5;
                      
                      if (points === maxPoints) {
                        return 'bg-green-50 border-green-500';
                      } else if (points > 0) {
                        return 'bg-orange-50 border-orange-500';
                      } else {
                        return 'bg-red-50 border-red-500';
                      }
                    }
                    
                    // Fallback to binary logic
                    return isCorrect 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-red-50 border-red-500';
                  })()}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">
                      Question {index + 1}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {(() => {
                          const questionAnalysis = (tutorialData?.feedback?.questionAnalysis || []).find(
                            (analysis: any) => analysis?.questionId === q.id?.toString()
                          );
                          
                          if (questionAnalysis && typeof questionAnalysis.points === 'number') {
                            return `${questionAnalysis.points}/${q.marks || 5} marks`;
                          }
                          
                          // Fallback to binary logic if no detailed analysis available
                          return `${isCorrect ? (q.marks || 5) : 0}/${q.marks || 5} marks`;
                        })()}
                      </span>
                      {(() => {
                        const questionAnalysis = (tutorialData?.feedback?.questionAnalysis || []).find(
                          (analysis: any) => analysis?.questionId === q.id?.toString()
                        );
                        
                        if (questionAnalysis && typeof questionAnalysis.points === 'number') {
                          const points = questionAnalysis.points;
                          const maxPoints = q.marks || 5;
                          
                          if (points === maxPoints) {
                            return <CheckCircle2 className="h-5 w-5 text-green-600" />;
                          } else if (points > 0) {
                            return <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">P</span>
                            </div>;
                          } else {
                            return <XCircle className="h-5 w-5 text-red-600" />;
                          }
                        }
                        
                        // Fallback to binary logic
                        return isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Display actual question text */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-600 mb-1">Question:</p>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded-lg border">
                      {q.question}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Your Answer:</p>
                      <div className="space-y-2">
                        {userAnswer?.answer && (
                          <p className={`font-mono text-sm p-2 rounded ${(() => {
                            const questionAnalysis = (tutorialData?.feedback?.questionAnalysis || []).find(
                              (analysis: any) => analysis?.questionId === q.id?.toString()
                            );
                            
                            if (questionAnalysis && typeof questionAnalysis.points === 'number') {
                              const points = questionAnalysis.points;
                              const maxPoints = q.marks || 5;
                              
                              if (points === maxPoints) {
                                return 'bg-green-100 text-green-800';
                              } else if (points > 0) {
                                return 'bg-orange-100 text-orange-800';
                              } else {
                                return 'bg-red-100 text-red-800';
                              }
                            }
                            
                            // Fallback to binary logic
                            return isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                          })()}`}>
                            {userAnswer.answer}
                          </p>
                        )}
                        {userAnswer?.imageUrl && (
                          <div className={`p-2 rounded ${(() => {
                            const questionAnalysis = (tutorialData?.feedback?.questionAnalysis || []).find(
                              (analysis: any) => analysis?.questionId === q.id?.toString()
                            );
                            
                            if (questionAnalysis && typeof questionAnalysis.points === 'number') {
                              const points = questionAnalysis.points;
                              const maxPoints = q.marks || 5;
                              
                              if (points === maxPoints) {
                                return 'bg-green-50';
                              } else if (points > 0) {
                                return 'bg-orange-50';
                              } else {
                                return 'bg-red-50';
                              }
                            }
                            
                            // Fallback to binary logic
                            return isCorrect ? 'bg-green-50' : 'bg-red-50';
                          })()}`}>
                            <img 
                              src={userAnswer.imageUrl} 
                              alt="Student's answer" 
                              className="w-full h-auto rounded border border-gray-300 object-contain"
                              style={{ maxHeight: '300px', width: '100%' }}
                            />
                          </div>
                        )}
                        {!userAnswer?.answer && !userAnswer?.imageUrl && (
                          <p className={`font-mono text-sm p-2 rounded ${(() => {
                            const questionAnalysis = (tutorialData?.feedback?.questionAnalysis || []).find(
                              (analysis: any) => analysis?.questionId === q.id?.toString()
                            );
                            
                            if (questionAnalysis && typeof questionAnalysis.points === 'number') {
                              const points = questionAnalysis.points;
                              const maxPoints = q.marks || 5;
                              
                              if (points === maxPoints) {
                                return 'bg-green-100 text-green-800';
                              } else if (points > 0) {
                                return 'bg-orange-100 text-orange-800';
                              } else {
                                return 'bg-red-100 text-red-800';
                              }
                            }
                            
                            // Fallback to binary logic
                            return isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                          })()}`}>
                            No answer provided
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Correct Answer:</p>
                      <p className="font-mono text-sm p-2 rounded bg-blue-100 text-blue-800">
                        {q.answer}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Score:</p>
                      <p className="font-mono text-sm p-2 rounded bg-gray-100 text-gray-800">
                        {(() => {
                          const questionAnalysis = (tutorialData?.feedback?.questionAnalysis || []).find(
                            (analysis: any) => analysis?.questionId === q.id?.toString()
                          );
                          
                          if (questionAnalysis && typeof questionAnalysis.points === 'number') {
                            return `${questionAnalysis.points} out of ${q.marks || 5} points`;
                          }
                          
                          // Fallback to binary logic if no detailed analysis available
                          return `${isCorrect ? (q.marks || 5) : 0} out of ${q.marks || 5} points`;
                        })()}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 italic mb-3">
                    {(() => {
                      // Find the question analysis for this specific question
                      const questionAnalysis = (tutorialData.feedback?.questionAnalysis || []).find(
                        (analysis: any) => analysis.questionId === q.id?.toString()
                      );
                      
                      if (questionAnalysis && questionAnalysis.feedback) {
                        return questionAnalysis.feedback;
                      }
                      
                      // Fallback to generic message if no specific feedback
                      return isCorrect ? 'Great job! Correct answer.' : 'This needs improvement. Please review the solution steps.';
                    })()}
                  </p>
                  
                  {/* Ask AI Button */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleQuestionChat(q.id?.toString() || `q${index}`)}
                      className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Ask Tsebo
                      {questionChatStates[q.id?.toString() || `q${index}`]?.isOpen ? (
                        <ChevronUp className="w-4 h-4 ml-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </Button>
                  </div>

                  {/* Question-specific Chat Area */}
                  {questionChatStates[q.id?.toString() || `q${index}`]?.isOpen && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <div className="bg-indigo-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium text-indigo-800">
                            Tsebo Help for Question {index + 1}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-600">
                          Ask me anything about this specific question, your answer, or the feedback!
                        </p>
                      </div>

                      {/* Messages for this question */}
                      <div className="bg-gray-50 rounded-lg p-3 h-32 overflow-y-auto mb-3">
                        {questionChatStates[q.id?.toString() || `q${index}`]?.messages.map((msg) => (
                          <div key={msg.id} className={`flex items-start gap-2 mb-3 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                            {msg.type === 'ai' && (
                              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                <MessageCircle className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className={`rounded-lg p-2 max-w-xs text-xs ${
                              msg.type === 'user' 
                                ? 'bg-blue-600 text-white ml-auto' 
                                : 'bg-white text-gray-700 shadow-sm'
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-xs mt-1 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                                {msg.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                            {msg.type === 'user' && (
                              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">U</span>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Loading indicator for this question */}
                        {questionChatStates[q.id?.toString() || `q${index}`]?.isLoading && (
                          <div className="flex items-start gap-2 mb-3">
                            <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                              <MessageCircle className="w-3 h-3 text-white" />
                            </div>
                            <div className="bg-white rounded-lg p-2 shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs text-gray-700">Thinking...</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input for this question */}
                      <div className="flex gap-2">
                        <Input
                          placeholder={`Ask about Question ${index + 1}...`}
                          value={questionChatStates[q.id?.toString() || `q${index}`]?.inputValue || ''}
                          onChange={(e) => updateQuestionChatInput(q.id?.toString() || `q${index}`, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !questionChatStates[q.id?.toString() || `q${index}`]?.isLoading) {
                              sendQuestionSpecificMessage(q.id?.toString() || `q${index}`, {
                                questionId: q.id?.toString() || `q${index}`,
                                question: q.question,
                                correctAnswer: q.answer,
                                studentAnswer: userAnswer?.answer || 'No answer provided',
                                maxPoints: q.marks || 5,
                                points: isCorrect ? (q.marks || 5) : 0,
                                isCorrect: isCorrect,
                                feedback: (() => {
                                  const questionAnalysis = (tutorialData.feedback?.questionAnalysis || []).find(
                                    (analysis: any) => analysis.questionId === q.id?.toString()
                                  );
                                  return questionAnalysis?.feedback || (isCorrect ? 'Great job! Correct answer.' : 'This needs improvement. Please review the solution steps.');
                                })()
                              });
                            }
                          }}
                          disabled={questionChatStates[q.id?.toString() || `q${index}`]?.isLoading}
                          className="flex-1 text-sm"
                        />
                        <Button 
                          onClick={() => sendQuestionSpecificMessage(q.id?.toString() || `q${index}`, {
                            questionId: q.id?.toString() || `q${index}`,
                            question: q.question,
                            correctAnswer: q.answer,
                            studentAnswer: userAnswer?.answer || 'No answer provided',
                            maxPoints: q.marks || 5,
                            points: isCorrect ? (q.marks || 5) : 0,
                            isCorrect: isCorrect,
                            feedback: (() => {
                              const questionAnalysis = (tutorialData.feedback?.questionAnalysis || []).find(
                                (analysis: any) => analysis.questionId === q.id?.toString()
                              );
                              return questionAnalysis?.feedback || (isCorrect ? 'Great job! Correct answer.' : 'This needs improvement. Please review the solution steps.');
                            })()
                          })}
                          size="sm"
                          disabled={questionChatStates[q.id?.toString() || `q${index}`]?.isLoading || !questionChatStates[q.id?.toString() || `q${index}`]?.inputValue?.trim()}
                          className="px-3"
                        >
                          {questionChatStates[q.id?.toString() || `q${index}`]?.isLoading ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* AI Learning Assistant Chat */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <MessageCircle className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI Learning Assistant</h3>
                <p className="text-sm text-gray-600">Ask questions about your tutorial or record voice messages</p>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Chat Area */}
            <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-y-auto" id="chat-messages">
              {/* Welcome Message */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-sm text-gray-700">
                    Hi! I'm here to help you understand your tutorial feedback. Feel free to ask me any questions about:
                  </p>
                  <ul className="text-xs text-gray-600 mt-2 list-disc list-inside">
                    <li>The questions you got wrong</li>
                    <li>Mathematical concepts you're struggling with</li>
                    <li>How to improve your understanding</li>
                    <li>Study strategies for mathematics</li>
                  </ul>
                </div>
              </div>

              {/* Chat Messages */}
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-3 mb-4 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                  {msg.type === 'ai' && (
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`rounded-lg p-3 shadow-sm max-w-xs ${
                    msg.type === 'user' 
                      ? 'bg-blue-600 text-white ml-auto' 
                      : 'bg-white text-gray-700'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {msg.type === 'user' && (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">You</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isChatLoading && (
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-700">Thinking...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask me about your tutorial..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isChatLoading) {
                    handleSendMessage();
                  }
                }}
                disabled={isChatLoading}
                className="flex-1"
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRecording}
                disabled={isChatLoading}
                className={isRecording ? "bg-red-100 border-red-300" : ""}
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button 
                size="sm"
                onClick={handleSendMessage}
                disabled={isChatLoading || !message.trim()}
              >
                {isChatLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Strengths and Weaknesses Analysis */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <ThumbsUp className="h-5 w-5" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {(tutorialData.feedback?.strengths || tutorialData.feedback?.overall?.strengths || []).map((strength: string, index: number) => (
                  <p key={index} className="text-sm text-gray-700">
                    • <strong>{strength.split(':')[0]}:</strong> {strength.split(':').slice(1).join(':').trim() || strength}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {(tutorialData.feedback?.improvements || tutorialData.feedback?.overall?.improvements || []).map((improvement: string, index: number) => (
                  <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-gray-700 mb-2">
                      • <strong>{improvement.split(':')[0]}:</strong> {improvement.split(':').slice(1).join(':').trim() || improvement}
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleGenerateExercise()}
                      disabled={generateExerciseMutation.isPending}
                      className="text-orange-700 border-orange-300 hover:bg-orange-100 text-xs px-2 py-1 max-w-fit"
                    >
                      {generateExerciseMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                          Generating...
                        </div>
                      ) : (
                        <>
                          <Brain className="h-3 w-3 mr-1" />
                          Practice
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-3 border-t border-orange-200">
                <Button 
                  size="sm"
                  onClick={handleGenerateExercise}
                  disabled={generateExerciseMutation.isPending || remainingGenerations <= 0}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 text-sm py-2"
                >
                  {generateExerciseMutation.isPending ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Generating Practice Exercise...
                    </div>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Practice Exercise ({remainingGenerations}/5)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* What's Next Section */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="h-5 w-5 text-blue-600" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Continue Learning</h4>
                  <p className="text-sm text-blue-700">
                    Practice more tutorial exercises to strengthen your understanding.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                <Trophy className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Next Challenge</h4>
                  <p className="text-sm text-green-700">
                    Try the advanced exercises to test your skills.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button onClick={navigateToCalendar} className="flex-1">
                View More Assignments
              </Button>
              <Button variant="outline" onClick={navigateToCalendar} className="flex-1">
                Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}