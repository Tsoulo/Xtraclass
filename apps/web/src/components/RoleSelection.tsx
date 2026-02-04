import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, BookOpen, GraduationCap, UserCheck } from "lucide-react";
import { useLocation } from "wouter";
import bwLogoImage from "@assets/xtraclass-logo-td.png";

const roles = [
  {
    id: "parent",
    title: "Join as Parent",
    description: "Level up your child's learning journey!",
    icon: Users,
    bgColor: "bg-light-green",
    iconColor: "bg-primary",
    textColor: "text-primary",
  },
  {
    id: "teacher",
    title: "Join as Teacher",
    description: "Master your classroom quests!",
    icon: BookOpen,
    bgColor: "bg-light-blue",
    iconColor: "bg-blue-500",
    textColor: "text-blue-600",
  },
  {
    id: "student",
    title: "Join as Student",
    description: "Earn points with personalized learning!",
    icon: GraduationCap,
    bgColor: "bg-light-yellow",
    iconColor: "bg-yellow-500",
    textColor: "text-yellow-600",
  },
  {
    id: "tutor",
    title: "Join as Tutor",
    description: "Lead your team to victory!",
    icon: UserCheck,
    bgColor: "bg-light-green",
    iconColor: "bg-primary",
    textColor: "text-primary",
  },
];

export default function RoleSelection() {
  const [, setLocation] = useLocation();

  const handleRoleSelect = (role: string) => {
    // Store the selected role in localStorage for the Dashboard to use
    localStorage.setItem('userRole', role);
    setLocation(`/register/auth-options?role=${role}`);
  };

  const handleBack = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="gamified-bg relative z-10 px-6 pt-8 pb-6">
        <div className="flex items-start justify-start mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-white hover:bg-white/20 backdrop-blur-sm rounded-full transition-all duration-300"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </div>

        <div className="text-center text-white px-2">
          <div className="flex justify-center mb-4">
            <img 
              src={bwLogoImage} 
              alt="XtraClass.ai Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-tight leading-tight">What role suits you?</h1>
          <p className="text-base opacity-95 font-medium max-w-sm mx-auto">Choose your adventure to get started!</p>
        </div>
      </div>

      {/* Role Cards */}
      <div className="px-6 space-y-3 pb-8 pt-3">
        {roles.map((role, index) => {
          const IconComponent = role.icon;
          return (
            <button
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              className={`group relative overflow-hidden bg-white rounded-2xl p-4 cursor-pointer border border-gray-200 hover:border-primary w-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Pattern */}
              <div className={`absolute inset-0 ${role.bgColor} opacity-40 group-hover:opacity-60 transition-opacity duration-300`}></div>
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative flex items-center space-x-4">
                <div className={`w-12 h-12 ${role.iconColor} rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className={`text-lg font-bold ${role.textColor} mb-1 group-hover:text-primary transition-colors duration-300`}>
                    {role.title}
                  </h3>
                  <p className="text-gray-600 text-sm font-medium">{role.description}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-1.5 h-1.5 ${role.iconColor} rounded-full opacity-60`}></div>
                  <div className={`w-2 h-2 ${role.iconColor} rounded-full opacity-80`}></div>
                  <svg
                    className={`w-5 h-5 ${role.textColor} group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
