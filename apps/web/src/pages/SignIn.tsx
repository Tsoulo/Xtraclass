import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { Eye, EyeOff, Mail, Phone, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import logoImage from "@assets/xtraclass-logo-td.png";

export default function SignIn() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  // Check for email verification status in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('verified') === 'true') {
      toast({
        title: "Email Verified!",
        description: "Your email has been successfully verified. You can now sign in.",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/signin');
    } else if (params.get('already_verified') === 'true') {
      toast({
        title: "Already Verified",
        description: "Your email was already verified. Please sign in.",
      });
      window.history.replaceState({}, '', '/signin');
    } else if (params.get('verification_error') === 'invalid_token') {
      toast({
        title: "Verification Failed",
        description: "The verification link is invalid or has expired. Please request a new one from Settings.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/signin');
    }
  }, [toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use AuthContext login method to ensure state is updated
      await login(formData.username, formData.password);
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in to your account.",
        variant: "success",
      });
      
      // Redirect to dashboard after successful login
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: error instanceof Error ? error.message : "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setLocation("/");
  };

  const handleForgotPassword = () => {
    setLocation("/forgot-password");
  };

  const handleCreateAccount = () => {
    setLocation("/register");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-blue-50 to-yellow-50 flex flex-col">
      {/* Logo Header */}
      <div className="flex justify-center pt-4 sm:pt-8 pb-2 sm:pb-4">
        <img 
          src={logoImage} 
          alt="XtraClass.ai" 
          className="h-10 sm:h-16 w-auto object-contain"
        />
      </div>

      {/* Fun Background Elements - hidden on very small screens */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
        <div className="absolute top-20 left-10 w-16 h-16 bg-primary/20 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
        <div className="absolute top-40 right-20 w-12 h-12 bg-blue-300/30 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        <div className="absolute bottom-40 left-20 w-20 h-20 bg-yellow-300/20 rounded-full animate-bounce" style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
        <div className="absolute bottom-20 right-10 w-14 h-14 bg-green-300/25 rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-4 sm:pb-8">
        <div className="w-full max-w-md">
          {/* Welcome Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-8 relative overflow-hidden">
            {/* Decorative corner elements */}
            <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full"></div>
            <div className="absolute bottom-0 left-0 w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-tr from-blue-200/30 to-transparent rounded-tr-full"></div>

            {/* Header */}
            <div className="text-center mb-4 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">Welcome Back!</h1>
              <p className="text-sm sm:text-base text-gray-600">Sign in to continue your learning journey</p>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-3 sm:space-y-6">
              {/* Username/Email Field */}
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="username" className="text-gray-700 font-medium text-sm sm:text-base">
                  Email or Phone Number
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your email or phone"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    className="pl-9 sm:pl-10 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-primary focus:ring-primary/20 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium text-sm sm:text-base">
                  Password
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pl-9 sm:pl-10 pr-10 sm:pr-12 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-primary focus:ring-primary/20 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right -mt-1 sm:mt-0">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[#00AACC] hover:text-[#008899] font-medium text-xs sm:text-sm transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 sm:py-4 text-sm sm:text-base rounded-lg sm:rounded-xl transition-colors transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="loader scale-50"></div>
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-4 sm:my-8 flex items-center">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-3 sm:px-4 text-gray-500 text-xs sm:text-sm">or</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Create Account */}
            <div className="text-center">
              <p className="text-gray-600 mb-2 sm:mb-4 text-sm sm:text-base">Don't have an account?</p>
              <Button
                type="button"
                onClick={handleCreateAccount}
                variant="outline"
                className="w-full border-2 border-[#00AACC] text-[#00AACC] hover:bg-[#00AACC] hover:text-white font-semibold py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl transition-colors"
              >
                Create Account
              </Button>
            </div>
          </div>

          {/* Back Button */}
          <div className="text-center mt-3 sm:mt-6">
            <button
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-800 font-medium text-sm sm:text-base transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}