import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, ArrowLeft, Trophy, Target, BookOpen, ThumbsUp, AlertTriangle, Brain, MessageCircle, Send, Mic, ChevronDown, ChevronUp, Maximize2, Minimize2, Flag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ExerciseFeedback() {
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingExercise, setIsGeneratingExercise] = useState(false);
  
  type QuestionChatState = {
    isOpen: boolean;
    messages: Array<{id: string; type: 'user' | 'ai'; content: string; timestamp: Date}>;
    isLoading: boolean;
    inputValue: string;
    isEnlarged: boolean;
  };

  const [questionChatStates, setQuestionChatStates] = useState<{[key: string]: QuestionChatState}>({});
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [mainChatEnlarged, setMainChatEnlarged] = useState(false);
  const { toast } = useToast();

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [currentReportQuestion, setCurrentReportQuestion] = useState<any>(null);
  const [reportType, setReportType] = useState('');
  const [reportComments, setReportComments] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  const exerciseFeedbackData = localStorage.getItem('exerciseFeedback');
  const completedExerciseData = localStorage.getItem('completedExercise');
  
  let submissionData: any = {};
  if (exerciseFeedbackData) {
    submissionData = JSON.parse(exerciseFeedbackData);
  } else if (completedExerciseData) {
    const exerciseData = JSON.parse(completedExerciseData);
    submissionData = {
      exercise: exerciseData,
      id: exerciseData.id,
      feedback: exerciseData.feedback || {},
      answers: exerciseData.answers || [],
      score: exerciseData.score || 0,
      totalMarks: exerciseData.totalMarks || 0
    };
  }

  const exerciseId = submissionData.exerciseId || submissionData.id;
  
  // Get exercise from localStorage (already passed from button)
  const exercise = submissionData.exercise;
  
  // Optionally refetch submission data for latest feedback
  const { data: actualSubmissionData } = useQuery({
    queryKey: [`/api/exercises/${exerciseId}/submission`],
    enabled: !!exerciseId,
  });
  
  const finalSubmissionData = actualSubmissionData || submissionData;
  
  if (!exercise || !finalSubmissionData.feedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">Loading exercise feedback...</p>
              <Button onClick={() => setLocation('/calendar')} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Calendar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const feedback = finalSubmissionData.feedback || {};
  const score = finalSubmissionData.score || 0;
  
  // Calculate total marks from submission data first, then from feedback questionAnalysis, then from exercise questions
  const totalMarks = finalSubmissionData.totalMarks 
    || feedback.questionAnalysis?.reduce((sum: number, q: any) => sum + (Number(q.maxPoints) || 0), 0)
    || exercise.questions?.reduce((sum: number, q: any) => sum + (q.points || q.marks || 0), 0)
    || 0;
  
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  // Check if all answers are correct for conditional challenge display
  const areAllAnswersCorrect = () => {
    // First check: if score equals total marks, all answers are correct
    if (score && totalMarks) {
      return score === totalMarks;
    }
    
    // Fallback check: examine individual answers if available
    if (finalSubmissionData.answers && exercise?.questions) {
      const correctAnswers = finalSubmissionData.answers.filter((answer: any) => answer.isCorrect);
      return correctAnswers.length === exercise.questions.length;
    }
    
    return false;
  };

  const allCorrect = areAllAnswersCorrect();

  // Get next day's date for lesson fetching
  const getNextDay = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  };

  // Fetch next lesson if all answers are correct
  const { data: nextLessonData } = useQuery({
    queryKey: ['/api/syllabus-calendar', 'next-lesson', getNextDay(), exercise?.grade, exercise?.subject],
    queryFn: () => apiRequest(`/api/syllabus-calendar?date=${getNextDay()}&grade=${exercise?.grade}&subject=${exercise?.subject}`),
    enabled: allCorrect && !!exercise?.grade && !!exercise?.subject,
    retry: false,
  });

  // Initialize question chat states when exercise data is available
  useEffect(() => {
    if (exercise?.questions && Object.keys(questionChatStates).length === 0) {
      const newStates: { [key: string]: QuestionChatState } = {};
      exercise.questions.forEach((question: any) => {
        newStates[question.id] = {
          isOpen: false,
          messages: [],
          inputValue: '',
          isLoading: false,
          isEnlarged: false
        };
      });
      setQuestionChatStates(newStates);
    }
  }, [exercise?.questions, questionChatStates]);

  // Tutorial exercise generation mutation
  const generateTutorialMutation = useMutation({
    mutationFn: async (weaknessAreas: string[]) => {
      const requestBody = {
        exerciseId: submissionData.exerciseId || exerciseId,
        topicName: exercise?.title || 'Practice Exercise',
        weaknessAreas: weaknessAreas,
        subject: exercise?.subject || 'mathematics',
        grade: exercise?.grade || '8'
      };
      
      return await apiRequest('/api/generate-tutorial-exercise', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
    },
    onSuccess: async (data) => {
      localStorage.setItem('tutorialFlowData', JSON.stringify({
        tutorial: data.tutorial,
        exercise: data.exercise,
        generatedFrom: 'exercise-feedback'
      }));
      
      toast({
        title: "Practice Exercise Created!",
        description: "Your personalized practice exercise has been added to the calendar. Check today's exercises.",
        duration: 3000,
      });
      
      // Comprehensive cache invalidation to ensure new exercise appears immediately
      
      // Method 1: Invalidate all exercise-related queries (both active and inactive)
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey?.[0];
          return typeof key === 'string' && (
            key.includes('/api/exercises') || 
            key === '/api/student/daily-exercise-generations'
          );
        }
      });
      
      // Method 2: Force refetch ALL exercise queries (including inactive ones like Calendar)
      await queryClient.refetchQueries({ 
        predicate: (query) => {
          const key = query.queryKey?.[0];
          return typeof key === 'string' && key.includes('/api/exercises');
        },
        type: 'all' // Critical: refetch both active AND inactive queries
      });
      
      // Method 3: Remove all exercise queries from cache to force fresh fetch on next mount
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey?.[0];
          return typeof key === 'string' && key.includes('/api/exercises');
        }
      });
      
      // Navigate back to calendar
      setTimeout(() => {
        setLocation('/calendar');
      }, 1000);
    },
    onError: (error: any) => {
      if (error?.status === 429 || error?.data?.message?.includes('Daily limit')) {
        const limit = error?.data?.limit || 5;
        const current = error?.data?.current || limit;
        
        toast({
          title: "Daily Limit Reached",
          description: `You've used ${current} of ${limit} practice exercise generations for today. The limit resets at midnight.`,
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Generation Failed",
          description: "Failed to generate practice exercise. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  });

  const handleGenerateExercises = async (improvementArea: string) => {
    setIsGeneratingExercise(true);
    try {
      const improvements = feedback.improvements || [];
      await generateTutorialMutation.mutateAsync(improvements);
    } catch (error) {
      console.error('Error generating practice exercise:', error);
    } finally {
      setIsGeneratingExercise(false);
    }
  };

  // Chat handlers
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: message,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsChatLoading(true);
    
    try {
      const response = await apiRequest('/api/assessment-chat', {
        method: 'POST',
        body: JSON.stringify({
          assessmentType: 'exercise',
          assessmentId: exerciseId,
          studentQuestion: message,
          context: {
            title: exercise.title,
            questions: exercise.questions,
            studentAnswers: finalSubmissionData.answers,
            feedback: feedback
          }
        })
      });
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: response.response,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRecording = () => {
    toast({
      title: "Voice Recording",
      description: "Voice recording feature coming soon!",
      duration: 2000,
    });
  };

  // Question-specific chat handlers
  const toggleQuestionChat = (questionId: string) => {
    setQuestionChatStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        isOpen: !prev[questionId]?.isOpen
      }
    }));
  };

  const toggleQuestionChatEnlarge = (questionId: string) => {
    setQuestionChatStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        isEnlarged: !prev[questionId]?.isEnlarged
      }
    }));
  };

  const updateQuestionChatInput = (questionId: string, value: string) => {
    setQuestionChatStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        inputValue: value
      }
    }));
  };

  const sendQuestionSpecificMessage = async (questionId: string, question: any) => {
    const currentInput = questionChatStates[questionId]?.inputValue || '';
    if (!currentInput.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: currentInput,
      timestamp: new Date()
    };
    
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
      const studentAnswer = finalSubmissionData.answers?.find((a: any) => a.questionId === questionId);
      const exerciseQuestion = exercise.questions?.find((q: any) => q.id === questionId);
      
      const response = await apiRequest('/api/question-specific-chat', {
        method: 'POST',
        body: JSON.stringify({
          assessmentType: 'exercise',
          assessmentId: exerciseId,
          questionId: questionId,
          studentQuestion: currentInput,
          context: {
            questionText: exerciseQuestion?.question || question.question,
            correctAnswer: exerciseQuestion?.answer || question.correctAnswer,
            studentAnswer: studentAnswer?.answer || 'No answer provided',
            feedback: question.feedback,
            isCorrect: question.isCorrect
          }
        })
      });
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: response.response,
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
      toast({
        title: "Chat Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      setQuestionChatStates(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          isLoading: false
        }
      }));
    }
  };

  // Report issue handlers
  const openReportDialog = (question: any, index: number) => {
    setCurrentReportQuestion({ ...question, questionIndex: index });
    setReportDialogOpen(true);
  };

  const resetReportForm = () => {
    setReportType('');
    setReportComments('');
    setCurrentReportQuestion(null);
  };

  const reportIssueMutation = useMutation({
    mutationFn: async (reportData: any) => {
      return await apiRequest('/api/question-reports', {
        method: 'POST',
        body: JSON.stringify(reportData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Issue Reported",
        description: "Thank you for reporting this issue. Our team will review it shortly.",
        duration: 3000,
      });
      setReportDialogOpen(false);
      resetReportForm();
    },
    onError: (error) => {
      console.error('Report error:', error);
      toast({
        title: "Report Failed",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  });

  const submitReport = () => {
    if (!reportType || !reportComments) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    reportIssueMutation.mutate({
      assessmentType: 'exercise',
      assessmentId: exerciseId,
      questionId: currentReportQuestion?.questionId,
      issueType: reportType,
      comments: reportComments,
      studentAnswer: finalSubmissionData.answers?.find((a: any) => a.questionId === currentReportQuestion?.questionId)?.answer,
      pointsReceived: currentReportQuestion?.points,
      maxPoints: currentReportQuestion?.maxPoints
    });
  };

  // Get strengths and improvements from feedback
  const rawStrengths = feedback?.strengths || [];
  const strengths = rawStrengths.filter((strength: string) => 
    !strength.toLowerCase().includes('no strengths to highlight') &&
    !strength.toLowerCase().includes('focus on improvement areas below')
  );
  const improvements = feedback?.improvements || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              localStorage.removeItem('exerciseFeedback');
              localStorage.removeItem('completedExercise');
              setLocation('/calendar');
            }}
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
              Exercise Completed!
            </CardTitle>
            <p className="text-lg text-gray-600 mb-4">{exercise.title}</p>
            
            {/* Score Display */}
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">
                  {score}/{totalMarks}
                </div>
                <p className="text-sm text-gray-500">Marks Earned</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {percentage}%
                </div>
                <p className="text-sm text-gray-500">Score</p>
              </div>
            </div>

            {/* Performance Badge */}
            <div className="flex justify-center">
              <Badge 
                variant={percentage >= 80 ? "default" : percentage >= 60 ? "secondary" : "destructive"}
                className="text-lg px-4 py-2"
              >
                {percentage >= 80 ? "Excellent Work!" : percentage >= 60 ? "Good Job!" : "Keep Practicing!"}
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
            {feedback.questionAnalysis?.map((qa: any, idx: number) => {
              // Convert questionId to number for comparison since database IDs are integers
              const questionId = typeof qa.questionId === 'string' ? parseInt(qa.questionId) : qa.questionId;
              const question = exercise.questions?.find((q: any) => q.id === questionId);
              const studentAnswer = finalSubmissionData.answers?.find((a: any) => a.questionId === qa.questionId);
              
              return (
                <div 
                  key={qa.questionId || idx} 
                  className={`p-4 rounded-lg border-l-4 ${
                    qa.isCorrect 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">
                      Question {idx + 1}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {Number(qa.points) || 0}/{Number(qa.maxPoints) || 0} marks
                      </span>
                      {qa.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  
                  {/* Display actual question text */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-600 mb-1">Question:</p>
                    <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                      {question?.question ? (
                        <p className="text-gray-800">{question.question}</p>
                      ) : (
                        <p className="text-gray-500 italic">Question text not available (Question ID: {qa.questionId})</p>
                      )}
                      {question?.imageUrl && (
                        <img 
                          src={question.imageUrl} 
                          alt="Question image" 
                          className="max-w-full h-auto rounded border border-gray-200"
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Your Answer:</p>
                      <div className="space-y-2">
                        {studentAnswer?.answer && (
                          <p className={`font-mono text-sm p-2 rounded ${
                            qa.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {studentAnswer.answer}
                          </p>
                        )}
                        {studentAnswer?.imageUrl && (
                          <div className={`p-2 rounded ${
                            qa.isCorrect ? 'bg-green-50' : 'bg-red-50'
                          }`}>
                            <img 
                              src={studentAnswer.imageUrl} 
                              alt="Student's answer" 
                              className="w-full h-auto rounded border border-gray-300 object-contain"
                              style={{ maxHeight: '300px', width: '100%' }}
                            />
                          </div>
                        )}
                        {!studentAnswer?.answer && !studentAnswer?.imageUrl && (
                          <p className={`font-mono text-sm p-2 rounded ${
                            qa.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            No answer provided
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Correct Answer:</p>
                      <p className="font-mono text-sm p-2 rounded bg-blue-100 text-blue-800 whitespace-pre-line">
                        {question?.answer || qa.correctAnswer || 'See solution steps in feedback below'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Score:</p>
                      <p className="font-mono text-sm p-2 rounded bg-gray-100 text-gray-800">
                        {Number(qa.points) || 0} out of {Number(qa.maxPoints) || 0} points
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 italic mb-3">{qa.feedback}</p>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReportDialog(qa, idx)}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3"
                      data-testid={`button-report-question-${idx + 1}`}
                    >
                      <Flag className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Report Issue</span>
                      <span className="sm:hidden">Report</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleQuestionChat(qa.questionId)}
                      className="text-indigo-600 border-indigo-300 hover:bg-indigo-50 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3"
                      data-testid={`button-ask-ai-question-${idx + 1}`}
                    >
                      <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Ask Tsebo</span>
                      <span className="sm:hidden">Tsebo</span>
                      {questionChatStates[qa.questionId]?.isOpen ? (
                        <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                      ) : (
                        <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                      )}
                    </Button>
                  </div>

                  {/* Question-specific Chat Area */}
                  {questionChatStates[qa.questionId]?.isOpen && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <div className="bg-indigo-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium text-indigo-800">
                            Tsebo Help for Question {idx + 1}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-600">
                          Ask me anything about this specific question, your answer, or the feedback!
                        </p>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <h6 className="text-sm font-medium text-indigo-700">Question Discussion</h6>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleQuestionChatEnlarge(qa.questionId)}
                          className="text-indigo-500 hover:text-indigo-700 h-6 px-2"
                        >
                          {questionChatStates[qa.questionId]?.isEnlarged ? (
                            <>
                              <Minimize2 className="w-3 h-3 mr-1" />
                              <span className="text-xs">Minimize</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="w-3 h-3 mr-1" />
                              <span className="text-xs">Enlarge</span>
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <div className={`bg-gray-50 rounded-lg p-3 overflow-y-auto mb-3 ${
                        questionChatStates[qa.questionId]?.isEnlarged ? 'h-64' : 'h-32'
                      }`}>
                        {questionChatStates[qa.questionId]?.messages.map((msg) => (
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

                        {questionChatStates[qa.questionId]?.isLoading && (
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

                      <div className="flex gap-2">
                        <Input
                          placeholder={`Ask about Question ${idx + 1}...`}
                          value={questionChatStates[qa.questionId]?.inputValue || ''}
                          onChange={(e) => updateQuestionChatInput(qa.questionId, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !questionChatStates[qa.questionId]?.isLoading) {
                              sendQuestionSpecificMessage(qa.questionId, qa);
                            }
                          }}
                          disabled={questionChatStates[qa.questionId]?.isLoading}
                          className="flex-1 text-sm"
                        />
                        <Button 
                          onClick={() => sendQuestionSpecificMessage(qa.questionId, qa)}
                          size="sm"
                          disabled={questionChatStates[qa.questionId]?.isLoading || !questionChatStates[qa.questionId]?.inputValue?.trim()}
                          className="px-3"
                        >
                          {questionChatStates[qa.questionId]?.isLoading ? (
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

        {/* Ask Tsebo Chat */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Ask Tsebo</h3>
                  <p className="text-sm text-gray-600">Ask questions about your exercise or record voice messages</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMainChatEnlarged(!mainChatEnlarged)}
                className="text-indigo-500 hover:text-indigo-700 h-8 px-3"
              >
                {mainChatEnlarged ? (
                  <>
                    <Minimize2 className="w-4 h-4 mr-1" />
                    <span className="text-sm">Minimize</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 mr-1" />
                    <span className="text-sm">Enlarge</span>
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className={`bg-gray-50 rounded-lg p-4 overflow-y-auto ${
              mainChatEnlarged ? 'h-96' : 'h-48'
            }`} id="chat-messages">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm flex-1">
                  <p className="text-sm text-gray-700">
                    Hi! I'm Tsebo. I can help you understand your exercise results, explain solutions, or answer any questions you have about the material.
                  </p>
                </div>
              </div>

              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-3 mb-4 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                  {msg.type === 'ai' && (
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`rounded-lg p-3 max-w-md ${
                    msg.type === 'user' 
                      ? 'bg-blue-600 text-white ml-auto' 
                      : 'bg-white text-gray-700 shadow-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {msg.type === 'user' && (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">U</span>
                    </div>
                  )}
                </div>
              ))}

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

            <div className="flex gap-2">
              <Input
                placeholder="Ask me about your exercise..."
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
                onClick={handleRecording} 
                size="sm"
                variant={isRecording ? "destructive" : "outline"}
                className={isRecording ? "animate-pulse" : ""}
                disabled={isChatLoading}
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button 
                onClick={handleSendMessage} 
                size="sm"
                disabled={isChatLoading || !message.trim()}
              >
                {isChatLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            {isRecording && (
              <p className="text-sm text-red-600 animate-pulse">🔴 Recording... (Click mic to stop)</p>
            )}
          </CardContent>
        </Card>

        {/* Strengths and Weaknesses Analysis */}
        {(strengths.length > 0 || improvements.length > 0) ? (
          <div className={`grid gap-6 ${strengths.length > 0 && improvements.length > 0 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
            {strengths.length > 0 && (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <ThumbsUp className="h-5 w-5" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {strengths.map((strength: string, index: number) => (
                      <p key={index} className="text-sm text-gray-700">
                        {strength.includes(':') ? (
                          <>• <strong>{strength.split(':')[0]}:</strong> {strength.split(':').slice(1).join(':').trim()}</>
                        ) : (
                          <>• {strength}</>
                        )}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {improvements.length > 0 && (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="h-5 w-5" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {improvements.map((improvement: string, index: number) => (
                      <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm text-gray-700">
                          {improvement.includes(':') ? (
                            <>• <strong>{improvement.split(':')[0]}:</strong> {improvement.split(':').slice(1).join(':').trim()}</>
                          ) : (
                            <>• <strong>{improvement}</strong></>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-orange-200">
                    <Button 
                      size="sm"
                      onClick={() => handleGenerateExercises('All Improvement Areas')}
                      disabled={isGeneratingExercise || generateTutorialMutation.isPending}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 text-sm py-2"
                    >
                      {isGeneratingExercise || generateTutorialMutation.isPending ? (
                        <div className="flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Generating Practice Exercise...
                        </div>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Generate Practice Exercise
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Trophy className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Excellent Work!</h3>
                <p className="text-gray-600">
                  You're doing great! Keep up the good work with your practice exercises.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* What's Next Section */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="h-5 w-5 text-blue-600" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`grid gap-4 ${allCorrect ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
              {/* Enhanced Continue Learning section - shows when answers are incorrect */}
              {!allCorrect ? (
                <div className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-orange-900 mb-2 text-lg">Continue Learning</h4>
                      <p className="text-sm text-orange-800 leading-relaxed">
                        You have some incorrect answers. We recommend generating practice exercises with step-by-step tutorials to help you master {exercise?.title || 'these concepts'}. 
                        Our AI-powered tutorials will guide you through each concept with detailed explanations and examples.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Continue Learning</h4>
                    <p className="text-sm text-blue-700">
                      Practice more {exercise?.title || 'topic'} problems to strengthen your understanding.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Conditional Next Challenge - only show if all answers are correct */}
              {allCorrect && (
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <Trophy className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Next Challenge</h4>
                    <p className="text-sm text-green-700">
                      {nextLessonData && nextLessonData.length > 0 
                        ? `Ready for tomorrow: ${nextLessonData[0].lessonTitle}`
                        : "No upcoming lessons scheduled"
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => setLocation('/calendar')} 
                className="flex-1"
                data-testid="button-view-more-assignments"
              >
                View More Assignments
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/calendar')} 
                className="flex-1"
                data-testid="button-calendar"
              >
                Calendar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Issue Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={(open) => {
          setReportDialogOpen(open);
          if (!open) resetReportForm();
        }}>
          <DialogContent className="max-w-md" data-testid="dialog-report-issue">
            <DialogHeader>
              <DialogTitle>Report Issue with Question {currentReportQuestion?.questionIndex + 1}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="report-type">Issue Type *</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger data-testid="select-report-type">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incorrect_grading">Incorrect Grading</SelectItem>
                    <SelectItem value="wrong_answer">Wrong Correct Answer</SelectItem>
                    <SelectItem value="unclear_question">Unclear Question</SelectItem>
                    <SelectItem value="missing_information">Missing Information</SelectItem>
                    <SelectItem value="technical_error">Technical Error</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="report-comments">Detailed Comments *</Label>
                <Textarea
                  id="report-comments"
                  value={reportComments}
                  onChange={(e) => setReportComments(e.target.value)}
                  placeholder="Please provide detailed information about the issue..."
                  className="min-h-[100px]"
                  data-testid="textarea-report-comments"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-medium text-gray-800 mb-1">Question Information:</p>
                <p className="text-gray-600">Your Answer: {currentReportQuestion && finalSubmissionData?.answers?.find((a: any) => a.questionId === currentReportQuestion.questionId)?.answer || 'No answer'}</p>
                <p className="text-gray-600">Points Received: {currentReportQuestion?.points || 0}/{currentReportQuestion?.maxPoints || 0}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setReportDialogOpen(false)}
                data-testid="button-cancel-report"
              >
                Cancel
              </Button>
              <Button 
                onClick={submitReport}
                disabled={reportIssueMutation.isPending || !reportType || !reportComments}
                data-testid="button-submit-report"
              >
                {reportIssueMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
