import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import logoImage from "@assets/xtraclass-logo-td.png";

export default function AuthOptions() {
  const [, setLocation] = useLocation();
  
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role') || 'parent';

  const handleBack = () => {
    setLocation("/register/role-selection");
  };

  const handleGoogleAuth = () => {
    // TODO: Implement real Google authentication
    console.log('Google authentication not yet implemented for role:', role);
    // For now, redirect to email registration
    setLocation(`/register/form?role=${role}`);
  };

  const handleAppleAuth = () => {
    // TODO: Implement real Apple authentication
    console.log('Apple authentication not yet implemented for role:', role);
    // For now, redirect to email registration
    setLocation(`/register/form?role=${role}`);
  };

  const handleEmailRegistration = () => {
    setLocation(`/register/form?role=${role}`);
  };

  const handleLogin = () => {
    setLocation("/signin");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="gamified-bg relative z-10 px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="w-24 h-12 flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="XtraClass.ai Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="w-6" />
        </div>

        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-1">Register</h1>
          <p className="text-sm opacity-90">Create your new account</p>
        </div>
      </div>

      {/* Auth Options */}
      <div className="px-4 space-y-4 pb-8 pt-4">
        {/* Google Sign-In */}
        <Button
          onClick={handleGoogleAuth}
          variant="outline"
          className="w-full bg-white border border-gray-300 rounded-2xl p-4 flex items-center justify-center space-x-3 card-hover h-auto py-4 text-black hover:text-black"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-black font-medium">Continue with Google</span>
        </Button>

        {/* Apple Sign-In */}
        <Button
          onClick={handleAppleAuth}
          className="w-full bg-black hover:bg-gray-800 rounded-2xl p-4 flex items-center justify-center space-x-3 card-hover h-auto py-4"
        >
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <span className="text-white font-medium">Continue with Apple</span>
        </Button>

        {/* Email Registration */}
        <Button
          onClick={handleEmailRegistration}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-4 px-6 rounded-2xl transition-colors"
        >
          Create Account with Email
        </Button>

        {/* Login Link */}
        <div className="text-center pt-4">
          <span className="text-gray-600">Already have an account? </span>
          <Button
            variant="link"
            onClick={handleLogin}
            className="text-[#00AACC] font-semibold p-0 h-auto"
          >
            Login
          </Button>
        </div>
      </div>
    </div>
  );
}
