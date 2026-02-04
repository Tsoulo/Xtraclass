import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Brain, 
  Trophy, 
  Target, 
  TrendingUp, 
  CheckCircle2,
  XCircle,
  AlertTriangle, 
  Star, 
  BookOpen,
  Loader2,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  ThumbsUp,
  GraduationCap
} from 'lucide-react';
import MathText from '@/components/MathText';

type QuestionChatState = {
  isOpen: boolean;
  messages: Array<{id: string; type: 'user' | 'ai'; content: string; timestamp: Date}>;
  isLoading: boolean;
  inputValue: string;
  isEnlarged: boolean;
};

interface GradedAnswer {
  questionId: number;
  questionText?: string;
  studentAnswer: string;
  earnedMarks: number;
  maxMarks: number;
  feedback?: string;
  isCorrect?: boolean;
  correctAnswer?: string;
}

interface TopicResult {
  exerciseId: number;
  topicName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  level: string;
  gradedAnswers?: GradedAnswer[];
}

interface FeedbackData {
  assessmentId: number;
  results: TopicResult[];
  overallScore: number;
  overallLevel: string;
  topicsCompleted: number;
  grade?: string;
  subject?: string;
}

function estimateFinalGrade(percentage: number): { grade: string; symbol: string; level: string; color: string } {
  if (percentage >= 80) return { grade: 'A', symbol: '7', level: 'Outstanding', color: 'text-green-600' };
  if (percentage >= 70) return { grade: 'B', symbol: '6', level: 'Meritorious', color: 'text-green-500' };
  if (percentage >= 60) return { grade: 'C', symbol: '5', level: 'Substantial', color: 'text-blue-600' };
  if (percentage >= 50) return { grade: 'D', symbol: '4', level: 'Adequate', color: 'text-yellow-600' };
  if (percentage >= 40) return { grade: 'E', symbol: '3', level: 'Moderate', color: 'text-orange-500' };
  if (percentage >= 30) return { grade: 'F', symbol: '2', level: 'Elementary', color: 'text-red-500' };
  return { grade: 'G', symbol: '1', level: 'Not Achieved', color: 'text-red-700' };
}

