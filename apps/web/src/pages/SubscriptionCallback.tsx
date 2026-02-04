import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SubscriptionCallback() {
  const [, setLocation] = useLocation();
  const [reference, setReference] = useState<string | null>(null);
  const [consentToken, setConsentToken] = useState<string | null>(null);
  const [checkAttempts, setCheckAttempts] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference");
    const token = params.get("consentToken");
    setReference(ref);
    setConsentToken(token);
  }, []);

  // For parent consent payments, check subscription status after a delay
  const { data: subscriptionStatus, isLoading: isCheckingStatus } = useQuery<{
    hasSubscription: boolean;
    subscription?: { status: string };
  }>({
    queryKey: ['/api/subscription/status'],
    enabled: !!consentToken && !reference && checkAttempts < 3,
    refetchInterval: checkAttempts < 3 ? 2000 : false, // Check every 2 seconds, up to 3 times
  });

  // Handle subscription status changes
  useEffect(() => {
    if (subscriptionStatus) {
      if (subscriptionStatus.hasSubscription && subscriptionStatus.subscription?.status === 'active') {
        // Success! Clear cache completely and redirect
        queryClient.removeQueries({ queryKey: ['/api/subscription/status'] });
        setTimeout(() => setLocation('/subscription'), 1000);
      } else if (checkAttempts < 3) {
        setCheckAttempts(prev => prev + 1);
      }
    }
  }, [subscriptionStatus, setLocation, checkAttempts]);

  // Manual check status mutation (if auto-check fails)
  const checkStatusMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/subscription/check-status', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      setTimeout(() => setLocation('/subscription'), 1000);
    },
  });

  const { data: verification, isLoading, error } = useQuery<{
    success?: boolean;
    message?: string;
  }>({
    queryKey: reference ? [`/api/subscription/verify/${reference}`] : [],
    enabled: !!reference,
    retry: false,
  });

  // Handle parent consent payment callback (no reference, but has consentToken)
  if (!reference && consentToken) {
    if (isCheckingStatus || checkAttempts < 3) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Processing Payment</CardTitle>
              <CardDescription>Please wait while we confirm your subscription...</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-8 space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Waiting for payment confirmation from Paystack
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                This usually takes a few seconds
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // If auto-check didn't work after 3 attempts, show manual check option
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-6 w-6" />
              Payment Confirmation Pending
            </CardTitle>
            <CardDescription>
              Your payment is being processed. This may take a moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                If your payment was successful, click below to check your subscription status.
              </p>
            </div>
            <Button 
              onClick={() => checkStatusMutation.mutate()}
              disabled={checkStatusMutation.isPending}
              className="w-full"
            >
              {checkStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Status Now'
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setLocation("/subscription")} 
              className="w-full"
            >
              Back to Subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reference) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              Invalid Payment
            </CardTitle>
            <CardDescription>No payment reference found</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/subscription")} className="w-full">
              Back to Subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Verifying Payment</CardTitle>
            <CardDescription>Please wait while we confirm your subscription...</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400">This may take a few moments</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !verification?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              Payment Failed
            </CardTitle>
            <CardDescription>
              {(error as any)?.message || verification?.message || "Unable to verify your payment"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/subscription")} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            Payment Successful!
          </CardTitle>
          <CardDescription>
            Your subscription has been activated successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              Thank you for subscribing! You now have full access to all premium features.
            </p>
          </div>
          <Button onClick={() => setLocation("/dashboard")} className="w-full">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
