import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Plus, Eye, Edit, BookOpen, Clock, Users, ChevronDown, ChevronUp, TrendingUp, Play, X, Trash2, Trophy, Brain, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import HomeworkForm from "@/components/HomeworkForm";
// AttemptExercise now handled by full page navigation
import BrilliantTutorialLearning from "@/components/BrilliantTutorialLearning";
import HomeworkAnalysis from "@/components/HomeworkAnalysis";
import ShortsVideoPlayer from "@/components/ShortsVideoPlayer";
import ExerciseSubmissionButton from "@/components/ExerciseSubmissionButton";
import TeacherStudentView from "@/components/TeacherStudentView";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useStudentSubjects } from "@/hooks/useStudentSubjects";
import { useToast } from "@/hooks/use-toast";

// Utility function to get YouTube video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/  // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

// Get YouTube thumbnail URL
const getYouTubeThumbnail = (videoUrl: string): string | null => {
  const videoId = getYouTubeVideoId(videoUrl);
  if (!videoId) return null;
  
  // Use maxresdefault for best quality, fallback to hqdefault
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

// Helper function to convert various YouTube URL formats to embed URL
// Returns empty string if not a valid YouTube URL
const getYouTubeEmbedUrl = (url: string): string => {
  if (!url) return '';
  
  // Parameters for auto subtitles
  const params = 'cc_load_policy=1&cc_lang_pref=en';
  
  // Handle youtu.be short links
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}?${params}` : '';
  }
  
  // Handle youtube.com/watch?v= links
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}?${params}` : '';
  }
  
  // Handle youtube.com/embed/ links (already in correct format)
  if (url.includes('youtube.com/embed/')) {
    // Add params if not already present
    return url.includes('?') ? `${url}&${params}` : `${url}?${params}`;
  }
  
  // Not a valid YouTube URL - return empty string
  return '';
};

// Check if URL is a valid YouTube URL
const isValidYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes('youtu.be/') || 
         url.includes('youtube.com/watch?v=') || 
         url.includes('youtube.com/embed/');
};

// Generation Counter Component
const GenerationCounter = () => {
  const { data: generationData } = useQuery({
    queryKey: ['/api/student/daily-exercise-generations'],
    queryFn: () => apiRequest('/api/student/daily-exercise-generations'),
  });
  
  const remaining = Math.max(0, 5 - (generationData?.count || 0));
  
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 rounded-full shrink-0">
      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
      <span className="text-purple-700 font-bold text-sm">{remaining}</span>
      <span className="text-purple-600 font-medium text-xs hidden sm:inline">left</span>
    </div>
  );
};

interface HomeworkQuestion {
  id: string;
  question: string;
  type: 'equation' | 'system' | 'expression';
  difficulty: 'easy' | 'medium' | 'hard';
  points?: number;
  answer?: string;
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
}

interface QuizData {
  id: string;
  classId: string;
  className: string;
  subject: string;
  title: string;
  duration: number;
  questions: HomeworkQuestion[];
  scheduledDate: string;
  published: boolean;
}

interface ChildData {
  id: number;
  firstName: string;
  lastName: string;
  grade: string;
  school: string;
  parentId: number;
  points: number;
  createdAt: Date;
}

