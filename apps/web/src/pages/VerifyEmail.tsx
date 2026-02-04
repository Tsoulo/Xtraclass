import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { buildApiUrl } from "@/lib/api";

type VerificationStatus = 'verifying' | 'success' | 'error' | 'already_verified';

export default function VerifyEmail() {
  const [, params] = useRoute("/verify-email/:token");
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!params?.token) {
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }

      try {
        const response = await fetch(buildApiUrl(`/api/verify-email/${params.token}`));
        const data = await response.json();

        if (response.ok) {
          if (data.code === 'ALREADY_VERIFIED') {
            setStatus('already_verified');
            setMessage('Your email has already been verified');
          } else {
            setStatus('success');
            setMessage('Your email has been verified successfully');
          }
        } else {
          setStatus('error');
          setMessage(data.message || 'Failed to verify email');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while verifying your email');
        console.error('Email verification error:', error);
      }
    };

    verifyEmail();
  }, [params?.token]);

  const handleContinue = () => {
    setLocation('/signin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'verifying' && (
              <Loader2 className="h-16 w-16 text-indigo-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-16 w-16 text-green-600" />
            )}
            {status === 'already_verified' && (
              <CheckCircle className="h-16 w-16 text-blue-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'verifying' && 'Verifying Your Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'already_verified' && 'Already Verified'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'verifying' && 'Please wait while we verify your email address...'}
            {status === 'success' && 'Your email address has been successfully verified. You can now log in to your account.'}
            {status === 'already_verified' && 'Your email address was already verified. You can log in to your account.'}
            {status === 'error' && message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {(status === 'success' || status === 'already_verified') && (
            <Button 
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              data-testid="button-continue-to-login"
            >
              Continue to Login
            </Button>
          )}
          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Need help? Contact support at support@xtraclass.ai
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
