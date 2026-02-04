import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StudentInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  gradeLevel: string;
}

interface StudentPasswordSetupProps {
  student: StudentInfo;
  idNumber: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function StudentPasswordSetup({ 
  student, 
  idNumber, 
  onSuccess, 
  onBack 
}: StudentPasswordSetupProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const setPasswordMutation = useMutation({
    mutationFn: async (passwordData: { idNumber: string; password: string }) =>
      apiRequest("/api/students/set-password", {
        method: "POST",
        body: JSON.stringify(passwordData)
      }),
    onSuccess: () => {
      toast({
        title: "Password Set Successfully",
        description: "You can now sign in with your ID number and password."
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set password",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in both password fields",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Validation Error", 
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setPasswordMutation.mutate({ idNumber, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Set Your Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              We found your account! Please set a password to continue.
            </AlertDescription>
          </Alert>

          {/* Student Info */}
          <div className="space-y-2 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">Your Information</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Name:</strong> {student.firstName} {student.lastName}</p>
              <p><strong>School:</strong> {student.schoolName}</p>
              <p><strong>Grade:</strong> {student.gradeLevel}</p>
              <p><strong>Email:</strong> {student.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-600">
              Password must be at least 6 characters long
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={setPasswordMutation.isPending}
                className="flex-1"
              >
                <Lock className="h-4 w-4 mr-2" />
                {setPasswordMutation.isPending ? "Setting..." : "Set Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}