const sampleQuestions: HomeworkQuestion[] = [
  {
    id: "q1",
    question: "Solve for x: (2x² - 8) / 4x = 0",
    type: "equation",
    difficulty: "medium",
    points: 12
  },
  {
    id: "q2", 
    question: "Solve the system of equations: 2x + y = 7 and x - y = 1",
    type: "system",
    difficulty: "medium",
    points: 15
  },
  {
    id: "q3",
    question: "Simplify the expression: 3x² + 2x - 5x² + 7x",
    type: "expression", 
    difficulty: "easy",
    points: 8
  },
  {
    id: "q4",
    question: "Factor completely: x² - 9x + 20",
    type: "expression",
    difficulty: "medium",
    points: 10
  }
];

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [homework, setHomework] = useState<Homework[]>([]);
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formType, setFormType] = useState<'homework' | 'quiz'>('homework');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [expandedHomework, setExpandedHomework] = useState<Set<string>>(new Set());
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [parallaxOffset, setParallaxOffset] = useState(0);
  // Exercise attempts now handled by full page navigation
  const [tutorialExercise, setTutorialExercise] = useState<any>(null);
  const [isLoadingHomework, setIsLoadingHomework] = useState(false);
  const [showHomeworkAnalysis, setShowHomeworkAnalysis] = useState(false);
  const [selectedHomeworkForAnalysis, setSelectedHomeworkForAnalysis] = useState<Homework | null>(null);
  const [selectedVideoLesson, setSelectedVideoLesson] = useState<any>(null);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [showStudentView, setShowStudentView] = useState(false);

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get current user data from auth context
  const { user: authUser } = useAuth();
  const currentUser = authUser || {};
  const userRole = (currentUser as any)?.role;
  const isParent = userRole === 'parent';

  // Mark calendar as viewed mutation
  const markCalendarViewed = useMutation({
    mutationFn: () => apiRequest('/api/calendar/mark-viewed', {
      method: 'POST',
    }),
    onSuccess: () => {
      // Invalidate notification count to update the badge
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
      console.log('📅 Calendar marked as viewed - notifications cleared');
    },
  });

  // Mark calendar as viewed when component mounts (only for students)
  useEffect(() => {
    if (userRole === 'student' && !markCalendarViewed.isPending) {
      markCalendarViewed.mutate();
    }
  }, [userRole]); // Re-run when userRole becomes available
  
  // Fetch user's actual subjects (for students)
  const { data: userSubjects = [] } = useStudentSubjects();
  
  // Fetch student profile to get accurate gradeLevel
  const { data: studentProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: userRole === 'student',
  });
  
  // Fetch today's lessons from database for all subjects
  const selectedDateStr = selectedDate.toLocaleDateString('en-CA');
  
  // Get grade from student profile for students, otherwise fallback to auth user or default
  // For students, wait for profile to load before defaulting to avoid incorrect grade
  // Note: The profile API returns grade as 'grade' not 'gradeLevel'
  const userGrade = userRole === 'student' 
    ? (studentProfile?.grade || (isLoadingProfile ? undefined : '8'))
    : ((currentUser as any)?.gradeLevel || (currentUser as any)?.grade || '8');
  
  // Fetch teacher's classes for subject extraction
  const { data: teacherClassesForSubjects = [] } = useQuery({
    queryKey: ['/api/classes'],
    enabled: userRole === 'teacher',
  });
  
  // Extract unique subjects from teacher's classes
  const teacherSubjects = useMemo(() => {
    if (userRole !== 'teacher' || !teacherClassesForSubjects.length) return [];
    const uniqueSubjects = [...new Set(teacherClassesForSubjects.map((cls: any) => cls.subject))];
    return uniqueSubjects;
  }, [userRole, teacherClassesForSubjects]);
  
  // Use user's actual subjects for students, teacher's class subjects for teachers, or all subjects for parents
  const subjects = userRole === 'student' ? userSubjects : userRole === 'teacher' ? teacherSubjects : ['mathematics', 'physical science', 'life sciences', 'english', 'history', 'geography'];
  
  // Fetch lessons for all subjects
  const { data: allTodayLessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['all-lessons', selectedDateStr, userGrade],
    queryFn: async () => {
      console.log('Calendar fetching lessons for all subjects:', { date: selectedDateStr, grade: userGrade });
      
      const lessonPromises = subjects.map(async (subject) => {
        try {
          const lessons = await apiRequest(
            `/api/syllabus-calendar?date=${encodeURIComponent(selectedDateStr)}&grade=${encodeURIComponent(userGrade)}&subject=${encodeURIComponent(subject)}`
          );
          
          return lessons.map((lesson: any) => ({ ...lesson, subject: subject }));
        } catch (error) {
          console.error(`Failed to fetch ${subject} lessons:`, error);
          return [];
        }
      });
      
      const allLessons = await Promise.all(lessonPromises);
      const flattenedLessons = allLessons.flat();
      
      console.log('Calendar fetched all lessons:', flattenedLessons);
      return flattenedLessons;
    },
    enabled: !!userGrade, // Only fetch when grade is available
  });
  
  // Get current user role - check both localStorage and user object
  const storedRole = localStorage.getItem('userRole');
  const isStudent = userRole === 'student';

  // Fetch children data for parent users
  const { data: parentChildren = [] } = useQuery({
    queryKey: ['/api/children'],
    queryFn: () => apiRequest('/api/children'),
    enabled: isParent,
  });

  // Get current selected child data
  const currentChildData = parentChildren.find((child: any) => child.firstName === selectedChild);
  
  // Fetch selected child's subjects from student stats
  const { data: childStudentStats } = useQuery({
    queryKey: ['/api/students', currentChildData?.studentUserId, 'stats'],
    queryFn: () => apiRequest(`/api/students/${currentChildData?.studentUserId}/stats`),
    enabled: isParent && !!currentChildData?.studentUserId
  });

  // Get available subjects for the selected child
  const childSubjects = childStudentStats?.subjectProgress?.map((subject: any) => 
    subject.subject.replace(/-/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase())
  ) || [];

  
  // Debug role detection - remove in production
  // console.log('Role detection:', { storedRole, currentUser, currentUserRole: currentUser.role, userRole, isParent, isStudent });

  // Group lessons by subject for organized display
  const lessonsBySubject = allTodayLessons.reduce((acc: any, lesson: any) => {
    const subject = lesson.subject || 'unknown';
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(lesson);
    return acc;
  }, {});

  // Filter lessons by subject if a specific subject is selected
  const filteredLessonsBySubject = subjectFilter === 'all' 
    ? lessonsBySubject 
    : Object.fromEntries(
        Object.entries(lessonsBySubject).filter(([subject]) => subject === subjectFilter)
      );

  // Get student ID for fetching assignments data
  // For actual students, use their own user ID
  // For parents viewing child data, find the selected child's student user ID
  let effectiveStudentUserId = null;
  let shouldFetchStudentData = false;
  
  if (isStudent) {
    // Direct student user
    effectiveStudentUserId = (currentUser as any)?.id;
    shouldFetchStudentData = !!effectiveStudentUserId;
    console.log('🔍 Student data fetch:', { isStudent, effectiveStudentUserId, shouldFetchStudentData });
  } else if (isParent && selectedChild && parentChildren.length > 0) {
    // Parent viewing specific child's data
    const childData = parentChildren.find((child: any) => child.firstName === selectedChild);
    if (childData && childData.studentUserId) {
      effectiveStudentUserId = childData.studentUserId;
      shouldFetchStudentData = true;
    }
    console.log('🔍 Parent viewing child:', { selectedChild, childData, effectiveStudentUserId, shouldFetchStudentData });
  }
  
  // Calculate date range for fetching assignments (±7 days from selected date for better performance)
  const assignmentsDateRange = useMemo(() => {
    const selected = new Date(selectedDate);
    const startDate = new Date(selected);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(selected);
    endDate.setDate(endDate.getDate() + 7);
    return {
      startDate: startDate.toLocaleDateString('en-CA'), // YYYY-MM-DD format
      endDate: endDate.toLocaleDateString('en-CA')
    };
  }, [selectedDate]);
  
  // Fetch homework and exercises from assignments endpoint for students or parent viewing child
  // Using date range filtering (±7 days) for better performance with large datasets
  const { data: assignmentsData = [], isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['/api/students', effectiveStudentUserId, 'assignments', assignmentsDateRange.startDate, assignmentsDateRange.endDate],
    queryFn: () => apiRequest(`/api/students/${effectiveStudentUserId}/assignments?startDate=${assignmentsDateRange.startDate}&endDate=${assignmentsDateRange.endDate}`),
    enabled: shouldFetchStudentData,
  });
  
  console.log('📊 Assignments query:', { 
    enabled: shouldFetchStudentData, 
    loading: assignmentsLoading, 
    dataCount: assignmentsData?.length || 0,
    error: assignmentsError,
    effectiveStudentUserId,
    dateRange: assignmentsDateRange
  });

  // Exercise queries for all users except parents (keeping existing logic for admin exercises)
  const shouldFetchExercises = !isParent && !!userGrade && userGrade !== 'undefined' && userGrade !== undefined;
  
  const { data: todayExercises = [], isLoading: exercisesLoading, error: exercisesError } = useQuery({
    queryKey: [`/api/exercises?date=${selectedDateStr}&grade=${userGrade}`],
    enabled: shouldFetchExercises,
  });



  // Format mathematical expressions with proper superscripts
  const formatMathExpression = (text: string): string => {
    if (!text) return text;
    
    // Replace patterns like "3^2" with "3²", "x^n" with "xⁿ", etc.
    return text
      .replace(/(\w|\))\^0/g, '$1⁰')
      .replace(/(\w|\))\^1/g, '$1¹')
      .replace(/(\w|\))\^2/g, '$1²')
      .replace(/(\w|\))\^3/g, '$1³')
      .replace(/(\w|\))\^4/g, '$1⁴')
      .replace(/(\w|\))\^5/g, '$1⁵')
      .replace(/(\w|\))\^6/g, '$1⁶')
      .replace(/(\w|\))\^7/g, '$1⁷')
      .replace(/(\w|\))\^8/g, '$1⁸')
      .replace(/(\w|\))\^9/g, '$1⁹')
      .replace(/(\w|\))\^(-?\w+)/g, '$1^($2)'); // Keep complex exponents with parentheses
  };
  
  // Fetch children data for parent
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['/api/children/parent', (currentUser as any)?.id],
    enabled: isParent && !!(currentUser as any)?.id,
  }) as { data: ChildData[], isLoading: boolean };

  // Fetch teacher's classes for homework creation
  const { data: teacherClasses = [], isLoading: classesLoading, error: classesError } = useQuery({
    queryKey: ['/api/classes'],
    enabled: !isParent && !!(currentUser as any)?.id,
  });

  // Debug the classes data (can be removed after fixing)
  // console.log('Classes data:', { teacherClasses, classesLoading, classesError, isParent, currentUserId: currentUser.id });

  // Mock assessment status function for consistent results
  const getAssessmentStatus = (id: string | number) => {
    // Use ID to generate consistent status
    const idStr = String(id);
    const hash = idStr.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const isMissed = hash % 10 > 7; // 30% chance of missed
    const percentage = hash % 101; // 0-100%
    return { isMissed, percentage };
  };

  // Separate useEffect for classes loading
  useEffect(() => {
    if (Array.isArray(teacherClasses) && teacherClasses.length > 0) {
      setClasses(teacherClasses);
    } else {
      const savedClasses = localStorage.getItem('teacherClasses');
      if (savedClasses) {
        setClasses(JSON.parse(savedClasses));
      }
    }
  }, [teacherClasses]);

  // Separate useEffect for children loading (only for parents)
  useEffect(() => {
    if (isParent && !children.length) {
      const savedChildren = localStorage.getItem('children');
      if (!savedChildren) {
        const sampleChildren = [
          { 
            id: 1, 
            firstName: 'Emma', 
            lastName: 'Johnson', 
            grade: 'Grade 10',
            school: 'Green Valley High',
            parentId: (currentUser as any)?.id,
            points: 0,
            createdAt: new Date()
          },
          { 
            id: 2, 
            firstName: 'Lucas', 
            lastName: 'Johnson', 
            grade: 'Grade 8',
            school: 'Green Valley High',
            parentId: (currentUser as any)?.id,
            points: 0,
            createdAt: new Date()
          }
        ];
        localStorage.setItem('children', JSON.stringify(sampleChildren));
      }
    }
  }, [isParent, children.length, (currentUser as any)?.id]);

  // Auto-select child if only one child and none selected
  useEffect(() => {
    if (isParent && parentChildren.length === 1 && !selectedChild) {
      setSelectedChild(parentChildren[0].firstName);
    }
  }, [isParent, parentChildren.length, selectedChild]);

  // Parallax scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      // Parallax factor: 0.5 means the header scrolls at half speed
      setParallaxOffset(scrollPosition * 0.5);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-select mathematics as default subject for homework display
  useEffect(() => {
    if (isParent && selectedChild && !selectedSubject && childSubjects.length > 0) {
      // Prefer Mathematics if available, otherwise select first subject
      const mathSubject = childSubjects.find((subject: string) => 
        subject.toLowerCase().includes('math')
      );
      setSelectedSubject(mathSubject || childSubjects[0]);
    }
  }, [isParent, selectedChild, selectedSubject, childSubjects]);

  // Separate useEffect for localStorage saving
  useEffect(() => {
    if (selectedChild) localStorage.setItem('selectedChild', selectedChild);
    if (selectedSubject) localStorage.setItem('selectedSubject', selectedSubject);
  }, [selectedChild, selectedSubject]);

  // Load homework from database for teachers only (students get homework through assignmentsData)
  const loadedDataRef = useRef(false);
  
  useEffect(() => {
    // Only load for teachers
    if (userRole !== 'teacher') return;
    if (loadedDataRef.current) return;
    
    const loadHomeworkData = async () => {
      console.log('🔍 Calendar - Loading homework data for teacher');
      
      setIsLoadingHomework(true);
      try {
        // Load homework from API
        const homeworkData = await apiRequest('/api/homework');
        console.log('🔍 Calendar - Received homework data:', homeworkData.length, 'items');
        
        setHomework(homeworkData);
        
      } catch (error) {
        console.error('Error loading homework:', error);
      } finally {
        setIsLoadingHomework(false);
        loadedDataRef.current = true;
      }
    };

    loadHomeworkData();
  }, [userRole]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-CA');
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
    if (isParent && (!selectedChild || !selectedSubject)) {
      return [];
    }
    
    // For students or parents viewing child data, use assignments data (includes questions and submissions)
    if (shouldFetchStudentData && assignmentsData) {
      const homeworkAssignments = assignmentsData.filter((assignment: any) => {
        if (assignment.type !== 'homework') return false;
        if (isParent && assignment.subject !== selectedSubject) return false;
        
        const assignmentDate = new Date(assignment.due_date).toISOString().split('T')[0];
        return assignmentDate === date;
      });
      
      console.log(`🔧 getHomeworkForDate - Found ${homeworkAssignments.length} homework for ${date}`);
      
      // Convert assignments format to homework format for compatibility
      return homeworkAssignments.map((assignment: any) => {
        const hasSubmission = assignment.status === 'completed';
        console.log(`🔧 getHomeworkForDate - Assignment ${assignment.id}: status=${assignment.status}, hasSubmission=${hasSubmission}`);
        
        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description || '',
          dueDate: assignment.due_date,
          subject: assignment.subject,
          className: assignment.class_name || 'Mathematics Class',
          published: assignment.published !== undefined ? assignment.published : true,
          questions: assignment.questions || [],
          createdAt: assignment.created_at,
          // Include submission data from flat fields
          _submission: hasSubmission ? {
            score: assignment.score, // Student's actual score
            totalScore: assignment.score, // Student's actual score (for compatibility)
            totalMarks: assignment.total_marks, // Total possible marks
            answers: assignment.answers,
            feedback: assignment.feedback,
            submittedAt: assignment.submitted_at
          } : null
        };
      });
    }
    
    // For teachers, use homework state
    const filtered = homework.filter(hw => {
      const hwDate = typeof hw.dueDate === 'string' 
        ? hw.dueDate.split('T')[0] 
        : new Date(hw.dueDate).toISOString().split('T')[0];
      const dateMatch = hwDate === date;
      const subjectMatch = isParent ? hw.subject === selectedSubject : true;
      
      return dateMatch && subjectMatch;
    });
    
    return filtered;
  };

  const getQuizzesForDate = (date: string) => {
    if (isParent && (!selectedChild || !selectedSubject)) {
      return [];
    }
    
    // For students or parents viewing child data, check assignments data for quizzes
    if (shouldFetchStudentData && assignmentsData) {
      const quizAssignments = assignmentsData.filter((assignment: any) => 
        assignment.type === 'quiz' && 
        new Date(assignment.due_date).toISOString().split('T')[0] === date &&
        (isParent ? assignment.subject === selectedSubject : true)
      );
      
      return quizAssignments.map((assignment: any) => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description || '',
        scheduledDate: assignment.due_date,
        duration: assignment.duration || 60,
        subject: assignment.subject,
        className: assignment.class_name || 'Mathematics Class',
        published: true,
        questions: [],
      }));
    }
    
    return quizzes.filter(quiz => {
      const quizDate = typeof quiz.scheduledDate === 'string' 
        ? quiz.scheduledDate.split('T')[0] 
        : new Date(quiz.scheduledDate).toISOString().split('T')[0];
      const dateMatch = quizDate === date;
      const subjectMatch = isParent ? quiz.subject === selectedSubject : true;
      return dateMatch && subjectMatch;
    });
  };

  const togglePublished = async (type: 'homework' | 'quiz', id: string) => {
    try {
      if (type === 'homework') {
        // Find current homework to get current published status
        const currentHomework = homework.find(hw => hw.id === id);
        if (!currentHomework) return;
        
        // Update database first
        await apiRequest(`/api/homework/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            published: !currentHomework.published
          })
        });
        
        // Update local state after successful API call
        setHomework(prev => prev.map(hw => 
          hw.id === id ? { ...hw, published: !hw.published } : hw
        ));
        
        console.log(`Homework ${id} published status updated to: ${!currentHomework.published}`);
        
      } else {
        // Quiz update logic (can be implemented similarly if needed)
        setQuizzes(prev => {
          const updated = prev.map(quiz => 
            quiz.id === id ? { ...quiz, published: !quiz.published } : quiz
          );
          
          // Store published quizzes for students
          const publishedQuizzes = updated.filter(quiz => quiz.published);
          localStorage.setItem('publishedQuizzes', JSON.stringify(publishedQuizzes));
          
          return updated;
        });
      }
    } catch (error) {
      console.error(`Error updating ${type} published status:`, error);
      alert(`Failed to update ${type} published status. Please try again.`);
    }
  };

  const handleCreateContent = (type: 'homework' | 'quiz') => {
    setFormType(type);
    setShowCreateForm(true);
    setShowTypeSelector(false);
  }

  const handleOpenVideoPlayer = (lesson: any) => {
    setSelectedVideoLesson(lesson);
    setIsVideoPlayerOpen(true);
  };

  const handleCloseVideoPlayer = () => {
    setIsVideoPlayerOpen(false);
    setSelectedVideoLesson(null);
  };;

  const handleHomeworkSubmission = (homework: any, answers: any[]) => {
    console.log('Homework submitted:', homework, answers);
    // Store homework data in localStorage for the feedback page
    localStorage.setItem('homeworkFeedback', JSON.stringify(homework));
    localStorage.setItem('submittedAnswers', JSON.stringify(answers));
    // Navigate to the feedback page
    setLocation('/homework-feedback');
  };

  // Exercise submission now handled by full page AttemptExercise component

  const handleSaveContent = async (data: any) => {
    try {
      if (data.type === 'homework') {
        // Create single homework assignment for the first selected class
        // This ensures students can see and submit homework properly
        const classId = data.classIds[0]; // Use first selected class
        const homeworkData = {
          classId: parseInt(classId),
          title: data.title,
          description: data.description,
          questions: data.questions,
          dueDate: data.dueDate,
          published: false,
          topicId: data.topicId,
          themeId: data.themeId
        };

        console.log('Creating homework for class:', classId, homeworkData);
        
        const response = await apiRequest('/api/homework', {
          method: 'POST',
          body: JSON.stringify({
            ...homeworkData,
            dueDate: data.dueDate
          }),
        });
        
        console.log('Homework created successfully:', response);

        // Add to local state for immediate UI update
        const newHomework = {
          ...response,
          className: classes.find(c => c.id === response.classId)?.name || 'Unknown Class',
          subject: classes.find(c => c.id === response.classId)?.subject || 'Unknown Subject'
        };
        setHomework(prev => [...prev, newHomework]);
        
        // Reload homework from API to ensure consistency
        if (userRole === 'teacher') {
          setTimeout(async () => {
            try {
              const [homeworkData, quizzesData] = await Promise.all([
                apiRequest('/api/homework'),
                apiRequest('/api/quizzes')
              ]);

              // Map homework data properly without grouping
              const mappedHomework = homeworkData.map((hw: any) => ({
                ...hw,
                className: classes.find(c => c.id === hw.classId)?.name || 'Unknown Class',
                subject: classes.find(c => c.id === hw.classId)?.subject || 'Unknown Subject'
              }));
              setHomework(mappedHomework);

              // Map database quizzes to match UI format
              const mappedQuizzes = quizzesData.map((quiz: any) => ({
                ...quiz,
                className: classes.find(c => c.id === quiz.classId)?.name || 'Unknown Class',
                subject: classes.find(c => c.id === quiz.classId)?.subject || 'Unknown Subject'
              }));
              setQuizzes(mappedQuizzes);
            } catch (error) {
              console.error('Error reloading homework and quizzes:', error);
            }
          }, 100);
        }
        
      } else {
        // Create single quiz assignment for the first selected class
        const classId = data.classIds[0]; // Use first selected class
        const quizData = {
          classId: parseInt(classId),
          title: data.title,
          description: data.description,
          duration: data.duration || 30,
          questions: data.questions,
          scheduledDate: data.dueDate,
          published: false
        };

        const response = await apiRequest('/api/quizzes', {
          method: 'POST',
          body: JSON.stringify({
            ...quizData,
            scheduledDate: data.dueDate
          }),
        });

        const createdQuiz = response;
        
        // Add to local state for immediate UI update
        const newQuiz = {
          ...createdQuiz,
          className: classes.find(c => c.id === createdQuiz.classId)?.name || 'Unknown Class',
          subject: classes.find(c => c.id === createdQuiz.classId)?.subject || 'Unknown Subject'
        };
        setQuizzes(prev => [...prev, newQuiz]);
      }
      
      setShowCreateForm(false);
      console.log(`${data.type} created successfully for ${data.classIds.length} classes`);
    } catch (error) {
      console.error(`Error creating ${data.type}:`, error);
      alert(`Failed to create ${data.type}. Please try again.`);
    }
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

  const toggleExerciseExpanded = (exerciseId: string) => {
    setExpandedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const toggleLessonExpanded = (subject: string) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subject)) {
        newSet.delete(subject);
      } else {
        newSet.add(subject);
      }
      return newSet;
    });
  };

  const handleEditQuestion = (homeworkId: string, questionId: string) => {
    // Find the homework and question
    const currentHomework = homework.find(hw => hw.id === homeworkId);
    if (!currentHomework) return;
    
    const question = currentHomework.questions.find(q => q.id === questionId);
    if (!question) return;
    
    // For now, just show an alert - this could be expanded to show an edit modal
    const newQuestionText = prompt("Edit question:", question.question);
    if (newQuestionText && newQuestionText.trim()) {
      setHomework(prev => prev.map(hw => {
        if (hw.id === homeworkId) {
          return {
            ...hw,
            questions: hw.questions.map(q => 
              q.id === questionId ? { ...q, question: newQuestionText.trim() } : q
            )
          };
        }
        return hw;
      }));
      
      // Update localStorage
      setHomework(prev => {
        const publishedHomework = prev.filter(hw => hw.published);
        localStorage.setItem('publishedHomework', JSON.stringify(publishedHomework));
        return prev;
      });
    }
  };

  const handleDeleteHomework = async (homeworkItem: any) => {
    if (!confirm("Are you sure you want to delete this homework? This action cannot be undone.")) {
      return;
    }

    try {
      // Delete single homework entry
      await apiRequest(`/api/homework/${homeworkItem.id}`, {
        method: 'DELETE'
      });

      // Remove from local state
      setHomework(prev => prev.filter(hw => hw.id !== homeworkItem.id));

      console.log('Homework deleted successfully');
    } catch (error) {
      console.error('Error deleting homework:', error);
      alert('Failed to delete homework. Please try again.');
    }
  };

  const handleDeleteQuestion = (homeworkId: string, questionId: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      setHomework(prev => prev.map(hw => {
        if (hw.id === homeworkId) {
          return {
            ...hw,
            questions: hw.questions.filter(q => q.id !== questionId)
          };
        }
        return hw;
      }));
      
      // Update localStorage
      setHomework(prev => {
        const publishedHomework = prev.filter(hw => hw.published);
        localStorage.setItem('publishedHomework', JSON.stringify(publishedHomework));
        return prev;
      });
    }
  };

  // Memoize today's data to prevent re-computation on every render
  const todayHomework = useMemo(() => getHomeworkForDate(selectedDateStr), [selectedDateStr, homework, assignmentsData, selectedChild, selectedSubject, isParent, shouldFetchStudentData]);
  const todayQuizzes = useMemo(() => getQuizzesForDate(selectedDateStr), [selectedDateStr, assignmentsData, selectedChild, selectedSubject, isParent, shouldFetchStudentData, quizzes]);
  
  // Filter homework by subject if a specific subject is selected (memoized for performance)
  const filteredTodayHomework = useMemo(() => {
    return subjectFilter === 'all' 
      ? todayHomework 
      : todayHomework.filter((hw: any) => hw.subject === subjectFilter);
  }, [subjectFilter, todayHomework]);
  
  // Filter exercises by subject if a specific subject is selected (memoized for performance)
  const filteredTodayExercises = useMemo(() => {
    return subjectFilter === 'all' 
      ? todayExercises 
      : todayExercises.filter((ex: any) => ex.subject === subjectFilter);
  }, [subjectFilter, todayExercises]);
  
  // Debug logging for homework display (can be removed in production)
  console.log('Calendar - Homework loaded:', {
    date: selectedDateStr,
    assignments: assignmentsData.length,
    todaysHomework: todayHomework.length,
    selectedChild,
    selectedSubject
  });

  // Show tutorial learning screen if tutorial exercise is selected
  if (tutorialExercise) {
    return (
      <BrilliantTutorialLearning 
        exercise={tutorialExercise} 
        onClose={() => setTutorialExercise(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pt-16">
      {/* Header */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"
        style={{ transform: `translateY(${parallaxOffset}px)` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            {!isParent && <h1 className="text-2xl font-bold text-white">Calendar</h1>}
            {isParent ? (
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <div className="w-full sm:w-36">
                  <Select value={selectedChild} onValueChange={setSelectedChild}>
                    <SelectTrigger className="bg-white/20 border-white/30 text-white rounded-2xl backdrop-blur-sm hover:bg-white/30">
                      <SelectValue placeholder="Select Child" />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl border border-slate-200">
                      {parentChildren.map((child: any) => (
                        <SelectItem 
                          key={child.id} 
                          value={child.firstName} 
                          className="cursor-pointer hover:bg-slate-50"
                        >
                          {child.firstName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-36">
                  <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedChild}>
                    <SelectTrigger className="bg-white/20 border-white/30 text-white rounded-2xl backdrop-blur-sm hover:bg-white/30 disabled:opacity-50">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl border border-slate-200">
                      {childSubjects.length > 0 ? (
                        childSubjects.map((subject: string) => (
                          <SelectItem key={subject} value={subject} className="cursor-pointer hover:bg-slate-50">
                            {subject}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled className="cursor-not-allowed opacity-50">
                          {selectedChild ? 'Loading subjects...' : 'Select a child first'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="bg-white/20 border-white/30 text-white rounded-2xl backdrop-blur-sm hover:bg-white/30 w-48">
                    <SelectValue>
                      {subjectFilter === 'all' ? 'All Subjects' : 
                       subjectFilter === 'mathematics' ? 'Mathematics' : 
                       subjectFilter === 'physical-science' ? 'Physical Science' : 
                       subjectFilter === 'life-sciences' ? 'Life Sciences' : 
                       subjectFilter === 'english' ? 'English' : 
                       subjectFilter === 'history' ? 'History' : 
                       subjectFilter === 'geography' ? 'Geography' : 'All Subjects'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl border border-slate-200">
                    {subjects.length > 1 && <SelectItem value="all" className="cursor-pointer hover:bg-slate-50">All Subjects</SelectItem>}
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject} className="cursor-pointer hover:bg-slate-50">
                        {subject === 'mathematics' ? 'Mathematics' : 
                         subject === 'physical-science' ? 'Physical Science' : 
                         subject === 'life-sciences' ? 'Life Sciences' : 
                         subject === 'english' ? 'English' : 
                         subject === 'history' ? 'History' : 
                         subject === 'geography' ? 'Geography' : subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Student Info: Grade & Subjects */}
          {isStudent && (
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white/30 rounded-full p-2">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Grade {userGrade}</p>
                    <p className="text-blue-100 text-xs opacity-90">
                      {userSubjects.length > 0 ? `${userSubjects.length} subject${userSubjects.length !== 1 ? 's' : ''}` : 'No subjects'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {userSubjects.map((subject) => (
                    <Badge key={subject} className={`text-xs px-3 py-1 ${
                      subject === 'mathematics' ? 'bg-red-500/80 text-white' :
                      subject === 'physical-science' ? 'bg-blue-500/80 text-white' :
                      subject === 'life-sciences' ? 'bg-green-500/80 text-white' :
                      subject === 'english' ? 'bg-purple-500/80 text-white' :
                      subject === 'history' ? 'bg-orange-500/80 text-white' :
                      subject === 'geography' ? 'bg-teal-500/80 text-white' :
                      'bg-gray-500/80 text-white'
                    }`}>
                      {subject === 'mathematics' ? 'Mathematics' :
                       subject === 'physical-science' ? 'Physical Science' :
                       subject === 'life-sciences' ? 'Life Sciences' :
                       subject === 'english' ? 'English' :
                       subject === 'history' ? 'History' :
                       subject === 'geography' ? 'Geography' : subject}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="text-white text-center mb-4">
            <p className="text-blue-100 text-sm opacity-90">
              {isParent ? (
                !selectedChild || !selectedSubject 
                  ? "Please select a child and subject to view their assessments"
                  : `View ${selectedSubject} assessments for ${selectedChild}`
              ) : isStudent ? "View your lessons, homework, and assessments" : "Manage homework and quizzes for your classes"}
            </p>
            {isParent && selectedChild && selectedSubject && (
              <Button
                onClick={() => setLocation("/parent-analytics")}
                variant="outline"
                className="mt-3 bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                View Detailed Analytics
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* Horizontal Date Picker */}
      <div className="px-6 -mt-6">
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 shadow-2xl border border-white/30 mb-6">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(selectedDate.getDate() - 7);
                  setSelectedDate(newDate);
                }}
                className="rounded-full"
                title="Previous week"
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
                  newDate.setDate(selectedDate.getDate() + 7);
                  setSelectedDate(newDate);
                }}
                className="rounded-full"
                title="Next week"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="text-xs px-3 py-1 h-7 rounded-full bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              >
                Today
              </Button>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value + 'T12:00:00');
                  if (!isNaN(newDate.getTime())) {
                    setSelectedDate(newDate);
                  }
                }}
                className="text-xs px-3 py-1 h-7 rounded-full border border-slate-200 bg-white text-slate-700 cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="flex space-x-2 overflow-x-auto">
            {getDateRange().map((date, index) => {
              const isSelected = formatDate(date) === selectedDateStr;
              const isToday = formatDate(date) === formatDate(new Date());
              
              return (
                <button
                  key={index}
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Content for Selected Date */}
        <div className="space-y-6">
          {/* Today's Lessons Section - For all users */}
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
            <div className="flex items-center space-x-3 mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 000-5H9v5zm0 0H7.5a2.5 2.5 0 000 5H9v-5zm0 0v5m0-5h2.5a2.5 2.5 0 000-5M9 15v-5" />
              </svg>
              <h2 className="text-xl font-bold text-slate-800">Today's Lessons</h2>
              <span className="text-sm text-slate-500">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })} • Grade {userGrade}
              </span>
            </div>

            {lessonsLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="loader"></div>
                <p className="text-slate-600 font-medium mt-2">Loading lessons...</p>
              </div>
            ) : (subjectFilter === 'all' ? allTodayLessons.length : Object.keys(filteredLessonsBySubject).length) > 0 ? (
              <div className="space-y-4">
                {Object.entries(filteredLessonsBySubject).map(([subject, lessons]: [string, any]) => {
                  const isExpanded = expandedLessons.has(subject);
                  const subjectDisplayName = subject.replace('_', ' ').split(' ').map((word: string) => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ');
                  
                  return (
                    <div key={subject} className={`rounded-2xl p-4 border overflow-hidden ${
                      subject === 'mathematics' ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-100' :
                      subject === 'physical science' ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100' :
                      subject === 'life sciences' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100' :
                      subject === 'english' ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100' :
                      subject === 'history' ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-100' :
                      subject === 'geography' ? 'bg-gradient-to-r from-teal-50 to-blue-50 border-teal-100' :
                      'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-100'
                    }`}>
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${
                              subject === 'mathematics' ? 'bg-red-500' :
                              subject === 'physical science' ? 'bg-blue-500' :
                              subject === 'life sciences' ? 'bg-green-500' :
                              subject === 'english' ? 'bg-purple-500' :
                              subject === 'history' ? 'bg-orange-500' :
                              subject === 'geography' ? 'bg-teal-500' :
                              'bg-gray-500'
                            }`}></div>
                            <h3 className="text-lg font-bold text-slate-800 truncate flex-1">
                              {subjectDisplayName}
                            </h3>
                            <Button
                              onClick={() => toggleLessonExpanded(subject)}
                              variant="ghost"
                              size="icon"
                              className={`w-8 h-8 rounded-full flex-shrink-0 ${
                                subject === 'mathematics' ? 'hover:bg-red-200' :
                                subject === 'physical science' ? 'hover:bg-blue-200' :
                                subject === 'life sciences' ? 'hover:bg-green-200' :
                                subject === 'english' ? 'hover:bg-purple-200' :
                                subject === 'history' ? 'hover:bg-orange-200' :
                                subject === 'geography' ? 'hover:bg-teal-200' :
                                'hover:bg-gray-200'
                              }`}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                          <p className={`text-sm font-medium truncate ${
                            subject === 'mathematics' ? 'text-red-600' :
                            subject === 'physical science' ? 'text-blue-600' :
                            subject === 'life sciences' ? 'text-green-600' :
                            subject === 'english' ? 'text-purple-600' :
                            subject === 'history' ? 'text-orange-600' :
                            subject === 'geography' ? 'text-teal-600' :
                            'text-gray-600'
                          }`}>
                            {lessons.length} lesson{lessons.length > 1 ? 's' : ''} scheduled
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                            <span className="whitespace-nowrap">Grade {userGrade}</span>
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="space-y-3 mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">Today's {subjectDisplayName} Lessons:</p>
                            <span className="text-xs text-slate-500">Educational content</span>
                          </div>
                          {lessons.map((lesson: any) => (
                            <div key={lesson.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition-colors overflow-hidden">
                              <div className="flex justify-between items-start mb-2 gap-2">
                                <h4 className="text-sm font-bold text-slate-800 flex-1">
                                  {lesson.lesson_title || lesson.lessonTitle}
                                </h4>
                              </div>
                              <p className="text-sm text-slate-700 mb-3 leading-relaxed break-words">
                                {lesson.description || `${subjectDisplayName} lesson content`}
                              </p>
                              
                              {/* Video Player - only show for valid YouTube URLs */}
                              {isValidYouTubeUrl(lesson.video_link || lesson.videoLink) && (
                                <div className="mt-3">
                                  <div className="w-full cursor-pointer" onClick={() => handleOpenVideoPlayer(lesson)}>
                                    <iframe
                                      src={getYouTubeEmbedUrl(lesson.video_link || lesson.videoLink)}
                                      className="w-full h-48 md:h-64 rounded-xl border-2 border-slate-200 shadow-lg hover:border-indigo-400 transition-colors pointer-events-none"
                                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      title={lesson.lesson_title || lesson.lessonTitle}
                                    ></iframe>
                                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                      <Play className="w-3 h-3" />
                                      <span>Click to open interactive AI chat player</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {!isExpanded && (
                        <div className={`mt-3 p-3 rounded-xl ${
                          subject === 'mathematics' ? 'bg-red-100/50' :
                          subject === 'physical science' ? 'bg-blue-100/50' :
                          subject === 'life sciences' ? 'bg-green-100/50' :
                          subject === 'english' ? 'bg-purple-100/50' :
                          subject === 'history' ? 'bg-orange-100/50' :
                          subject === 'geography' ? 'bg-teal-100/50' :
                          'bg-gray-100/50'
                        }`}>
                          <p className="text-xs text-slate-600 text-center">
                            Click the expand button above to view all {lessons.length} {subjectDisplayName.toLowerCase()} lesson{lessons.length > 1 ? 's' : ''} in detail
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No lessons scheduled for this date</p>
                <p className="text-xs text-slate-400 mt-2">
                  Looking for Grade {userGrade} lessons on {selectedDateStr}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Try navigating to different dates using the calendar above
                </p>
              </div>
            )}
          </div>

          {/* Call to Action for Parents */}
          {isParent && (!selectedChild || !selectedSubject) && (
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-8 shadow-2xl border border-white/30 text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2">Select Child & Subject</h3>
              <p className="text-sm md:text-base text-slate-600 mb-4">Choose a child and subject from the dropdowns above to view their assessments and track their progress.</p>
              <div className="flex justify-center space-x-2 text-sm text-slate-500">
                <span className={`px-3 py-1 rounded-full ${selectedChild ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
                  {selectedChild ? `✓ ${selectedChild}` : '1. Select Child'}
                </span>
                <span className={`px-3 py-1 rounded-full ${selectedSubject ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
                  {selectedSubject ? `✓ ${selectedSubject}` : '2. Select Subject'}
                </span>
              </div>
            </div>
          )}

          {/* Quizzes & Exercises Section */}
          {(!isParent || (selectedChild && selectedSubject)) && (
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
              <div className="flex items-center space-x-3 mb-4">
                <Clock className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-slate-800">Quizzes & Exercises</h2>
              </div>

              {(exercisesLoading || assignmentsLoading) ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="loader"></div>
                  <p className="text-slate-600 font-medium mt-2">Loading quizzes and exercises...</p>
                </div>
              ) : (todayQuizzes.length > 0 || (Array.isArray(filteredTodayExercises) && filteredTodayExercises.length > 0)) ? (
                <div className="space-y-6">
                  {/* Quizzes */}
                  {todayQuizzes.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-700 border-b border-purple-200 pb-2">Quizzes</h3>
                      {todayQuizzes.map((quiz) => {
                    const isExpanded = expandedQuizzes.has(quiz.id);
                    const totalPoints = quiz.questions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
                    
                    return (
                      <div key={quiz.id} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100 overflow-hidden">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-bold text-slate-800 truncate flex-1">{quiz.title}</h3>
                              <Button
                                onClick={() => toggleQuizExpanded(quiz.id)}
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 rounded-full hover:bg-purple-200 flex-shrink-0"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                            </div>
                            {!isParent && (
                              <Button
                                onClick={() => togglePublished('quiz', quiz.id)}
                                size="sm"
                                className={`text-xs font-semibold px-3 py-1 rounded-full transition-all mb-2 ${
                                  quiz.published 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                }`}
                                variant="ghost"
                              >
                                {quiz.published ? 'Published' : 'Draft'}
                              </Button>
                            )}
                            <p className="text-sm text-purple-600 font-medium truncate">{quiz.className} • {quiz.subject}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                              <span className="whitespace-nowrap">Duration: {quiz.duration} minutes</span>
                              <span className="whitespace-nowrap">{quiz.questions.length} questions</span>
                              <span className="whitespace-nowrap">{totalPoints} total points</span>
                              <span className="whitespace-nowrap">Date: {new Date(quiz.scheduledDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            {isParent && quiz.published && (() => {
                              const status = getAssessmentStatus(quiz.id);
                              return status.isMissed ? (
                                <span className="text-xs px-3 py-1 bg-red-100 text-red-600 rounded-full font-medium border-2 border-red-400">
                                  Missed
                                </span>
                              ) : (
                                <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                  {status.percentage}%
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="space-y-3 mt-4 pt-4 border-t border-purple-200">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-slate-700">All Quiz Questions:</p>
                              <span className="text-xs text-slate-500">Timed assessment content</span>
                            </div>
                            {quiz.questions.map((q, idx) => (
                              <div key={q.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-purple-300 transition-colors overflow-hidden">
                                <div className="flex justify-between items-start mb-2 gap-2">
                                  <span className="text-sm font-bold text-purple-600 flex-shrink-0">Question {idx + 1}</span>
                                  <span className="text-sm font-medium text-slate-600 whitespace-nowrap">{q.points || 10} points</span>
                                </div>
                                <p className="text-sm text-slate-700 mb-3 leading-relaxed break-words">{q.question}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                                    q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                    q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {q.difficulty}
                                  </span>
                                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium whitespace-nowrap">
                                    {q.type}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {!isExpanded && (
                          <div className="mt-3 p-3 bg-purple-100/50 rounded-xl">
                            <p className="text-xs text-slate-600 text-center">
                              Click the expand button above to view all {quiz.questions.length} quiz questions in detail
                            </p>
                          </div>
                        )}
                      </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tutorial Exercises (AI-Generated) */}
                  {Array.isArray(filteredTodayExercises) && (() => {
                    console.log('🔍 All exercises:', filteredTodayExercises.map(ex => ({id: ex.id, hasInitialTutorial: ex.hasInitialTutorial, has_initial_tutorial: ex.has_initial_tutorial, allKeys: Object.keys(ex)})));
                    const tutorialExs = filteredTodayExercises.filter((ex: any) => ex.hasInitialTutorial || ex.has_initial_tutorial);
                    return tutorialExs.length > 0;
                  })() && (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-purple-200 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-semibold text-slate-700">AI Tutorial Exercises</h3>
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 rounded-full">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-purple-600 font-medium">Personalized</span>
                          </div>
                        </div>
                        <GenerationCounter />
                      </div>
                      {(filteredTodayExercises as any[]).filter((ex: any) => ex.hasInitialTutorial || ex.has_initial_tutorial).map((exercise: any) => {
                        const isExpanded = expandedExercises.has(exercise.id.toString());
                        const isTutorial = true;
                        
                        return (
                          <div key={`tutorial-${exercise.id}`} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-purple-200 shadow-lg">
                            <div className="space-y-4">
                              {/* Header Section */}
                              <div className="flex items-start gap-2">
                                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shrink-0">
                                  <span className="text-white text-xs font-bold">AI</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm sm:text-base font-bold text-slate-800 leading-tight line-clamp-2">{exercise.title}</h3>
                                </div>
                              </div>
                              
                              {/* Badges Section */}
                              <div className="flex flex-wrap gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  exercise.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                  exercise.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {exercise.difficulty}
                                </span>
                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                                  Tutorial Exercise
                                </span>
                                <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                                  Based on Homework Feedback
                                </span>
                              </div>
                              
                              {/* Subject and Description */}
                              <div className="space-y-2">
                                <p className="text-sm text-purple-600 font-medium">{exercise.subject}</p>
                                {exercise.description && (
                                  <p className="text-sm text-slate-600 break-words">{exercise.description}</p>
                                )}
                              </div>
                              
                              {/* Start Tutorial Button with Completion Status */}
                              {isStudent && (
                                <div className="pt-2">
                                  <ExerciseSubmissionButton 
                                    exerciseId={exercise.id} 
                                    exercise={exercise}
                                    isTutorial={true}
                                    onAttempt={() => {
                                      // AI tutorial exercises should start with tutorial flow
                                      localStorage.setItem('tutorialFlowData', JSON.stringify({
                                        tutorial: null, // Will be loaded from backend
                                        exercise: exercise,
                                        generatedFrom: 'ai-tutorial-exercise'
                                      }));
                                      setLocation('/tutorial-flow');
                                    }} 
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Regular Exercises */}
                  {Array.isArray(filteredTodayExercises) && filteredTodayExercises.filter((ex: any) => !(ex.hasInitialTutorial || ex.has_initial_tutorial)).length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-700 border-b border-green-200 pb-2">Exercises</h3>
                      {(filteredTodayExercises as any[]).filter((ex: any) => !(ex.hasInitialTutorial || ex.has_initial_tutorial)).map((exercise: any) => {
                        const isExpanded = expandedExercises.has(exercise.id.toString());
                        
                        const isTutorial = exercise.isTutorial || exercise.is_tutorial;
                        
                        return (
                          <div key={`exercise-${exercise.id}`} className={`rounded-2xl p-4 sm:p-6 border shadow-md ${
                            isTutorial 
                              ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200' 
                              : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100'
                          }`}>
                            <div className="flex items-start justify-between mb-3 gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-2">
                                  <h3 className="text-sm sm:text-base font-bold text-slate-800 leading-tight line-clamp-2 flex-1">{exercise.title}</h3>
                                  {!isStudent && (
                                    <Button
                                      onClick={() => toggleExerciseExpanded(exercise.id.toString())}
                                      variant="ghost"
                                      size="icon"
                                      className="w-8 h-8 rounded-full hover:bg-green-200 flex-shrink-0"
                                    >
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    exercise.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                    exercise.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {exercise.difficulty}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    isTutorial 
                                      ? 'bg-purple-100 text-purple-700' 
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {isTutorial ? 'Tutorial Exercise' : 'Exercise'}
                                  </span>
                                </div>
                                <p className="text-sm text-green-600 font-medium">{exercise.subject}</p>
                                {exercise.description && (
                                  <p className="text-sm text-slate-600 mt-1">{exercise.description}</p>
                                )}
                              </div>
                            </div>
                            
                            {/* Students only see the attempt button, teachers see questions when expanded */}
                            {isStudent ? (
                              <div className="mt-3">
                                <ExerciseSubmissionButton 
                                  exerciseId={exercise.id}
                                  exercise={exercise}
                                  onAttempt={() => {
                                    // Baseline assessments go directly to exercise attempt (no tutorial)
                                    if (exercise.isBaseline || exercise.is_baseline) {
                                      localStorage.setItem('attemptingExercise', JSON.stringify(exercise));
                                      setLocation('/attempt-exercise');
                                      return;
                                    }
                                    
                                    // Check if this is an AI-generated exercise that should start with tutorial
                                    if (exercise.hasInitialTutorial || exercise.generatedFor) {
                                      // Store exercise data for tutorial flow and navigate to tutorial
                                      localStorage.setItem('tutorialFlowData', JSON.stringify({
                                        tutorial: null, // Will be extracted from exercise.tutorialContent
                                        exercise: exercise,
                                        generatedFrom: 'ai-tutorial-exercise'
                                      }));
                                      setLocation('/tutorial-flow');
                                    } else {
                                      // Regular exercise - navigate to full page
                                      localStorage.setItem('attemptingExercise', JSON.stringify(exercise));
                                      setLocation('/attempt-exercise');
                                    }
                                  }} 
                                />
                              </div>
                            ) : (
                              <>
                                {isExpanded && (
                                  <div className="space-y-3">
                                    {exercise.questions && exercise.questions.length > 0 && (
                                      <div className="space-y-3">
                                        {exercise.questions.map((question: any, qIndex: number) => (
                                          <div key={question.id || qIndex} className="p-3 bg-white rounded-xl border text-sm">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="font-medium text-xs text-slate-500">
                                                Question {question.questionNumber || qIndex + 1}:
                                              </div>
                                              <span className="text-xs text-green-600 font-medium">
                                                {question.marks} mark{question.marks !== 1 ? 's' : ''}
                                              </span>
                                            </div>
                                            <div className="whitespace-pre-wrap">{formatMathExpression(question.question)}</div>
                                            
                                            {question.answer && (
                                              <div className="mt-2 p-2 bg-green-50 rounded border border-green-100">
                                                <div className="font-medium text-xs text-green-700 mb-1">Answer:</div>
                                                <div className="whitespace-pre-wrap text-xs">{formatMathExpression(question.answer)}</div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {!isExpanded && (
                                  <div className="mt-3 p-3 bg-green-100/50 rounded-xl">
                                    <p className="text-xs text-slate-600 text-center">
                                      Click the expand button above to view questions
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No quizzes or exercises scheduled for this date</p>
                </div>
              )}
            </div>
          )}

          {/* Homework Section */}
          {(!isParent || (selectedChild && selectedSubject)) && (
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  <h2 className="text-lg md:text-xl font-bold text-slate-800">Homework</h2>
                  <span className="text-xs md:text-sm text-slate-500 hidden sm:inline">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                {userRole === 'teacher' && (
                  <Button
                    onClick={() => handleCreateContent('homework')}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 py-2 md:px-4 md:py-2 flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create Homework</span>
                    <span className="sm:hidden">Create</span>
                  </Button>
                )}
              </div>

              {isLoadingHomework ? (
                // Loading skeleton
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100 animate-pulse">
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="h-6 bg-blue-200 rounded mb-2 w-3/4"></div>
                          <div className="h-4 bg-blue-100 rounded mb-2 w-1/2"></div>
                          <div className="flex gap-2">
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                          <div className="h-8 bg-blue-200 rounded w-24"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTodayHomework.length > 0 ? (
                <div className="space-y-4">
                  {filteredTodayHomework.map((hw) => {
                    const isExpanded = expandedHomework.has(hw.id);
                    const totalPoints = hw.questions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
                    
                    return (
                      <div key={hw.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100 overflow-hidden">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base md:text-lg font-bold text-slate-800 truncate flex-1">{hw.title}</h3>
                              <Button
                                onClick={() => toggleHomeworkExpanded(hw.id)}
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 md:w-8 md:h-8 rounded-full hover:bg-blue-200 flex-shrink-0"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3 md:w-4 md:h-4" /> : <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />}
                              </Button>
                            </div>
                            {userRole === 'teacher' && (
                              <Button
                                onClick={() => togglePublished('homework', hw.id)}
                                size="sm"
                                className={`text-xs font-semibold px-3 py-1 rounded-full transition-all mb-2 ${
                                  hw.published 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                }`}
                                variant="ghost"
                              >
                                {hw.published ? 'Published' : 'Draft'}
                              </Button>
                            )}
                            <p className="text-sm text-blue-600 font-medium truncate">{hw.className} • {hw.subject}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                              <span className="whitespace-nowrap">{hw.questions.length} questions</span>
                              <span className="whitespace-nowrap">{totalPoints} total points</span>
                              <span className="whitespace-nowrap">Due: {new Date(hw.dueDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            {userRole === 'teacher' && (
                              <>
                                <Button
                                  onClick={() => {
                                    setSelectedHomeworkForAnalysis(hw);
                                    setShowHomeworkAnalysis(true);
                                  }}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 md:px-4 md:py-2 h-auto text-xs font-medium"
                                >
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  <span className="hidden sm:inline">View Analysis</span>
                                  <span className="sm:hidden">Analysis</span>
                                </Button>
                                <Button
                                  onClick={() => handleDeleteHomework(hw)}
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 px-3 py-1 h-auto text-xs"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </>
                            )}
                            {userRole === 'student' && hw.published && (() => {
                              // Use the _submission field from homework data (no separate loading needed)
                              const submission = (hw as any)._submission;
                              if (submission) {
                                // Calculate total score from submission
                                const totalScore = submission.totalScore || submission.score || 0;
                                const totalPossible = hw.questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);
                                
                                // Show score and "View Analysis" button if homework is completed
                                return (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                                      {totalScore}/{totalPossible} points
                                    </span>
                                    <Button
                                      onClick={() => {
                                        try {
                                          // Clear old homework data first to prevent quota issues (iOS Safari has strict limits)
                                          localStorage.removeItem('homeworkFeedback');
                                          localStorage.removeItem('submissionData');
                                          localStorage.removeItem('completedHomework');
                                          
                                          // Store only essential data - the page will fetch full details from API
                                          localStorage.setItem('homeworkFeedback', JSON.stringify({
                                            id: hw.id,
                                            homeworkId: hw.id,
                                            title: hw.title,
                                            subject: hw.subject
                                          }));
                                          setLocation('/homework-feedback');
                                        } catch (error: any) {
                                          // Handle quota exceeded error (common on iOS Safari)
                                          if (error.name === 'QuotaExceededError' || error.code === 22) {
                                            toast({
                                              title: "Storage Limit Reached",
                                              description: "Please clear your browser data or try again in a private window.",
                                              variant: "destructive"
                                            });
                                          } else {
                                            toast({
                                              title: "Error",
                                              description: "Unable to view analysis. Please try again.",
                                              variant: "destructive"
                                            });
                                          }
                                          console.error('Error storing homework data:', error);
                                        }
                                      }}
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 h-auto text-xs font-medium"
                                      data-testid="button-view-analysis"
                                    >
                                      <TrendingUp className="w-3 h-3 mr-1" />
                                      View Analysis
                                    </Button>
                                  </div>
                                );
                              } else {
                                // Show "Start Homework" button if not completed
                                return (
                                  <Button
                                    onClick={() => {
                                      try {
                                        // Clear old homework data first to prevent quota issues
                                        localStorage.removeItem('attemptingHomework');
                                        localStorage.removeItem('homeworkFeedback');
                                        localStorage.removeItem('submissionData');
                                        
                                        const homeworkData = {
                                          id: hw.id,
                                          title: hw.title,
                                          description: hw.description,
                                          subject: hw.subject,
                                          difficulty: 'medium',
                                          isHomework: true,
                                          questions: hw.questions?.map((q, index) => ({
                                            id: q.id,
                                            questionNumber: index + 1,
                                            question: q.question || q,
                                            answer: q.answer || '',
                                            marks: q.points || 10
                                          })) || []
                                        };
                                        
                                        localStorage.setItem('attemptingHomework', JSON.stringify(homeworkData));
                                        setLocation('/attempt-homework');
                                      } catch (error: any) {
                                        // Handle quota exceeded error (common on iOS Safari)
                                        if (error.name === 'QuotaExceededError' || error.code === 22) {
                                          toast({
                                            title: "Storage Limit Reached",
                                            description: "Your device storage is full. Please clear your browser data and try again.",
                                            variant: "destructive"
                                          });
                                        } else {
                                          toast({
                                            title: "Error",
                                            description: "Unable to start homework. Please try again.",
                                            variant: "destructive"
                                          });
                                        }
                                        console.error('Error storing homework data:', error);
                                      }
                                    }}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 h-auto text-xs font-medium"
                                    data-testid="button-start-homework"
                                  >
                                    <BookOpen className="w-3 h-3 mr-1" />
                                    Start Homework
                                  </Button>
                                );
                              }
                            })()}
                            {isParent && hw.published && (() => {
                              // For parents viewing child data, show completion status
                              // Check if the assignment has been completed
                              const isCompleted = hw.status === 'completed' || hw.completion_status === 'completed';
                              
                              if (isCompleted) {
                                return (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                                      Completed
                                    </span>
                                    <Button
                                      onClick={() => {
                                        // Navigate to StudentHomework page for this child to see detailed results
                                        const child = parentChildren.find((c: any) => c.firstName === selectedChild);
                                        if (child) {
                                          setLocation(`/student-homework/${child.id}`);
                                        }
                                      }}
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 h-auto text-xs font-medium"
                                    >
                                      <TrendingUp className="w-3 h-3 mr-1" />
                                      View Results
                                    </Button>
                                  </div>
                                );
                              } else {
                                // Show pending status for incomplete homework
                                return (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                                      Pending
                                    </span>
                                    <Button
                                      onClick={() => {
                                        // Navigate to StudentHomework page for this child
                                        const child = parentChildren.find((c: any) => c.firstName === selectedChild);
                                        if (child) {
                                          setLocation(`/student-homework/${child.id}`);
                                        }
                                      }}
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 h-auto text-xs font-medium"
                                    >
                                      <BookOpen className="w-3 h-3 mr-1" />
                                      View Details
                                    </Button>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="space-y-3 mt-4 pt-4 border-t border-blue-200">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-slate-700">All Homework Questions:</p>
                              <span className="text-xs text-slate-500">Practice problems</span>
                            </div>
                            {hw.questions.map((q, idx) => {
                              console.log(`Homework ${hw.id} - Question mapping:`, { questionId: q.id, index: idx, displayNumber: idx + 1 });
                              return (
                              <div key={q.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-colors overflow-hidden">
                                <div className="flex justify-between items-start mb-2 gap-2">
                                  <span className="text-sm font-bold text-blue-600 flex-shrink-0">Question {idx + 1}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-600 whitespace-nowrap">{q.points || 10} points</span>
                                    {userRole === 'teacher' && (
                                      <div className="flex gap-1">
                                        <Button
                                          onClick={() => handleEditQuestion(hw.id, q.id)}
                                          variant="ghost"
                                          size="sm"
                                          className="w-6 h-6 p-0 hover:bg-blue-100 rounded-full"
                                        >
                                          <Edit className="w-3 h-3 text-blue-600" />
                                        </Button>
                                        <Button
                                          onClick={() => handleDeleteQuestion(hw.id, q.id)}
                                          variant="ghost"
                                          size="sm"
                                          className="w-6 h-6 p-0 hover:bg-red-100 rounded-full"
                                        >
                                          <X className="w-3 h-3 text-red-600" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-slate-700 mb-3 leading-relaxed break-words">{q.question}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                                    q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                    q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {q.difficulty}
                                  </span>
                                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium whitespace-nowrap">
                                    {q.type}
                                  </span>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {!isExpanded && (
                          <div className="mt-3 p-3 bg-blue-100/50 rounded-xl">
                            <p className="text-xs text-slate-600 text-center">
                              Click the expand button above to view all {hw.questions.length} questions in detail
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No homework scheduled for this date</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Type Selector Modal - Only for teachers */}
      {showTypeSelector && !isParent && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">What would you like to create?</h3>
            <div className="space-y-3">
              <Button
                onClick={() => handleCreateContent('homework')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl flex items-center justify-center space-x-3"
              >
                <BookOpen className="w-6 h-6" />
                <span className="font-semibold">Homework Assignment</span>
              </Button>
              <Button
                onClick={() => handleCreateContent('quiz')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-2xl flex items-center justify-center space-x-3"
              >
                <Clock className="w-6 h-6" />
                <span className="font-semibold">Timed Quiz</span>
              </Button>
              <Button
                onClick={() => setShowTypeSelector(false)}
                variant="outline"
                className="w-full py-3 rounded-2xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Homework/Quiz Form Modal - Only for teachers */}
      {showCreateForm && !isParent && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm">
          <div className="absolute inset-y-0 right-0 w-full sm:max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out overflow-hidden">
            <HomeworkForm
              onClose={() => setShowCreateForm(false)}
              onSave={handleSaveContent}
              classes={classes}
              selectedDate={selectedDateStr}
              type={formType}
            />
          </div>
        </div>
      )}
      
      {/* Exercise Attempt - Navigate to full page instead of modal */}

      {/* Homework Analysis Modal - Only for teachers */}
      <HomeworkAnalysis
        isOpen={showHomeworkAnalysis}
        onClose={() => {
          setShowHomeworkAnalysis(false);
          setSelectedHomeworkForAnalysis(null);
        }}
        homework={selectedHomeworkForAnalysis}
      />

      
      <BottomNav />

      {/* YouTube Shorts-style Video Player */}
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