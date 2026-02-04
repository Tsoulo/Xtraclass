import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calculator, 
  Atom, 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Award,
  ChevronRight,
  ChevronDown,
  Target,
  Brain,
  Zap,
  LogOut,
  Loader2,
  CheckCircle,
  AlertCircle,
  Play,
  Calendar,
  PenTool,
  FileText,
  Plus,
  Bell,
  ScrollText,
  Mic,
  Video
} from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSquareRootVariable,
  faFlask,
  faGraduationCap,
  faChartLine,
  faBook,
  faTrophy,
  faCalendarDay,
  faPencil,
  faClipboardList,
  faFileCircleCheck,
  faScroll,
  faMicrophone,
  faVideoCamera,
  faBullseye,
  faStar,
  faRocket,
  faLightbulb
} from '@fortawesome/free-solid-svg-icons';
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentSubjects } from "@/hooks/useStudentSubjects";
import { useTopicProgress } from "@/hooks/useTopicProgress";
import { useTopicAnalysis } from "@/hooks/useTopicAnalysis";
import { useRetroactivePoints } from "@/hooks/useRetroactivePoints";
import { useTopicFeedback, type TopicFeedback } from "@/hooks/useTopicFeedback";
import { useNotificationCount } from "@/hooks/useNotifications";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PointsBreakdownModal from "@/components/PointsBreakdownModal";
import BaselineAssessmentModal from "@/components/BaselineAssessmentModal";
import PastPaperSelectionModal from "@/components/PastPaperSelectionModal";
import logoImage from '@assets/xtraclass-logo-td.png';

interface SubjectData {
  id: string;
  name: string;
  icon: any;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
  progress: number;
  topicsStarted?: number;
  totalTopics?: number;
  grade: string;
}

function getSubjectIcon(subject: string) {
  const subjectMap: { [key: string]: any } = {
    'mathematics': Calculator,
    'mathematical-literacy': Calculator,
    'physical-science': Atom,
    'default': BookOpen
  };
  return subjectMap[subject] || subjectMap['default'];
}

function getSubjectColor(subject: string) {
  const colorMap: { [key: string]: { color: string; gradientFrom: string; gradientTo: string; iconColor: string } } = {
    'mathematics': { color: "blue", gradientFrom: "from-blue-500", gradientTo: "to-indigo-600", iconColor: "text-blue-500" },
    'mathematical-literacy': { color: "cyan", gradientFrom: "from-cyan-500", gradientTo: "to-blue-600", iconColor: "text-cyan-500" },
    'physical-science': { color: "purple", gradientFrom: "from-purple-500", gradientTo: "to-pink-600", iconColor: "text-purple-500" },
    'default': { color: "gray", gradientFrom: "from-gray-500", gradientTo: "to-slate-600", iconColor: "text-gray-500" }
  };
  return colorMap[subject] || colorMap['default'];
}

