import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import MathText from '@/components/MathText';
import { CheckCircle2, XCircle, ArrowLeft, Trophy, Target, BookOpen, ThumbsUp, AlertTriangle, Brain, MessageCircle, Send, Mic, ChevronDown, ChevronUp, Maximize2, Minimize2, Flag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function HomeworkFeedbackPage() {
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
  const isGeneratingRef = useRef(false);
  
  // Question-specific chat states type
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

  // Report Issue state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [currentReportQuestion, setCurrentReportQuestion] = useState<any>(null);
  const [reportType, setReportType] = useState('');
  const [reportComments, setReportComments] = useState('');

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Auto-scroll chat to bottom when new messages are added
  useEffect(() => {
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  // Get feedback data from localStorage (submission response from API)
  // Check both 'homeworkFeedback' (from homework completion flow) and 'completedHomework' (from completed assignments view)
  const homeworkFeedbackData = localStorage.getItem('homeworkFeedback');
  const completedHomeworkData = localStorage.getItem('completedHomework');
  
  let submissionData = {};
  if (homeworkFeedbackData) {
    submissionData = JSON.parse(homeworkFeedbackData);
  } else if (completedHomeworkData) {
    // If viewing a completed homework, transform the data to match expected format
    const homeworkData = JSON.parse(completedHomeworkData);
    submissionData = {
      homework: homeworkData,
      id: homeworkData.id,
      feedback: homeworkData.feedback || {},
      answers: homeworkData.answers || [],
      score: homeworkData.score || 0,
      totalMarks: homeworkData.totalMarks || 25
    };
  }
  console.log('Submission data from localStorage:', submissionData);

  // If this is a completed homework from the assignments list, fetch the actual submission data
  const { data: homeworkSubmissionData } = useQuery({
    queryKey: ['/api/homework', submissionData.id, 'submission'],
    queryFn: () => apiRequest(`/api/homework/${submissionData.id}/submission`),
    enabled: !!submissionData.id && !!completedHomeworkData && !homeworkFeedbackData,
    retry: false,
  });

  // Merge submission data if available
  if (homeworkSubmissionData && completedHomeworkData) {
    submissionData = {
      ...submissionData,
      feedback: homeworkSubmissionData.feedback || {},
      answers: homeworkSubmissionData.answers || [],
      score: homeworkSubmissionData.score || 0,
      totalMarks: homeworkSubmissionData.totalMarks || 25,
      homeworkId: homeworkSubmissionData.homeworkId || submissionData.id
    };
  }
  
  // Check if we have the homework ID, either from submissionData or directly from localStorage
  const homeworkId = submissionData.homeworkId || submissionData.id;
  console.log('🔍 Looking for homework ID:', homeworkId);
  
  // Fetch actual submission data from database to get real student answers and feedback
  const { data: actualSubmissionData } = useQuery({
    queryKey: [`/api/homework/${homeworkId}/submission`],
    enabled: !!homeworkId,
  });
  
  // Fetch homework details to get the actual questions
  const { data: homeworkData } = useQuery({
    queryKey: ['/api/homework'],
    enabled: !!homeworkId,
  });
  
  // Find the specific homework from the list
  const homework = homeworkData?.find((hw: any) => hw.id == homeworkId);
  
  // Fetch student profile to get their grade level
  const { data: userProfile } = useQuery({
    queryKey: ['/api/user/profile'],
  });
  
  // Get student's grade level from profile (API returns 'grade' field, not 'gradeLevel')
  const studentGradeLevel = userProfile?.grade || homework?.grade || '8';
  
  // Use actual submission data if available (this contains the real feedback and analysis)
  const finalSubmissionData = actualSubmissionData || submissionData;
  console.log('Final submission data being used:', finalSubmissionData);
  console.log('🔍 actualSubmissionData from API:', actualSubmissionData);

  // Check if all answers are correct for conditional challenge display
  const areAllAnswersCorrect = () => {
    // First check: if score equals total marks, all answers are correct
    if (finalSubmissionData.score && finalSubmissionData.totalMarks) {
      return finalSubmissionData.score === finalSubmissionData.totalMarks;
    }
    
    // Fallback check: examine individual answers if available
    if (finalSubmissionData.answers && homework?.questions) {
      const correctAnswers = finalSubmissionData.answers.filter((answer: any) => answer.isCorrect);
      return correctAnswers.length === homework.questions.length;
    }
    
    return false;
  };

  const allCorrect = areAllAnswersCorrect();
  console.log('🔍 Are all answers correct?', allCorrect, 'Score:', finalSubmissionData.score, 'Total:', finalSubmissionData.totalMarks);

  // Get next day's date for lesson fetching
  const getNextDay = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  };

  // Fetch next lesson if all answers are correct
  const { data: nextLessonData } = useQuery({
    queryKey: ['/api/syllabus-calendar', 'next-lesson', getNextDay(), homework?.grade, homework?.subject],
    queryFn: () => apiRequest(`/api/syllabus-calendar?date=${getNextDay()}&grade=${homework?.grade}&subject=${homework?.subject}`),
    enabled: allCorrect && !!homework?.grade && !!homework?.subject,
    retry: false,
  });

  console.log('🔍 Next lesson data:', nextLessonData);

  // Initialize question chat states when homework data is available
  useEffect(() => {
    if (homework?.questions && Object.keys(questionChatStates).length === 0) {
      console.log('🔧 Initializing question chat states for', homework.questions.length, 'questions');
      const newStates: { [key: string]: QuestionChatState } = {};
      homework.questions.forEach((question: any) => {
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
  }, [homework?.questions, questionChatStates]);
  
  // Get actual marks from submission data (AI has already calculated the correct score)
  const calculateActualMarks = () => {
    return { 
      earned: finalSubmissionData.score || 0, 
      possible: finalSubmissionData.totalMarks || 0 
    };
  };
  
  const actualMarks = calculateActualMarks();
  console.log('Calculated marks:', actualMarks, 'from submission:', finalSubmissionData.score, finalSubmissionData.totalMarks);
  
  // Use submission data directly since it contains the homework info
  const feedbackData = {
    title: finalSubmissionData.isExercise 
      ? (finalSubmissionData.exercise?.title || 'Exercise') 
      : (homework?.title || finalSubmissionData.homework?.title || 'Homework Assignment'),
    score: actualMarks.earned,
    totalMarks: actualMarks.possible,
    totalQuestions: homework?.questions?.length || finalSubmissionData.answers?.length || 0,
    ...finalSubmissionData.feedback
  };

  // Tutorial exercise generation mutation
  const generateTutorialMutation = useMutation({
    mutationFn: async (weaknessAreas: string[]) => {
      const requestBody = submissionData.isExercise ? {
        // For exercises, use exercise data
        exerciseId: submissionData.exerciseId,
        topicName: submissionData.exercise?.title || 'Mathematics Practice',
        weaknessAreas: weaknessAreas,
        subject: submissionData.exercise?.subject || 'mathematics',
        grade: submissionData.exercise?.grade || studentGradeLevel
      } : {
        // For homework, use homework data and student's actual grade level
        homeworkId: submissionData.homeworkId || homework?.id,
        topicName: homework?.topic || 'Algebra',
        weaknessAreas: weaknessAreas,
        subject: homework?.subject || 'mathematics',
        grade: studentGradeLevel
      };
      
      console.log('🔄 Sending tutorial exercise request:', requestBody);
      console.log('🔍 Available submissionData:', { 
        homeworkId: submissionData.homeworkId, 
        id: submissionData.id,
        keys: Object.keys(submissionData)
      });
      console.log('🔍 Available homework:', homework);
      
      return await apiRequest('/api/generate-tutorial-exercise', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
    },
    onSuccess: async (data) => {
      console.log('✅ Tutorial and exercise generated successfully:', data);
      
      // Store tutorial and exercise data for the flow
      localStorage.setItem('tutorialFlowData', JSON.stringify({
        tutorial: data.tutorial,
        exercise: data.exercise,
        generatedFrom: 'homework-feedback'
      }));
      
      toast({
        title: "Practice Exercise Created!",
        description: "Your personalized practice exercise has been added to the calendar. Check today's exercises.",
        duration: 3000,
      });
      
      // Comprehensive cache invalidation to ensure new exercise appears immediately
      console.log('Exercise generated, starting comprehensive cache invalidation...');
      
      // Method 1: Invalidate by predicate
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey?.[0];
          const shouldInvalidate = typeof key === 'string' && (
            key.includes('/api/exercises') || 
            key === '/api/student/daily-exercise-generations'
          );
          if (shouldInvalidate) {
            console.log('Invalidating query:', query.queryKey);
          }
          return shouldInvalidate;
        }
      });
      
      // Method 2: Target the specific calendar query pattern 
      const today = new Date().toISOString().split('T')[0];
      const userGrade = localStorage.getItem('userGrade') || '8';
      const specificQueryKey = `/api/exercises?date=${today}&grade=${userGrade}`;
      console.log('Invalidating specific query:', specificQueryKey);
      await queryClient.invalidateQueries({ queryKey: [specificQueryKey] });
      
      // Method 3: Force refetch all exercise queries
      await queryClient.refetchQueries({ 
        predicate: (query) => {
          const key = query.queryKey?.[0];
          return typeof key === 'string' && key.includes('/api/exercises');
        }
      });
      
      // Method 4: Remove all exercise queries from cache and force fresh fetch
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey?.[0];
          return typeof key === 'string' && key.includes('/api/exercises');
        }
      });
      
      // Navigate back to calendar instead of tutorial flow
      setTimeout(() => {
        setLocation('/calendar');
      }, 1000);
    },
    onError: (error: any) => {
      console.error('Error generating tutorial exercise:', error);
      
      // Check if it's a rate limit error (HTTP 429)
      if (error?.status === 429 || error?.data?.message?.includes('Daily limit')) {
        const limit = error?.data?.limit || 5;
        const current = error?.data?.current || limit;
        
        toast({
          title: "Daily Limit Reached",
          description: `You've used ${current} of ${limit} practice exercise generations for today. The limit resets at midnight. Keep practicing with your existing exercises!`,
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
    // Ref-based guard to prevent double-clicks (ref updates are synchronous)
    if (isGeneratingRef.current) {
      console.log('🚫 Already generating exercise - ignoring duplicate click');
      return;
    }
    
    // Set ref immediately (synchronous) before async operations
    isGeneratingRef.current = true;
    setIsGeneratingExercise(true);
    
    try {
      // Extract weakness areas from the improvements array
      const weaknessAreas = improvements.length > 0 ? improvements : [improvementArea];
      
      await generateTutorialMutation.mutateAsync(weaknessAreas);
    } catch (error) {
      console.error('Error in handleGenerateExercises:', error);
    } finally {
      isGeneratingRef.current = false;
      setIsGeneratingExercise(false);
    }
  };

  // Assessment chat mutation
  const assessmentChatMutation = useMutation({
    mutationFn: async (question: string) => {
      const requestBody = {
        studentQuestion: question,
        assessmentType: submissionData.isExercise ? 'exercise' : 'homework',
        assessmentId: submissionData.isExercise ? submissionData.exerciseId : submissionData.homeworkId,
        questions: homework?.questions?.map((q: any) => {
          const studentAnswer = submissionData.answers?.find((a: any) => a.questionId === q.id.toString());
          return {
            id: q.id.toString(),
            question: q.question,
            correctAnswer: q.answer,
            studentAnswer: studentAnswer?.answer || '',
            marks: q.marks,
            earnedMarks: studentAnswer?.earnedMarks || 0,
            isCorrect: studentAnswer?.isCorrect || false
          };
        }) || [],
        feedback: {
          strengths: submissionData.feedback?.strengths || [],
          improvements: submissionData.feedback?.improvements || [],
          overallScore: submissionData.score || 0,
          totalMarks: submissionData.totalMarks || 0,
          percentage: submissionData.score && submissionData.totalMarks 
            ? Math.round((submissionData.score / submissionData.totalMarks) * 100) 
            : 0
        }
      };

      return await apiRequest('/api/assessment-chat', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
    }
  });

  // Question-specific chat mutation (simple version for the new approach)
  const questionSpecificChatMutation = useMutation({
    mutationFn: async (requestData: any) => {
      return await apiRequest('/api/question-specific-chat', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
    }
  });

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
        description: "AI has answered your question about the assessment",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error sending chat message:', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: "I'm sorry, I couldn't process your question right now. Please try again later.",
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, errorMessage]);
      
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
    // Toggle recording state - no implementation yet
    setIsRecording(!isRecording);
  };

  // Report Issue functionality
  const reportIssueMutation = useMutation({
    mutationFn: async (reportData: any) => {
      return await apiRequest('/api/question-reports', {
        method: 'POST',
        body: JSON.stringify(reportData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Your question report has been submitted for review. Thank you for your feedback!",
        variant: "default",
      });
      setReportDialogOpen(false);
      resetReportForm();
    },
    onError: (error) => {
      console.error('Error submitting report:', error);
      toast({
        title: "Report Failed",
        description: "Failed to submit your report. Please try again.",
        variant: "destructive",
      });
    }
  });

  const openReportDialog = (question: any, questionIndex: number) => {
    setCurrentReportQuestion({ ...question, questionIndex });
    setReportDialogOpen(true);
  };

  const resetReportForm = () => {
    setReportType('');
    setReportComments('');
    setCurrentReportQuestion(null);
  };

  const submitReport = () => {
    if (!reportType || !reportComments || !currentReportQuestion) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const studentAnswer = finalSubmissionData?.answers?.find((a: any) => a.questionId === currentReportQuestion.questionId);

    // Convert reportType to a readable title
    const reportTypeToTitle = {
      'incorrect_grading': 'Incorrect Grading',
      'wrong_answer': 'Wrong Correct Answer',
      'unclear_question': 'Unclear Question',
      'missing_information': 'Missing Information',
      'technical_error': 'Technical Error',
      'other': 'Other Issue'
    };

    const reportData = {
      homeworkId: homeworkId,
      exerciseId: finalSubmissionData.isExercise ? finalSubmissionData.exercise?.id : null,
      questionId: currentReportQuestion.questionId,
      questionNumber: currentReportQuestion.questionIndex + 1,
      topicId: homework?.topicId || null,
      themeId: homework?.themeId || null,
      reportType: reportType,
      title: reportTypeToTitle[reportType] || reportType,
      comments: reportComments,
      studentAnswer: studentAnswer?.answer || null,
      expectedScore: currentReportQuestion.maxPoints,
      actualScore: currentReportQuestion.points
    };

    reportIssueMutation.mutate(reportData);
  };

  // Question-specific chat handlers
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
        isEnlarged: !prev[questionId]?.isEnlarged,
        isOpen: prev[questionId]?.isOpen || false,
        messages: prev[questionId]?.messages || [],
        isLoading: false,
        inputValue: prev[questionId]?.inputValue || ''
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
        isLoading: false,
        isEnlarged: prev[questionId]?.isEnlarged || false
      }
    }));
  };

  const sendQuestionSpecificMessage = async (questionId: string, questionData: any) => {
    const chatState = questionChatStates[questionId];
    const messageText = chatState?.inputValue?.trim();
    
    if (!messageText) return;

    console.log('🔍 Question data for chat:', questionData);
    console.log('🔍 Final submission data:', finalSubmissionData);
    console.log('🔍 Homework data:', homework);

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
      // Find the student's answer for this question
      const studentAnswer = finalSubmissionData?.answers?.find((a: any) => a.questionId === questionData.questionId);
      
      // Build proper request data matching the backend API expectations
      const requestData = {
        studentQuestion: messageText,
        assessmentType: 'homework',
        assessmentId: homeworkId.toString(),
        specificQuestion: {
          id: questionData.questionId,
          question: questionData.question,
          correctAnswer: questionData.correctAnswer,
          studentAnswer: studentAnswer?.answer || 'No answer provided',
          imageUrl: studentAnswer?.imageUrl, // Include student's submitted image if available
          marks: questionData.maxPoints,
          earnedMarks: questionData.points,
          isCorrect: questionData.isCorrect,
          feedback: questionData.feedback
        },
        context: {
          subject: homework?.subject || 'Mathematics',
          topic: homework?.topic || 'General Math',
          grade: '8'
        }
      };
      
      console.log('🔍 Sending request data:', requestData);
      
      const response = await questionSpecificChatMutation.mutateAsync(requestData);
      
      console.log('🔍 Full API response:', response);
      console.log('🔍 Response fields:', Object.keys(response));
      
      // Extract the actual AI response content
      const aiContent = response.response || response.message || response.data?.response || 'No response received';
      console.log('🔍 Extracted AI content:', aiContent);
      
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
      console.error('🚨 Full error details:', JSON.stringify(error, null, 2));
      console.error('🚨 Error message:', error instanceof Error ? error.message : 'Unknown error');
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`,
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

  if (!finalSubmissionData.id && !finalSubmissionData.homework) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">No feedback data found. Please complete a homework assignment first.</p>
            <Button onClick={() => setLocation('/calendar')} className="mt-4">
              Back to Calendar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scorePercentage = feedbackData.totalMarks > 0 
    ? Math.round((feedbackData.score / feedbackData.totalMarks) * 100) 
    : 0;

  // Generate proper feedback structure using real AI data
  const detailedFeedback = (() => {
    console.log('🔍 Building detailedFeedback from finalSubmissionData:', {
      hasQuestionAnalysis: !!finalSubmissionData.feedback?.questionAnalysis,
      questionAnalysisLength: finalSubmissionData.feedback?.questionAnalysis?.length,
      questionAnalysis: finalSubmissionData.feedback?.questionAnalysis,
      hasAnswers: !!finalSubmissionData.answers,
      answersLength: finalSubmissionData.answers?.length,
      hasHomework: !!homework,
      homeworkQuestionsLength: homework?.questions?.length
    });

    // Use AI-generated questionAnalysis from submission data if available and not empty
    if (finalSubmissionData.feedback?.questionAnalysis && Array.isArray(finalSubmissionData.feedback.questionAnalysis) && finalSubmissionData.feedback.questionAnalysis.length > 0) {
      console.log('✅ Using AI-generated questionAnalysis');
      return finalSubmissionData.feedback.questionAnalysis.map((aiAnalysis: any) => ({
        questionId: aiAnalysis.questionId,
        questionNumber: parseInt(aiAnalysis.questionId) || 1,
        question: aiAnalysis.question || `Question ${aiAnalysis.questionId}`,
        correctAnswer: aiAnalysis.correctAnswer || 'See feedback below',
        // Consider correct if got full marks, regardless of AI's isCorrect claim
        isCorrect: (aiAnalysis.points || aiAnalysis.score || 0) === (aiAnalysis.maxPoints || aiAnalysis.maxScore || 5) ? true : aiAnalysis.isCorrect,
        points: aiAnalysis.points || aiAnalysis.score || 0,
        maxPoints: aiAnalysis.maxPoints || aiAnalysis.maxScore || 5,
        feedback: aiAnalysis.feedback || 'No feedback available'
      }));
    }
    
    // Fallback for exercises with missing AI analysis
    if (finalSubmissionData.isExercise && finalSubmissionData.exercise?.questions) {
      return finalSubmissionData.exercise.questions.map((exerciseQuestion: any, index: number) => {
        const studentAnswer = finalSubmissionData.answers?.find((a: any) => a.questionId === exerciseQuestion.id);
        const isCorrect = studentAnswer?.answer === exerciseQuestion.answer;
        
        return {
          questionId: exerciseQuestion.id,
          questionNumber: index + 1,
          question: exerciseQuestion.question,
          correctAnswer: exerciseQuestion.answer,
          isCorrect: isCorrect,
          points: isCorrect ? exerciseQuestion.marks : 0,
          maxPoints: exerciseQuestion.marks,
          feedback: isCorrect 
            ? "Excellent work! Your answer is correct." 
            : "This answer needs some work. Review the concept and try again."
        };
      });
    } 
    
    // Alternative approach: Check if there's stored feedback data with detailed analysis
    if (finalSubmissionData.detailedFeedback && Array.isArray(finalSubmissionData.detailedFeedback) && finalSubmissionData.detailedFeedback.length > 0) {
      console.log('✅ Using stored detailedFeedback from submission');
      return finalSubmissionData.detailedFeedback;
    }

    // Primary fallback: Build from homework questions and student answers when AI feedback is missing
    if (homework?.questions && finalSubmissionData.answers) {
      console.log('📝 Building question feedback from homework questions and student answers (AI analysis missing)');
      console.log('🔍 Homework questions:', homework.questions);
      console.log('🔍 Student answers:', finalSubmissionData.answers);
      
      return homework.questions.map((hwQuestion: any, index: number) => {
        // Find corresponding student answer using various ID matching strategies
        const studentAnswer = finalSubmissionData.answers.find((ans: any) => 
          ans.questionId === hwQuestion.id.toString() || 
          ans.questionId === `generated_${hwQuestion.id}` ||
          ans.questionId === `generated_${finalSubmissionData.homeworkId}_${index}` ||
          ans.questionId === `${index + 1}` ||
          ans.questionId === hwQuestion.id
        );
        
        console.log(`🔍 Question ${index + 1} - hwQuestion.id: ${hwQuestion.id}, found answer:`, studentAnswer);
        
        // Simple scoring logic: exact match with correct answer
        const studentAnswerValue = studentAnswer?.answer || '';
        const correctAnswer = hwQuestion.correctAnswer || hwQuestion.answer || '';
        const isCorrect = studentAnswerValue.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        const maxPoints = hwQuestion.points || hwQuestion.marks || 5;
        const points = isCorrect ? maxPoints : 0;
        
        return {
          questionId: hwQuestion.id.toString(),
          questionNumber: index + 1,
          question: hwQuestion.question,
          correctAnswer: correctAnswer,
          isCorrect: isCorrect,
          points: points,
          maxPoints: maxPoints,
          feedback: isCorrect 
            ? "Correct! Well done on this question." 
            : `Incorrect. Your answer "${studentAnswerValue}" doesn't match the expected answer "${correctAnswer}". Please review the solution steps.`
        };
      });
    }
    
    // Last resort: Create basic feedback from student answers only
    if (finalSubmissionData.answers && Array.isArray(finalSubmissionData.answers)) {
      console.log('📝 Creating basic question feedback from student answers only (no homework data available)');
      return finalSubmissionData.answers.map((answer: any, index: number) => ({
        questionId: answer.questionId || `question_${index + 1}`,
        questionNumber: index + 1,
        question: `Question ${index + 1}`,
        correctAnswer: 'See feedback for correct approach',
        isCorrect: false, // Default to incorrect since we don't have correct answers
        points: 0,
        maxPoints: 5,
        feedback: `Your answer: "${answer.answer}". Please review this question and try again.`
      }));
    }
    
    return [];
  })();

  // Calculate strengths and weaknesses
  const correctAnswers = detailedFeedback.filter(q => q.isCorrect);
  const incorrectAnswers = detailedFeedback.filter(q => !q.isCorrect);
  
  // Use real AI-generated strengths and improvements, but filter out generic "no strengths" messages
  const rawStrengths = finalSubmissionData.feedback?.strengths || [];
  const strengths = rawStrengths.filter(strength => 
    !strength.toLowerCase().includes('no strengths to highlight') &&
    !strength.toLowerCase().includes('focus on improvement areas below')
  );
  const improvements = finalSubmissionData.feedback?.improvements || [];
  
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
              {finalSubmissionData.isExercise ? 'Exercise Completed!' : 'Homework Completed!'}
            </CardTitle>
            <p className="text-lg text-gray-600 mb-4">{feedbackData.title}</p>
            
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
            {detailedFeedback.map((question, index) => {
              // Find the corresponding student answer with fallback logic
              const studentAnswer = (() => {
                // First try exact question ID match
                let answer = finalSubmissionData.answers?.find(a => a.questionId === question.questionId);
                
                // If not found, try simple numeric ID as fallback
                if (!answer) {
                  const questionIndex = detailedFeedback.indexOf(question);
                  answer = finalSubmissionData.answers?.find(a => a.questionId === (questionIndex + 1).toString());
                }
                
                return answer?.answer || 'No answer provided';
              })();
              
              return (
                <div 
                  key={question.questionId || index} 
                  className={`p-4 rounded-lg border-l-4 ${
                    question.isCorrect 
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
                        {Number(question.points) || 0}/{Number(question.maxPoints) || 0} marks
                      </span>
                      {question.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                  
                  {/* Display actual question text */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-600 mb-1">Question:</p>
                    {(() => {
                      let questionText, questionImage;
                      if (finalSubmissionData.isExercise) {
                        // For exercises, use exercise questions
                        const exerciseQuestion = finalSubmissionData.exercise?.questions?.find(q => q.id === question.questionId) ||
                                                 finalSubmissionData.exercise?.questions?.[index];
                        questionText = exerciseQuestion?.question || question.question || `Exercise Question ${index + 1}`;
                        questionImage = exerciseQuestion?.imageUrl;
                      } else {
                        // For homework, first try to find by questionId
                        const hwQuestion = homework?.questions?.find(q => q.id === question.questionId) ||
                                         homework?.questions?.[index];
                        questionText = hwQuestion?.question || `Question ${index + 1}`;
                        questionImage = hwQuestion?.imageUrl;
                      }
                      
                      return (
                        <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                          {questionText && !questionText.match(/^(Question|Exercise Question) \d+$/) && (
                            <p className="text-gray-800">{questionText}</p>
                          )}
                          {questionImage && (
                            <img 
                              src={questionImage} 
                              alt="Question image" 
                              className="max-w-full h-auto rounded border border-gray-200"
                            />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Your Answer:</p>
                      {(() => {
                        // First try to find by exact question ID match
                        let answer = finalSubmissionData?.answers?.find((a: any) => 
                          a.questionId === question.questionId
                        );
                        
                        // If not found, try simple numeric ID as fallback
                        if (!answer) {
                          const questionIndex = detailedFeedback.indexOf(question);
                          answer = finalSubmissionData?.answers?.find((a: any) => 
                            a.questionId === (questionIndex + 1).toString()
                          );
                        }
                        
                        return (
                          <div className="space-y-2">
                            {answer?.answer && (
                              <p className={`font-mono text-sm p-2 rounded ${
                                question.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {answer.answer}
                              </p>
                            )}
                            {answer?.imageUrl && (
                              <div className={`p-2 rounded ${
                                question.isCorrect ? 'bg-green-50' : 'bg-red-50'
                              }`}>
                                <img 
                                  src={answer.imageUrl} 
                                  alt="Student's answer" 
                                  className="w-full h-auto rounded border border-gray-300 object-contain"
                                  style={{ maxHeight: '300px', width: '100%' }}
                                />
                              </div>
                            )}
                            {!answer?.answer && !answer?.imageUrl && (
                              <p className={`font-mono text-sm p-2 rounded ${
                                question.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                No answer provided
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Correct Answer:</p>
                      <p className="font-mono text-sm p-2 rounded bg-blue-100 text-blue-800 whitespace-pre-line">
                        {(() => {
                          if (finalSubmissionData.isExercise) {
                            // For exercises, use exercise question answer
                            const exerciseQuestion = finalSubmissionData.exercise?.questions?.find(q => q.id === question.questionId) ||
                                                     finalSubmissionData.exercise?.questions?.[index];
                            return exerciseQuestion?.answer || question.correctAnswer || 'See solution steps in feedback below';
                          } else {
                            // For homework, use homework question correct answer
                            return homework?.questions?.find(q => q.id === question.questionId)?.correctAnswer || 
                                   question.correctAnswer || 
                                   'See solution steps in feedback below';
                          }
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Score:</p>
                      <p className="font-mono text-sm p-2 rounded bg-gray-100 text-gray-800">
                        {Number(question.points) || 0} out of {Number(question.maxPoints) || 0} points
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 italic mb-3">{question.feedback}</p>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-between items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReportDialog(question, index)}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50 flex-shrink-0"
                      data-testid={`button-report-question-${index + 1}`}
                    >
                      <Flag className="w-4 h-4 mr-1" />
                      Report Issue
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleQuestionChat(question.questionId)}
                      className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                      data-testid={`button-ask-ai-question-${index + 1}`}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Ask Tsebo
                      {questionChatStates[question.questionId]?.isOpen ? (
                        <ChevronUp className="w-4 h-4 ml-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-1" />
                      )}
                    </Button>
                  </div>

                  {/* Question-specific Chat Area */}
                  {questionChatStates[question.questionId]?.isOpen && (
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

                      {/* Chat Header with Enlarge Button */}
                      <div className="flex items-center justify-between mb-3">
                        <h6 className="text-sm font-medium text-indigo-700">Question Discussion</h6>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleQuestionChatEnlarge(question.questionId)}
                          className="text-indigo-500 hover:text-indigo-700 h-6 px-2"
                        >
                          {questionChatStates[question.questionId]?.isEnlarged ? (
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
                        questionChatStates[question.questionId]?.isEnlarged ? 'h-64' : 'h-32'
                      }`}>
                        {questionChatStates[question.questionId]?.messages.map((msg) => (
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
                        {questionChatStates[question.questionId]?.isLoading && (
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
                          value={questionChatStates[question.questionId]?.inputValue || ''}
                          onChange={(e) => updateQuestionChatInput(question.questionId, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !questionChatStates[question.questionId]?.isLoading) {
                              sendQuestionSpecificMessage(question.questionId, question);
                            }
                          }}
                          disabled={questionChatStates[question.questionId]?.isLoading}
                          className="flex-1 text-sm"
                        />
                        <Button 
                          onClick={() => sendQuestionSpecificMessage(question.questionId, question)}
                          size="sm"
                          disabled={questionChatStates[question.questionId]?.isLoading || !questionChatStates[question.questionId]?.inputValue?.trim()}
                          className="px-3"
                        >
                          {questionChatStates[question.questionId]?.isLoading ? (
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Learning Assistant</h3>
                  <p className="text-sm text-gray-600">Ask questions about your homework or record voice messages</p>
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
            {/* Chat Area */}
            <div className={`bg-gray-50 rounded-lg p-4 overflow-y-auto ${
              mainChatEnlarged ? 'h-96' : 'h-48'
            }`} id="chat-messages">
              {/* Welcome Message */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-sm text-gray-700">
                    Hi! I'm here to help you understand your homework feedback. Feel free to ask me any questions about:
                  </p>
                  <ul className="text-xs text-gray-600 mt-2 list-disc list-inside">
                    <li>The questions you got wrong</li>
                    <li>Polynomial concepts you're struggling with</li>
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
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask me about your homework..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isChatLoading) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isChatLoading}
                className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                rows={2}
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
            {/* Strengths - Only show if there are actual strengths */}
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
                    {strengths.map((strength, index) => (
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
                    {improvements.map((improvement, index) => (
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
                  You're doing great! Keep up the good work with your homework.
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
                        You have some incorrect answers. We recommend generating practice exercises with step-by-step tutorials to help you master {homework?.topic || 'these concepts'}. 
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
                      Practice more {homework?.topic || 'topic'} problems to strengthen your understanding.
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
              <Button onClick={() => setLocation('/calendar')} className="flex-1">
                View More Assignments
              </Button>
              <Button variant="outline" onClick={() => setLocation('/calendar')} className="flex-1">
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