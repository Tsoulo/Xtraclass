import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, BookOpen, GraduationCap, UserCheck } from "lucide-react";
import { useLocation } from "wouter";
import logoImage from "@assets/xtraclass-logo-td.png";
import type { UserRole } from "@/lib/types";

const roles = [
  {
    id: "parent" as UserRole,
    title: "Parent",
    description: "Level up your child's learning journey!",
    icon: Users,
  },
  {
    id: "teacher" as UserRole,
    title: "Teacher", 
    description: "Master your classroom quests!",
    icon: BookOpen,
  },
  {
    id: "student" as UserRole,
    title: "Student",
    description: "Earn points with personalized learning!",
    icon: GraduationCap,
  },
];

export default function CombinedRoleAuth() {
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");

  const handleBack = () => {
    setLocation("/");
  };

  const handleEmailRegistration = () => {
    if (!selectedRole) return;
    setLocation(`/register/form?role=${selectedRole}`);
  };

  const handleLogin = () => {
    setLocation("/signin");
  };

  const selectedRoleData = roles.find(role => role.id === selectedRole);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="gamified-bg relative z-10 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-white hover:bg-white/20 z-10 relative"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="w-20 h-10 flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="XtraClass.ai Logo" 
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>
          <div className="w-6" />
        </div>

        <div className="text-center text-white">
          <h1 className="text-xl font-bold mb-0">Join XtraClass</h1>
          <p className="text-xs opacity-90">Choose your role and get started</p>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 px-4 pt-4 pb-4">
        <div className="bg-white rounded-2xl p-4 shadow-lg max-w-md mx-auto">
          <div className="space-y-4">
            {/* Role Selection Question */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                What role best describes you? *
              </label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => {
                    const IconComponent = role.icon;
                    return (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center space-x-3">
                          <IconComponent className="w-4 h-4 text-primary" />
                          <div>
                            <div className="font-medium">{role.title}</div>
                            <div className="text-xs text-gray-500">{role.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              
            </div>

            {/* Authentication Options - Only show when role is selected */}
            {selectedRole && (
              <div className="space-y-3 pt-2">
                <div className="border-t pt-4">
                  {/* Email Registration */}
                  <Button
                    onClick={handleEmailRegistration}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                  >
                    Create Account
                  </Button>

                  {/* Login Link */}
                  <div className="text-center pt-3">
                    <span className="text-gray-600 text-sm">Already have an account? </span>
                    <Button
                      variant="link"
                      onClick={handleLogin}
                      className="text-[#00AACC] font-semibold p-0 h-auto text-sm"
                    >
                      Login
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Call to action when no role selected */}
            {!selectedRole && (
              <div className="text-center py-8">
                <p className="text-sm text-[#00AACC]">
                  Please select your role to continue
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}