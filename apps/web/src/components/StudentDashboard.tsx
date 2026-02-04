import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Share, Bell, Calendar, BookOpen, Trophy, Star, AlertTriangle, Clock, TrendingUp, LogOut, Filter, CheckCircle2, Loader2, Mic, Video } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "./BottomNav";
import type { ChildData } from "@/lib/types";
import logoImage from "@assets/xtraclass-logo-td.png";
import { useAuth } from "@/contexts/AuthContext";
import ReferralShareCard from "./ReferralShareCard";

interface StudentDashboardProps {
  childId: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function StudentDashboard({ childId }: StudentDashboardProps) {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();

  // Fetch children data from API
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['/api/children'],
    queryFn: () => apiRequest('/api/children')
  });

  // Find the child from API data first to get student user ID
  const child = children.find((c: ChildData) => c.id?.toString() === childId);

  // Fetch student statistics using the student user ID, not child ID
  const { data: studentStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/students', child?.studentUserId, 'stats'],
    queryFn: () => apiRequest(`/api/students/${child?.studentUserId}/stats`),
    enabled: !!child?.studentUserId
  });

  // Fetch student metrics (missed work, upcoming work)
  const { data: studentMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/students', child?.studentUserId, 'metrics'],
    queryFn: () => apiRequest(`/api/students/${child?.studentUserId}/metrics`),
    enabled: !!child?.studentUserId
  });

  // Fetch recent activity
  const { data: recentActivity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['/api/students', child?.studentUserId, 'activity'],
    queryFn: () => apiRequest(`/api/students/${child?.studentUserId}/activity`),
    enabled: !!child?.studentUserId
  });

  // Fetch latest work (homework and exercises) for dashboard preview
  const { data: latestWork = [], isLoading: latestWorkLoading } = useQuery({
    queryKey: ['/api/students', child?.studentUserId, 'latest-work'],
    queryFn: () => apiRequest(`/api/students/${child?.studentUserId}/latest-work`),
    enabled: !!child?.studentUserId
  });

  // Fetch weekly schedule
  const { data: weeklySchedule = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ['/api/students', child?.studentUserId, 'schedule'],
    queryFn: () => apiRequest(`/api/students/${child?.studentUserId}/schedule`),
    enabled: !!child?.studentUserId
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
  });

  // Check feature flags
  const hasVoiceTutorAccess = subscriptionStatus?.features?.aiVoiceTutor === true;
  const hasTutorVideoCallAccess = subscriptionStatus?.features?.tutorVideoCall === true;


  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('StudentDashboard logout button clicked!');
    try {
      await logout();
      // Navigate to landing page after logout
      setLocation('/');
    } catch (error) {
      console.error('Logout error in StudentDashboard:', error);
    }
  };

  const handleBack = () => {
    setLocation('/dashboard');
  };

  if (childrenLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        {/* Enhanced Loading Screen */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-12 shadow-2xl border border-white/30 text-center max-w-sm w-full mx-6">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src={logoImage} 
              alt="XtraClass.ai" 
              className="w-32 h-16 mx-auto object-contain"
            />
          </div>
          
          {/* Animated Loader */}
          <div className="relative mb-8">
            <div className="w-16 h-16 mx-auto relative">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
              {/* Spinning ring */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
              {/* Inner pulsing dot */}
              <div className="absolute inset-4 rounded-full bg-blue-600 animate-pulse"></div>
            </div>
          </div>
          
          {/* Loading Text */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-800">Loading Student Dashboard</h3>
            <p className="text-gray-600">Preparing your child's academic overview...</p>
            
            {/* Loading Steps Animation */}
            <div className="space-y-2 mt-6">
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-600" />
                <span>Fetching student data...</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-600" style={{ animationDelay: '0.2s' }} />
                <span>Loading recent activities...</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-600" style={{ animationDelay: '0.4s' }} />
                <span>Calculating performance metrics...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Child not found.</p>
          <Button onClick={handleBack} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pb-0 md:pt-16">
      {/* Header */}
      <div className="relative overflow-hidden">
        {/* Modern gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-4 md:p-6 pb-8 md:pb-12">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl"
              >
                <Bell className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl"
              >
                <Share className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl"
              >
                <LogOut className="w-6 h-6" />
              </Button>
            </div>
          </div>

          <div className="text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">{child.firstName}'s Dashboard</h1>
            <p className="text-blue-100 text-sm md:text-lg">{child.schoolName || child.school || 'School not specified'} • {child.gradeLevel || child.grade || 'Grade not specified'}</p>
          </div>
        </div>
      </div>
      {/* Student Profile Card */}
      <div className="relative -mt-6 px-4 md:px-6 mb-6 md:mb-8">
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 relative overflow-hidden">
          {/* Modern gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-purple-50/20 to-blue-50/30 pointer-events-none"></div>
          <div className="relative z-10">
            {/* Profile and Metrics Row */}
            <div className="flex items-center justify-between mb-8">
              {child.profilePhoto && (
                <div className="w-20 h-20 rounded-3xl overflow-hidden ring-4 ring-indigo-100 shadow-xl">
                  <img 
                    src={child.profilePhoto} 
                    alt={`${child.firstName} ${child.lastName}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex space-x-4">
                <div className="text-center bg-gradient-to-br from-indigo-100/80 to-purple-100/60 rounded-3xl p-6 backdrop-blur-sm border border-indigo-200/50 shadow-lg">
                  <div className="text-3xl font-bold text-indigo-600 mb-1">{studentStats?.points || 0}</div>
                  <div className="text-xs text-indigo-700 font-semibold">XP Points</div>
                </div>
                
                <div className="text-center bg-gradient-to-br from-emerald-100/80 to-green-100/60 rounded-3xl p-6 backdrop-blur-sm border border-emerald-200/50 shadow-lg">
                  <div className="text-3xl font-bold text-emerald-600 mb-1">{studentStats?.completionPercentage || 0}%</div>
                  <div className="text-xs text-emerald-700 font-semibold">Completion</div>
                </div>
              </div>
            </div>

            {/* Additional Metrics - Less Prominent */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="text-center bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/30 shadow-sm">
                <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div className="text-lg font-bold text-slate-700 mb-1">{studentMetrics?.missedWork?.count || 0}</div>
                <div className="text-xs text-slate-500 font-medium">Missed Work</div>
              </div>
              <div className="text-center bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/30 shadow-sm">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="text-lg font-bold text-slate-700 mb-1">{studentMetrics?.upcomingWork?.count || 0}</div>
                <div className="text-xs text-slate-500 font-medium">Upcoming Work</div>
              </div>
              <div className="text-center bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/30 shadow-sm">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="text-lg font-bold text-slate-700 mb-1">84%</div>
                <div className="text-xs text-slate-500 font-medium">Assessment Avg</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Subject Progress */}
      <div className="px-6 mb-8">
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/40 via-blue-50/30 to-indigo-50/40 pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-slate-800 mb-8 tracking-tight">Subject Progress</h3>
            
            <div className="space-y-6">
              {studentStats?.subjectProgress && studentStats.subjectProgress.length > 0 ? (
                studentStats.subjectProgress.map((subject: any, index: number) => {
                  // Get color scheme based on index
                  const colorSchemes = [
                    { 
                      bg: 'from-indigo-50/80 to-blue-50/60',
                      border: 'border-indigo-100/50',
                      text: 'text-indigo-600',
                      progress: 'bg-indigo-100'
                    },
                    {
                      bg: 'from-amber-50/80 to-yellow-50/60', 
                      border: 'border-amber-100/50',
                      text: 'text-amber-600',
                      progress: 'bg-amber-100'
                    },
                    {
                      bg: 'from-emerald-50/80 to-green-50/60',
                      border: 'border-emerald-100/50', 
                      text: 'text-emerald-600',
                      progress: 'bg-emerald-100'
                    },
                    {
                      bg: 'from-purple-50/80 to-violet-50/60',
                      border: 'border-purple-100/50',
                      text: 'text-purple-600', 
                      progress: 'bg-purple-100'
                    }
                  ];
                  
                  const colorScheme = colorSchemes[index % colorSchemes.length];
                  
                  return (
                    <div key={subject.subject} className={`bg-gradient-to-r ${colorScheme.bg} rounded-2xl p-5 border ${colorScheme.border}`}>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-slate-700 font-semibold text-lg capitalize">{subject.subject}</span>
                        <span className={`${colorScheme.text} font-bold text-xl`}>{subject.percentage}%</span>
                      </div>
                      <Progress value={subject.percentage} className={`h-4 ${colorScheme.progress}`} />
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No subjects available for your grade level
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Recent Activity */}
      <div className="px-6 mb-8">
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/30 via-pink-50/20 to-purple-50/30 pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-slate-800 mb-8 tracking-tight">Recent Activity</h3>
            
            <div className="space-y-5">
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-slate-600">Loading recent activity...</span>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-slate-600">No recent activity yet</p>
                  <p className="text-sm text-slate-500 mt-1">Complete homework and exercises to see your progress!</p>
                </div>
              ) : (
                recentActivity.map((activity: any, index: number) => {
                  const getActivityStyles = (type: string, subject: string) => {
                    if (type === 'homework') {
                      if (subject === 'mathematics') {
                        return {
                          bg: 'from-emerald-50/80 to-green-50/60',
                          border: 'border-emerald-100/50',
                          iconBg: 'from-emerald-500 to-green-600',
                          textColor: 'text-emerald-600',
                          icon: BookOpen
                        };
                      } else if (subject === 'physical-science') {
                        return {
                          bg: 'from-blue-50/80 to-cyan-50/60',
                          border: 'border-blue-100/50',
                          iconBg: 'from-blue-500 to-cyan-600',
                          textColor: 'text-blue-600',
                          icon: BookOpen
                        };
                      } else {
                        return {
                          bg: 'from-purple-50/80 to-pink-50/60',
                          border: 'border-purple-100/50',
                          iconBg: 'from-purple-500 to-pink-600',
                          textColor: 'text-purple-600',
                          icon: BookOpen
                        };
                      }
                    } else {
                      return {
                        bg: 'from-amber-50/80 to-yellow-50/60',
                        border: 'border-amber-100/50',
                        iconBg: 'from-amber-500 to-yellow-600',
                        textColor: 'text-amber-600',
                        icon: Trophy
                      };
                    }
                  };
                  
                  const styles = getActivityStyles(activity.type, activity.subject);
                  const Icon = styles.icon;
                  
                  return (
                    <div key={`${activity.type}-${activity.id}-${index}`} className={`flex items-center space-x-5 p-5 bg-gradient-to-r ${styles.bg} rounded-2xl border ${styles.border} hover:shadow-lg transition-all duration-300`}>
                      <div className={`w-14 h-14 bg-gradient-to-br ${styles.iconBg} rounded-2xl flex items-center justify-center shadow-xl`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-bold text-slate-800 capitalize">
                          Completed {activity.title}
                        </p>
                        <p className={`text-sm font-semibold ${styles.textColor}`}>
                          {activity.timeAgo} • +{activity.points} XP
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Homework Section */}
      <div className="px-6 mb-8">
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-green-50/20 to-teal-50/30 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Homework</h3>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              {latestWorkLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-slate-600">Loading latest work...</span>
                </div>
              ) : latestWork.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-slate-600">No recent homework or exercises</p>
                  <p className="text-sm text-slate-500 mt-1">New assignments will appear here when available!</p>
                </div>
              ) : (
                latestWork.map((work: any, index: number) => {
                  const getWorkStyles = (type: string, subject: string) => {
                    if (type === 'homework') {
                      if (subject === 'mathematics') {
                        return {
                          bg: 'from-emerald-50/80 to-green-50/60',
                          border: 'border-emerald-100/50',
                          iconBg: 'from-emerald-500 to-green-600',
                          textColor: 'text-emerald-600',
                          icon: BookOpen
                        };
                      } else if (subject === 'physical-science') {
                        return {
                          bg: 'from-blue-50/80 to-cyan-50/60',
                          border: 'border-blue-100/50',
                          iconBg: 'from-blue-500 to-cyan-600',
                          textColor: 'text-blue-600',
                          icon: BookOpen
                        };
                      } else {
                        return {
                          bg: 'from-purple-50/80 to-pink-50/60',
                          border: 'border-purple-100/50',
                          iconBg: 'from-purple-500 to-pink-600',
                          textColor: 'text-purple-600',
                          icon: BookOpen
                        };
                      }
                    } else {
                      return {
                        bg: 'from-amber-50/80 to-yellow-50/60',
                        border: 'border-amber-100/50',
                        iconBg: 'from-amber-500 to-yellow-600',
                        textColor: 'text-amber-600',
                        icon: Trophy
                      };
                    }
                  };

                  const getStatusStyles = (status: string) => {
                    switch (status) {
                      case 'completed':
                        return {
                          textColor: 'text-green-600',
                          icon: CheckCircle2,
                          label: 'Completed'
                        };
                      case 'overdue':
                        return {
                          textColor: 'text-red-600',
                          icon: AlertTriangle,
                          label: 'Overdue'
                        };
                      default:
                        return {
                          textColor: 'text-orange-600',
                          icon: Clock,
                          label: 'Pending'
                        };
                    }
                  };
                  
                  const workStyles = getWorkStyles(work.type, work.subject);
                  const statusStyles = getStatusStyles(work.status);
                  const WorkIcon = workStyles.icon;
                  const StatusIcon = statusStyles.icon;
                  
                  const formatSubject = (subject: string) => {
                    return subject
                      .replace(/-/g, ' ')
                      .replace(/\b\w/g, (char: string) => char.toUpperCase());
                  };
                  
                  const formatDueDate = (dueDate: string | null) => {
                    if (!dueDate) return 'No due date';
                    const date = new Date(dueDate);
                    const now = new Date();
                    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays === 0) return 'Due today';
                    if (diffDays === 1) return 'Due tomorrow';
                    if (diffDays === -1) return 'Due yesterday';
                    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
                    return `Due in ${diffDays} days`;
                  };
                  
                  return (
                    <div key={`${work.type}-${work.id}-${index}`} className={`flex items-center space-x-5 p-6 bg-gradient-to-r ${workStyles.bg} rounded-2xl border ${workStyles.border}`}>
                      <div className={`w-14 h-14 bg-gradient-to-br ${workStyles.iconBg} rounded-2xl flex items-center justify-center shadow-xl`}>
                        <WorkIcon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-bold text-slate-800">{work.title}</p>
                        <p className={`text-sm font-semibold ${workStyles.textColor}`}>
                          {formatSubject(work.subject)} • {formatDueDate(work.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 mb-1">Status</div>
                        <div className={`flex items-center space-x-1 ${statusStyles.textColor}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">{statusStyles.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <Button 
              onClick={() => setLocation(`/dashboard/student/${childId}/homework`)}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-2xl py-3 shadow-xl"
              data-testid="button-view-homework"
            >
              View All Homework & Exercises
            </Button>
            
            {hasVoiceTutorAccess && (
              <Button 
                onClick={() => setLocation('/voice-tutor')}
                className="w-full mt-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl py-3 shadow-xl flex items-center justify-center gap-2"
                data-testid="button-voice-tutor"
              >
                <Mic className="w-5 h-5" />
                Tsebo Voice Tutor - Get Help with Questions
              </Button>
            )}
            
            {hasTutorVideoCallAccess && (
              <Button 
                onClick={() => setLocation('/student-tutoring')}
                className="w-full mt-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-2xl py-3 shadow-xl flex items-center justify-center gap-2"
                data-testid="button-tutor-sessions"
              >
                <Video className="w-5 h-5" />
                Schedule 1-on-1 Tutor Video Call
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* Schedule */}
      <div className="px-6 mb-8">
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50/30 via-purple-50/20 to-indigo-50/30 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">This Week's Schedule</h3>
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-violet-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              {scheduleLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-slate-600">Loading schedule...</span>
                </div>
              ) : weeklySchedule.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-slate-600">No scheduled activities this week</p>
                  <p className="text-sm text-slate-500 mt-1">Check back for upcoming lessons and assignments!</p>
                </div>
              ) : (
                weeklySchedule.map((scheduleItem: any, index: number) => {
                  const getScheduleStyles = (type: string, subject: string) => {
                    const colors = [
                      { bg: 'from-indigo-50/80 to-blue-50/60', border: 'border-indigo-100/50', dayColor: 'text-indigo-600' },
                      { bg: 'from-blue-50/80 to-cyan-50/60', border: 'border-blue-100/50', dayColor: 'text-blue-600' },
                      { bg: 'from-emerald-50/80 to-green-50/60', border: 'border-emerald-100/50', dayColor: 'text-emerald-600' },
                      { bg: 'from-purple-50/80 to-pink-50/60', border: 'border-purple-100/50', dayColor: 'text-purple-600' },
                      { bg: 'from-orange-50/80 to-red-50/60', border: 'border-orange-100/50', dayColor: 'text-orange-600' }
                    ];
                    return colors[index % colors.length];
                  };
                  
                  const styles = getScheduleStyles(scheduleItem.type, scheduleItem.subject);
                  
                  const formatSubject = (subject: string) => {
                    return subject
                      .replace(/-/g, ' ')
                      .replace(/\b\w/g, (char: string) => char.toUpperCase());
                  };
                  
                  return (
                    <div key={`${scheduleItem.day}-${scheduleItem.date}-${index}`} className={`flex items-center space-x-5 p-6 bg-gradient-to-r ${styles.bg} rounded-2xl border ${styles.border} hover:shadow-lg transition-all duration-300`}>
                      <div className="text-center min-w-[4rem]">
                        <div className={`text-lg font-bold ${styles.dayColor}`}>{scheduleItem.day}</div>
                        <div className={`text-xs ${styles.dayColor.replace('text-', 'text-').replace('-600', '-500')} font-semibold`}>
                          {scheduleItem.month} {scheduleItem.date}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-bold text-slate-800">{formatSubject(scheduleItem.subject)}</p>
                        <p className="text-sm text-slate-600">{scheduleItem.description}</p>
                      </div>
                      <div className="text-xs text-slate-500 uppercase font-medium">
                        {scheduleItem.type}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Referral Section */}
      <div className="px-6 mb-8">
        <ReferralShareCard />
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}