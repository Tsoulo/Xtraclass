import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Plus, AlertTriangle, Target, Zap, Lock, CreditCard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TopicDetail {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface StudentAnalytics {
  id: string;
  firstName: string;
  lastName: string;
  subject: string;
  currentAverage: number;
  missedAssessments: number;
  totalAssessments: number;
  homeworkCompleted?: number;
  exercisesCompleted?: number;
  totalCompleted?: number;
  topicScores: Record<string, number>;
  topicDetails: Record<string, TopicDetail>;
  strengths: string[];
  weaknesses: string[];
  summary: string;
  recentTrend: 'improving' | 'declining' | 'stable';
  lastAssessmentDate: string;
  profilePhoto?: string;
}


export default function ParentAnalytics() {
  const [, setLocation] = useLocation();
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedStudentUserId, setSelectedStudentUserId] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Read URL parameters or localStorage on component mount - URL params take priority
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const studentUserIdParam = params.get('studentUserId');
    const studentParam = params.get('student');
    
    // URL parameters take priority over localStorage
    if (studentUserIdParam) {
      setSelectedStudentUserId(parseInt(studentUserIdParam));
    }
    
    if (studentParam) {
      setSelectedChild(studentParam);
    } else {
      // Fallback to localStorage if no URL param
      const savedChild = localStorage.getItem('selectedChild');
      if (savedChild) setSelectedChild(savedChild);
    }
    
    // For subject, only use localStorage (will be auto-selected by the auto-select effect)
    const savedSubject = localStorage.getItem('selectedSubject');
    if (savedSubject && !studentParam) {
      // Only use saved subject if we're not coming from a URL parameter
      setSelectedSubject(savedSubject);
    }
  }, []);
  
  // Fetch parent analytics data
  const { data: analyticsData = [], isLoading } = useQuery({
    queryKey: ['/api/parents/analytics'],
    queryFn: () => apiRequest('/api/parents/analytics')
  });

  // Fetch children data to get student user IDs 
  const { data: children = [] } = useQuery({
    queryKey: ['/api/children'],
    enabled: true
  });

  // Find current student from children data - use studentUserId for reliable lookup
  const currentStudent = selectedStudentUserId 
    ? children.find((child: any) => child.studentUserId === selectedStudentUserId)
    : children.find((child: any) => `${child.firstName} ${child.lastName}` === selectedChild);

  // Fetch student stats to get registered subjects
  const { data: studentStats } = useQuery({
    queryKey: ['/api/students', currentStudent?.studentUserId, 'stats'],
    queryFn: () => apiRequest(`/api/students/${currentStudent?.studentUserId}/stats`),
    enabled: !!currentStudent?.studentUserId
  });

  // Get available subjects from student stats (registered subjects) or fallback to analytics data
  // Standardize formatting: title case with spaces instead of hyphens
  const formatSubject = (subject: string) => 
    subject.replace(/-/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase());
  
  const availableSubjects = selectedChild && studentStats?.subjectProgress && studentStats.subjectProgress.length > 0
    ? studentStats.subjectProgress.map((subject: any) => formatSubject(subject.subject))
    : selectedChild 
    ? [...new Set(analyticsData.filter((s: StudentAnalytics) => `${s.firstName} ${s.lastName}` === selectedChild).map((s: StudentAnalytics) => 
        formatSubject(s.subject)
      ))]
    : [];
    
  // Auto-select Math by default if available, otherwise first subject
  useEffect(() => {
    if (selectedChild && availableSubjects.length > 0) {
      // Prefer Mathematics if available
      const mathSubject = availableSubjects.find((subject: string) => 
        subject.toLowerCase().includes('math')
      );
      
      // If there's only one subject, select it. Otherwise prefer Math or select first
      if (availableSubjects.length === 1) {
        setSelectedSubject(availableSubjects[0]);
      } else if (mathSubject) {
        setSelectedSubject(mathSubject);
      } else {
        setSelectedSubject(availableSubjects[0]);
      }
    } else if (!selectedChild) {
      // Clear subject if no child is selected
      setSelectedSubject('');
    }
  }, [selectedChild, availableSubjects.join(',')]);
  
  // Calculate current student record from analytics data - case insensitive matching
  const currentStudentRecord = analyticsData.find((s: StudentAnalytics) => 
    `${s.firstName} ${s.lastName}` === selectedChild && 
    s.subject.toLowerCase() === selectedSubject.toLowerCase()
  );
  
  // Fetch real metrics data for selected student
  const { data: studentMetrics } = useQuery({
    queryKey: ['/api/students', currentStudentRecord?.id, 'metrics'],
    queryFn: () => apiRequest(`/api/students/${currentStudentRecord?.id}/metrics`),
    enabled: !!currentStudentRecord?.id
  });

  // Fetch daily exercise generation limit status for current student
  const { data: dailyLimitStatus } = useQuery({
    queryKey: ['/api/students', currentStudentRecord?.id, 'daily-limit'],
    queryFn: () => apiRequest(`/api/students/${currentStudentRecord?.id}/daily-limit`),
    enabled: !!currentStudentRecord?.id
  });

  // Fetch global context data for the selected student and subject
  const { data: globalContext, isLoading: isGlobalContextLoading } = useQuery({
    queryKey: ['/api/student/global-context', selectedSubject.toLowerCase().replace(/\s+/g, '-')],
    queryFn: () => apiRequest(`/api/student/global-context/${selectedSubject.toLowerCase().replace(/\s+/g, '-')}`),
    enabled: !!currentStudentRecord?.id && !!selectedSubject,
    retry: false,
  });

  // Check student's subscription status
  const { data: studentSubscriptionStatus } = useQuery({
    queryKey: ['/api/students', currentStudent?.studentUserId, 'subscription-status'],
    queryFn: () => apiRequest(`/api/students/${currentStudent?.studentUserId}/subscription-status`),
    enabled: !!currentStudent?.studentUserId,
    retry: false,
  });

  // Exercise generation mutation
  const generateExerciseMutation = useMutation({
    mutationFn: async ({ studentId, topic, subject }: { studentId: string, topic: string, subject: string }) => {
      return apiRequest('/api/generate-adaptive-exercise', {
        method: 'POST',
        body: JSON.stringify({
          studentId: parseInt(studentId),
          topic,
          subject: subject.toLowerCase()
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Exercise Generated Successfully",
        description: `A personalized ${selectedChild} exercise has been created and added to ${selectedChild}'s calendar.`,
      });
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/students', currentStudentRecord?.id, 'daily-limit'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Exercise Generation Failed",
        description: error.message.includes('daily limit') 
          ? "Daily exercise generation limit reached. Try again tomorrow."
          : "Failed to generate exercise. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleBack = () => {
    window.history.back();
  };

  const handleGenerateExercise = (topic: string) => {
    if (!currentStudentRecord) return;
    
    generateExerciseMutation.mutate({
      studentId: currentStudentRecord.id,
      topic,
      subject: currentStudentRecord.subject
    });
  };

  // Save selections to localStorage
  useEffect(() => {
    if (selectedChild) localStorage.setItem('selectedChild', selectedChild);
  }, [selectedChild]);

  useEffect(() => {
    if (selectedSubject) localStorage.setItem('selectedSubject', selectedSubject);
  }, [selectedSubject]);

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAverageColor = (average: number): string => {
    if (average >= 80) return 'text-green-600';
    if (average >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUnderstandingColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const toggleTopicExpansion = (topic: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topic)) {
      newExpanded.delete(topic);
    } else {
      newExpanded.add(topic);
    }
    setExpandedTopics(newExpanded);
  };
    
  const availableChildren = [...new Set(analyticsData.map((s: StudentAnalytics) => `${s.firstName} ${s.lastName}`))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-bold text-white tracking-tight">Student Analytics</h1>
            <div className="w-10"></div>
          </div>

          {/* Child and Subject Selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Child</label>
                <Select 
                  value={selectedChild} 
                  onValueChange={(value) => {
                    setSelectedChild(value);
                    setSelectedSubject(""); // Reset subject selection when changing child
                  }}
                >
                  <SelectTrigger className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
                    <SelectValue placeholder="Select Child" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChildren.map((childName) => (
                      <SelectItem key={childName} value={childName}>
                        {childName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Subject</label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                  disabled={!selectedChild}
                >
                  <SelectTrigger className="bg-white/20 backdrop-blur-sm border-white/30 text-white disabled:opacity-50">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600">Loading analytics data...</p>
          </div>
        ) : !selectedChild ? (
          /* No Child Selected Prompt */
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a Child</h3>
            <p className="text-slate-600">Choose a child to view their analytics and performance insights</p>
          </div>
        ) : studentSubscriptionStatus && !studentSubscriptionStatus.hasActiveSubscription ? (
          /* Subscription Required Prompt */
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 text-center">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              {studentSubscriptionStatus?.subscription?.status === "cancelled" || studentSubscriptionStatus?.subscription?.status === "expired" 
                ? "Subscription Inactive" 
                : "Subscription Required"}
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              {studentSubscriptionStatus?.subscription?.status === "cancelled" 
                ? `${selectedChild}'s subscription has been cancelled. Resubscribe to restore access to all premium features.`
                : studentSubscriptionStatus?.subscription?.status === "expired"
                ? `${selectedChild}'s subscription has expired. Resubscribe to restore access to all premium features.`
                : `${selectedChild} needs an active subscription to access the learning platform. Subscribe now to unlock all features and help them succeed!`}
            </p>
            <div className="bg-slate-50 rounded-2xl p-6 mb-6 max-w-md mx-auto">
              <h4 className="font-semibold text-slate-800 mb-3">What's included:</h4>
              <ul className="text-left text-slate-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>AI-powered personalized exercises</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Detailed performance analytics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Interactive homework and assessments</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Progress tracking and insights</span>
                </li>
              </ul>
            </div>
            <Button 
              onClick={() => setLocation(`/subscription?studentUserId=${currentStudent?.studentUserId}`)}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 md:py-6 px-4 md:px-8 rounded-xl text-base md:text-lg shadow-lg"
            >
              <CreditCard className="w-4 h-4 md:w-5 md:h-5 mr-2 flex-shrink-0" />
              <span className="truncate">
                {studentSubscriptionStatus?.subscription?.status === "cancelled" || studentSubscriptionStatus?.subscription?.status === "expired"
                  ? `Resubscribe for ${selectedChild}`
                  : `Start Subscription for ${selectedChild}`}
              </span>
            </Button>
          </div>
        ) : !selectedSubject ? (
          /* No Subject Selected Prompt */
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a Subject</h3>
            <p className="text-slate-600">Choose a subject to view detailed analytics and performance insights for {selectedChild}</p>
          </div>
        ) : currentStudentRecord ? (
          <>
            {/* Student Overview Card */}
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/30">
              <div className="flex items-start md:items-center space-x-3 md:space-x-4 mb-4 md:mb-6">
                <Avatar className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
                  {currentStudentRecord.profilePhoto ? (
                    <AvatarImage src={currentStudentRecord.profilePhoto} alt={`${currentStudentRecord.firstName} ${currentStudentRecord.lastName}`} />
                  ) : (
                    <AvatarFallback className="bg-primary text-white text-base md:text-lg">
                      {getInitials(currentStudentRecord.firstName, currentStudentRecord.lastName)}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-slate-800 truncate">
                    {currentStudentRecord.firstName} {currentStudentRecord.lastName}
                  </h3>
                  <p className="text-sm md:text-base text-slate-600 mb-1 md:mb-2 truncate">{currentStudentRecord.subject}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs md:text-sm text-slate-600 whitespace-nowrap">Current Average:</span>
                      <span className={`text-base md:text-lg font-bold ${getAverageColor(currentStudentRecord.currentAverage)}`}>
                        {currentStudentRecord.currentAverage}%
                      </span>
                    </div>
                    {currentStudentRecord.recentTrend === 'improving' && (
                      <Badge variant="outline" className="text-green-700 border-green-300 w-fit">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Improving
                      </Badge>
                    )}
                  </div>
                </div>

              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                <div className="bg-blue-50 rounded-xl p-2 md:p-3 text-center">
                  <div className="text-lg md:text-xl font-bold text-blue-600">{currentStudentRecord.homeworkCompleted || 0}</div>
                  <div className="text-[10px] md:text-xs text-blue-600">Homework</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-2 md:p-3 text-center">
                  <div className="text-lg md:text-xl font-bold text-purple-600">{currentStudentRecord.exercisesCompleted || 0}</div>
                  <div className="text-[10px] md:text-xs text-purple-600">Exercises</div>
                </div>
                <div className="bg-green-50 rounded-xl p-2 md:p-3 text-center">
                  <div className="text-lg md:text-xl font-bold text-green-600">{currentStudentRecord.totalCompleted || 0}</div>
                  <div className="text-[10px] md:text-xs text-green-600">Total Done</div>
                </div>
                <div className="bg-red-50 rounded-xl p-2 md:p-3 text-center">
                  <div className="text-lg md:text-xl font-bold text-red-600">{currentStudentRecord.missedAssessments || 0}</div>
                  <div className="text-[10px] md:text-xs text-red-600">Missed</div>
                </div>
              </div>
            </div>

            {/* Missed Assessments Alert */}
            {(studentMetrics?.missedWork || 0) > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-3xl p-6">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <div>
                    <h4 className="text-lg font-semibold text-red-800">
                      {studentMetrics?.missedWork || 0} Missed Assessment{(studentMetrics?.missedWork || 0) > 1 ? 's' : ''}
                    </h4>
                    <p className="text-red-600">Please ensure {currentStudentRecord.firstName} completes outstanding assessments to maintain progress.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Overall Analysis */}
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/30">
              <h4 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4">Overall Analysis</h4>
              <p className="text-sm md:text-base text-slate-600 bg-slate-50 rounded-lg p-3 md:p-4 mb-3 md:mb-4">
                {currentStudentRecord.summary}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-semibold text-green-700 mb-3 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Key Strengths
                    {globalContext && (
                      <Badge className="ml-2 text-xs bg-blue-100 text-blue-700">
                        AI Analysis
                      </Badge>
                    )}
                  </h5>
                  <div className="space-y-2">
                    {/* Show only AI-generated global context strengths */}
                    {isGlobalContextLoading ? (
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                        Loading AI analysis...
                      </div>
                    ) : globalContext?.overallFeedback?.strengths?.length > 0 ? (
                      globalContext.overallFeedback.strengths.map((strength: string, index: number) => (
                        <div key={index} className="text-sm text-green-600 bg-green-50 rounded-lg p-3">
                          • {strength}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                        • Complete more activities to generate meaningful strengths analysis
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-semibold text-orange-700 mb-3 flex items-center">
                    <TrendingDown className="w-4 h-4 mr-1" />
                    Areas for Growth
                    {globalContext && (
                      <Badge className="ml-2 text-xs bg-blue-100 text-blue-700">
                        AI Analysis
                      </Badge>
                    )}
                  </h5>
                  <div className="space-y-2">
                    {/* Show AI improvements first, fallback to existing weakness data */}
                    {isGlobalContextLoading ? (
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                        Loading AI analysis...
                      </div>
                    ) : globalContext?.overallFeedback?.improvements?.length > 0 ? (
                      globalContext.overallFeedback.improvements.map((improvement: string, index: number) => (
                        <div key={index} className="text-sm text-orange-600 bg-orange-50 rounded-lg p-3">
                          • {improvement}
                        </div>
                      ))
                    ) : currentStudentRecord.weaknesses.length > 0 ? (
                      currentStudentRecord.weaknesses.map((weakness, index) => (
                        <div key={index} className="text-sm text-orange-600 bg-orange-50 rounded-lg p-3">
                          • {weakness}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                        • Complete more activities to generate improvement suggestions
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* AI Recommendations Section */}
              {globalContext?.overallFeedback?.recommendations?.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-semibold text-blue-700 mb-3 flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    AI Recommendations
                    <Badge className="ml-2 text-xs bg-blue-100 text-blue-700">
                      Latest Analysis
                    </Badge>
                  </h5>
                  <div className="space-y-2">
                    {globalContext.overallFeedback.recommendations.map((recommendation: string, index: number) => (
                      <div key={index} className="text-sm text-blue-600 bg-blue-50 rounded-lg p-3">
                        💡 {recommendation}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Topic Performance */}
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/30">
              <h4 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center">
                <Target className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Topic Performance
              </h4>
              
              <div className="space-y-4">
                {Object.entries(currentStudentRecord.topicScores).map(([topic, score]) => {
                  const topicName = topic.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const topicDetail = currentStudentRecord.topicDetails?.[topic];
                  const isExpanded = expandedTopics.has(topic);
                  
                  return (
                    <div key={topic} className="bg-slate-50 rounded-xl p-4">
                      <div 
                        className="cursor-pointer"
                        onClick={() => toggleTopicExpansion(topic)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-slate-700">{topicName}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-700">{score}%</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${getUnderstandingColor(score)}`}
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Expanded Topic Details */}
                      {isExpanded && topicDetail && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h6 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Strengths
                              </h6>
                              <div className="space-y-1">
                                {topicDetail.strengths.map((strength, index) => (
                                  <div key={index} className="text-xs text-green-600 bg-green-50 rounded-md p-2">
                                    • {strength}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h6 className="text-sm font-semibold text-orange-700 mb-2 flex items-center">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                Areas for Improvement
                              </h6>
                              <div className="space-y-1">
                                {topicDetail.weaknesses.map((weakness, index) => (
                                  <div key={index} className="text-xs text-orange-600 bg-orange-50 rounded-md p-2">
                                    • {weakness}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Generate Exercise Button */}
                          <div className="flex justify-center pt-2">
                            <Button
                              onClick={() => handleGenerateExercise(topic)}
                              disabled={generateExerciseMutation.isPending || (dailyLimitStatus?.exercisesGenerated >= dailyLimitStatus?.dailyLimit)}
                              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-2"
                              size="sm"
                            >
                              {generateExerciseMutation.isPending ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 mr-2" />
                                  Generate Exercise
                                </>
                              )}
                            </Button>
                          </div>
                          
                          {/* Daily Limit Status */}
                          {dailyLimitStatus && (
                            <div className="text-center">
                              <div className="text-xs text-slate-500">
                                Exercises generated today: {dailyLimitStatus.exercisesGenerated}/{dailyLimitStatus.dailyLimit}
                                {dailyLimitStatus.exercisesGenerated >= dailyLimitStatus.dailyLimit && (
                                  <span className="text-red-500 ml-1">(Limit reached - resets tomorrow)</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <Button
                variant="outline"
                className="w-full py-4 md:py-6 flex items-center justify-center md:justify-start"
                onClick={() => setLocation(`/student-homework/${currentStudentRecord.id}`)}
              >
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-sm md:text-base font-semibold">View All Assessments</div>
                  <div className="text-xs md:text-sm text-slate-600 hidden sm:block">See detailed assessment history</div>
                </div>
              </Button>
              
              <Button
                className="w-full py-4 md:py-6 bg-gradient-to-r from-primary via-primary-dark to-cyan-600 hover:from-primary-dark hover:via-cyan-600 hover:to-primary flex items-center justify-center md:justify-start"
                onClick={() => setLocation(`/generate-lesson/${currentStudentRecord.id}`)}
              >
                <Zap className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-sm md:text-base font-semibold">Generate Custom Assessment</div>
                  <div className="text-xs md:text-sm text-white/80 hidden sm:block">Create targeted practice</div>
                </div>
              </Button>
            </div>
          </>
        ) : (
          /* No Data Found */
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Data Available</h3>
            <p className="text-slate-600">Analytics data for {selectedChild} in {selectedSubject} is not available yet.</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}