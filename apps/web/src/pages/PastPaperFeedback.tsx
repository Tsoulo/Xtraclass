import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, ArrowLeft, Trophy, BookOpen, Calendar, Loader2, MessageCircle, Send, ChevronDown, ChevronUp, Maximize2, Minimize2, ThumbsUp, AlertTriangle, Brain, Target } from 'lucide-react';
import MathText from '@/components/MathText';

function formatQuestionNumber(num: number): string {
  if (num >= 100) {
    const main = Math.floor(num / 100);
    const sub = num % 100;
    if (sub === 0) return main.toString();
    return `${main}.${sub}`;
  }
  return num.toString();
}

type QuestionChatState = {
  isOpen: boolean;
  messages: Array<{id: string; type: 'user' | 'ai'; content: string; timestamp: Date}>;
  isLoading: boolean;
  inputValue: string;
  isEnlarged: boolean;
};

export default function PastPaperFeedbackPage() {
  const [, setLocation] = useLocation();
  const [feedbackData, setFeedbackData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionChatStates, setQuestionChatStates] = useState<{[key: string]: QuestionChatState}>({});
  const [isGeneratingExercise, setIsGeneratingExercise] = useState(false);
  const { toast } = useToast();

  // Tutorial exercise generation mutation
  const generateTutorialMutation = useMutation({
    mutationFn: async (weaknessAreas: string[]) => {
      const paper = feedbackData?.paper || {};
      const requestBody = {
        pastPaperId: feedbackData?.paperId,
        topicName: paper.title || 'Past Paper Practice',
        weaknessAreas: weaknessAreas,
        subject: paper.subject || 'mathematics',
        grade: paper.grade || '8'
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
        generatedFrom: 'past-paper-feedback'
      }));
      
      toast({
        title: "Practice Exercise Created!",
        description: "Your personalized practice exercise has been added to the calendar.",
        duration: 3000,
      });
      
      // Invalidate exercise queries
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

  const handleGenerateExercises = async (improvementArea: string) => {
    setIsGeneratingExercise(true);
    try {
      const feedback = feedbackData?.feedback || {};
      const improvements = feedback.areasForImprovement || feedback.improvements || [];
      const weaknessAreas = improvements.length > 0 ? improvements : [improvementArea];
      await generateTutorialMutation.mutateAsync(weaknessAreas);
    } catch (error) {
      console.error('Error in handleGenerateExercises:', error);
    } finally {
      setIsGeneratingExercise(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const storedData = localStorage.getItem('pastPaperFeedback');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        console.log('📊 Loaded pastPaperFeedback data:', parsed);
        setFeedbackData(parsed);
        
        // Initialize chat states for each question
        if (parsed.questions) {
          const newStates: { [key: string]: QuestionChatState } = {};
          parsed.questions.forEach((question: any) => {
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
      } catch (error) {
        console.error('Error parsing feedback data:', error);
      }
    }
    setIsLoading(false);
  }, []);

  // Question-specific chat mutation
  const questionSpecificChatMutation = useMutation({
    mutationFn: async (requestData: any) => {
      return await apiRequest('/api/question-specific-chat', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
    }
  });

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

  const sendQuestionSpecificMessage = async (questionId: string, questionData: any) => {
    const chatState = questionChatStates[questionId];
    const messageText = chatState?.inputValue?.trim();
    
    if (!messageText) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: messageText,
      timestamp: new Date()
    };

    // Add user message and clear input
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
        assessmentType: 'past-paper',
        assessmentId: feedbackData?.paperId?.toString() || '',
        specificQuestion: {
          id: questionId,
          question: questionData.questionText,
          correctAnswer: questionData.correctAnswer || questionData.solutionText || 'See solution',
          studentAnswer: questionData.studentAnswer || 'No answer provided',
          marks: questionData.maxPoints,
          earnedMarks: questionData.pointsEarned,
          isCorrect: questionData.isCorrect,
          feedback: questionData.feedback
        },
        context: {
          subject: feedbackData?.paper?.subject || 'Mathematics',
          topic: feedbackData?.paper?.title || 'Past Paper',
          grade: feedbackData?.paper?.grade || '8'
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
      
      toast({
        title: "Chat Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!feedbackData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">No feedback data found. Please complete a past paper assessment first.</p>
            <Button onClick={() => setLocation('/calendar')} className="mt-4">
              Back to Calendar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paper = feedbackData.paper || {};
  const questions = feedbackData.questions || [];
  const feedback = feedbackData.feedback || {};
  const questionAnalysis = feedback.questionAnalysis || [];
  const studentAnswers = feedbackData.answers || [];
  
  // Calculate score from AI grading and totalMarks from ALL paper questions
  // Score = sum of points from answered questions
  // Total = sum of marks from ALL questions in the paper (answered + unanswered)
  const score = feedbackData.score || questionAnalysis.reduce((sum: number, a: any) => sum + (Number(a.points) || 0), 0);
  const totalMarks = questions.reduce((sum: number, q: any) => sum + (Number(q.marks) || 1), 0);
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  const strengths = feedback.strengths || [];
  const improvements = feedback.areasForImprovement || feedback.improvements || [];

  // Build enhanced question data with student answers and analysis
  // IMPORTANT: Use analysis.points and analysis.maxPoints from AI grading (same as HomeworkFeedback)
  const getQuestionData = (question: any, index: number) => {
    const analysis = questionAnalysis.find((a: any) => a.questionId === question.id) || {};
    const studentAnswerEntry = studentAnswers.find((a: any) => a.questionId === question.id);
    
    // Use grading results (analysis) as primary source for marks - this matches the feedback summary
    const pointsEarned = Number(analysis.points) || 0;
    const maxPoints = Number(analysis.maxPoints) || Number(question.marks) || 1;
    
    return {
      ...question,
      studentAnswer: studentAnswerEntry?.answer || analysis.studentAnswer || '',
      studentImageUrl: studentAnswerEntry?.imageUrl || '',
      correctAnswer: analysis.correctAnswer || question.solutionText || '',
      isCorrect: pointsEarned === maxPoints ? true : analysis.isCorrect || false,
      pointsEarned,
      maxPoints,
      feedback: analysis.feedback || ''
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/calendar')}
            className="hover:bg-white/50"
            data-testid="button-back"
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
              Assessment Completed!
            </CardTitle>
            <p className="text-lg text-gray-600 mb-2">{paper.title || 'Past Paper'}</p>
            
            {/* Paper Details */}
            <div className="flex justify-center gap-4 text-sm text-gray-500 mb-4">
              {paper.subject && (
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span className="capitalize">{paper.subject.replace('-', ' ')}</span>
                </div>
              )}
              {paper.year && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{paper.year}</span>
                </div>
              )}
            </div>
            
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

        {/* Question-by-Question Feedback - Same structure as HomeworkFeedback */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Question Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((question: any, index: number) => {
              // Find grading analysis for this question (if answered)
              const analysis = questionAnalysis.find((a: any) => a.questionId === question.id);
              const studentAnswerEntry = studentAnswers.find((a: any) => a.questionId === question.id);
              const wasAnswered = !!analysis || !!studentAnswerEntry;
              
              // Build question data - use grading results if available, otherwise show as unanswered
              const qData = {
                ...question,
                studentAnswer: studentAnswerEntry?.answer || analysis?.studentAnswer || '',
                studentImageUrl: studentAnswerEntry?.imageUrl || '',
                correctAnswer: analysis?.correctAnswer || question.solutionText || question.answer || '',
                isCorrect: analysis ? (analysis.isCorrect || (Number(analysis.points) === Number(analysis.maxPoints))) : false,
                pointsEarned: analysis ? (Number(analysis.points) || 0) : 0,
                maxPoints: Number(question.marks) || 1,
                feedback: analysis?.feedback || (wasAnswered ? '' : 'This question was not answered.'),
                wasAnswered
              };
              const questionNumber = formatQuestionNumber(question.questionNumber || index + 1);

              return (
                <div 
                  key={question.id || index} 
                  className={`p-4 rounded-lg border-l-4 ${
                    !qData.wasAnswered
                      ? 'bg-gray-50 border-gray-400'
                      : qData.isCorrect 
                        ? 'bg-green-50 border-green-500' 
                        : 'bg-red-50 border-red-500'
                  }`}
                  data-testid={`analysis-card-${question.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">
                      Question {questionNumber}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {qData.pointsEarned}/{qData.maxPoints} marks
                      </span>
                      {!qData.wasAnswered ? (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      ) : qData.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  
                  {/* Display actual question text */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-600 mb-1">Question:</p>
                    <div className="bg-gray-50 p-3 rounded-lg border">
                      <div className="text-gray-800">
                        <MathText>{question.questionText || ''}</MathText>
                      </div>
                      {question.imageUrl && (
                        <img 
                          src={question.imageUrl} 
                          alt="Question image" 
                          className="max-w-full h-auto rounded border border-gray-200 mt-2"
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Your Answer:</p>
                      <div className="space-y-2">
                        {qData.studentAnswer && (
                          <div className={`font-mono text-sm p-2 rounded ${
                            qData.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {qData.studentAnswer}
                          </div>
                        )}
                        {qData.studentImageUrl && (
                          <div className={`p-2 rounded ${qData.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                            <img 
                              src={qData.studentImageUrl} 
                              alt="Your answer" 
                              className="w-full h-auto rounded border border-gray-300 object-contain"
                              style={{ maxHeight: '200px' }}
                            />
                          </div>
                        )}
                        {!qData.studentAnswer && !qData.studentImageUrl && (
                          <div className="font-mono text-sm p-2 rounded bg-gray-100 text-gray-600">
                            No answer provided
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Correct Answer:</p>
                      <div className="font-mono text-sm p-2 rounded bg-blue-100 text-blue-800 whitespace-pre-line">
                        <MathText>{qData.correctAnswer || 'See solution in feedback'}</MathText>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Score:</p>
                      <p className="font-mono text-sm p-2 rounded bg-gray-100 text-gray-800">
                        {qData.pointsEarned} out of {qData.maxPoints} points
                      </p>
                    </div>
                  </div>
                  
                  {qData.feedback && (
                    <p className="text-sm text-gray-700 italic mb-3">{qData.feedback}</p>
                  )}

                  {/* Ask AI Button */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleQuestionChat(question.id.toString())}
                      className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                      data-testid={`button-ask-ai-question-${index + 1}`}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Ask Tsebo
                      {questionChatStates[question.id]?.isOpen ? (
                        <ChevronUp className="w-4 h-4 ml-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </Button>
                  </div>

                  {/* Question-specific Chat Area */}
                  {questionChatStates[question.id]?.isOpen && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <div className="bg-indigo-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium text-indigo-800">
                            Tsebo Help for Question {questionNumber}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-600">
                          Ask me anything about this specific question, your answer, or the feedback!
                        </p>
                      </div>

                      {/* Chat Header with Enlarge Button */}
                      <div className="flex items-center justify-between mb-3">
                        <h6 className="text-sm font-medium text-indigo-700">Question Discussion</h6>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleQuestionChatEnlarge(question.id.toString())}
                          className="text-indigo-500 hover:text-indigo-700 h-6 px-2"
                        >
                          {questionChatStates[question.id]?.isEnlarged ? (
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
                      
                      {/* Messages for this question */}
                      <div className={`bg-gray-50 rounded-lg p-3 overflow-y-auto mb-3 ${
                        questionChatStates[question.id]?.isEnlarged ? 'h-64' : 'h-32'
                      }`}>
                        {questionChatStates[question.id]?.messages.map((msg) => (
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
                              <MathText className="whitespace-pre-wrap">{msg.content}</MathText>
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
                        {questionChatStates[question.id]?.isLoading && (
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
                          placeholder={`Ask about Question ${questionNumber}...`}
                          value={questionChatStates[question.id]?.inputValue || ''}
                          onChange={(e) => updateQuestionChatInput(question.id.toString(), e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !questionChatStates[question.id]?.isLoading) {
                              sendQuestionSpecificMessage(question.id.toString(), qData);
                            }
                          }}
                          disabled={questionChatStates[question.id]?.isLoading}
                          className="flex-1 text-sm"
                        />
                        <Button 
                          onClick={() => sendQuestionSpecificMessage(question.id.toString(), qData)}
                          size="sm"
                          disabled={questionChatStates[question.id]?.isLoading || !questionChatStates[question.id]?.inputValue?.trim()}
                          className="px-3"
                        >
                          {questionChatStates[question.id]?.isLoading ? (
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

        {/* Strengths and Weaknesses Analysis */}
        {(strengths.length > 0 || improvements.length > 0) ? (
          <div className={`grid gap-6 ${strengths.length > 0 && improvements.length > 0 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
            {/* Strengths */}
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

            {/* Areas for Improvement */}
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
                      data-testid="button-generate-exercise"
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
                  You're doing great! Keep up the good work with your assessments.
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
            <div className="grid gap-4 md:grid-cols-1">
              {percentage < 80 ? (
                <div className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-orange-900 mb-2 text-lg">Continue Learning</h4>
                      <p className="text-sm text-orange-800 leading-relaxed">
                        Generate practice exercises with step-by-step tutorials to help you master these concepts. 
                        Our AI-powered tutorials will guide you through each concept with detailed explanations and examples.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <Trophy className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Great Achievement!</h4>
                    <p className="text-sm text-green-700">
                      Excellent score! You've demonstrated strong understanding of this past paper. Try more challenging papers to continue improving.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setLocation('/calendar')}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                data-testid="button-back-to-calendar"
              >
                Back to Calendar
              </Button>
              <Button
                onClick={() => setLocation('/past-papers')}
                variant="outline"
                className="flex-1"
                data-testid="button-more-papers"
              >
                Try More Papers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
