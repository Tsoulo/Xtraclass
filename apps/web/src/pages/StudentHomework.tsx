import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Clock, Trophy, AlertTriangle, Calendar, Filter, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "../components/BottomNav";
import type { ChildData } from "@/lib/types";

interface StudentHomeworkProps {
  childId: string;
}

export default function StudentHomework({ childId }: StudentHomeworkProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    // Check if there's a previous page in browser history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to student dashboard if no history
      setLocation(`/dashboard/student/${childId}`);
    }
  };
  const [filter, setFilter] = useState<'all' | 'outstanding' | 'completed'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'dueDate' | 'title' | 'score' | 'status' | 'submitted'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const itemsPerPage = 10;

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch children data from API to get student user ID
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['/api/children'],
    queryFn: () => apiRequest('/api/children')
  });

  // Find the child from API data first to get student user ID
  // The childId could be either the child.id or the studentUserId, so check both
  const child = children.find((c: ChildData) => 
    c.id?.toString() === childId || c.studentUserId?.toString() === childId
  );

  // Fetch student assignments from API
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/students', child?.studentUserId, 'assignments', 'all'],
    queryFn: () => apiRequest(`/api/students/${child?.studentUserId}/assignments?status=all`),
    enabled: !!child?.studentUserId
  });

  // Fetch completed exercises for the student
  const { data: exercises = [], isLoading: exercisesLoading } = useQuery({
    queryKey: ['/api/students', child?.studentUserId, 'exercises'],
    queryFn: async () => {
      if (!child?.studentUserId || !child?.gradeLevel) return [];
      try {
        // Get date range for the current academic year to fetch exercises
        const now = new Date();
        const currentYear = now.getFullYear();
        const startOfYear = new Date(currentYear, 0, 1); // January 1st
        const endOfYear = new Date(currentYear, 11, 31); // December 31st
        
        const startDate = startOfYear.toISOString().split('T')[0];
        const endDate = endOfYear.toISOString().split('T')[0];
        
        // Fetch all exercises for the student's grade with proper parameters
        const allExercises = await apiRequest(`/api/exercises?startDate=${startDate}&endDate=${endDate}&grade=${child.gradeLevel}`);
        
        // For each exercise, check if the student has a submission
        const exercisesWithStatus = await Promise.all(
          allExercises.map(async (exercise: any) => {
            try {
              const submission = await apiRequest(`/api/exercises/${exercise.id}/submission?studentUserId=${child.studentUserId}`);
              return {
                ...exercise,
                type: 'exercise',
                status: submission?.isCompleted ? 'completed' : 'pending',
                submitted_at: submission?.submittedAt,
                completed_at: submission?.completedAt,
                score: submission?.score || 0,
                due_date: exercise.date // Use exercise date as due date
              };
            } catch (error) {
              // If no submission found, exercise is pending
              return {
                ...exercise,
                type: 'exercise',
                status: 'pending',
                due_date: exercise.date
              };
            }
          })
        );
        
        return exercisesWithStatus;
      } catch (error) {
        console.error('Error fetching exercises:', error);
        return [];
      }
    },
    enabled: !!child?.studentUserId && !!child?.grade
  });

  // Combine assignments and exercises for filtering
  const allItems = [...assignments, ...exercises];
  
  // Get unique subjects from assignments and exercises
  const subjects = Array.from(new Set(allItems.map((item: any) => item.subject))).filter(Boolean);

  // Filter assignments and exercises based on selected filters
  const filteredAssignments = allItems.filter((item: any) => {
    // Filter by status
    let statusMatch = true;
    if (filter === 'outstanding') {
      statusMatch = item.status === 'pending' || item.status === 'scheduled';
    } else if (filter === 'completed') {
      statusMatch = item.status === 'completed';
    }

    // Filter by subject
    let subjectMatch = true;
    if (subjectFilter !== 'all') {
      subjectMatch = item.subject === subjectFilter;
    }

    return statusMatch && subjectMatch;
  });

  // Sorting function
  const sortAssignments = (assignments: any[]) => {
    return [...assignments].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'dueDate':
          aValue = new Date(a.due_date || a.date);
          bValue = new Date(b.due_date || b.date);
          // Handle invalid dates
          if (isNaN(aValue.getTime()) && isNaN(bValue.getTime())) return 0;
          if (isNaN(aValue.getTime())) return 1;
          if (isNaN(bValue.getTime())) return -1;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'score':
          aValue = a.score || 0;
          bValue = b.score || 0;
          break;
        case 'status':
          // Sort by priority: overdue -> outstanding -> completed
          const statusPriority = { 'overdue': 3, 'outstanding': 2, 'pending': 2, 'completed': 1 };
          aValue = statusPriority[a.status as keyof typeof statusPriority] || 0;
          bValue = statusPriority[b.status as keyof typeof statusPriority] || 0;
          break;
        case 'submitted':
          aValue = a.submitted_at ? new Date(a.submitted_at) : new Date(0);
          bValue = b.submitted_at ? new Date(b.submitted_at) : new Date(0);
          break;
        default:
          aValue = new Date(a.due_date || a.date);
          bValue = new Date(b.due_date || b.date);
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  // Apply sorting to filtered assignments
  const sortedAssignments = sortAssignments(filteredAssignments);

  // Handle sort change
  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  // Reset current page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, subjectFilter, sortBy, sortOrder]);

  // Calculate pagination
  const totalItems = sortedAssignments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssignments = sortedAssignments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const getAssignmentIcon = (assignment: any) => {
    if (assignment.status === 'completed') return Trophy;
    if (assignment.type === 'homework') return BookOpen;
    if (assignment.type === 'exercise') return BookOpen;
    if (assignment.type === 'quiz') return Clock;
    return BookOpen;
  };

  const getAssignmentColor = (assignment: any) => {
    const isOverdue = assignment.status !== 'completed' && new Date(assignment.due_date) < new Date();
    
    if (assignment.status === 'completed') {
      return {
        bg: 'from-green-50/80 to-emerald-50/60',
        border: 'border-green-100/50',
        iconBg: 'from-green-500 to-emerald-600',
        textColor: 'text-green-600'
      };
    }
    
    if (isOverdue) {
      return {
        bg: 'from-red-50/80 to-orange-50/60',
        border: 'border-red-100/50', 
        iconBg: 'from-red-500 to-orange-600',
        textColor: 'text-red-600'
      };
    }
    
    if (assignment.subject === 'physics') {
      return {
        bg: 'from-blue-50/80 to-indigo-50/60',
        border: 'border-blue-100/50',
        iconBg: 'from-blue-500 to-indigo-600', 
        textColor: 'text-blue-600'
      };
    }
    
    return {
      bg: 'from-emerald-50/80 to-green-50/60',
      border: 'border-emerald-100/50',
      iconBg: 'from-emerald-500 to-green-600',
      textColor: 'text-emerald-600'
    };
  };

  const getStatusDisplay = (assignment: any) => {
    const isOverdue = assignment.status !== 'completed' && new Date(assignment.due_date) < new Date();
    
    if (assignment.status === 'completed') {
      return { text: 'Completed', icon: Trophy, color: 'text-green-600' };
    }
    if (isOverdue) {
      return { text: 'Overdue', icon: AlertTriangle, color: 'text-red-600' };
    }
    if (assignment.status === 'pending') {
      return { text: 'Pending', icon: Clock, color: 'text-orange-600' };
    }
    if (assignment.status === 'scheduled') {
      return { text: 'Scheduled', icon: Calendar, color: 'text-blue-600' };
    }
    return { text: 'Unknown', icon: Clock, color: 'text-gray-600' };
  };

  if (childrenLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!child) {
    return <div className="min-h-screen flex items-center justify-center">Student not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pb-0 md:pt-16">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-6 pt-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-full hover:bg-white/30"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Button>
            
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">Homework & Exercises</h1>
              <p className="text-white/80">{child.firstName} {child.lastName}</p>
            </div>
            
            <div className="w-10"></div>
          </div>
        </div>
      </div>
      {/* Filter Section */}
      <div className="px-6 py-4 -mt-8 relative z-20">
        <div className="bg-white/90 backdrop-blur-2xl rounded-2xl p-4 shadow-lg border border-white/30 space-y-3">
          {/* Status Filter */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Status</p>
            <div className="flex space-x-2">
              {(['all', 'outstanding', 'completed'] as const).map((filterOption) => (
                <Button
                  key={filterOption}
                  variant={filter === filterOption ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(filterOption)}
                  className="capitalize flex-1"
                >
                  <Filter className="w-3 h-3 mr-1" />
                  {filterOption}
                </Button>
              ))}
            </div>
          </div>

          {/* Subject Filter */}
          {subjects.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Subject</p>
              <div className="flex space-x-2 flex-wrap gap-2">
                <Button
                  variant={subjectFilter === 'all' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSubjectFilter('all')}
                  className="capitalize"
                >
                  All Subjects
                </Button>
                {subjects.map((subject: string) => (
                  <Button
                    key={subject}
                    variant={subjectFilter === subject ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSubjectFilter(subject)}
                    className="capitalize"
                  >
                    {subject}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Sorting Section */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Sort by</p>
            <div className="flex space-x-2 flex-wrap gap-2">
              {([
                { key: 'dueDate', label: 'Due Date' },
                { key: 'title', label: 'Title' },
                { key: 'score', label: 'Score' },
                { key: 'status', label: 'Status' },
                { key: 'submitted', label: 'Submitted' }
              ] as const).map((sortOption) => {
                const isActive = sortBy === sortOption.key;
                const SortIcon = isActive 
                  ? (sortOrder === 'asc' ? ArrowUp : ArrowDown)
                  : ArrowUpDown;
                
                return (
                  <Button
                    key={sortOption.key}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortChange(sortOption.key)}
                    className="flex items-center space-x-1"
                  >
                    <SortIcon className="w-3 h-3" />
                    <span>{sortOption.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Assignments List */}
      <div className="px-6 pb-8">
        <div className="space-y-4">
          {(assignmentsLoading || exercisesLoading) ? (
            <div className="bg-white/90 backdrop-blur-2xl rounded-2xl p-8 shadow-lg border border-white/30 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500">Loading homework and exercises...</p>
            </div>
          ) : paginatedAssignments.length === 0 ? (
            <div className="bg-white/90 backdrop-blur-2xl rounded-2xl p-8 shadow-lg border border-white/30 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No homework or exercises found</h3>
              <p className="text-gray-500">
                {filter === 'outstanding' ? 'No outstanding homework or exercises' :
                 filter === 'completed' ? 'No completed homework or exercises' :
                 'No homework or exercises available'}
              </p>
            </div>
          ) : (
            paginatedAssignments.map((assignment) => {
              const Icon = getAssignmentIcon(assignment);
              const colors = getAssignmentColor(assignment);
              const status = getStatusDisplay(assignment);
              const StatusIcon = status.icon;
              const dueDate = new Date(assignment.due_date);

              return (
                <div 
                  key={`${assignment.type}-${assignment.id}`}
                  className={`bg-white/90 backdrop-blur-2xl rounded-2xl p-6 shadow-lg border border-white/30`}
                >
                  <div 
                    className={`flex items-center space-x-5 p-6 rounded-2xl border bg-gradient-to-r ${colors.bg} ${colors.border} cursor-pointer hover:shadow-lg transition-shadow`}
                    onClick={() => {
                      if (assignment.status === 'completed') {
                        // For completed assignments, show feedback/report
                        if (assignment.type === 'exercise') {
                          localStorage.setItem('completedExercise', JSON.stringify(assignment));
                          setLocation('/tutorial-feedback');
                        } else if (assignment.type === 'homework') {
                          localStorage.setItem('completedHomework', JSON.stringify(assignment));
                          setLocation('/homework-feedback');
                        }
                        return;
                      }
                      
                      if (assignment.type === 'exercise') {
                        // Check if exercise has tutorial content and should show tutorial first
                        if (assignment.hasInitialTutorial && assignment.tutorialContent) {
                          console.log('📚 Exercise has tutorial content, redirecting to tutorial first');
                          localStorage.setItem('tutorialFlowData', JSON.stringify({
                            tutorial: null, // Will be parsed from tutorialContent
                            exercise: assignment,
                            generatedFrom: 'exercise-start'
                          }));
                          setLocation('/tutorial-flow');
                        } else {
                          // No tutorial, go directly to exercise
                          localStorage.setItem('attemptingExercise', JSON.stringify(assignment));
                          setLocation('/attempt-exercise');
                        }
                      } else if (assignment.type === 'homework') {
                        localStorage.setItem('attemptingHomework', JSON.stringify(assignment));
                        setLocation('/attempt-homework');
                      } else if (assignment.type === 'quiz') {
                        localStorage.setItem('attemptingQuiz', JSON.stringify(assignment));
                        setLocation('/attempt-quiz');
                      }
                    }}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl bg-gradient-to-br ${colors.iconBg}`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-lg font-bold text-slate-800 capitalize mb-1">
                            {assignment.title}
                            {assignment.type === 'exercise' && assignment.hasInitialTutorial && assignment.tutorialContent && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Tutorial Included
                              </span>
                            )}
                            {assignment.type === 'exercise' && assignment.hasInitialTutorial && assignment.tutorialContent && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Tutorial Included
                              </span>
                            )}
                          </p>
                          <p className={`text-sm font-semibold ${colors.textColor} mb-1`}>
                            {assignment.status === 'completed' 
                              ? `Completed ${assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleDateString() : ''}`
                              : assignment.type === 'quiz'
                              ? `${dueDate.toLocaleDateString()} • ${assignment.duration} min`
                              : `Due ${dueDate.toLocaleDateString()}`
                            }
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {assignment.subject} • {assignment.class_name}
                          </p>
                          {assignment.description && (
                            <p className="text-sm text-slate-600 mt-2">{assignment.description}</p>
                          )}
                          {assignment.status === 'completed' && assignment.score && (
                            <p className="text-sm font-semibold text-green-600 mt-1">
                              Score: {assignment.score}%
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-xs text-slate-500 mb-1">Status</div>
                          <div className={`flex items-center space-x-1 ${status.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{status.text}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white/90 backdrop-blur-2xl rounded-2xl p-4 shadow-lg border border-white/30">
            <div className="text-sm text-slate-600">
              Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} items
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current page
                  const showPage = page === 1 || page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  
                  if (!showPage && page === currentPage - 2) {
                    return <span key={page} className="px-2 text-slate-400">...</span>;
                  }
                  
                  if (!showPage && page === currentPage + 2) {
                    return <span key={page} className="px-2 text-slate-400">...</span>;
                  }
                  
                  if (!showPage) return null;
                  
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}