export default function BaselineFeedbackPage() {
  const [, setLocation] = useLocation();
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionChatStates, setQuestionChatStates] = useState<{[key: string]: QuestionChatState}>({});
  const [isGeneratingExercise, setIsGeneratingExercise] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const loadData = async () => {
      // Check for attemptId in URL query params (when coming from Settings)
      const urlParams = new URLSearchParams(window.location.search);
      const attemptId = urlParams.get('attemptId');
      
      if (attemptId) {
        // Fetch data from API using attemptId
        try {
          console.log('📊 Fetching baseline results for attemptId:', attemptId);
          const response = await apiRequest(`/api/baseline-assessment/${attemptId}/results`);
          console.log('📊 API response:', response);
          
          if (response) {
            setFeedbackData(response);
            
            const allAnswers = response.results?.flatMap((r: TopicResult) => r.gradedAnswers || []) || [];
            if (allAnswers.length > 0) {
              const newStates: { [key: string]: QuestionChatState } = {};
              allAnswers.forEach((answer: GradedAnswer) => {
                newStates[answer.questionId] = {
                  isOpen: false,
                  messages: [],
                  inputValue: '',
                  isLoading: false,
                  isEnlarged: false
                };
              });
              setQuestionChatStates(newStates);
            }
          }
        } catch (error) {
          console.error('Error fetching baseline results:', error);
        }
      } else {
        // Fall back to localStorage (when coming from assessment completion)
        const storedData = localStorage.getItem('baselineFeedback');
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            console.log('📊 Loaded baselineFeedback from localStorage:', parsed);
            setFeedbackData(parsed);
            
            const allAnswers = parsed.results?.flatMap((r: TopicResult) => r.gradedAnswers || []) || [];
            if (allAnswers.length > 0) {
              const newStates: { [key: string]: QuestionChatState } = {};
              allAnswers.forEach((answer: GradedAnswer) => {
                newStates[answer.questionId] = {
                  isOpen: false,
                  messages: [],
                  inputValue: '',
                  isLoading: false,
                  isEnlarged: false
                };
              });
              setQuestionChatStates(newStates);
            }
          } catch (error) {
            console.error('Error parsing feedback data:', error);
          }
        }
      }
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  const generateTutorialMutation = useMutation({
    mutationFn: async (weaknessAreas: string[]) => {
      const requestBody = {
        baselineAssessmentId: feedbackData?.assessmentId,
        topicName: 'Baseline Assessment Practice',
        weaknessAreas: weaknessAreas,
        subject: feedbackData?.subject || 'mathematics',
        grade: feedbackData?.grade || '8'
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
        generatedFrom: 'baseline-feedback'
      }));
      
      toast({
        title: "Practice Exercise Created!",
        description: "Your personalized practice exercise has been added to the calendar.",
        duration: 3000,
      });
      
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey?.[0];
          return typeof key === 'string' && key.includes('/api/exercises');
        }
      });
      
      setTimeout(() => {
        setLocation('/calendar');
      }, 1000);
    },
    onError: (error: any) => {
      if (error?.status === 429) {
        toast({
          title: "Daily Limit Reached",
          description: "You've reached your daily limit for practice exercise generations. Try again tomorrow!",
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

  const questionSpecificChatMutation = useMutation({
    mutationFn: async (requestData: any) => {
      return await apiRequest('/api/question-specific-chat', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
    }
  });

  const handleGenerateExercises = async (area: string) => {
    setIsGeneratingExercise(true);
    try {
      const needsWork = feedbackData?.results.filter(r => r.level === 'beginner') || [];
      const weaknessAreas = needsWork.length > 0 ? needsWork.map(r => r.topicName) : [area];
      await generateTutorialMutation.mutateAsync(weaknessAreas);
    } catch (error) {
      console.error('Error generating exercises:', error);
    } finally {
      setIsGeneratingExercise(false);
    }
  };

  const toggleQuestionChat = (questionId: string) => {
    setQuestionChatStates(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        isOpen: !prev[questionId]?.isOpen,
        messages: prev[questionId]?.messages || [],
        isLoading: false,
        inputValue: prev[questionId]?.inputValue || '',
        isEnlarged: prev[questionId]?.isEnlarged || false
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

  const sendQuestionSpecificMessage = async (questionId: string, questionData: GradedAnswer) => {
    const chatState = questionChatStates[questionId];
    const messageText = chatState?.inputValue?.trim();
    
    if (!messageText) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: messageText,
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
      const requestData = {
        studentQuestion: messageText,
        assessmentType: 'baseline',
        assessmentId: feedbackData?.assessmentId?.toString() || '',
        specificQuestion: {
          id: questionId,
          question: questionData.questionText || 'Baseline assessment question',
          correctAnswer: questionData.correctAnswer || 'See feedback',
          studentAnswer: questionData.studentAnswer || 'No answer provided',
          marks: questionData.maxMarks,
          earnedMarks: questionData.earnedMarks,
          isCorrect: questionData.isCorrect,
          feedback: questionData.feedback
        },
        context: {
          subject: feedbackData?.subject || 'Mathematics',
          topic: 'Baseline Assessment',
          grade: feedbackData?.grade || '8'
        }
      };
      
      const response = await questionSpecificChatMutation.mutateAsync(requestData);
      
      const aiContent = response.response || response.message || 'No response received';
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: aiContent,
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
      console.error('Error sending question-specific message:', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: `Sorry, I couldn't process your question. Please try again.`,
        timestamp: new Date()
      };

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

  const handleGoToCalendar = () => {
    localStorage.removeItem('baselineFeedback');
    setLocation('/calendar');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-red-50 to-orange-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-orange-600 mx-auto mb-4 animate-spin" />
          <p className="text-lg text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!feedbackData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-red-50 to-orange-100">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Results Found</h2>
            <p className="text-gray-600 mb-4">Please complete a baseline assessment first.</p>
            <Button onClick={() => setLocation('/calendar')}>Go to Calendar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allGradedAnswers = feedbackData.results.flatMap(r => r.gradedAnswers || []);
  const correctCount = allGradedAnswers.filter(a => a.isCorrect).length;
  const incorrectCount = allGradedAnswers.filter(a => !a.isCorrect).length;
  
  const strengths = feedbackData.results.filter(r => r.level === 'advanced');
  const needsWork = feedbackData.results.filter(r => r.level === 'beginner');
  const moderate = feedbackData.results.filter(r => r.level === 'intermediate');

  const gradeEstimate = estimateFinalGrade(feedbackData.overallScore);
  const scorePercentage = feedbackData.overallScore;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-orange-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleGoToCalendar}
            className="hover:bg-white/50"
            data-testid="button-back-calendar"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calendar
          </Button>
        </div>

        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Trophy className="h-16 w-16 text-yellow-500" />
                <div className="absolute -bottom-1 -right-1 bg-orange-500 rounded-full p-1">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
              Baseline Assessment Complete!
            </CardTitle>
            <p className="text-lg text-gray-600 mb-4">
              {feedbackData.subject || 'Mathematics'} - Grade {feedbackData.grade || '8'}
            </p>
            
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600">
                  {correctCount}/{allGradedAnswers.length}
                </div>
                <p className="text-sm text-gray-500">Questions Correct</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-red-600">
                  {scorePercentage}%
                </div>
                <p className="text-sm text-gray-500">Score</p>
              </div>
            </div>

            <div className="flex justify-center">
              <Badge 
                variant={scorePercentage >= 70 ? "default" : scorePercentage >= 40 ? "secondary" : "destructive"}
                className="text-lg px-4 py-2"
              >
                {scorePercentage >= 70 ? "Excellent Work!" : scorePercentage >= 40 ? "Good Effort!" : "Keep Practicing!"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2 text-blue-700">
              <GraduationCap className="h-6 w-6" />
              Report Card - Grade Projection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Current Performance</p>
                <div className={`text-4xl font-bold mb-1 ${gradeEstimate.color}`}>
                  {scorePercentage}%
                </div>
                <p className="text-sm font-medium text-gray-700">Level {gradeEstimate.symbol} - {gradeEstimate.level}</p>
                <p className="text-xs text-gray-500 mt-1">Based on baseline assessment</p>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Projected Final Term</p>
                <div className={`text-4xl font-bold mb-1 ${gradeEstimate.color}`}>
                  {scorePercentage}%
                </div>
                <p className="text-sm font-medium text-gray-700">If you maintain current level</p>
                <p className="text-xs text-gray-500 mt-1">Without additional practice</p>
              </div>
              
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200">
                <p className="text-xs text-green-600 uppercase tracking-wide mb-2">Expected with XtraClass</p>
                <div className="text-4xl font-bold mb-1 text-green-600">
                  {Math.min(100, scorePercentage + 15)}%
                </div>
                <p className="text-sm font-medium text-green-700">
                  Level {scorePercentage + 15 >= 80 ? '7' : scorePercentage + 15 >= 70 ? '6' : scorePercentage + 15 >= 60 ? '5' : scorePercentage + 15 >= 50 ? '4' : scorePercentage + 15 >= 40 ? '3' : '2'}
                </p>
                <p className="text-xs text-green-600 mt-1">With regular practice (+10-20%)</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Your Path to Improvement</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Students who complete daily practice exercises on XtraClass typically improve their marks by 10-20% over the term. 
                    Focus on your weak areas and you could achieve Level {Math.min(7, parseInt(gradeEstimate.symbol) + 2)} by year-end!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Question Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allGradedAnswers.map((answer, index) => {
              const chatState = questionChatStates[answer.questionId];
              
              return (
                <div 
                  key={answer.questionId} 
                  className={`p-4 rounded-lg border-l-4 ${
                    answer.isCorrect 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">
                      Question {index + 1}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {answer.earnedMarks}/{answer.maxMarks} marks
                      </span>
                      {answer.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  
                  {answer.questionText && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-600 mb-1">Question:</p>
                      <div className="bg-gray-50 p-3 rounded-lg border">
                        <MathText>{answer.questionText}</MathText>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Your Answer:</p>
                      <p className={`font-mono text-sm p-2 rounded ${
                        answer.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        <MathText>{answer.studentAnswer || 'No answer provided'}</MathText>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Correct Answer:</p>
                      <p className="font-mono text-sm p-2 rounded bg-blue-100 text-blue-800 whitespace-pre-line">
                        <MathText>{answer.correctAnswer || 'See feedback below'}</MathText>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Score:</p>
                      <p className="font-mono text-sm p-2 rounded bg-gray-100 text-gray-800">
                        {answer.earnedMarks} out of {answer.maxMarks} points
                      </p>
                    </div>
                  </div>
                  
                  {answer.feedback && (
                    <p className="text-sm text-gray-700 italic mb-3">
                      <MathText>{answer.feedback}</MathText>
                    </p>
                  )}
                  
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleQuestionChat(String(answer.questionId))}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      data-testid={`button-ask-ai-question-${index + 1}`}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Ask Tsebo
                      {chatState?.isOpen ? (
                        <ChevronUp className="w-4 h-4 ml-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </Button>
                  </div>

                  {chatState?.isOpen && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <div className="bg-orange-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">
                            Tsebo Help for Question {index + 1}
                          </span>
                        </div>
                        <p className="text-xs text-orange-600">
                          Ask me anything about this question, your answer, or the feedback!
                        </p>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <h6 className="text-sm font-medium text-orange-700">Question Discussion</h6>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleQuestionChatEnlarge(String(answer.questionId))}
                          className="text-orange-500 hover:text-orange-700 h-6 px-2"
                        >
                          {chatState?.isEnlarged ? (
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
                        chatState?.isEnlarged ? 'h-64' : 'h-32'
                      }`}>
                        {chatState?.messages?.map((msg) => (
                          <div key={msg.id} className={`flex items-start gap-2 mb-3 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                            {msg.type === 'ai' && (
                              <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center">
                                <MessageCircle className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className={`rounded-lg p-2 max-w-xs text-xs ${
                              msg.type === 'user' 
                                ? 'bg-orange-600 text-white ml-auto' 
                                : 'bg-white text-gray-700 shadow-sm'
                            }`}>
                              <MathText>{msg.content}</MathText>
                              <p className={`text-xs mt-1 ${msg.type === 'user' ? 'text-orange-100' : 'text-gray-500'}`}>
                                {msg.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                            {msg.type === 'user' && (
                              <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">Y</span>
                              </div>
                            )}
                          </div>
                        ))}
                        {chatState?.isLoading && (
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Thinking...
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          value={chatState?.inputValue || ''}
                          onChange={(e) => updateQuestionChatInput(String(answer.questionId), e.target.value)}
                          placeholder="Ask a question about this problem..."
                          className="text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendQuestionSpecificMessage(String(answer.questionId), answer);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => sendQuestionSpecificMessage(String(answer.questionId), answer)}
                          disabled={chatState?.isLoading}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {strengths.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <ThumbsUp className="h-5 w-5" />
                Your Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {strengths.map((topic, idx) => (
                  <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <Star className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span><strong>{topic.topicName}:</strong> {topic.percentage}% - Great understanding!</span>
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {needsWork.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {needsWork.map((topic, idx) => (
                  <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-gray-700">
                      • <strong>{topic.topicName}:</strong> {topic.percentage}% - Focus on practicing this topic to improve your score.
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

        {moderate.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <TrendingUp className="h-5 w-5" />
                Making Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {moderate.map((topic, idx) => (
                  <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-gray-700">
                      • <strong>{topic.topicName}:</strong> {topic.percentage}% - You're on the right track!
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center gap-4">
          <Button
            onClick={handleGoToCalendar}
            variant="outline"
            size="lg"
            data-testid="button-continue-calendar"
          >
            Continue to Calendar
          </Button>
        </div>
      </div>
    </div>
  );
}
