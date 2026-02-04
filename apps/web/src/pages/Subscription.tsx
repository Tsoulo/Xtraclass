import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CreditCard, 
  Check, 
  X, 
  Loader2, 
  AlertCircle,
  Crown,
  Zap,
  Shield,
  LogOut,
  UserCheck,
  Mail,
  Phone
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, MessageCircle } from "lucide-react";

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  paystackPlanCode: string;
  amount: number;
  currency: string;
  interval: string;
  features: {
    maxStudents?: number;
    maxClasses?: number;
    aiChatAccess?: boolean;
    advancedAnalytics?: boolean;
    prioritySupport?: boolean;
    customBranding?: boolean;
    apiAccess?: boolean;
    [key: string]: any;
  };
  isActive: boolean;
  sortOrder: number;
}

interface Subscription {
  id: number;
  planId: number;
  status: string;
  amount: number;
  currency: string;
  trialEndDate: string | null;
  currentPeriodEnd: string | null;
  nextPaymentDate: string | null;
  cancelledAt: string | null;
}

export default function Subscription() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [studentUserId, setStudentUserId] = useState<number | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [parentEmail, setParentEmail] = useState<string>('');
  const [parentPhone, setParentPhone] = useState<string>('');
  const [parentName, setParentName] = useState<string>('');
  const [parentRelationship, setParentRelationship] = useState<string>('');
  const [showParentForm, setShowParentForm] = useState<boolean>(false);
  const [showParentConsentForm, setShowParentConsentForm] = useState<boolean>(false);
  const [consentLink, setConsentLink] = useState<string>('');
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const hasRedirectedRef = useRef(false);

  // Read studentUserId from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userIdParam = params.get('studentUserId');
    if (userIdParam) {
      setStudentUserId(parseInt(userIdParam));
    }
  }, []);

  // Fetch student name if subscribing for a student
  const { data: children } = useQuery({
    queryKey: ['/api/children'],
    enabled: user?.role === 'parent' && !!studentUserId
  });

  // Set student name when children data is loaded
  useEffect(() => {
    if (children && studentUserId) {
      const student = children.find((child: any) => child.studentUserId === studentUserId);
      if (student) {
        setStudentName(`${student.firstName} ${student.lastName}`);
      }
    }
  }, [children, studentUserId]);

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const { data: subscriptionData, isLoading: subscriptionLoading, error: subscriptionError } = useQuery({
    queryKey: ["/api/subscription/status"],
    refetchOnMount: 'always', // Always fetch fresh data when component mounts
    refetchOnWindowFocus: false,
    retry: false,
  });

  const subscription = subscriptionData?.subscription as Subscription | undefined;
  const hasSubscription = subscriptionData?.hasSubscription;

  // Auto-redirect students with active subscriptions to dashboard
  useEffect(() => {
    console.log('🔍 Redirect check:', {
      subscriptionLoading,
      hasRedirected: hasRedirectedRef.current,
      userRole: user?.role,
      studentUserId,
      subscriptionStatus: subscription?.status,
      hasSubscription,
    });
    
    if (!subscriptionLoading && !hasRedirectedRef.current) {
      // Only redirect if:
      // 1. User is a student (not parent subscribing for someone else)
      // 2. User has an active subscription
      // 3. Not currently subscribing for a specific child
      if (user?.role === 'student' && !studentUserId && subscription?.status === 'active') {
        console.log('🔓 Subscription is active - redirecting student to dashboard');
        hasRedirectedRef.current = true;
        
        // Show success toast
        toast({
          title: "Subscription Active!",
          description: "Redirecting to your dashboard...",
        });
        
        // Redirect after a short delay to show the toast
        setTimeout(() => {
          setLocation('/dashboard');
        }, 1000);
      }
    }
  }, [subscription?.status, studentUserId, user?.role, subscriptionLoading, setLocation, toast, hasSubscription]);

  // Fetch parent status for students
  const { data: parentStatus } = useQuery({
    queryKey: [`/api/students/${user?.id}/parent-status`],
    enabled: user?.role === 'student' && !studentUserId
  });

  // Check if student needs to provide parent contact
  useEffect(() => {
    if (user?.role === 'student' && !studentUserId && parentStatus) {
      const shouldShow = !parentStatus.hasParent && !parentStatus.parentContact;
      setShowParentForm(shouldShow);
    }
  }, [user, studentUserId, parentStatus]);

  // Save parent contact mutation
  const saveParentContactMutation = useMutation({
    mutationFn: async () => {
      if (!parentEmail || !parentPhone) {
        throw new Error("Parent email and phone are required");
      }
      
      const response = await apiRequest(`/api/students/${user?.id}/parent-contact`, {
        method: "POST",
        body: JSON.stringify({
          parentEmail,
          parentPhone
        }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Parent Contact Saved",
        description: "Your parent's contact details have been saved. You can now subscribe to a plan.",
      });
      setShowParentForm(false);
      queryClient.invalidateQueries({ queryKey: [`/api/students/${user?.id}/parent-status`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save parent contact details",
        variant: "destructive",
      });
    },
  });

  const initializePaymentMutation = useMutation({
    mutationFn: async (planId: number) => {
      const payload: any = {
        planId,
        callbackUrl: `${window.location.origin}/subscription/callback`,
      };
      
      // If subscribing for a student, include studentUserId
      if (studentUserId) {
        payload.studentUserId = studentUserId;
      }
      
      const response = await apiRequest("/api/subscription/initialize", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Initialization Failed",
        description: error.message || "Failed to initialize payment",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/subscription/cancel", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const checkStatusMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/subscription/check-status", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Status Updated",
        description: "Your subscription status has been refreshed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check Failed",
        description: error.message || "Failed to check subscription status",
        variant: "destructive",
      });
    },
  });

  const requestParentConsentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan || !parentName || !parentEmail || !parentPhone || !parentRelationship) {
        throw new Error("All parent details are required");
      }
      
      const response = await apiRequest("/api/subscription/request-parent-consent", {
        method: "POST",
        body: JSON.stringify({
          planId: selectedPlan,
          parentName,
          parentEmail,
          parentPhone,
          parentRelationship,
        }),
      });
      return response;
    },
    onSuccess: (data: any) => {
      setConsentLink(data.consentUrl);
      toast({
        title: "Consent Request Created",
        description: "Share the link with your parent to complete the subscription.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create consent request",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (planId: number) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to subscribe",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
    
    // If user is a student, navigate to parent consent request page
    if (user.role === 'student') {
      setLocation(`/subscription/request-consent?planId=${planId}`);
    } else {
      // Parents/teachers can subscribe directly
      setSelectedPlan(planId);
      initializePaymentMutation.mutate(planId);
    }
  };

  const handleCancelSubscription = () => {
    if (window.confirm("Are you sure you want to cancel your subscription?")) {
      cancelSubscriptionMutation.mutate();
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "NGN") {
      return `₦${(amount / 100).toLocaleString()}`;
    }
    if (currency === "ZAR") {
      // Display R199 for marketing (actual amount is still 200)
      const displayAmount = (amount / 100) - 1;
      return `R${displayAmount.toLocaleString()}`;
    }
    return `${currency} ${(amount / 100).toLocaleString()}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: "Active" },
      trial: { variant: "secondary", label: "Trial" },
      expired: { variant: "destructive", label: "Expired" },
      cancelled: { variant: "outline", label: "Cancelled" },
      failed: { variant: "destructive", label: "Failed" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="absolute top-0 right-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 pt-12 sm:pt-0" data-testid="heading-subscription">
              {studentUserId && studentName ? `Subscribe for ${studentName}` : 'Choose Your Plan'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {studentUserId && studentName 
                ? `Select a plan to unlock all features for ${studentName}`
                : 'Unlock premium features and enhance your learning experience'}
            </p>
          </div>

          {!plans || plans.length === 0 ? (
            <Card data-testid="card-no-plans">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Plans Available
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  Subscription plans are not configured yet. Please contact support.
                </p>
              </CardContent>
            </Card>
          ) : hasSubscription && subscription ? (
            // Show subscription management UI if user has any subscription
            <div className="max-w-2xl mx-auto">
              <Card className="border-primary border-2">
                <CardHeader className="text-center bg-gradient-to-r from-primary/10 to-indigo-100 dark:from-primary/20 dark:to-indigo-900/20">
                  <div className="flex items-center justify-center mb-2">
                    <Shield className="w-8 h-8 text-primary mr-2" />
                    <CardTitle className="text-3xl">
                      {subscription.status === "active" ? "Active Subscription" : "Subscription Status"}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {subscription.status === "active" 
                      ? "You're currently on a premium plan"
                      : "Manage your subscription details below"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Plan Details */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4">Plan Details</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Plan Type:</span>
                          <span className="font-semibold text-gray-900 dark:text-white" data-testid="text-current-plan-name">
                            {plans?.find(p => p.id === subscription.planId)?.name || "Premium"}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Billing Cycle:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {plans?.find(p => p.id === subscription.planId)?.interval || "monthly"}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <Badge 
                            className={`text-white text-xs ${
                              subscription.status === "active" ? "bg-green-500" :
                              subscription.status === "expired" ? "bg-red-500" :
                              subscription.status === "cancelled" ? "bg-gray-500" :
                              "bg-yellow-500"
                            }`} 
                            data-testid="badge-subscription-status"
                          >
                            {subscription.status === "pending_parent_consent" ? "Pending Consent" :
                             subscription.status === "pending_payment" ? "Pending Payment" :
                             subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                          </Badge>
                        </div>
                        {subscription.nextPaymentDate && subscription.status === "active" && (
                          <>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">Next Payment:</span>
                              <span className="font-semibold text-gray-900 dark:text-white" data-testid="text-next-payment-date">
                                {new Date(subscription.nextPaymentDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </>
                        )}
                        {subscription.cancelledAt && (subscription.status === "cancelled" || subscription.status === "expired") && (
                          <>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">Cancelled On:</span>
                              <span className="font-semibold text-gray-900 dark:text-white" data-testid="text-cancelled-date">
                                {new Date(subscription.cancelledAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </>
                        )}
                        {subscription.currentPeriodEnd && subscription.status === "cancelled" && (
                          <>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">Access Until:</span>
                              <span className="font-semibold text-gray-900 dark:text-white" data-testid="text-access-until">
                                {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Cancellation/Expiration Info */}
                    {(subscription.status === "cancelled" || subscription.status === "expired") && (
                      <div className={`p-4 rounded-lg ${subscription.status === "cancelled" ? "bg-amber-50 dark:bg-amber-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                        <p className={`text-sm ${subscription.status === "cancelled" ? "text-amber-800 dark:text-amber-200" : "text-red-800 dark:text-red-200"}`}>
                          {subscription.status === "cancelled" 
                            ? "Your subscription has been cancelled. You'll continue to have access until the end of your current billing period." 
                            : "Your subscription has expired due to payment issues. Please update your card details to reactivate your subscription."}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {subscription.status === "active" && (
                        <>
                          <Button
                            className="w-full"
                            variant="default"
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
                            <CreditCard className="mr-2 h-4 w-4" />
                            Update Card Details
                          </Button>
                          
                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => setShowCancelDialog(true)}
                            data-testid="button-cancel-subscription"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel Subscription
                          </Button>
                        </>
                      )}
                      {(subscription.status === "pending_payment" || subscription.status === "pending_parent_consent") && (
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => checkStatusMutation.mutate()}
                          disabled={checkStatusMutation.isPending}
                          data-testid="button-check-status"
                        >
                          {checkStatusMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Checking...
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Check Status
                            </>
                          )}
                        </Button>
                      )}
                      {subscription.status === "expired" && (
                        <Button
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          onClick={async () => {
                            try {
                              const data = await apiRequest("/api/subscription/manage-link");
                              
                              // Open Paystack management page in new tab
                              window.open(data.link, "_blank");
                              
                              toast({
                                title: "Redirecting to Paystack",
                                description: "Update your card details to reactivate your subscription.",
                              });
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to open card management page. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                          data-testid="button-update-card-expired"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Update Card Details
                        </Button>
                      )}
                      {subscription.status === "cancelled" && plans && (
                        <Button
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                          onClick={() => handleSubscribe(subscription.planId)}
                          disabled={initializePaymentMutation.isPending || (user?.role === 'parent' && showParentForm)}
                          data-testid="button-resubscribe"
                        >
                          {initializePaymentMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Zap className="mr-2 h-4 w-4" />
                              Resubscribe
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Show plan selection cards if user doesn't have active subscription
            <div className="flex flex-wrap gap-8 justify-center">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative hover:shadow-xl transition-all w-full max-w-sm ${
                    plan.sortOrder === 1 ? "border-primary border-2" : ""
                  }`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  {plan.sortOrder === 1 && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-white px-4 py-1">
                        <Crown className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl" data-testid={`text-plan-name-${plan.id}`}>
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {plan.description || "Premium access to all features"}
                    </CardDescription>
                    <div className="mt-4">
                      <p className="text-4xl font-bold text-gray-900 dark:text-white" data-testid={`text-plan-price-${plan.id}`}>
                        {formatCurrency(plan.amount, plan.currency)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        per {plan.interval}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Separator className="mb-6" />
                    <ul className="space-y-3 mb-6">
                      {user?.role === 'teacher' ? (
                        <>
                          <li className="flex items-center justify-center text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                            <span>Create unlimited classes</span>
                          </li>
                          <li className="flex items-center justify-center text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                            <span>Unlimited students</span>
                          </li>
                          <li className="flex items-center justify-center text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                            <span>AI-powered grading</span>
                          </li>
                          <li className="flex items-center justify-center text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                            <span>Assignment creation tools</span>
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center justify-center text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                            <span>Daily exercises</span>
                          </li>
                          <li className="flex items-center justify-center text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                            <span>Custom homework</span>
                          </li>
                          <li className="flex items-center justify-center text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                            <span>Custom tutorials</span>
                          </li>
                          <li className="flex items-center justify-center text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                            <span>Real-time marking</span>
                          </li>
                          <li className="flex items-center justify-center text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                            <span>Real-time improvement feedback</span>
                          </li>
                        </>
                      )}
                    </ul>
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={
                        initializePaymentMutation.isPending ||
                        (user?.role === 'parent' && showParentForm)
                      }
                      data-testid={`button-subscribe-${plan.id}`}
                    >
                      {initializePaymentMutation.isPending && selectedPlan === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Subscribe Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Secure payment powered by{" "}
              <span className="font-semibold">Paystack</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Cancel anytime. No questions asked.
            </p>
          </div>
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelDialog(false);
                cancelSubscriptionMutation.mutate();
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
    </div>
  );
}
