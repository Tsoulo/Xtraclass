import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Subscription from "@/pages/Subscription";
import { Button } from "@/components/ui/button";

interface ParentSubscriptionGateProps {
  children: React.ReactNode;
}

export default function ParentSubscriptionGate({ children }: ParentSubscriptionGateProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [shouldCheckSubscription, setShouldCheckSubscription] = useState(true);

  // Only check subscription for parent users
  useEffect(() => {
    if (!user) {
      setLocation("/signin");
      return;
    }
    
    // Only parents need subscription check
    if (user.role !== 'parent') {
      setShouldCheckSubscription(false);
    }
  }, [user, setLocation]);

  // Fetch subscription status - always get fresh data to prevent stale cache issues
  const { data: subscriptionData, isLoading, error, isSuccess, isFetching } = useQuery({
    queryKey: ["/api/subscription/status"],
    enabled: shouldCheckSubscription && user?.role === 'parent',
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache the data
    refetchOnMount: 'always', // Always refetch on mount
  });

  // If not a parent, render children directly
  if (!shouldCheckSubscription || user?.role !== 'parent') {
    return <>{children}</>;
  }

  // Show loading state while checking subscription
  if (isLoading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  // Show error state if subscription check failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Unable to Check Subscription</h2>
          <p className="text-slate-600 mb-4">We couldn't verify your subscription status. Please try again.</p>
          <Button onClick={() => window.location.reload()} className="bg-indigo-600 hover:bg-indigo-700">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Only proceed if we have successfully fetched FRESH subscription data
  // Block rendering if still fetching to prevent stale cache from allowing children to render
  if (!isSuccess || !subscriptionData || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  // Check if parent has active subscription
  const hasActiveSubscription = subscriptionData?.hasSubscription && 
    (subscriptionData?.subscription?.status === 'active' || 
     subscriptionData?.subscription?.status === 'trial');

  // If no subscription, show subscription page (and prevent children from rendering)
  if (!hasActiveSubscription) {
    return <Subscription />;
  }

  // Only render children if we have confirmed active subscription from fresh data
  return <>{children}</>;
}
