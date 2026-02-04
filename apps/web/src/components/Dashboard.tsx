import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Bell, 
  Calendar, 
  Clock, 
  BookOpen, 
  CheckCircle, 
  GraduationCap, 
  Users, 
  UserPlus,
  LogOut,
  Settings,
  Trash2,
  Plus,
  Loader2,
  Lock,
  Trophy
} from 'lucide-react';
import ClassForm from './ClassForm';
import TeacherClassList from './TeacherClassList';
import ChildForm from './ChildForm';
import BottomNav from './BottomNav';
import ReferralShareCard from './ReferralShareCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import logoImage from '@assets/xtraclass-logo-td.png';
import StudentSubjectDashboard from './StudentSubjectDashboard';
import TeacherClasses from './TeacherClasses';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import type { ChildData } from '@/lib/types';
import { useNotificationCount } from '@/hooks/useNotifications';

interface ClassData {
  id?: number;
  teacherId?: number;
  subject: string;
  grade: string;
  className: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { data: notificationData } = useNotificationCount();
  const [loadingDetails, setLoadingDetails] = useState<number | null>(null);
  const [childToUnlink, setChildToUnlink] = useState<{ id: number; name: string } | null>(null);
  
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Dashboard logout button clicked!');
    try {
      await logout();
      // Navigate to landing page after logout
      setLocation('/');
    } catch (error) {
      console.error('Logout error in Dashboard:', error);
    }
  };
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showChildForm, setShowChildForm] = useState(false);

  const handleViewDetails = async (childId: number) => {
    setLoadingDetails(childId);
    // Find the child data to get their name and grade
    const child = children.find((c: any) => c.id === childId);
    if (child) {
      // Add a small delay to show the loading state
      setTimeout(() => {
        // Navigate to parent analytics with studentUserId for reliable lookup
        const params = new URLSearchParams({
          studentUserId: child.studentUserId?.toString() || '',
          student: `${child.firstName} ${child.lastName}`,
          grade: child.grade || child.gradeLevel || ''
        });
        setLocation(`/parent-analytics?${params.toString()}`);
        setLoadingDetails(null);
      }, 500);
    } else {
      setLoadingDetails(null);
    }
  };

  // Fetch children for parents
  const { data: children = [], isLoading: childrenLoading } = useQuery<ChildData[]>({
    queryKey: ['/api/children'],
    enabled: user?.role === 'parent'
  });

  // Fetch stats for each child
  const childStats = useQuery({
    queryKey: ['/api/children/stats'],
    queryFn: async () => {
      if (!children.length) return [];
      
      const statsPromises = children.map(async (child) => {
        if (!child.studentUserId) return { childId: child.id, stats: null };
        
        try {
          const stats = await apiRequest(`/api/students/${child.studentUserId}/stats`);
          return { childId: child.id, stats };
        } catch (error) {
          console.error(`Failed to fetch stats for child ${child.id}:`, error);
          return { childId: child.id, stats: null };
        }
      });
      
      const results = await Promise.all(statsPromises);
      return results.reduce((acc, result) => {
        acc[result.childId] = result.stats;
        return acc;
      }, {} as Record<number, any>);
    },
    enabled: user?.role === 'parent' && children.length > 0
  });

  // Fetch subscription status for each child
  const childSubscriptions = useQuery({
    queryKey: ['/api/children/subscriptions'],
    queryFn: async () => {
      if (!children.length) return {};
      
      const subscriptionPromises = children.map(async (child) => {
        if (!child.studentUserId) return { childId: child.id, hasSubscription: false, status: 'none' };
        
        try {
          const status = await apiRequest(`/api/students/${child.studentUserId}/subscription-status`);
          return { 
            childId: child.id, 
            hasSubscription: status.hasActiveSubscription,
            status: status.subscriptionStatus || 'none',
            nextPaymentDate: status.subscription?.nextPaymentDate
          };
        } catch (error) {
          console.error(`Failed to fetch subscription for child ${child.id}:`, error);
          return { childId: child.id, hasSubscription: false, status: 'none' };
        }
      });
      
      const results = await Promise.all(subscriptionPromises);
      return results.reduce((acc, result) => {
        acc[result.childId] = {
          hasSubscription: result.hasSubscription,
          status: result.status,
          nextPaymentDate: result.nextPaymentDate
        };
        return acc;
      }, {} as Record<number, { hasSubscription: boolean; status: string; nextPaymentDate?: string }>);
    },
    enabled: user?.role === 'parent' && children.length > 0,
    refetchInterval: 30000,
    staleTime: 10000
  });

  const handleAddChild = () => {
    setShowChildForm(true);
  };

  const handleChildSaved = (child: ChildData) => {
    queryClient.invalidateQueries({ queryKey: ['/api/children'] });
    setShowChildForm(false);
  };

  // Mutation to unlink a child
  const unlinkChildMutation = useMutation({
    mutationFn: async (childId: number) => {
      return apiRequest(`/api/children/${childId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/children'] });
      queryClient.invalidateQueries({ queryKey: ['/api/children/stats'] });
    },
    onError: (error) => {
      console.error('Failed to unlink child:', error);
    }
  });

  const handleUnlinkChild = () => {
    if (childToUnlink) {
      unlinkChildMutation.mutate(childToUnlink.id);
      setChildToUnlink(null);
    }
  };

  const { toast } = useToast();

  // Handle update subscription (redirect to Paystack management page)
  const handleUpdateSubscription = async (child: ChildData) => {
    if (!child.studentUserId) {
      toast({
        title: "Error",
        description: "No student account linked",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await apiRequest(`/api/subscription/${child.studentUserId}/manage-link`);
      if (response.success && response.link) {
        // Redirect to Paystack hosted subscription management page
        window.open(response.link, '_blank');
      } else {
        toast({
          title: "Error",
          description: "Failed to generate subscription management link",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access subscription management",
        variant: "destructive"
      });
    }
  };

  // Handle cancel subscription
  const handleCancelSubscription = async (child: ChildData) => {
    if (!child.studentUserId) {
      toast({
        title: "Error",
        description: "No student account linked",
        variant: "destructive"
      });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel ${child.firstName}'s subscription? They will lose access to premium features.`
    );
    
    if (!confirmed) return;

    try {
      await apiRequest(`/api/subscription/cancel`, {
        method: 'POST',
        body: JSON.stringify({ userId: child.studentUserId })
      });
      
      toast({
        title: "Success",
        description: "Subscription cancelled successfully"
      });
      
      // Refresh subscription status
      queryClient.invalidateQueries({ queryKey: ['/api/children/subscriptions'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive"
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`;
  };

  // Show StudentSubjectDashboard for students
  if (user?.role === 'student') {
    return <StudentSubjectDashboard />;
  }

  // Parent Dashboard
  if (user?.role === 'parent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pb-0 md:pt-16">
        {/* Header */}
        <div className="gamified-bg relative z-10 p-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="w-32 h-16 flex items-center justify-center">
              <img 
                src={logoImage} 
                alt="XtraClass.ai Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 bg-white bg-opacity-20 rounded-full hover:bg-white/30"
              >
                <Bell className="w-5 h-5 text-white" />
              </Button>
              <button
                onClick={handleLogout}
                className="w-10 h-10 bg-white bg-opacity-20 rounded-full hover:bg-white/30 flex items-center justify-center cursor-pointer transition-colors relative z-50"
                style={{ pointerEvents: 'auto' }}
              >
                <LogOut className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="text-white">
            <h1 className="text-2xl font-bold mb-1">Welcome back!</h1>
            <p className="opacity-90">Track your children's learning progress</p>
          </div>
        </div>

        {/* Children Section */}
        <div className="relative px-6 pt-8">
          {/* Section Header with Add Button */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-800 font-semibold text-lg">My Children</h3>
            <Button
              onClick={handleAddChild}
              className="bg-primary hover:bg-primary-dark text-white font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          </div>

          {/* Children Cards */}
          <div className="space-y-4">
            {childrenLoading ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="animate-pulse flex space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ) : children.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-gray-200 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Add Your First Child</h3>
                <p className="text-teal-500 font-medium mb-2">
                  Create a profile to get started
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  Use the "Add Child" button above to begin
                </p>
              </div>
            ) : (
              children.map((child) => (
                <div key={child.id} className="bg-white rounded-3xl p-5 md:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  {/* Header Section */}
                  <div className="flex items-center gap-4 mb-5">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {child.profilePhoto ? (
                        <img 
                          src={child.profilePhoto} 
                          alt={`${child.firstName} ${child.lastName}`}
                          className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-primary/20 shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center shadow-md">
                          <span className="text-white font-bold text-xl md:text-2xl">
                            {getInitials(child.firstName, child.lastName)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg md:text-xl font-bold text-gray-800">
                          {child.firstName} {child.lastName}
                        </h3>
                        {childSubscriptions.data?.[child.id]?.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                            <Lock className="w-3 h-3" />
                            Cancelled
                          </span>
                        )}
                        {!childSubscriptions.data?.[child.id]?.hasSubscription && 
                         childSubscriptions.data?.[child.id]?.status !== 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                            <Lock className="w-3 h-3" />
                            No Subscription
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-0.5">{child.school}</p>
                      <p className="text-xs text-gray-400">{child.grade}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {childSubscriptions.data?.[child.id]?.hasSubscription && 
                       childSubscriptions.data?.[child.id]?.status !== 'cancelled' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                              className="w-9 h-9 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl"
                              data-testid={`settings-child-${child.id}`}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateSubscription(child);
                              }}
                              className="cursor-pointer"
                              data-testid={`update-subscription-${child.id}`}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Update Card Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelSubscription(child);
                              }}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                              data-testid={`cancel-subscription-${child.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Cancel Subscription
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChildToUnlink({ id: child.id, name: `${child.firstName} ${child.lastName}` });
                        }}
                        className="w-9 h-9 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                        data-testid={`unlink-child-${child.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* XP Badge */}
                  <div className="flex items-center justify-center mb-5">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl border border-cyan-200">
                      <Trophy className="w-5 h-5 text-[#00AACC]" />
                      <span className="text-2xl font-bold text-[#00AACC]">
                        {childStats.data?.[child.id]?.points || 0}
                      </span>
                      <span className="text-sm font-medium text-gray-600">XP</span>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="space-y-4 mb-5">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Learning Progress</h4>
                    {childStats.data?.[child.id]?.subjectProgress?.length > 0 ? (
                      childStats.data[child.id].subjectProgress.map((subject: any, index: number) => {
                        const colors = [
                          { text: 'text-[#00AACC]', bg: 'bg-[#00AACC]' },
                          { text: 'text-blue-500', bg: 'bg-blue-500' },
                          { text: 'text-emerald-500', bg: 'bg-emerald-500' },
                          { text: 'text-purple-500', bg: 'bg-purple-500' }
                        ];
                        const color = colors[index % colors.length];
                        const formattedSubject = subject.subject
                          .replace(/-/g, ' ')
                          .replace(/\b\w/g, (char: string) => char.toUpperCase());
                        
                        return (
                          <div key={subject.subject} className="bg-gray-50 rounded-xl p-3">
                            <div className="flex justify-between items-center text-sm mb-2">
                              <span className="font-medium text-gray-700">{formattedSubject}</span>
                              <span className={`${color.text} font-bold`}>
                                {subject.percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`${color.bg} h-2.5 rounded-full transition-all duration-500`}
                                style={{ width: `${subject.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl">
                        {childStats.isLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading progress...</span>
                          </div>
                        ) : (
                          'No subjects available'
                        )}
                      </div>
                    )}
                  </div>

                  {/* View Details Button */}
                  <Button 
                    onClick={() => handleViewDetails(child.id)}
                    disabled={loadingDetails === child.id}
                    className="w-full bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg"
                  >
                    {loadingDetails === child.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      'View Detailed Analytics'
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav />

        {/* Child Form Modal */}
        {showChildForm && (
          <ChildForm
            onClose={() => setShowChildForm(false)}
            onSave={handleChildSaved}
          />
        )}

        {/* Unlink Child Confirmation Dialog */}
        <AlertDialog open={!!childToUnlink} onOpenChange={(open) => !open && setChildToUnlink(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Child from Your Profile?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <span className="font-semibold text-gray-900">{childToUnlink?.name}</span> from your profile?
                <br /><br />
                This will unlink them from your account, but their student account and all their progress will remain intact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUnlinkChild}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Remove Child
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (user?.role === 'teacher') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pb-0 md:pt-16">
        {/* Teacher Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.3),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]"></div>
          
          <div className="relative z-10 p-6 pb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="w-20 h-10 flex items-center justify-center">
                <img 
                  src={logoImage} 
                  alt="XtraClass.ai Logo" 
                  className="w-full h-full object-contain brightness-0 invert rounded-xl"
                />
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation('/calendar')}
                  className="w-10 h-10 bg-white bg-opacity-20 rounded-full hover:bg-white/30"
                >
                  <Calendar className="w-5 h-5 text-white" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 bg-white bg-opacity-20 rounded-full hover:bg-white/30 relative"
                >
                  <Bell className="w-5 h-5 text-white" />
                  {notificationData && notificationData.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {notificationData.unreadCount > 99 ? '99+' : notificationData.unreadCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="w-10 h-10 bg-white bg-opacity-20 rounded-full hover:bg-white/30"
                >
                  <LogOut className="w-5 h-5 text-white" />
                </Button>
              </div>
            </div>

            <div className="text-white">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, {user?.firstName}!</h1>
              <p className="text-sm md:text-lg opacity-90">Ready to inspire minds today?</p>
            </div>
          </div>
        </div>

        {/* Classes Section */}
        <div className="relative -mt-8 px-3 md:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h3 className="text-gray-800 font-semibold text-lg md:text-xl">My Classes</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 sm:px-4 sm:py-2">
                      <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Add Class</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Class</DialogTitle>
                      <DialogDescription>
                        Fill in the details to create a new class for your students.
                      </DialogDescription>
                    </DialogHeader>
                    <ClassForm
                      onSuccess={() => window.location.reload()}
                      onCancel={() => {}}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <TeacherClassList />
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav />


      </div>
    );
  }

  // Fallback for unknown roles
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome to XtraClass.ai</h1>
        <p className="text-gray-600 mb-6">Setting up your dashboard...</p>
        <Button onClick={handleLogout} variant="outline">
          Sign Out
        </Button>
      </div>
    </div>
  );
}