function formatSubjectName(subject: string): string {
  return subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getMasteryColor(mastery: string): string {
  switch (mastery) {
    case 'excellent': return 'bg-green-500';
    case 'good': return 'bg-blue-500';
    case 'fair': return 'bg-yellow-500';
    case 'needs-improvement': return 'bg-orange-500';
    default: return 'bg-gray-300';
  }
}

function getMasteryTextColor(mastery: string): string {
  switch (mastery) {
    case 'excellent': return 'text-green-600';
    case 'good': return 'text-blue-600';
    case 'fair': return 'text-yellow-600';
    case 'needs-improvement': return 'text-orange-600';
    default: return 'text-gray-600';
  }
}

interface TopicItemProps {
  topic: any;
  isExpanded: boolean;
  onToggle: () => void;
}

function TopicItem({ topic, isExpanded, onToggle }: TopicItemProps) {
  const [isGeneratingExercise, setIsGeneratingExercise] = useState(false);
  const [, setLocation] = useLocation();
  const { data: analysis, isLoading: analysisLoading } = useTopicAnalysis(topic.id, isExpanded);
  const { user } = useAuth();
  
  // Get student ID from user profile
  const { data: userProfile } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: !!user
  }) as { data: any };
  
  // Dynamically get student ID from user profile (no hardcoding)
  const studentId = userProfile?.studentId || user?.studentId;
  
  const { data: topicFeedback, isLoading: feedbackLoading } = useTopicFeedback(
    studentId, 
    topic.id
  ) as { data: TopicFeedback | undefined; isLoading: boolean };

  const handleGenerateExercise = async (topicName: string) => {
    setIsGeneratingExercise(true);
    
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      await apiRequest('/api/generate-adaptive-exercise-unlimited', {
        method: 'POST',
        body: JSON.stringify({
          topic: topicName,
          subject: 'mathematics'
        })
      });
      
      // Clear exercise cache to show the new exercise
      const userGrade = currentUser.gradeLevel || '8';
      const todayDate = new Date().toISOString().split('T')[0];
      const calendarExerciseKey = `/api/exercises?date=${todayDate}&grade=${userGrade}`;
      queryClient.removeQueries({ queryKey: [calendarExerciseKey] });
      
      // Redirect to calendar where the exercise was generated
      setLocation('/calendar');
    } catch (error) {
      console.error('Error generating exercise:', error);
      alert('Failed to generate exercise. Please try again.');
    } finally {
      setIsGeneratingExercise(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Topic Header - Clickable */}
      <div 
        className="p-3 sm:p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
              )}
            </div>
            <span className="font-medium text-slate-700 text-sm sm:text-base truncate">{topic.name}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 shrink-0">
            <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${getMasteryTextColor(topic.mastery)}`}>
              {topic.mastery.replace('-', ' ')}
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-semibold">{topic.progress}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 bg-slate-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getMasteryColor(topic.mastery)}`}
              style={{ width: `${topic.progress}%` }}
            ></div>
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">{topic.lastStudied}</span>
        </div>
      </div>
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          {analysisLoading ? (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-sm text-slate-600">Loading analysis...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {/* Progress Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-sm text-slate-600">Exercises</div>
                  <div className="text-lg font-semibold text-slate-800">
                    {analysis.completedExercises}/{analysis.totalExercises}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-sm text-slate-600">Homework</div>
                  <div className="text-lg font-semibold text-slate-800">
                    {analysis.completedHomework}/{analysis.totalHomework}
                  </div>
                </div>
              </div>

              {/* Assessment Overview */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm rounded-lg p-3 sm:p-4 border-l-4 border-blue-500 mb-4">
                <div className="flex items-center gap-2 text-blue-700 mb-3">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  <h4 className="text-base sm:text-lg font-semibold">Assessments</h4>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                  <div className="bg-white p-2 sm:p-3 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-blue-600">{analysis?.completedHomework || 0}</div>
                    <div className="text-[10px] sm:text-xs text-gray-600">Homework</div>
                  </div>
                  <div className="bg-white p-2 sm:p-3 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-purple-600">{analysis?.completedExercises || 0}</div>
                    <div className="text-[10px] sm:text-xs text-gray-600">Exercises</div>
                  </div>
                  <div className="bg-white p-2 sm:p-3 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-green-600">{(analysis?.completedHomework || 0) + (analysis?.completedExercises || 0)}</div>
                    <div className="text-[10px] sm:text-xs text-gray-600">Total</div>
                  </div>
                </div>
              </div>

              {/* Feedback Section */}
              {topicFeedback ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 backdrop-blur-sm rounded-lg p-4 border-l-4 border-green-500">
                    <div className="flex items-center gap-2 text-green-700 mb-3">
                      <CheckCircle className="h-5 w-5" />
                      <h4 className="text-lg font-semibold">Strengths</h4>
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        Latest: {new Date(topicFeedback.updatedAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    {topicFeedback.strengths && topicFeedback.strengths.length > 0 ? (
                      <div className="space-y-2">
                        {topicFeedback.strengths.map((strength, index) => (
                          <p key={index} className="text-sm text-gray-700 flex items-start">
                            <span className="text-green-600 mr-2">✓</span>
                            <span>{strength}</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No strengths identified yet. Complete more homework or exercises in this topic to get feedback.</p>
                    )}
                  </div>

                  {/* Areas for Improvement */}
                  <div className="border-0 shadow-lg bg-gradient-to-r from-orange-50 to-amber-50 backdrop-blur-sm rounded-lg p-4 border-l-4 border-orange-500">
                    <div className="flex items-center gap-2 text-orange-700 mb-3">
                      <AlertCircle className="h-5 w-5" />
                      <h4 className="text-lg font-semibold">Areas to Improve</h4>
                    </div>
                    {topicFeedback.improvements && topicFeedback.improvements.length > 0 ? (
                      <div className="space-y-2">
                        {topicFeedback.improvements.map((improvement, index) => (
                          <p key={index} className="text-sm text-gray-700 flex items-start">
                            <span className="text-orange-600 mr-2">⚠</span>
                            <span>{improvement}</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No areas for improvement identified yet. Complete more homework or exercises in this topic to get feedback.</p>
                    )}
                    
                    {/* Overall Exercise Generation Button */}
                    <div className="mt-4 pt-3 border-t border-orange-200">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full text-blue-700 border-blue-300 hover:bg-blue-200"
                        onClick={() => handleGenerateExercise(topic.name)}
                        disabled={isGeneratingExercise}
                      >
                        {isGeneratingExercise ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Generate Exercise
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-slate-50 backdrop-blur-sm rounded-lg p-4 border-l-4 border-gray-400">
                  <div className="text-center py-6">
                    <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h4 className="text-base sm:text-lg font-semibold text-gray-600 mb-2">
                      {analysis && ((analysis.completedHomework > 0) || (analysis.completedExercises > 0)) 
                        ? "Feedback Processing" 
                        : "No Feedback Yet"}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-500 mb-4">
                      {analysis && ((analysis.completedHomework > 0) || (analysis.completedExercises > 0))
                        ? "You've completed some work! Feedback will be generated after you submit more homework or exercises to identify patterns in your learning."
                        : "Complete homework or exercises in this topic to receive personalized feedback on your strengths and areas for improvement."}
                    </p>
                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                      {analysis && ((analysis.completedHomework > 0) || (analysis.completedExercises > 0))
                        ? `${analysis.completedHomework + analysis.completedExercises} submissions - Keep learning!`
                        : "Feedback will appear here after submissions"}
                    </Badge>
                  </div>
                </div>
              )}


            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-slate-600">Unable to load analysis</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



export default function StudentSubjectDashboard() {
  const [, setLocation] = useLocation();
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [showPastPaperModal, setShowPastPaperModal] = useState(false);
  const [quickAccessVisible, setQuickAccessVisible] = useState(true);
  const [shouldAnimateQuickAccess, setShouldAnimateQuickAccess] = useState(false);
  const quickAccessRef = useRef<HTMLDivElement>(null);
  const { logout, user } = useAuth();
  const { data: subjects, isLoading, error } = useStudentSubjects();
  const retroactivePointsMutation = useRetroactivePoints();
  
  // Check if student needs baseline assessment
  const { data: baselineStatus } = useQuery({
    queryKey: ['/api/baseline-assessment/status'],
    enabled: !!user && user.role === 'student'
  }) as { data: { needsBaseline: boolean; assessments: any[]; studentGrade: string } | undefined };
  
  // Show baseline modal when student first logs in and needs assessment (once per day)
  useEffect(() => {
    if (baselineStatus?.needsBaseline && subjects && subjects.length > 0) {
      // Check if we've already shown the modal today
      const today = new Date().toISOString().split('T')[0];
      const lastShown = localStorage.getItem('baselineModalLastShown');
      
      if (lastShown !== today) {
        setShowBaselineModal(true);
        localStorage.setItem('baselineModalLastShown', today);
      }
    }
  }, [baselineStatus?.needsBaseline, subjects]);
  
  // Mobile-only fade-in animation for Quick Access section (triggers once on scroll)
  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    if (!isMobile) {
      setQuickAccessVisible(true);
      setShouldAnimateQuickAccess(false);
      return;
    }
    
    // Check if element is below the viewport (needs animation)
    if (quickAccessRef.current) {
      const rect = quickAccessRef.current.getBoundingClientRect();
      const isBelowViewport = rect.top >= window.innerHeight;
      
      if (isBelowViewport) {
        // Element is below viewport - hide it and set up animation
        setShouldAnimateQuickAccess(true);
        setQuickAccessVisible(false);
        
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setQuickAccessVisible(true);
              observer.disconnect();
            }
          },
          { threshold: 0.1 }
        );
        
        observer.observe(quickAccessRef.current);
        return () => observer.disconnect();
      } else {
        // Element is already in view - no animation needed
        setQuickAccessVisible(true);
        setShouldAnimateQuickAccess(false);
      }
    }
  }, []);
  
  // Use proper notification count from backend
  const { data: notificationData } = useNotificationCount();
  
  // Fetch complete user profile with grade information
  const { data: userProfile } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: !!user
  }) as { data: any };
  

  // Fetch topic progress for all available subjects FIRST
  const { data: mathTopics, isLoading: mathTopicsLoading, error: mathTopicsError } = useTopicProgress('mathematics');
  const { data: physicalScienceTopics, isLoading: physicalScienceTopicsLoading, error: physicalScienceTopicsError } = useTopicProgress('physical-science');
  
  // Progress calculation for student dashboard

  // Fetch today's data for quick access
  const today = new Date().toISOString().split('T')[0];
  const actualGrade = userProfile?.grade || user?.grade || '8';
  
  // Fetch lessons for all subjects and aggregate
  const { data: mathLessons } = useQuery({
    queryKey: ['/api/syllabus-calendar', { date: today, grade: actualGrade, subject: 'mathematics' }],
    queryFn: () => apiRequest(`/api/syllabus-calendar?date=${today}&grade=${actualGrade}&subject=mathematics`),
    enabled: !!actualGrade && !!subjects?.includes('mathematics')
  });

  const { data: scienceLessons } = useQuery({
    queryKey: ['/api/syllabus-calendar', { date: today, grade: actualGrade, subject: 'physical-science' }],
    queryFn: () => apiRequest(`/api/syllabus-calendar?date=${today}&grade=${actualGrade}&subject=physical-science`),
    enabled: !!actualGrade && !!subjects?.includes('physical-science')
  });

  // Fetch exercises for all subjects and aggregate  
  const { data: mathExercises } = useQuery({
    queryKey: ['/api/exercises', { date: today, grade: actualGrade, subject: 'mathematics' }],
    queryFn: () => apiRequest(`/api/exercises?date=${today}&grade=${actualGrade}&subject=mathematics`),
    enabled: !!actualGrade && !!subjects?.includes('mathematics')
  });

  const { data: scienceExercises } = useQuery({
    queryKey: ['/api/exercises', { date: today, grade: actualGrade, subject: 'physical-science' }],
    queryFn: () => apiRequest(`/api/exercises?date=${today}&grade=${actualGrade}&subject=physical-science`),
    enabled: !!actualGrade && !!subjects?.includes('physical-science')
  });

  const { data: todaysHomework } = useQuery({
    queryKey: ['/api/homework'],
    enabled: !!user && user.role === 'student'
  });

  // Fetch past papers with submission status for baseline assessment cards
  const { data: pastPapersWithStatus } = useQuery({
    queryKey: ['/api/student/past-papers-with-status'],
    enabled: !!user && user.role === 'student'
  });

  // Fetch subscription status with plan features
  const { data: subscriptionStatus } = useQuery<{
    hasSubscription: boolean;
    subscription?: any;
    features?: {
      aiChatAccess?: boolean;
      aiVoiceTutor?: boolean;
      advancedAnalytics?: boolean;
      tutorVideoCall?: boolean;
      [key: string]: any;
    } | null;
  }>({
    queryKey: ['/api/subscription/status'],
    enabled: !!user
  });

  // Check feature flags
  const hasVoiceTutorAccess = subscriptionStatus?.features?.aiVoiceTutor === true;
  const hasTutorVideoCallAccess = subscriptionStatus?.features?.tutorVideoCall === true;

  // Aggregate the data
  const todaysLessons = [...(mathLessons || []), ...(scienceLessons || [])];
  const todaysExercises = [...(mathExercises || []), ...(scienceExercises || [])];
  
  // Filter homework to only today's uncompleted assignments
  const todaysUncompletedHomework = ((todaysHomework as any[]) || []).filter((hw: any) => {
    if (!hw.dueDate) return false;
    
    const dueDate = new Date(hw.dueDate).toISOString().split('T')[0];
    const isToday = dueDate === today;
    const isOverdue = dueDate < today;
    const isNotCompleted = !hw.isCompleted;
    
    return (isToday || isOverdue) && isNotCompleted;
  });
  
  // Use proper notification count from backend API
  const notificationCount = notificationData?.unreadCount || 0;

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('StudentSubjectDashboard logout button clicked!');
    try {
      await logout();
      // Navigate to landing page after logout
      setLocation('/');
    } catch (error) {
      console.error('Logout error in StudentSubjectDashboard:', error);
    }
  }

  const toggleTopic = (topicId: number) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  // Convert string subjects to SubjectData objects with actual progress from aggregates
  const subjectData: SubjectData[] = subjects?.map((subject, index) => {
    const colors = getSubjectColor(subject);
    const actualGrade = userProfile?.grade || user?.grade || '10';
    
    // Use subject-level aggregates instead of averaging all topics
    let subjectProgress = 0;
    let topicsStarted = 0;
    let totalTopics = 0;
    
    if (subject === 'mathematics' && mathTopics?.subjectAggregates) {
      subjectProgress = mathTopics.subjectAggregates.percentComplete;
      topicsStarted = mathTopics.subjectAggregates.topicsStarted;
      totalTopics = mathTopics.subjectAggregates.totalTopics;
    } else if (subject === 'physical-science' && physicalScienceTopics?.subjectAggregates) {
      subjectProgress = physicalScienceTopics.subjectAggregates.percentComplete;
      topicsStarted = physicalScienceTopics.subjectAggregates.topicsStarted;
      totalTopics = physicalScienceTopics.subjectAggregates.totalTopics;
    }
    
    return {
      id: subject,
      name: formatSubjectName(subject),
      icon: getSubjectIcon(subject),
      color: colors.color,
      gradientFrom: colors.gradientFrom,
      gradientTo: colors.gradientTo,
      iconColor: colors.iconColor,
      progress: subjectProgress,
      topicsStarted,
      totalTopics,
      grade: user?.role === 'student' ? `Grade ${actualGrade}` : 'Grade 10'
    };
  }) || [];

  // Calculate overall progress from subject-level aggregates
  const calculateOverallProgress = () => {
    if (!subjects || subjects.length === 0) return 0;
    
    let totalCompleted = 0;
    let totalAvailable = 0;
    
    // Add mathematics progress
    if (subjects.includes('mathematics') && mathTopics?.subjectAggregates) {
      totalCompleted += mathTopics.subjectAggregates.totalCompleted;
      totalAvailable += mathTopics.subjectAggregates.totalAvailable;
    }
    
    // Add physical science progress  
    if (subjects.includes('physical-science') && physicalScienceTopics?.subjectAggregates) {
      totalCompleted += physicalScienceTopics.subjectAggregates.totalCompleted;
      totalAvailable += physicalScienceTopics.subjectAggregates.totalAvailable;
    }
    
    return totalAvailable > 0 && totalCompleted > 0
      ? Math.max(1, Math.round((totalCompleted / totalAvailable) * 100))
      : 0;
  };

  const overallProgress = calculateOverallProgress();

  const handleSubjectClick = (subject: SubjectData) => {
    setSelectedSubject(subject);
  };

  const handleBackToOverview = () => {
    setSelectedSubject(null);
  };

  const handleBackToHome = () => {
    console.log('🔙 Back to Home clicked!');
    setSelectedSubject(null);
  };

  // Handle subscription error redirect - must be before any early returns
  useEffect(() => {
    if (error) {
      const err = error as any;
      const errorMessage = err?.message || String(error);
      const isSubscriptionError = 
        err?.requiresSubscription || 
        err?.data?.requiresSubscription ||
        errorMessage.includes('Premium subscription required') ||
        errorMessage.includes('subscription required') ||
        errorMessage.includes('403');
      
      console.log('Error detected:', { error, errorMessage, isSubscriptionError, timestamp: new Date().toISOString() });
      
      if (isSubscriptionError) {
        setLocation('/subscription');
      }
    }
  }, [error, setLocation]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-slate-600">Loading your subjects...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    const err = error as any;
    const errorMessage = err?.message || String(error);
    const isSubscriptionError = 
      err?.requiresSubscription || 
      err?.data?.requiresSubscription ||
      errorMessage.includes('Premium subscription required') ||
      errorMessage.includes('subscription required') ||
      errorMessage.includes('403');
    
    if (isSubscriptionError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
            <p className="text-slate-600">Redirecting to subscription page...</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load subjects</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (selectedSubject) {
    // Determine which topics data to use based on selected subject
    const topicsData = selectedSubject.id === 'mathematics' ? mathTopics :
                       selectedSubject.id === 'physical-science' ? physicalScienceTopics :
                       null;
    const topicsLoading = selectedSubject.id === 'mathematics' ? mathTopicsLoading :
                          selectedSubject.id === 'physical-science' ? physicalScienceTopicsLoading :
                          false;
    const topicsError = selectedSubject.id === 'mathematics' ? mathTopicsError :
                        selectedSubject.id === 'physical-science' ? physicalScienceTopicsError :
                        null;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20">
        {/* Header */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${selectedSubject.gradientFrom} ${selectedSubject.gradientTo}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_50%)]"></div>
          
          <div className="relative z-10 p-4 md:p-6 md:pt-[54px] pl-[16px] pr-[16px] pt-[25px] pb-[25px]">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                onClick={handleBackToHome}
                className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl"
              >
                ←
              </Button>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white">{selectedSubject.name}</h1>
                <div className="text-white/80 text-sm">
                  <span>{selectedSubject.grade}</span>
                  {userProfile?.classInfo && (
                    <span> • Class: {userProfile.classInfo.name}</span>
                  )}
                </div>
              </div>
              <div className="w-16"></div>
            </div>

            {/* Progress Overview */}
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-medium">Overall Progress</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-yellow-300" />
                    <span className="text-white font-bold text-sm">{userProfile?.points || user?.points || 0} pts</span>
                  </div>
                  <span className="text-white font-bold text-lg">
                    {topicsData?.subjectAggregates ? topicsData.subjectAggregates.percentComplete : 0}%
                  </span>
                </div>
              </div>
              <Progress value={topicsData?.subjectAggregates ? topicsData.subjectAggregates.percentComplete : 0} 
                className="h-3 bg-white/20" />
            </div>

          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Topic Mastery */}
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <Brain className="w-6 h-6 mr-2 text-indigo-600" />
              Topic Mastery
            </h3>
            {topicsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
                <p className="text-slate-600">Loading topics...</p>
              </div>
            ) : topicsError ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Failed to load topics</p>
              </div>
            ) : !topicsData?.topics || topicsData.topics.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-slate-700 mb-2">No Topics Available</h4>
                <p className="text-slate-600 mb-4">No topics found for {selectedSubject.name}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topicsData.topics.map((topic, index) => (
                  <TopicItem 
                    key={topic.id} 
                    topic={topic} 
                    isExpanded={expandedTopics.has(topic.id)}
                    onToggle={() => toggleTopic(topic.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-200">
            <h3 className="text-lg font-bold text-indigo-700 mb-3 flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Quick Actions
            </h3>
            <p className="text-indigo-600 mb-4">Get started with your learning journey</p>
            <div className="flex gap-3 flex-wrap">
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setLocation('/calendar')}
              >
                View Lessons
              </Button>
              <Button 
                variant="outline" 
                className="border-indigo-200 text-indigo-700"
                onClick={() => setLocation('/calendar')}
              >
                View Exercises
              </Button>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-4 md:p-6 pt-4 md:pt-[66px] pb-[66px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              {/* User Avatar */}
              <Avatar className="h-12 w-12 md:h-14 md:w-14 border-2 border-white shadow-lg">
                <AvatarImage src={userProfile?.avatar || user?.avatar} alt={userProfile?.fullName || user?.fullName} />
                <AvatarFallback className="bg-white text-indigo-600 font-bold text-lg">
                  {(userProfile?.fullName || user?.fullName || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex items-center space-x-2">
              {/* Notification Bell */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/calendar')}
                className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl relative"
                style={{ zIndex: 60 }}
              >
                <Bell className="w-6 h-6" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {notificationCount}
                  </span>
                )}
              </Button>
              
              {/* Logout Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl relative"
                style={{ zIndex: 60 }}
              >
                <LogOut className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-2 md:p-4 text-center">
              <div className="text-lg md:text-2xl font-bold text-white flex items-center justify-center space-x-1">
                <FontAwesomeIcon icon={faRocket} className="w-4 h-4 md:w-5 md:h-5 text-green-300" />
                <span>{overallProgress}%</span>
              </div>
              <div className="text-white/80 text-xs md:text-sm hidden md:block">Overall Progress</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-2 md:p-4 text-center">
              <div className="text-lg md:text-2xl font-bold text-white flex items-center justify-center space-x-1">
                <FontAwesomeIcon icon={faBook} className="w-4 h-4 md:w-5 md:h-5 text-blue-300" />
                <span>{subjectData.length}</span>
              </div>
              <div className="text-white/80 text-xs md:text-sm hidden md:block">Available Subjects</div>
            </div>
            <div 
              className="bg-white/20 backdrop-blur-sm rounded-2xl p-2 md:p-4 text-center cursor-pointer hover:bg-white/30 transition-colors"
              onClick={() => setIsPointsModalOpen(true)}
            >
              <div className="text-lg md:text-2xl font-bold text-white flex items-center justify-center space-x-1">
                <FontAwesomeIcon icon={faTrophy} className="w-4 h-4 md:w-5 md:h-5 text-yellow-300" />
                <span>{userProfile?.points || user?.points || 0}</span>
              </div>
              <div className="text-white/80 text-xs md:text-sm hidden md:block">Total Points</div>
            </div>
          </div>
        </div>
      </div>
      {/* Subject Cards */}
      <div className="px-4 md:px-6 -mt-8 space-y-4">
        {subjectData.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30 text-center">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No subjects available</h3>
            <p className="text-slate-600">Check back later for available subjects in your grade.</p>
          </div>
        ) : (
          subjectData.map((subject) => (
            <div
              key={subject.id}
              onClick={() => handleSubjectClick(subject)}
              className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30 cursor-pointer transition-all duration-300 hover:shadow-3xl hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <subject.icon className={`w-12 h-12 ${subject.iconColor}`} />
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{subject.name}</h3>
                    <p className="text-slate-600">{subject.grade}</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-400" />
              </div>

              <div className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Progress</span>
                    <span className="text-sm font-bold text-slate-800">{subject.progress}%</span>
                  </div>
                  <Progress value={subject.progress} className="h-2" />
                </div>

                {/* Topics Started */}
                {subject.topicsStarted !== undefined && subject.totalTopics !== undefined && (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Topics Started</span>
                      <Badge variant={subject.topicsStarted > 0 ? "default" : "secondary"} className="text-xs">
                        {subject.topicsStarted}/{subject.totalTopics}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Access Section */}
      <div 
        ref={quickAccessRef}
        className={`px-4 md:px-6 mt-6 space-y-4 ${
          shouldAnimateQuickAccess 
            ? `transition-all duration-500 ease-out ${quickAccessVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`
            : ''
        }`}
      >
        <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-4">Quick Access</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Today's Lessons */}
          <div 
            className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/30 cursor-pointer transition-all duration-300 hover:shadow-3xl hover:scale-105"
            onClick={() => setLocation('/calendar')}
          >
            <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
              <FontAwesomeIcon icon={faCalendarDay} className="w-8 h-8 md:w-10 md:h-10 text-green-500" />
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-800">Today's Lessons</h3>
                <p className="text-slate-600 text-xs md:text-sm">View scheduled lessons</p>
              </div>
            </div>
            <div className="space-y-2">
              {todaysLessons && todaysLessons.length > 0 ? (
                <>
                  <div className="text-xl md:text-2xl font-bold text-green-600">{todaysLessons.length}</div>
                  <div className="text-xs md:text-sm text-slate-600">lessons available</div>
                  <div className="text-xs text-slate-500">
                    {todaysLessons.slice(0, 2).map((lesson: any, idx: number) => (
                      <div key={idx} className="truncate">{lesson.lessonTitle}</div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xl md:text-2xl font-bold text-slate-400">0</div>
                  <div className="text-xs md:text-sm text-slate-600">No lessons today</div>
                </>
              )}
            </div>
          </div>

          {/* Today's Exercises */}
          <div 
            className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/30 cursor-pointer transition-all duration-300 hover:shadow-3xl hover:scale-105"
            onClick={() => setLocation('/calendar')}
          >
            <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
              <FontAwesomeIcon icon={faPencil} className="w-8 h-8 md:w-10 md:h-10 text-blue-500" />
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-800">Today's Exercises</h3>
                <p className="text-slate-600 text-xs md:text-sm">Practice problems</p>
              </div>
            </div>
            <div className="space-y-2">
              {todaysExercises && todaysExercises.length > 0 ? (
                <>
                  <div className="text-xl md:text-2xl font-bold text-blue-600">{todaysExercises.length}</div>
                  <div className="text-xs md:text-sm text-slate-600">exercises available</div>
                  <div className="text-xs text-slate-500">
                    {todaysExercises.slice(0, 2).map((exercise: any, idx: number) => (
                      <div key={idx} className="truncate">{exercise.title}</div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xl md:text-2xl font-bold text-slate-400">0</div>
                  <div className="text-xs md:text-sm text-slate-600">No exercises today</div>
                </>
              )}
            </div>
          </div>

          {/* Homework */}
          <div 
            className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/30 cursor-pointer transition-all duration-300 hover:shadow-3xl hover:scale-105"
            onClick={() => setLocation('/calendar')}
          >
            <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
              <FontAwesomeIcon icon={faClipboardList} className="w-8 h-8 md:w-10 md:h-10 text-purple-500" />
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-800">Homework</h3>
                <p className="text-slate-600 text-xs md:text-sm">Assignments & tasks</p>
              </div>
            </div>
            <div className="space-y-2">
              {todaysUncompletedHomework && todaysUncompletedHomework.length > 0 ? (
                <>
                  <div className="text-xl md:text-2xl font-bold text-purple-600">{todaysUncompletedHomework.length}</div>
                  <div className="text-xs md:text-sm text-slate-600">assignments due</div>
                  <div className="text-xs text-slate-500">
                    {todaysUncompletedHomework.slice(0, 2).map((hw: any, idx: number) => (
                      <div key={idx} className="truncate">{hw.title}</div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xl md:text-2xl font-bold text-slate-400">0</div>
                  <div className="text-xs md:text-sm text-slate-600">No homework due</div>
                </>
              )}
            </div>
          </div>

          {/* Baseline Assessments */}
          {pastPapersWithStatus && (pastPapersWithStatus as any[]).length > 0 ? (
            (pastPapersWithStatus as any[]).map((assessment: any) => (
              <div 
                key={assessment.subject}
                className={`bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border cursor-pointer transition-all duration-300 hover:shadow-3xl hover:scale-105 ${
                  assessment.isCompleted 
                    ? 'border-green-200' 
                    : 'border-orange-200'
                }`}
                onClick={() => {
                  if (assessment.isCompleted && assessment.id) {
                    // Navigate to baseline assessment results
                    setLocation(`/baseline-feedback?attemptId=${assessment.id}`);
                  } else {
                    // Open baseline assessment modal to start
                    setShowBaselineModal(true);
                  }
                }}
                data-testid={`card-baseline-assessment-${assessment.subject}`}
              >
                <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
                  {assessment.isCompleted ? (
                    <FontAwesomeIcon icon={faFileCircleCheck} className="w-8 h-8 md:w-10 md:h-10 text-green-500" />
                  ) : (
                    <FontAwesomeIcon icon={faBullseye} className="w-8 h-8 md:w-10 md:h-10 text-orange-500" />
                  )}
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-800">Baseline Assessment</h3>
                    <p className="text-slate-600 text-xs md:text-sm capitalize">{assessment.subject?.replace('-', ' ')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {assessment.isCompleted ? (
                    <>
                      <div className="text-xl md:text-2xl font-bold text-green-600">Completed</div>
                      <div className="text-xs md:text-sm text-slate-600">View Results</div>
                    </>
                  ) : (
                    <>
                      <div className="text-xl md:text-2xl font-bold text-orange-600">Not Started</div>
                      <div className="text-xs md:text-sm text-slate-600">Start Assessment</div>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div 
              className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/30 cursor-pointer transition-all duration-300 hover:shadow-3xl hover:scale-105"
              onClick={() => setShowBaselineModal(true)}
              data-testid="card-baseline-assessment"
            >
              <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
                <FontAwesomeIcon icon={faBullseye} className="w-8 h-8 md:w-10 md:h-10 text-orange-500" />
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-800">Baseline Assessment</h3>
                  <p className="text-slate-600 text-xs md:text-sm">Diagnostic test</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xl md:text-2xl font-bold text-orange-600">Not Started</div>
                <div className="text-xs md:text-sm text-slate-600">Start Assessment</div>
              </div>
            </div>
          )}

          {/* Past Papers */}
          <div 
            className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/30 cursor-pointer transition-all duration-300 hover:shadow-3xl hover:scale-105"
            onClick={() => setShowPastPaperModal(true)}
            data-testid="card-past-papers"
          >
            <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
              <FontAwesomeIcon icon={faScroll} className="w-8 h-8 md:w-10 md:h-10 text-amber-500" />
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-800">Past Papers</h3>
                <p className="text-slate-600 text-xs md:text-sm">Exam practice</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xl md:text-2xl font-bold text-amber-600">Practice</div>
              <div className="text-xs md:text-sm text-slate-600">Prepare for exams</div>
            </div>
          </div>

          {/* AI Voice Tutor - Only show if feature is enabled */}
          {hasVoiceTutorAccess && (
            <div 
              className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-purple-200 cursor-pointer transition-all duration-300 hover:shadow-3xl hover:scale-105"
              onClick={() => setLocation('/voice-tutor')}
              data-testid="card-voice-tutor"
            >
              <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
                <FontAwesomeIcon icon={faMicrophone} className="w-8 h-8 md:w-10 md:h-10 text-purple-600" />
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-800">Tsebo Voice Tutor</h3>
                  <p className="text-slate-600 text-xs md:text-sm">Get help with questions</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xl md:text-2xl font-bold text-purple-600">Talk to Tsebo</div>
                <div className="text-xs md:text-sm text-slate-600">Show your question & chat</div>
              </div>
            </div>
          )}

          {/* Tutor Video Call - Only show if feature is enabled */}
          {hasTutorVideoCallAccess && (
            <div 
              className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-teal-200 cursor-pointer transition-all duration-300 hover:shadow-3xl hover:scale-105"
              onClick={() => setLocation('/student-tutoring')}
              data-testid="card-tutor-video-call"
            >
              <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
                <FontAwesomeIcon icon={faVideoCamera} className="w-8 h-8 md:w-10 md:h-10 text-teal-500" />
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-800">Tutor Video Call</h3>
                  <p className="text-slate-600 text-xs md:text-sm">1-on-1 tutoring sessions</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xl md:text-2xl font-bold text-teal-600">Schedule Session</div>
                <div className="text-xs md:text-sm text-slate-600">Book a live tutor session</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
      <PointsBreakdownModal 
        isOpen={isPointsModalOpen} 
        onClose={() => setIsPointsModalOpen(false)} 
      />
      <BaselineAssessmentModal
        isOpen={showBaselineModal}
        onClose={() => setShowBaselineModal(false)}
        studentGrade={userProfile?.grade || user?.grade || '8'}
        availableSubjects={subjects || []}
      />
      <PastPaperSelectionModal
        isOpen={showPastPaperModal}
        onClose={() => setShowPastPaperModal(false)}
        studentGrade={userProfile?.grade || user?.grade || '8'}
        availableSubjects={subjects || []}
      />
    </div>
  );
}