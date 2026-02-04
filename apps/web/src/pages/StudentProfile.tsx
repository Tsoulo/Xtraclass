import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  User, 
  School, 
  Calendar,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  MapPin,
  Clock,
  UserCheck,
  Database
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface StudentProfileProps {
  studentId: string;
  classId?: string;
}

interface Student {
  id: number;
  userId: number;
  studentId: string;
  gradeLevel: string;
  schoolName: string;
  parentContact: string;
  firstName: string;
  lastName: string;
  email: string;
  cellNumber?: string;
  enrolledAt: string;
}

interface Class {
  id: number;
  name: string;
  subject: string;
  grade: string;
  classCode: string;
  schoolName: string;
  teacherId: number;
}

export default function StudentProfile({ studentId, classId }: StudentProfileProps) {
  const [, setLocation] = useLocation();

  // Fetch student data
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['/api/students', studentId],
    queryFn: () => apiRequest(`/api/students/${studentId}`),
    enabled: !!studentId
  });

  // Fetch class data if classId is provided
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['/api/classes', classId],
    queryFn: () => apiRequest(`/api/classes/${classId}`),
    enabled: !!classId
  });

  const getInitials = (firstName: string | undefined, lastName: string | undefined) => {
    const first = firstName && firstName.length > 0 ? firstName.charAt(0) : 'S';
    const last = lastName && lastName.length > 0 ? lastName.charAt(0) : 'P';
    return `${first}${last}`.toUpperCase();
  };

  const handleBack = () => {
    if (classId) {
      setLocation(`/student-management/${classId}`);
    } else {
      setLocation('/dashboard');
    }
  };

  if (studentLoading || (classId && classLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
          <div className="relative z-10 p-6">
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="text-center">
              <Skeleton className="h-12 w-64 mx-auto mb-2" />
              <Skeleton className="h-6 w-48 mx-auto" />
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Student Not Found</h3>
            <p className="text-gray-600 mb-6">The requested student could not be found.</p>
            <Button onClick={handleBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">
              Student Profile
            </h1>
            <div className="w-10" /> {/* Spacer for center alignment */}
          </div>

          {/* Student Header */}
          <div className="text-center text-white">
            <div className="mb-4">
              <Avatar className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 ring-4 ring-white/30">
                <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                  {getInitials(student.firstName, student.lastName)}
                </AvatarFallback>
              </Avatar>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              {student.firstName || 'Student'} {student.lastName || 'Profile'}
            </h2>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge className="bg-white/20 text-white border-white/30">
                {student.gradeLevel}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30">
                Active Student
              </Badge>
            </div>
            <p className="text-blue-100 text-lg">
              {student.schoolName}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 -mt-8 relative z-10">
        {/* Personal Information */}
        <Card className="bg-white/90 backdrop-blur-2xl shadow-2xl border border-white/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Full Name
                  </label>
                  <p className="text-gray-900 font-semibold text-lg">
                    {student.firstName || 'Student'} {student.lastName || 'Profile'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Student ID
                  </label>
                  <p className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-lg inline-block">
                    {student.studentId}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email Address
                  </label>
                  <p className="text-gray-900">{student.email}</p>
                </div>
                {student.cellNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Cell Number
                    </label>
                    <p className="text-gray-900">{student.cellNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card className="bg-white/90 backdrop-blur-2xl shadow-2xl border border-white/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <GraduationCap className="w-5 h-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    Grade Level
                  </label>
                  <p className="text-gray-900 font-semibold text-lg">{student.gradeLevel}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <School className="w-3 h-3" />
                    School
                  </label>
                  <p className="text-gray-900">{student.schoolName}</p>
                </div>
              </div>
              <div className="space-y-4">
                {classData && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Current Class
                      </label>
                      <p className="text-gray-900 font-medium">{classData.subject} - {classData.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        Class Code
                      </label>
                      <p className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-lg inline-block">
                        {classData.classCode}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="bg-white/90 backdrop-blur-2xl shadow-2xl border border-white/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Phone className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Parent/Guardian Contact
                </label>
                <p className="text-gray-900">
                  {student.parentContact || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Enrollment Date
                </label>
                <p className="text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  {new Date(student.enrolledAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card className="bg-white/90 backdrop-blur-2xl shadow-2xl border border-white/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Database className="w-5 h-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600">User ID</label>
                <p className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-lg inline-block">
                  {student.userId}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Database ID</label>
                <p className="text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-lg inline-block">
                  {student.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="py-4 h-auto"
            onClick={() => setLocation(`/student-assessments/${studentId}`)}
          >
            <BookOpen className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-semibold">View Assessments</div>
              <div className="text-sm text-gray-600">See detailed assessment history</div>
            </div>
          </Button>
          
          <Button
            className="py-4 h-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            onClick={() => setLocation(`/generate-lesson/${studentId}`)}
          >
            <GraduationCap className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Generate Lesson</div>
              <div className="text-sm text-white/80">Create personalized content</div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}