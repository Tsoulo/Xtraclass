import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, User, Shield, Mail, Phone, Camera, Edit, Save, X, Loader2, CreditCard, Download, Calendar, Globe, FileText, BarChart2, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import ReferralShareCard from "@/components/ReferralShareCard";
import jsPDF from "jspdf";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  cellNumber: string;
  role: string;
  profilePhoto?: string;
  registrationNumber?: string;
  subjectSpecialization?: string;
  schoolAffiliation?: string;
  yearsExperience?: number;
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'privacy'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [selectedChildForCancel, setSelectedChildForCancel] = useState<any>(null);

  // Fetch user profile data based on role
  const { data: fetchedProfile, isLoading, error } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: !!user
  });

  // Local state for editing profile
  const [userProfile, setUserProfile] = useState<any>(null);

  // Update local state when fetched data changes
  useEffect(() => {
    if (fetchedProfile) {
      setUserProfile(fetchedProfile);
    }
  }, [fetchedProfile]);

  // Fetch children for parent users
  const { data: children = [] } = useQuery({
    queryKey: ['/api/children'],
    enabled: user?.role === 'parent'
  });

  // Fetch subscription status for each child
  const { data: childSubscriptions } = useQuery({
    queryKey: ['/api/children/subscriptions'],
    queryFn: async () => {
      if (!children.length) return {};
      
      const subscriptionPromises = children.map(async (child: any) => {
        if (!child.studentUserId) return { childId: child.id, hasSubscription: false, status: 'none', subscription: null };
        
        try {
          const status = await apiRequest(`/api/students/${child.studentUserId}/subscription-status`);
          return { 
            childId: child.id, 
            hasSubscription: status.hasActiveSubscription,
            status: status.subscriptionStatus || 'none',
            subscription: status.subscription,
            studentUserId: child.studentUserId
          };
        } catch (error) {
          console.error(`Failed to fetch subscription for child ${child.id}:`, error);
          return { childId: child.id, hasSubscription: false, status: 'none', subscription: null };
        }
      });
      
      const results = await Promise.all(subscriptionPromises);
      return results.reduce((acc, result) => {
        acc[result.childId] = {
          hasSubscription: result.hasSubscription,
          status: result.status,
          subscription: result.subscription,
          studentUserId: result.studentUserId
        };
        return acc;
      }, {} as Record<number, any>);
    },
    enabled: user?.role === 'parent' && children.length > 0,
    refetchInterval: 30000,
    staleTime: 10000
  });

  // Fetch baseline assessments for students
  const { data: baselineAssessments = [] } = useQuery<any[]>({
    queryKey: ['/api/baseline-assessment/history'],
    enabled: user?.role === 'student'
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) =>
      apiRequest('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      setIsEditing(false);
    }
  });

  // Cancel subscription mutation (for own subscription or child's)
  const cancelSubscriptionMutation = useMutation({
    mutationFn: (studentUserId?: number) =>
      apiRequest(studentUserId ? `/api/subscription/${studentUserId}/cancel` : '/api/subscription/cancel', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/children/subscriptions'] });
      setShowCancelDialog(false);
      setSelectedChildForCancel(null);
      toast({
        title: "Subscription Cancelled",
        description: "The subscription has been cancelled. Access will continue until the end of the current billing period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    }
  });

  const handleChangePassword = () => {
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation password must match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handleBack = () => {
    setLocation('/dashboard');
  };

  const handleSaveProfile = () => {
    if (userProfile) {
      updateProfileMutation.mutate(userProfile);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
  };

  const generatePDFReceipt = () => {
    if (!subscription || !userProfile) return;

    const doc = new jsPDF();
    
    // Add logo/header background
    doc.setFillColor(79, 70, 229); // Indigo color
    doc.rect(0, 0, 210, 50, 'F');
    
    // Load and add logo image
    const logoImg = new Image();
    logoImg.src = '/attached_assets/xtraclas -- logo(clr)_1749583140786.png';
    
    logoImg.onload = () => {
      // Add logo to PDF (centered at top)
      doc.addImage(logoImg, 'PNG', 85, 8, 40, 12);
      
      // Company name below logo
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('XtraClass.ai', 105, 28, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('PAYMENT RECEIPT', 105, 38, { align: 'center' });
      
      completePDF();
    };
    
    logoImg.onerror = () => {
      // Fallback if logo doesn't load - just use text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('XtraClass.ai', 105, 25, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('PAYMENT RECEIPT', 105, 38, { align: 'center' });
      
      completePDF();
    };
    
    const completePDF = () => {
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      // Receipt details (adjusted position for larger header)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Receipt Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, 65);
      doc.text(`Receipt #: RCP-${Date.now()}`, 20, 72);
      
      // Divider line
      doc.setLineWidth(0.5);
      doc.line(20, 80, 190, 80);
      
      // Customer information
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Customer Information', 20, 90);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${userProfile.firstName} ${userProfile.lastName}`, 20, 100);
      doc.text(`Email: ${userProfile.email}`, 20, 107);
      
      // Subscription details
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Subscription Details', 20, 125);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Plan Type: Premium', 20, 135);
      doc.text(`Amount: ${subscription.currency} ${subscription.amount}`, 20, 142);
      doc.text(`Status: ${subscription.status.toUpperCase()}`, 20, 149);
      
      if (subscription.nextPaymentDate) {
        const nextPaymentFormatted = new Date(subscription.nextPaymentDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        doc.text(`Next Payment Due: ${nextPaymentFormatted}`, 20, 156);
      }
      
      // Total amount box
      doc.setFillColor(240, 240, 240);
      doc.rect(20, 170, 170, 20, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Amount:', 25, 182);
      doc.text(`${subscription.currency} ${subscription.amount}`, 165, 182, { align: 'right' });
      
      // Footer
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for your subscription!', 105, 210, { align: 'center' });
      doc.text('For support, contact us at support@xtraclass.ai', 105, 217, { align: 'center' });
      
      // Save the PDF
      doc.save(`XtraClass-Receipt-${Date.now()}.pdf`);
    };
  };

  // Fetch subscription data
  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/subscription/status'],
    enabled: !!user
  });

  const subscription = subscriptionData?.subscription;
  const hasSubscription = subscriptionData?.hasSubscription;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'privacy', label: 'Privacy', icon: Shield }
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="loader scale-75 mx-auto"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pt-16">
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <p className="text-red-600">Failed to load profile data</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] })}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pt-16">
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
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
            <div className="w-10"></div>
          </div>

          {/* Tab Navigation */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2 bg-white/20 backdrop-blur-sm rounded-2xl p-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex flex-col items-center justify-center space-y-0.5 sm:space-y-1 py-2 sm:py-3 rounded-xl transition-all duration-300 ${
                    activeTab === tab.id
                      ? "bg-white text-indigo-600 shadow-lg"
                      : "text-white hover:bg-white/10"
                  }`}
                  variant="ghost"
                >
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[9px] sm:text-xs font-medium hidden sm:block">{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Profile Information</h3>
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="rounded-2xl"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="rounded-2xl"
                  >
                    {updateProfileMutation.isPending ? (
                      <div className="loader scale-[0.2] mr-2"></div>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="rounded-2xl"
                    disabled={updateProfileMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Profile Photo */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  {userProfile?.avatar ? (
                    <AvatarImage src={userProfile.avatar} alt="Profile" />
                  ) : (
                    <AvatarFallback className="bg-primary text-white text-2xl">
                      {userProfile?.firstName?.[0] || 'U'}{userProfile?.lastName?.[0] || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                {isEditing && (
                  <Button
                    size="icon"
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-800">
                  {userProfile?.firstName || ''} {userProfile?.lastName || ''}
                </h4>
                {userProfile?.username && (
                  <p className="text-sm text-slate-500">@{userProfile.username}</p>
                )}
                <Badge className="mt-1">
                  {userProfile?.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : 'User'}
                </Badge>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                  <Input
                    value={userProfile?.firstName || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev!, firstName: e.target.value }))}
                    disabled={!isEditing}
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                  <Input
                    value={userProfile?.lastName || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev!, lastName: e.target.value }))}
                    disabled={!isEditing}
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    value={userProfile?.email || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev!, email: e.target.value }))}
                    disabled={!isEditing}
                    className="rounded-2xl pl-10"
                  />
                </div>
                
                {/* Email Verification Status */}
                <div className="mt-3">
                  {userProfile?.emailVerified ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-green-700">Email Verified</span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center justify-center w-5 h-5 bg-amber-500 rounded-full flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-amber-700">Email Not Verified</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg text-xs h-8 border-amber-300 hover:bg-amber-100 hover:text-amber-800 w-full sm:w-auto"
                        onClick={async () => {
                          try {
                            await apiRequest('/api/auth/resend-verification', {
                              method: 'POST'
                            });
                            toast({
                              title: "Email Sent",
                              description: "Verification email has been sent. Please check your inbox.",
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to resend verification email. Please try again later.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Resend Verification
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    value={userProfile?.cellNumber || ''}
                    onChange={(e) => setUserProfile(prev => ({ ...prev!, cellNumber: e.target.value }))}
                    disabled={!isEditing}
                    className="rounded-2xl pl-10"
                  />
                </div>
              </div>

              {userProfile?.role === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        value={userProfile?.username || ''}
                        onChange={(e) => setUserProfile(prev => ({ ...prev!, username: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Choose a username"
                        className="rounded-2xl pl-10"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">This is your public display name on leaderboards</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Grade</label>
                      <Input
                        value={userProfile?.grade || ''}
                        disabled={true}
                        className="rounded-2xl bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Student ID</label>
                      <Input
                        value={userProfile?.studentId || ''}
                        disabled={true}
                        className="rounded-2xl bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">School</label>
                    <Input
                      value={userProfile?.school || ''}
                      disabled={true}
                      className="rounded-2xl bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Points</label>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-800">{userProfile?.points || 0} Points</span>
                        <div className="text-sm text-blue-600">🏆 Keep learning!</div>
                      </div>
                    </div>
                  </div>

                  {userProfile?.subjects && Array.isArray(userProfile.subjects) && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Enrolled Subjects</label>
                      <div className="flex flex-wrap gap-2">
                        {userProfile.subjects.map((subject: string) => (
                          <Badge key={subject} variant="secondary" className="flex items-center space-x-1">
                            <span>{subject}</span>
                          </Badge>
                        ))}
                        {userProfile.subjects.length === 0 && (
                          <p className="text-gray-500 italic">No subjects enrolled yet</p>
                        )}
                      </div>
                    </div>
                  )}

                  {userProfile?.parent && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Parent/Guardian Information</label>
                      <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-medium">{userProfile.parent.firstName} {userProfile.parent.lastName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium break-all">{userProfile.parent.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{userProfile.parent.cellNumber}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Baseline Assessment Reports</label>
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200">
                      {baselineAssessments.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart2 className="w-5 h-5 text-orange-600" />
                            <span className="text-sm font-medium text-orange-800">Your Completed Assessments</span>
                          </div>
                          {baselineAssessments.map((assessment: any) => (
                            <div
                              key={assessment.id}
                              className="flex items-center justify-between p-3 bg-white rounded-xl border border-orange-100 hover:border-orange-300 transition-colors cursor-pointer"
                              onClick={() => setLocation(`/baseline-feedback?attemptId=${assessment.id}`)}
                              data-testid={`baseline-report-${assessment.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">{assessment.subject}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(assessment.completedAt || assessment.startedAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  assessment.score >= 70 ? 'bg-green-500' :
                                  assessment.score >= 50 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }>
                                  {assessment.score}%
                                </Badge>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <BarChart2 className="w-10 h-10 text-orange-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No baseline assessments completed yet</p>
                          <p className="text-xs text-gray-500 mt-1">Complete an assessment to see your report here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {userProfile?.role === 'teacher' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Parcel Number</label>
                      <Input
                        value={userProfile?.registrationNumber || ''}
                        onChange={(e) => setUserProfile(prev => ({ ...prev!, registrationNumber: e.target.value }))}
                        disabled={!isEditing}
                        className="rounded-2xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Years Experience</label>
                      <Input
                        type="number"
                        value={userProfile?.yearsExperience || ''}
                        onChange={(e) => setUserProfile(prev => ({ ...prev!, yearsExperience: parseInt(e.target.value) }))}
                        disabled={!isEditing}
                        className="rounded-2xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Subject Specialization</label>
                    <Input
                      value={userProfile?.subjectSpecialization || ''}
                      onChange={(e) => setUserProfile(prev => ({ ...prev!, subjectSpecialization: e.target.value }))}
                      disabled={!isEditing}
                      className="rounded-2xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">School Affiliation</label>
                    <Input
                      value={userProfile?.schoolAffiliation || ''}
                      onChange={(e) => setUserProfile(prev => ({ ...prev!, schoolAffiliation: e.target.value }))}
                      disabled={!isEditing}
                      className="rounded-2xl"
                    />
                  </div>
                </>
              )}

              {/* Invite Friends Section */}
              <div className="mt-6">
                <ReferralShareCard />
              </div>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Subscription & Billing</h3>
            
            {/* For Parents: Show all children subscriptions */}
            {user?.role === 'parent' && children.length > 0 && (
              <div className="space-y-4 mb-6">
                <h4 className="text-lg font-semibold text-gray-700">Children Subscriptions</h4>
                {children.map((child: any) => {
                  const childSub = childSubscriptions?.[child.id];
                  const hasActiveSub = childSub?.hasSubscription && childSub?.status === 'active';
                  
                  return (
                    <div key={child.id} className="p-5 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h5 className="text-lg font-semibold text-gray-900">{child.firstName} {child.lastName}</h5>
                          <p className="text-sm text-gray-600">{child.gradeLevel || child.grade}</p>
                        </div>
                        <Badge className={
                          childSub?.status === 'active' ? 'bg-green-500' :
                          childSub?.status === 'cancelled' ? 'bg-gray-500' :
                          'bg-amber-500'
                        }>
                          {childSub?.status === 'active' ? 'ACTIVE' :
                           childSub?.status === 'cancelled' ? 'CANCELLED' :
                           'NO SUBSCRIPTION'}
                        </Badge>
                      </div>
                      
                      {hasActiveSub && childSub?.subscription ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-2 border-b border-gray-200">
                            <span className="text-sm text-gray-600">Amount</span>
                            <span className="font-semibold text-gray-900">
                              {childSub.subscription.currency} {childSub.subscription.amount}
                            </span>
                          </div>
                          
                          {childSub.subscription.nextPaymentDate && (
                            <div className="flex items-center justify-between py-2 border-b border-gray-200">
                              <span className="text-sm text-gray-600">Next Payment</span>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-indigo-600" />
                                <span className="font-semibold text-gray-900 text-sm">
                                  {new Date(childSub.subscription.nextPaymentDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl"
                              onClick={async () => {
                                try {
                                  const data = await apiRequest(`/api/subscription/${childSub.studentUserId}/manage-link`);
                                  window.open(data.link, "_blank");
                                  toast({
                                    title: "Redirecting to Paystack",
                                    description: "You can update card details on the Paystack page.",
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to open card management page.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Update Card
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1 rounded-xl"
                              onClick={() => {
                                setSelectedChildForCancel(child);
                                setShowCancelDialog(true);
                              }}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-600 mb-3">
                            {childSub?.status === 'cancelled' ? 'Subscription cancelled' : 'No active subscription'}
                          </p>
                          {childSub?.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              onClick={() => setLocation('/subscription')}
                              className="rounded-xl"
                            >
                              Subscribe Now
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* For teachers: Show unavailable message */}
            {user?.role === 'teacher' ? (
              <div className="text-center py-12">
                <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Subscriptions Unavailable</h4>
                <p className="text-gray-600">Subscription management is not available for teachers</p>
              </div>
            ) : user?.role !== 'parent' && hasSubscription && subscription ? (
              <div className="space-y-6">
                {/* Receipt/Subscription Details */}
                <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-indigo-900">Current Plan</h4>
                    <Badge className={
                      subscription.status === 'active' ? 'bg-green-500' :
                      subscription.status === 'trial' ? 'bg-blue-500' : 'bg-gray-500'
                    }>
                      {subscription.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-indigo-200">
                      <span className="text-sm text-slate-600">Plan Type</span>
                      <span className="font-semibold text-slate-900">Premium</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-3 border-b border-indigo-200">
                      <span className="text-sm text-slate-600">Amount</span>
                      <span className="font-semibold text-slate-900">
                        {subscription.currency} {subscription.amount}
                      </span>
                    </div>
                    
                    {subscription.nextPaymentDate && (
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm text-slate-600">Next Payment Due</span>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                          <span className="font-semibold text-slate-900 text-xs sm:text-base">
                            {new Date(subscription.nextPaymentDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl justify-start"
                    onClick={generatePDFReceipt}
                    data-testid="button-download-receipt"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Receipt (PDF)
                  </Button>
                  
                  {subscription.status === 'active' && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full rounded-2xl justify-start"
                        onClick={async () => {
                          try {
                            const data = await apiRequest("/api/subscription/manage-link");
                            
                            // Open Paystack management page in new tab
                            window.open(data.link, "_blank");
                            
                            toast({
                              title: "Redirecting to Paystack",
                              description: "You can update your card details or reactivate your subscription on the Paystack page.",
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to open card management page. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                        data-testid="button-update-card"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Update Card Details
                      </Button>
                      
                      <Button
                        variant="destructive"
                        className="w-full rounded-2xl justify-start"
                        onClick={() => setShowCancelDialog(true)}
                        data-testid="button-cancel-subscription-settings"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : user?.role !== 'parent' ? (
              <div className="text-center py-12">
                <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h4>
                <p className="text-gray-600 mb-6">Subscribe to unlock premium features</p>
                <Button
                  onClick={() => setLocation('/subscription')}
                  className="rounded-2xl"
                >
                  View Plans
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Privacy & Security</h3>
            
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Data Protection</h4>
                <p className="text-sm text-blue-700">
                  Your personal information is encrypted and securely stored. We comply with GDPR and other privacy regulations.
                </p>
              </div>

              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full rounded-2xl justify-start"
                  onClick={() => setShowPasswordDialog(true)}
                  data-testid="button-change-password"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full rounded-2xl justify-start"
                  onClick={() => window.open('/privacy', '_blank')}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Privacy Policy
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedChildForCancel ? (
                <>Are you sure you want to cancel the subscription for <span className="font-semibold">{selectedChildForCancel.firstName} {selectedChildForCancel.lastName}</span>? They will continue to have access until the end of the current billing period.</>
              ) : (
                <>Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedChildForCancel(null)}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const studentUserId = selectedChildForCancel ? childSubscriptions?.[selectedChildForCancel.id]?.studentUserId : undefined;
                cancelSubscriptionMutation.mutate(studentUserId);
              }}
              disabled={cancelSubscriptionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelSubscriptionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Subscription'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Password</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your current password and choose a new password. Your new password must be at least 6 characters long.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
              <Input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="rounded-2xl"
                data-testid="input-current-password"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Enter new password (min. 6 characters)"
                className="rounded-2xl"
                data-testid="input-new-password"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                className="rounded-2xl"
                data-testid="input-confirm-password"
              />
            </div>
            
            {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
              <p className="text-sm text-red-600">Passwords don't match</p>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              data-testid="button-confirm-password-change"
            >
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}