import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, BookOpen, Clock, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";

interface HomeworkQuestion {
  id: string;
  question: string;
  type: 'equation' | 'system' | 'expression' | 'word-problem';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
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
  completed?: boolean;
  submittedAt?: string;
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
  completed?: boolean;
  submittedAt?: string;
}

export default function StudentHomeworkCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [homework, setHomework] = useState<Homework[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [expandedHomework, setExpandedHomework] = useState<Set<string>>(new Set());
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set());
  
  // Get current user role
  const userRole = localStorage.getItem('userRole');
  const isParent = userRole === 'parent';

  useEffect(() => {
    // Load published homework from localStorage
    const publishedHomework = localStorage.getItem('publishedHomework');
    if (publishedHomework) {
      const homeworkData = JSON.parse(publishedHomework);
      // Add completion status for each homework
      const homeworkWithStatus = homeworkData.map((hw: Homework) => ({
        ...hw,
        completed: Math.random() > 0.6, // Random completion status for demo
        submittedAt: Math.random() > 0.7 ? new Date(Date.now() - Math.random() * 86400000).toISOString() : undefined
      }));
      setHomework(homeworkWithStatus);
    }

    // Load published quizzes from localStorage
    const publishedQuizzes = localStorage.getItem('publishedQuizzes');
    if (publishedQuizzes) {
      const quizData = JSON.parse(publishedQuizzes);
      // Add completion status for each quiz
      const quizzesWithStatus = quizData.map((quiz: Quiz) => ({
        ...quiz,
        completed: Math.random() > 0.7, // Random completion status for demo
        submittedAt: Math.random() > 0.8 ? new Date(Date.now() - Math.random() * 86400000).toISOString() : undefined
      }));
      setQuizzes(quizzesWithStatus);
    }
  }, []);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDateRange = () => {
    const dates = [];
    for (let i = -3; i <= 3; i++) {
      const date = new Date(selectedDate);
      date.setDate(selectedDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getHomeworkForDate = (date: string) => {
    return homework.filter(hw => hw.dueDate === date);
  };

  const getQuizzesForDate = (date: string) => {
    return quizzes.filter(quiz => quiz.scheduledDate === date);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (completed: boolean, dueDate: string) => {
    if (completed) return 'text-green-600';
    if (new Date(dueDate) < new Date()) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getStatusIcon = (completed: boolean, dueDate: string) => {
    if (completed) return <CheckCircle className="w-5 h-5" />;
    if (new Date(dueDate) < new Date()) return <AlertTriangle className="w-5 h-5" />;
    return <Clock className="w-5 h-5" />;
  };

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

  const startHomework = (homeworkId: string) => {
    console.log('Starting homework:', homeworkId);
    // Here you would navigate to the homework completion interface
  };

  const startQuiz = (quizId: string) => {
    console.log('Starting quiz:', quizId);
    // Here you would navigate to the quiz interface
  };

  const selectedDateString = formatDate(selectedDate);
  const selectedHomework = getHomeworkForDate(selectedDateString);
  const selectedQuizzes = getQuizzesForDate(selectedDateString);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.3),transparent_50%)]"></div>
        
        <div className="relative z-10 p-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">My Homework</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateDate('prev')}
                className="text-white hover:bg-white/20 backdrop-blur-sm rounded-xl"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateDate('next')}
                className="text-white hover:bg-white/20 backdrop-blur-sm rounded-xl"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
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
                const newDate = new Date(selectedDate);
                newDate.setDate(selectedDate.getDate() - 1);
                setSelectedDate(newDate);
              }}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="text-lg font-bold text-slate-800">
              {selectedDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(selectedDate.getDate() + 1);
                setSelectedDate(newDate);
              }}
              className="rounded-full"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex space-x-2 overflow-x-auto">
            {getDateRange().map((date) => {
              const dateString = formatDate(date);
              const isSelected = dateString === selectedDateString;
              const isToday = formatDate(date) === formatDate(new Date());
              const hasHomework = getHomeworkForDate(dateString).length > 0;
              const hasQuizzes = getQuizzesForDate(dateString).length > 0;
              
              return (
                <button
                  key={dateString}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 flex flex-col items-center p-3 rounded-2xl transition-all duration-200 min-w-[70px] ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : isToday
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-xs font-medium">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-lg font-bold">
                    {date.getDate()}
                  </span>
                  {(hasHomework || hasQuizzes) && (
                    <div className="flex space-x-1 mt-1">
                      {hasHomework && (
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-600'}`} />
                      )}
                      {hasQuizzes && (
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-purple-200' : 'bg-purple-600'}`} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 space-y-6">
        {/* Homework Section */}
        {selectedHomework.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
              Homework Due Today
            </h2>
            <div className="space-y-4">
              {selectedHomework.map((hw) => (
                <div key={hw.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">{hw.title}</h3>
                          <div className={`flex items-center space-x-1 ${getStatusColor(hw.completed || false, hw.dueDate)}`}>
                            {getStatusIcon(hw.completed || false, hw.dueDate)}
                            <span className="text-sm font-medium">
                              {hw.completed ? 'Completed' : new Date(hw.dueDate) < new Date() ? 'Overdue' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                            {hw.subject}
                          </Badge>
                          <Badge variant="outline">{hw.className}</Badge>
                        </div>
                        <p className="text-gray-600 text-sm">{hw.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleHomeworkExpanded(hw.id)}
                        className="rounded-full"
                      >
                        {expandedHomework.has(hw.id) ? 
                          <ChevronUp className="w-5 h-5" /> : 
                          <ChevronDown className="w-5 h-5" />
                        }
                      </Button>
                    </div>

                    {expandedHomework.has(hw.id) && (
                      <div className="border-t border-gray-100 pt-4 mt-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Questions ({hw.questions.length})</h4>
                        <div className="space-y-3 mb-4">
                          {hw.questions.map((question, index) => (
                            <div key={question.id} className="p-3 bg-gray-50 rounded-xl">
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Question {index + 1}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary" className={getDifficultyColor(question.difficulty)}>
                                    {question.difficulty}
                                  </Badge>
                                  <span className="text-sm text-gray-500">{question.points} pts</span>
                                </div>
                              </div>
                              <p className="text-gray-800 text-sm">{question.question}</p>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex space-x-3">
                          {!isParent && !hw.completed && (
                            <Button 
                              onClick={() => startHomework(hw.id)}
                              className="flex-1"
                            >
                              Start Homework
                            </Button>
                          )}
                          {!isParent && hw.completed && hw.submittedAt && (
                            <Button variant="outline" className="flex-1">
                              View Submission
                            </Button>
                          )}
                          {isParent && (
                            <div className="flex-1 text-center py-2 px-4 bg-slate-100 text-slate-600 rounded-lg text-sm">
                              {hw.completed ? 'Completed by Student' : 'Available for Student'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiz Section */}
        {selectedQuizzes.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Clock className="w-6 h-6 mr-2 text-purple-600" />
              Quizzes Scheduled Today
            </h2>
            <div className="space-y-4">
              {selectedQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">{quiz.title}</h3>
                          <div className={`flex items-center space-x-1 ${getStatusColor(quiz.completed || false, quiz.scheduledDate)}`}>
                            {getStatusIcon(quiz.completed || false, quiz.scheduledDate)}
                            <span className="text-sm font-medium">
                              {quiz.completed ? 'Completed' : new Date(quiz.scheduledDate) < new Date() ? 'Missed' : 'Scheduled'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            {quiz.subject}
                          </Badge>
                          <Badge variant="outline">{quiz.className}</Badge>
                          <Badge variant="outline" className="bg-orange-100 text-orange-800">
                            {quiz.duration} min
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleQuizExpanded(quiz.id)}
                        className="rounded-full"
                      >
                        {expandedQuizzes.has(quiz.id) ? 
                          <ChevronUp className="w-5 h-5" /> : 
                          <ChevronDown className="w-5 h-5" />
                        }
                      </Button>
                    </div>

                    {expandedQuizzes.has(quiz.id) && (
                      <div className="border-t border-gray-100 pt-4 mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-gray-600">
                            {quiz.questions.length} questions • {quiz.duration} minutes
                          </span>
                          <span className="text-sm text-gray-600">
                            Total Points: {quiz.questions.reduce((sum, q) => sum + q.points, 0)}
                          </span>
                        </div>
                        
                        <div className="flex space-x-3">
                          {!isParent && !quiz.completed && (
                            <Button 
                              onClick={() => startQuiz(quiz.id)}
                              className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                              Start Quiz
                            </Button>
                          )}
                          {!isParent && quiz.completed && quiz.submittedAt && (
                            <Button variant="outline" className="flex-1">
                              View Results
                            </Button>
                          )}
                          {isParent && (
                            <div className="flex-1 text-center py-2 px-4 bg-slate-100 text-slate-600 rounded-lg text-sm">
                              {quiz.completed ? 'Completed by Student' : 'Scheduled for Student'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {selectedHomework.length === 0 && selectedQuizzes.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No assignments for today</h3>
            <p className="text-gray-500">Check other dates to see your upcoming homework and quizzes</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}