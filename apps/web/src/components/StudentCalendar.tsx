import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  ArrowRight, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Send,
  Timer,
  Award,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Play
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ShortsVideoPlayer from "@/components/ShortsVideoPlayer";
import { buildApiUrl } from "@/lib/api";

interface HomeworkQuestion {
  id: string;
  question: string;
  type: 'equation' | 'system' | 'expression' | 'word-problem';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  correctAnswer?: string;
  userAnswer?: string;
}

interface Homework {
  id: string;
  classId: string;
  className: string;
  subject: string;
  title: string;
  description: string;
  questions: HomeworkQuestion[];
  dueDate: string;
  published: boolean;
  createdAt: string;
  submitted?: boolean;
  submittedAt?: string;
  score?: number;
  maxScore: number;
}

interface Quiz {
  id: string;
  classId: string;
  className: string;
  subject: string;
  title: string;
  duration: number;
  questions: HomeworkQuestion[];
  scheduledDate: string;
  published: boolean;
  submitted?: boolean;
  submittedAt?: string;
  score?: number;
  maxScore: number;
  timeRemaining?: number;
  isActive?: boolean;
}

export default function StudentCalendar() {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [expandedHomework, setExpandedHomework] = useState<Set<string>>(new Set());
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set());
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState<number>(0);
  const [currentAnswers, setCurrentAnswers] = useState<{[key: string]: string}>({});
  const [selectedSubject, setSelectedSubject] = useState<string>("All Subjects");
  const [selectedVideoLesson, setSelectedVideoLesson] = useState<any>(null);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);

  // Always use current date
  const currentDate = new Date();

  // Get current user data from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Fetch today's lessons for all subjects
  const todayDateStr = formatDate(currentDate);
  
  // Get grade from multiple possible sources
  const userGrade = currentUser.gradeLevel || currentUser.grade || '8';
  
  // Define all available subjects
  const subjects = ['mathematics', 'physical science', 'life sciences', 'english', 'history', 'geography'];
  
  // Fetch lessons for all subjects
  const { data: allTodayLessons = [] } = useQuery({
    queryKey: ['all-student-lessons', todayDateStr, userGrade],
    queryFn: async () => {
      console.log('StudentCalendar fetching lessons for all subjects:', { date: todayDateStr, grade: userGrade });
      
      const lessonPromises = subjects.map(async (subject) => {
        try {
          const response = await fetch(
            `/api/syllabus-calendar?date=${encodeURIComponent(todayDateStr)}&grade=${encodeURIComponent(userGrade)}&subject=${encodeURIComponent(subject)}`
          );
          
          if (!response.ok) {
            return [];
          }
          
          const lessons = await response.json();
          return lessons.map((lesson: any) => ({ ...lesson, subject: subject }));
        } catch (error) {
          console.error(`Failed to fetch ${subject} lessons:`, error);
          return [];
        }
      });
      
      const allLessons = await Promise.all(lessonPromises);
      const flattenedLessons = allLessons.flat();
      
      console.log('StudentCalendar fetched all lessons:', flattenedLessons);
      return flattenedLessons;
    },
    enabled: true, // Always try to fetch lessons
  });
  
  // Group lessons by subject for organized display
  const lessonsBySubject = allTodayLessons.reduce((acc: any, lesson: any) => {
    const subject = lesson.subject || 'unknown';
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(lesson);
    return acc;
  }, {});

  useEffect(() => {
    // Load published homework and quizzes from localStorage
    const publishedHomework = JSON.parse(localStorage.getItem('publishedHomework') || '[]');
    const publishedQuizzes = JSON.parse(localStorage.getItem('publishedQuizzes') || '[]');
    
    // Add submission status and calculate max scores
    const homeworkWithSubmissions = publishedHomework.map((hw: any) => ({
      ...hw,
      submitted: false,
      maxScore: hw.questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0)
    }));

    const quizzesWithSubmissions = publishedQuizzes.map((quiz: any) => ({
      ...quiz,
      submitted: false,
      maxScore: quiz.questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0)
    }));

    setHomework(homeworkWithSubmissions);
    setQuizzes(quizzesWithSubmissions);
  }, []);

  useEffect(() => {
    // Quiz timer
    let interval: NodeJS.Timeout;
    if (activeQuiz && quizTimeRemaining > 0) {
      interval = setInterval(() => {
        setQuizTimeRemaining(prev => {
          if (prev <= 1) {
            handleQuizSubmit(activeQuiz);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeQuiz, quizTimeRemaining]);

  // Filter for current day only
  const todayHomework = homework.filter(hw => hw.dueDate === todayDateStr && hw.published);
  const todayQuizzes = quizzes.filter(quiz => quiz.scheduledDate === todayDateStr && quiz.published);

  const toggleHomeworkExpanded = (homeworkId: string) => {
    setExpandedHomework(prev => {
      const newSet = new Set(prev);
      if (newSet.has(homeworkId)) {
        newSet.delete(homeworkId);
      } else {
        newSet.add(homeworkId);
      }
      return newSet;
    });
  };

  const toggleQuizExpanded = (quizId: string) => {
    setExpandedQuizzes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quizId)) {
        newSet.delete(quizId);
      } else {
        newSet.add(quizId);
      }
      return newSet;
    });
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setCurrentAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleOpenVideoPlayer = (lesson: any) => {
    setSelectedVideoLesson(lesson);
    setIsVideoPlayerOpen(true);
  };

  const handleCloseVideoPlayer = () => {
    setIsVideoPlayerOpen(false);
    setSelectedVideoLesson(null);
  };

  const handleHomeworkSubmit = async (homeworkItem: Homework) => {
    try {
      console.log('Submitting homework with questions:', homeworkItem.questions);
      console.log('Current answers state:', currentAnswers);
      
      const submissionAnswers = homeworkItem.questions.map(q => ({
        questionId: q.id, // This should use the actual database question ID like "pq1_1753960293160"
        answer: currentAnswers[q.id] || ''
      }));
      
      console.log('Submission answers being sent:', submissionAnswers);

      // Submit homework to database
      const response = await fetch(buildApiUrl(`/api/homework/${homeworkItem.id}/submit`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          answers: submissionAnswers
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit homework');
      }

      const submissionResult = await response.json();
      console.log('Submission result:', submissionResult);
      
      // Store the feedback in localStorage for the feedback page
      localStorage.setItem('homeworkFeedback', JSON.stringify(submissionResult));

      // Navigate to feedback page
      if (submissionResult && submissionResult.feedback) {
        // Scroll to top before navigation
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setLocation('/homework-feedback');
      }

      // Refresh homework data to show completion status
      const homeworkResponse = await fetch(buildApiUrl('/api/homework'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (homeworkResponse.ok) {
        const updatedHomework = await homeworkResponse.json();
        setHomework(updatedHomework);
      }

      // Clear answers for this homework
      const clearedAnswers = { ...currentAnswers };
      homeworkItem.questions.forEach(q => {
        delete clearedAnswers[q.id];
      });
      setCurrentAnswers(clearedAnswers);
      
      setExpandedHomework(prev => {
        const newSet = new Set(prev);
        newSet.delete(homeworkItem.id);
        return newSet;
      });

      // Show success message
      console.log('Homework submitted successfully!');
    } catch (error) {
      console.error('Error submitting homework:', error);
      // Show error message to user
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz({ ...quiz, isActive: true });
    setQuizTimeRemaining(quiz.duration * 60); // Convert minutes to seconds
    setCurrentAnswers({});
  };

  const handleQuizSubmit = (quiz: Quiz) => {
    const submissionAnswers = quiz.questions.map(q => ({
      questionId: q.id,
      userAnswer: currentAnswers[q.id] || ''
    }));

    // Calculate score (simplified)
    const score = Math.floor(Math.random() * 20) + 75; // Mock score between 75-95

    setQuizzes(prev => prev.map(q => 
      q.id === quiz.id 
        ? { 
            ...q, 
            submitted: true, 
            submittedAt: new Date().toISOString(),
            score: score,
            questions: q.questions.map(qu => ({
              ...qu,
              userAnswer: currentAnswers[qu.id] || ''
            }))
          }
        : q
    ));

    setActiveQuiz(null);
    setQuizTimeRemaining(0);
    setCurrentAnswers({});
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Active Quiz View
  if (activeQuiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 pb-20">
        {/* Quiz Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]"></div>
          
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">{activeQuiz.title}</h1>
                <p className="text-purple-100">{activeQuiz.subject} • {activeQuiz.className}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{formatTime(quizTimeRemaining)}</div>
                <div className="text-purple-100 text-sm">Time Remaining</div>
              </div>
            </div>
            
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white">Progress</span>
                <span className="text-white">
                  {Object.keys(currentAnswers).length}/{activeQuiz.questions.length}
                </span>
              </div>
              <Progress 
                value={(Object.keys(currentAnswers).length / activeQuiz.questions.length) * 100} 
                className="h-2 bg-white/20" 
              />
            </div>
          </div>
        </div>

        {/* Quiz Questions */}
        <div className="px-6 py-6 space-y-6">
          {activeQuiz.questions.map((question, index) => (
            <div key={question.id} className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg font-bold text-purple-600">Question {index + 1}</span>
                    <Badge className={getDifficultyColor(question.difficulty)}>
                      {question.difficulty}
                    </Badge>
                    <Badge variant="outline">{question.points} pts</Badge>
                  </div>
                  <p className="text-slate-700 mb-4">{question.question}</p>
                </div>
              </div>

              <Textarea
                placeholder="Enter your answer here..."
                value={currentAnswers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                className="min-h-[100px] rounded-2xl"
              />
            </div>
          ))}

          {/* Submit Button */}
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
            <Button 
              onClick={() => handleQuizSubmit(activeQuiz)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl text-lg font-semibold"
              disabled={Object.keys(currentAnswers).length === 0}
            >
              <Send className="w-5 h-5 mr-2" />
              Submit Quiz
            </Button>
            <p className="text-center text-sm text-slate-600 mt-2">
              Make sure to review your answers before submitting
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">My Assignments</h1>
              <p className="text-blue-100 text-lg">Complete your homework and take quizzes</p>
            </div>
            <div className="w-48">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="bg-white/20 border-white/30 text-white rounded-2xl backdrop-blur-sm hover:bg-white/30">
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Subjects">All Subjects</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Physical Science">Physical Science</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="text-white text-center mb-4">
            <p className="text-blue-100 text-sm opacity-90">
              {selectedSubject === "All Subjects" 
                ? "View all your assignments and assessments" 
                : `View ${selectedSubject} assignments and assessments`}
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Date Picker */}
      <div className="px-6 -mt-6">
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 shadow-2xl border border-white/30 mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Disabled - showing only current day
              }}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="text-lg font-bold text-slate-800">
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Disabled - showing only current day
              }}
              className="rounded-full"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="text-center">
            <div className="text-indigo-600 font-semibold text-lg">
              Today - {currentDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <p className="text-slate-600 text-sm mt-1">Viewing assignments due today</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 space-y-6">
        {/* Today's Lessons Section */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
          <div className="flex items-center space-x-3 mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 000-5H9v5zm0 0H7.5a2.5 2.5 0 000 5H9v-5zm0 0v5m0-5h2.5a2.5 2.5 0 000-5M9 15v-5" />
            </svg>
            <h2 className="text-xl font-bold text-slate-800">Today's Lessons - All Subjects</h2>
            <span className="text-sm text-slate-500">
              {currentDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })} • Grade {userGrade}
            </span>
          </div>

          {allTodayLessons.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(lessonsBySubject).map(([subject, lessons]: [string, any]) => (
                <div key={subject} className="space-y-4">
                  {/* Subject Header */}
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      subject === 'mathematics' ? 'bg-red-500' :
                      subject === 'physical science' ? 'bg-blue-500' :
                      subject === 'life sciences' ? 'bg-green-500' :
                      subject === 'english' ? 'bg-purple-500' :
                      subject === 'history' ? 'bg-orange-500' :
                      subject === 'geography' ? 'bg-teal-500' :
                      'bg-gray-500'
                    }`}></div>
                    <h3 className="text-lg font-semibold text-slate-700 capitalize">
                      {subject.replace(' ', ' ').replace('_', ' ')} ({lessons.length} lesson{lessons.length > 1 ? 's' : ''})
                    </h3>
                  </div>
                  
                  {/* Lessons for this subject */}
                  <div className="space-y-3 ml-5">
                    {lessons.map((lesson: any) => {
                      console.log('StudentCalendar rendering lesson:', lesson);
                      console.log('Video link check:', lesson.video_link, lesson.videoLink);
                      return (
                        <div key={lesson.id} className={`rounded-2xl p-5 border ${
                        subject === 'mathematics' ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-100' :
                        subject === 'physical science' ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100' :
                        subject === 'life sciences' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100' :
                        subject === 'english' ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100' :
                        subject === 'history' ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-100' :
                        subject === 'geography' ? 'bg-gradient-to-r from-teal-50 to-blue-50 border-teal-100' :
                        'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-100'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-bold text-slate-800">{lesson.lesson_title || lesson.lessonTitle}</h4>
                            </div>
                            <p className={`text-sm font-medium mb-2 ${
                              subject === 'mathematics' ? 'text-red-600' :
                              subject === 'physical science' ? 'text-blue-600' :
                              subject === 'life sciences' ? 'text-green-600' :
                              subject === 'english' ? 'text-purple-600' :
                              subject === 'history' ? 'text-orange-600' :
                              subject === 'geography' ? 'text-teal-600' :
                              'text-gray-600'
                            }`}>
                              {lesson.description || `${subject.charAt(0).toUpperCase() + subject.slice(1)} Lesson`}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500 ml-4">{lesson.duration || 60} min</span>
                        </div>

                        {/* Video Thumbnail Preview */}
                        {(lesson.video_link || lesson.videoLink) && (
                          <div className="relative w-full mb-4 group cursor-pointer" onClick={() => handleOpenVideoPlayer(lesson)}>
                            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden shadow-lg border-2 border-transparent group-hover:border-white/20 transition-all duration-300">
                              <div className="relative w-full h-full flex items-center justify-center">
                                {/* Video thumbnail overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>
                                
                                {/* Play button overlay */}
                                <div className="relative z-10 bg-white/20 backdrop-blur-sm rounded-full p-6 group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                                  <Play className="w-8 h-8 text-white ml-1" />
                                </div>
                                
                                {/* Subject badge */}
                                <div className="absolute top-3 left-3 z-10">
                                  <Badge className={`${
                                    subject === 'mathematics' ? 'bg-red-500' :
                                    subject === 'physical science' ? 'bg-blue-500' :
                                    subject === 'life sciences' ? 'bg-green-500' :
                                    subject === 'english' ? 'bg-purple-500' :
                                    subject === 'history' ? 'bg-orange-500' :
                                    subject === 'geography' ? 'bg-teal-500' :
                                    'bg-gray-500'
                                  } text-white border-0`}>
                                    Video Lesson
                                  </Badge>
                                </div>
                                
                                {/* Duration badge */}
                                <div className="absolute bottom-3 right-3 z-10 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                                  {lesson.duration || 60} min
                                </div>
                              </div>
                            </div>
                            
                            {/* Hover text */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                              <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium">
                                Open in Shorts Player
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Watch Video Button - Opens Shorts Player */}
                        {(lesson.video_link || lesson.videoLink) && (
                          <Button
                            onClick={() => handleOpenVideoPlayer(lesson)}
                            className={`w-full text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-300 hover:scale-[1.02] shadow-lg ${
                              subject === 'mathematics' ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' :
                              subject === 'physical science' ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' :
                              subject === 'life sciences' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' :
                              subject === 'english' ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' :
                              subject === 'history' ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' :
                              subject === 'geography' ? 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700' :
                              'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                            }`}
                          >
                            <Play className="w-5 h-5" />
                            Open Interactive Player
                          </Button>
                        )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No lessons scheduled for today</p>
              <p className="text-xs text-slate-400 mt-2">
                Looking for Grade {userGrade} lessons on {todayDateStr}
              </p>
            </div>
          )}
        </div>

        {/* Homework Section */}
        {todayHomework.length > 0 && (
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <BookOpen className="w-6 h-6 mr-2 text-blue-600" />
              Homework Due Today
            </h2>
            <div className="space-y-4">
              {todayHomework.map((hw) => (
                <div key={hw.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-slate-800">{hw.title}</h3>
                        {hw.isCompleted && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <p className="text-blue-600 text-sm font-medium">{hw.subject} • {hw.className}</p>
                      <p className="text-slate-600 text-sm mt-1">{hw.description}</p>
                      {hw.isCompleted && (
                        <div className="mt-2 flex items-center space-x-4">
                          <span className="text-sm text-slate-600">
                            Score: <span className="font-bold text-green-600">{hw.score}/{hw.totalMarks}</span>
                          </span>
                          <span className="text-sm text-slate-500">
                            Submitted: {new Date(hw.submittedAt!).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleHomeworkExpanded(hw.id)}
                      className="rounded-full"
                      disabled={hw.isCompleted}
                    >
                      {expandedHomework.has(hw.id) ? 
                        <ChevronUp className="w-5 h-5" /> : 
                        <ChevronDown className="w-5 h-5" />
                      }
                    </Button>
                  </div>

                  {expandedHomework.has(hw.id) && !hw.isCompleted && (
                    <div className="border-t border-blue-200 pt-4 mt-4 space-y-4">
                      {hw.questions.map((question, index) => (
                        <div key={question.id} className="bg-white rounded-xl p-4 border border-slate-200">
                          <div className="flex items-start justify-between mb-3">
                            <span className="text-sm font-bold text-blue-600">Question {index + 1}</span>
                            <div className="flex items-center space-x-2">
                              <Badge className={getDifficultyColor(question.difficulty)}>
                                {question.difficulty}
                              </Badge>
                              <span className="text-sm text-slate-500">{question.points} pts</span>
                            </div>
                          </div>
                          <p className="text-slate-700 mb-3">{question.question}</p>
                          <Textarea
                            placeholder="Enter your answer here..."
                            value={currentAnswers[question.id] || ''}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="min-h-[80px] rounded-xl"
                          />
                        </div>
                      ))}
                      
                      <Button 
                        onClick={() => handleHomeworkSubmit(hw)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
                        disabled={hw.questions.some(q => !currentAnswers[q.id])}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Submit Homework
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quizzes Section */}
        {todayQuizzes.length > 0 && (
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <Clock className="w-6 h-6 mr-2 text-purple-600" />
              Quizzes Scheduled Today
            </h2>
            <div className="space-y-4">
              {todayQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-slate-800">{quiz.title}</h3>
                        {quiz.submitted && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <p className="text-purple-600 text-sm font-medium">{quiz.subject} • {quiz.className}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                        <span>Duration: {quiz.duration} minutes</span>
                        <span>{quiz.questions.length} questions</span>
                        <span>{quiz.maxScore} points</span>
                      </div>
                      {quiz.submitted && (
                        <div className="mt-2 flex items-center space-x-4">
                          <span className="text-sm text-slate-600">
                            Score: <span className="font-bold text-green-600">{quiz.score}/{quiz.maxScore}</span>
                          </span>
                          <span className="text-sm text-slate-500">
                            Completed: {new Date(quiz.submittedAt!).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!quiz.submitted && (
                    <Button 
                      onClick={() => startQuiz(quiz)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl"
                    >
                      <Timer className="w-4 h-4 mr-2" />
                      Start Quiz ({quiz.duration} min)
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {todayHomework.length === 0 && todayQuizzes.length === 0 && allTodayLessons.length === 0 && (
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 text-center">
            <CalendarIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No assignments or lessons for today</h3>
            <p className="text-slate-500">Enjoy your free time!</p>
          </div>
        )}
      </div>

      <BottomNav />
      
      {/* Shorts Video Player Modal */}
      {selectedVideoLesson && (
        <ShortsVideoPlayer
          lesson={selectedVideoLesson}
          isOpen={isVideoPlayerOpen}
          onClose={handleCloseVideoPlayer}
        />
      )}
    </div>
  );
}