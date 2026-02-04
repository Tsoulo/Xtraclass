import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation, useParams } from "wouter";
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { buildApiUrl } from "@/lib/api";
import logoImage from "@assets/xtraclass-logo-td.png";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const params = useParams<{ token: string }>();
  const token = params.token;
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(buildApiUrl(`/api/auth/validate-reset-token/${token}`));
        const data = await response.json();
        
        if (data.valid) {
          setIsValidToken(true);
          setUserEmail(data.email || "");
        }
      } catch (error) {
        console.error("Token validation failed:", error);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/reset-password", { 
        token,
        password 
      });
      
      setIsSuccess(true);
      toast({
        title: "Password reset successful",
        description: "You can now sign in with your new password.",
      });
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Unable to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    setLocation("/signin");
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-blue-50 to-yellow-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00AACC] animate-spin mb-4" />
        <p className="text-gray-600">Validating reset link...</p>
      </div>
    );
  }

  if (!isValidToken && !isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-blue-50 to-yellow-50 flex flex-col">
        <div className="flex justify-center pt-8 pb-4">
          <img 
            src={logoImage} 
            alt="XtraClass.ai" 
            className="h-16 w-auto object-contain"
          />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid Reset Link</h1>
              <p className="text-gray-600 mb-8">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => setLocation("/forgot-password")}
                  className="w-full bg-[#00AACC] hover:bg-[#008899] text-white font-semibold py-3 rounded-xl"
                >
                  Request New Link
                </Button>
                <Button
                  onClick={handleSignIn}
                  variant="outline"
                  className="w-full border-2 border-gray-200 text-gray-600 font-semibold py-3 rounded-xl"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-blue-50 to-yellow-50 flex flex-col">
        <div className="flex justify-center pt-8 pb-4">
          <img 
            src={logoImage} 
            alt="XtraClass.ai" 
            className="h-16 w-auto object-contain"
          />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Password Reset!</h1>
              <p className="text-gray-600 mb-8">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              
              <Button
                onClick={handleSignIn}
                className="w-full bg-[#00AACC] hover:bg-[#008899] text-white font-semibold py-4 rounded-xl"
              >
                Sign In Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-blue-50 to-yellow-50 flex flex-col">
      <div className="flex justify-center pt-8 pb-4">
        <img 
          src={logoImage} 
          alt="XtraClass.ai" 
          className="h-16 w-auto object-contain"
        />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-16 h-16 bg-primary/20 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
        <div className="absolute top-40 right-20 w-12 h-12 bg-blue-300/30 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full"></div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Create New Password</h1>
              {userEmail && (
                <p className="text-gray-600">for {userEmail}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pl-10 pr-10 py-3 rounded-xl border-gray-200 focus:border-[#00AACC] focus:ring-[#00AACC]"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Must be at least 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pl-10 pr-10 py-3 rounded-xl border-gray-200 focus:border-[#00AACC] focus:ring-[#00AACC]"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#00AACC] hover:bg-[#008899] text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
