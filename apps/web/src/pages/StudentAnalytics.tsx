import { ArrowLeft, Trophy, BookOpen, Target, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import TeacherStudentView from "@/components/TeacherStudentView";

interface StudentAnalyticsProps {
  studentId: string;
  classId: string;
}

export default function StudentAnalytics({ studentId, classId }: StudentAnalyticsProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    setLocation(`/dashboard/students/${classId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Students
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <TeacherStudentView
          studentId={parseInt(studentId)}
          classId={parseInt(classId)}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}