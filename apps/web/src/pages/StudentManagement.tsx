import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  Search, 
  MoreVertical,
  Mail,
  Phone,
  UserMinus,
  Upload,
  FileText,
  UserPlus,
  AlertTriangle,
  Eye,
  User,
  School,
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  BookOpen,
  Activity,
  PieChart,
  CheckCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import StudentForm from "@/components/StudentForm";
import TeacherStudentView from "@/components/TeacherStudentView";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsePieChart, Cell, LineChart, Line, Legend } from 'recharts';

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
  schoolName: string;
  teacherId: number;
}

interface ClassAnalytics {
  totalStudents: number;
  averageScore: number;
  completionRate: number;
  topPerformers: Student[];
  strugglingStudents: Student[];
  subjectPerformance: {
    subject: string;
    avgScore: number;
    completionRate: number;
  }[];
  weeklyProgress: {
    week: string;
    avgScore: number;
    completions: number;
  }[];
  performanceDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  homeworkPerformance: {
    totalAssigned: number;
    totalCompleted: number;
    averageScore: number;
    onTimeSubmissions: number;
    lateSubmissions: number;
    recentTrends: {
      week: string;
      completed: number;
      avgScore: number;
    }[];
  };
  exercisePerformance: {
    totalAssigned: number;
    totalCompleted: number;
    averageScore: number;
    averageAttempts: number;
    strugglingTopics: string[];
    masteredTopics: string[];
  };
  classComparison: {
    week: string;
    currentClass: number;
    schoolAverage: number;
    topPerformingClass: number;
  }[];
}

interface StudentManagementProps {
  classId: string;
}

export default function StudentManagement({ classId }: StudentManagementProps) {
  const [, setLocation] = useLocation();
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showCSVDialog, setShowCSVDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [studentDetailsData, setStudentDetailsData] = useState<Student | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [showStudentProgressView, setShowStudentProgressView] = useState(false);
  const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch class information
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['/api/classes', classId],
    queryFn: () => apiRequest(`/api/classes/${classId}`),
    enabled: !!classId
  });

  // Fetch students in this class
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/classes', classId, 'students'],
    queryFn: () => apiRequest(`/api/classes/${classId}/students`),
    enabled: !!classId
  });

  // Search for students by grade and search term
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['/api/students/search', classData?.grade, studentSearchTerm, classId],
    queryFn: () => apiRequest(`/api/students/search?grade=${encodeURIComponent(classData?.grade || '')}&term=${encodeURIComponent(studentSearchTerm)}&classId=${classId}`),
    enabled: !!classData && !!classData.grade && !!studentSearchTerm && studentSearchTerm.length >= 2
  });

  // Remove student mutation
  const removeStudentMutation = useMutation({
    mutationFn: (studentId: number) => 
      apiRequest(`/api/classes/${classId}/students/${studentId}`, {
        method: 'DELETE'
      }),
    onSuccess: async () => {
      // Invalidate and refetch student list
      await queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'students'] });
      // Force refetch of all classes to update student counts on dashboard
      await queryClient.refetchQueries({ queryKey: ['/api/classes'] });
      toast({
        title: "Student removed",
        description: "Student has been removed from the class successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove student from class",
        variant: "destructive"
      });
    }
  });

  // Add existing student to class mutation
  const addStudentToClassMutation = useMutation({
    mutationFn: (studentId: number) => 
      apiRequest(`/api/classes/${classId}/students/${studentId}`, {
        method: 'POST'
      }),
    onSuccess: async () => {
      // Invalidate and refetch student list
      await queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'students'] });
      // Force refetch of all classes to update student counts on dashboard
      await queryClient.refetchQueries({ queryKey: ['/api/classes'] });
      setShowSearchDialog(false);
      setStudentSearchTerm("");
      toast({
        title: "Student added",
        description: "Student has been added to the class successfully."
      });
    },
    onError: (error: any) => {
      // Since we now show enrollment conflicts proactively, we should only get here for unexpected errors
      toast({
        title: "Error",
        description: error.message || "Failed to add student to class",
        variant: "destructive"
      });
    }
  });

  // CSV upload mutation
  const uploadCSVMutation = useMutation({
    mutationFn: async (file: File) => {
      // Parse CSV on frontend
      console.log("StudentManagement CSV upload started");
      const text = await file.text();
      console.log("CSV content:", text);
      const lines = text.split('\n').filter(line => line.trim());
      console.log("CSV lines:", lines);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      console.log("CSV headers:", headers);
      
      const students = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const student: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          console.log(`Processing header "${header}" with value "${value}"`);
          
          // Map common header variations - fix the logic
          if (header.includes('first') || header === 'firstname') {
            student.firstName = value;
          } else if (header.includes('last') || header === 'lastname') {
            student.lastName = value;
          } else if (header.includes('id') || header === 'idnumber') {
            student.idNumber = value;
          } else if (header.includes('cell') || header.includes('phone')) {
            student.cellphone = value;
          } else if (header.includes('email')) {
            student.email = value;
          } else if (header.includes('parent')) {
            student.parentContact = value;
          } else if (header.includes('school')) {
            student.school = value;
          } else if (header.includes('grade')) {
            student.grade = value;
          }
        });

        console.log("Student object after processing:", student);
        
        // Use class data as defaults
        if (!student.school && classData) {
          student.school = classData.schoolName;
        }
        if (!student.grade && classData) {
          student.grade = classData.grade;
        }
        
        return student;
      }).filter(s => {
        const isValid = s.firstName && s.lastName && s.idNumber;
        console.log(`Student validation: firstName="${s.firstName}", lastName="${s.lastName}", idNumber="${s.idNumber}", valid=${isValid}`);
        return isValid;
      });
      
      console.log("Parsed students from CSV:", students);
      
      return apiRequest(`/api/classes/${classId}/students`, {
        method: 'POST',
        body: JSON.stringify({ students })
      });
    },
    onSuccess: async (result) => {
      // Invalidate and refetch student list
      await queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'students'] });
      // Force refetch of all classes to update student counts on dashboard
      await queryClient.refetchQueries({ queryKey: ['/api/classes'] });
      setShowCSVDialog(false);
      setCsvFile(null);
      
      const successCount = result.students?.length || 0;
      const errorCount = result.errors?.length || 0;
      const skippedCount = errorCount;
      
      // Count new vs existing students
      const newStudents = result.students?.filter((s: any) => s.action === 'created_new') || [];
      const existingStudents = result.students?.filter((s: any) => s.action === 'added_existing') || [];
      
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: "CSV upload successful",
          description: `Added ${newStudents.length} new student${newStudents.length !== 1 ? 's' : ''}${existingStudents.length > 0 ? ` and ${existingStudents.length} existing student${existingStudents.length !== 1 ? 's' : ''}` : ''} to the class.`
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: "CSV upload completed with conflicts",
          description: `Added ${successCount} student${successCount !== 1 ? 's' : ''} to the class. ${skippedCount} student${skippedCount !== 1 ? 's were' : ' was'} skipped due to enrollment conflicts.`
        });
        // Show detailed error information
        setTimeout(() => {
          toast({
            title: "Skipped students",
            description: result.errors.slice(0, 3).join('. ') + (result.errors.length > 3 ? '...' : ''),
            variant: "destructive"
          });
        }, 500);
      } else if (errorCount > 0) {
        toast({
          title: "CSV upload failed",
          description: `No students were added. ${errorCount} student${errorCount !== 1 ? 's' : ''} could not be processed due to conflicts.`,
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload students",
        variant: "destructive"
      });
    }
  });

  const handleRemoveStudent = (student: Student) => {
    removeStudentMutation.mutate(student.id);
  };

  const handleViewStudentDetails = (student: Student) => {
    setStudentDetailsData(student);
    setShowStudentDetails(true);
  };

  const handleViewStudentProgress = (studentId: number) => {
    setSelectedStudentForProgress(studentId);
    setShowStudentProgressView(true);
  };

  const handleBackFromProgressView = () => {
    setShowStudentProgressView(false);
    setSelectedStudentForProgress(null);
  };

  const handleCSVUpload = () => {
    if (csvFile) {
      uploadCSVMutation.mutate(csvFile);
    }
  };

  const handleStudentAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'students'] });
    queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
    setShowStudentForm(false);
  };

  const handleAddExistingStudent = (student: Student) => {
    addStudentToClassMutation.mutate(student.id);
  };

  const getInitials = (firstName: string | undefined, lastName: string | undefined) => {
    const first = firstName && firstName.length > 0 ? firstName.charAt(0) : 'S';
    const last = lastName && lastName.length > 0 ? lastName.charAt(0) : 'P';
    return `${first}${last}`.toUpperCase();
  };

  // Generate class analytics data
  const generateClassAnalytics = (): ClassAnalytics => {
    if (!students || students.length === 0) {
      return {
        totalStudents: 0,
        averageScore: 0,
        completionRate: 0,
        topPerformers: [],
        strugglingStudents: [],
        subjectPerformance: [],
        weeklyProgress: [],
        performanceDistribution: [],
        homeworkPerformance: {
          totalAssigned: 0,
          totalCompleted: 0,
          averageScore: 0,
          onTimeSubmissions: 0,
          lateSubmissions: 0,
          recentTrends: []
        },
        exercisePerformance: {
          totalAssigned: 0,
          totalCompleted: 0,
          averageScore: 0,
          averageAttempts: 0,
          strugglingTopics: [],
          masteredTopics: []
        },
        classComparison: []
      };
    }

    // Mock analytics data based on student count and realistic patterns
    const totalStudents = students.length;
    const averageScore = Math.floor(Math.random() * 20) + 70; // 70-90%
    const completionRate = Math.floor(Math.random() * 15) + 80; // 80-95%

    // Top performers (top 20% or minimum 1)
    const topCount = Math.max(1, Math.floor(totalStudents * 0.2));
    const topPerformers = students.slice(0, topCount);

    // Struggling students (bottom 20% or minimum 1 if more than 3 students)
    const strugglingCount = totalStudents > 3 ? Math.max(1, Math.floor(totalStudents * 0.2)) : 0;
    const strugglingStudents = students.slice(-strugglingCount);

    // Weekly progress for last 8 weeks
    const weeklyProgress = Array.from({ length: 8 }, (_, i) => ({
      week: `Week ${i + 1}`,
      avgScore: Math.floor(Math.random() * 15) + 70 + i * 2, // Trending upward
      completions: Math.floor(Math.random() * totalStudents * 0.3) + Math.floor(totalStudents * 0.6)
    }));

    // Performance distribution
    const performanceDistribution = [
      { range: '90-100%', count: Math.floor(totalStudents * 0.2), percentage: 20 },
      { range: '80-89%', count: Math.floor(totalStudents * 0.4), percentage: 40 },
      { range: '70-79%', count: Math.floor(totalStudents * 0.25), percentage: 25 },
      { range: '60-69%', count: Math.floor(totalStudents * 0.1), percentage: 10 },
      { range: 'Below 60%', count: Math.floor(totalStudents * 0.05), percentage: 5 }
    ];

    const subjectPerformance = [
      { subject: 'Mathematics', avgScore: 78, completionRate: 92 },
      { subject: 'Algebra', avgScore: 82, completionRate: 88 },
      { subject: 'Geometry', avgScore: 75, completionRate: 85 }
    ];

    // Homework performance data
    const homeworkPerformance = {
      totalAssigned: Math.floor(totalStudents * 12), // ~12 homework per student
      totalCompleted: Math.floor(totalStudents * 12 * 0.85), // 85% completion
      averageScore: Math.floor(Math.random() * 15) + 75, // 75-90%
      onTimeSubmissions: Math.floor(totalStudents * 12 * 0.75), // 75% on time
      lateSubmissions: Math.floor(totalStudents * 12 * 0.1), // 10% late
      recentTrends: Array.from({ length: 6 }, (_, i) => ({
        week: `Week ${i + 1}`,
        completed: Math.floor(Math.random() * totalStudents * 0.3) + Math.floor(totalStudents * 0.7),
        avgScore: Math.floor(Math.random() * 10) + 75 + i
      }))
    };

    // Exercise performance data
    const exercisePerformance = {
      totalAssigned: Math.floor(totalStudents * 20), // ~20 exercises per student
      totalCompleted: Math.floor(totalStudents * 20 * 0.92), // 92% completion
      averageScore: Math.floor(Math.random() * 12) + 78, // 78-90%
      averageAttempts: Math.round((Math.random() * 1.5 + 1.2) * 10) / 10, // 1.2-2.7 attempts
      strugglingTopics: ['Quadratic Equations', 'Logarithms', 'Complex Numbers'],
      masteredTopics: ['Basic Algebra', 'Linear Equations', 'Polynomials']
    };

    // Class comparison data (current class vs school average vs top class)
    const classComparison = Array.from({ length: 8 }, (_, i) => {
      const currentClassScore = Math.floor(Math.random() * 15) + 70 + i * 2;
      const schoolAverageScore = Math.floor(Math.random() * 10) + 65 + i * 1.5;
      const topClassScore = Math.floor(Math.random() * 8) + 85 + i * 1;
      
      return {
        week: `Week ${i + 1}`,
        currentClass: currentClassScore,
        schoolAverage: schoolAverageScore,
        topPerformingClass: topClassScore
      };
    });

    return {
      totalStudents,
      averageScore,
      completionRate,
      topPerformers,
      strugglingStudents,
      subjectPerformance,
      weeklyProgress,
      performanceDistribution,
      homeworkPerformance,
      exercisePerformance,
      classComparison
    };
  };

  const classAnalytics = generateClassAnalytics();

  // Add filtered students logic for the main list
  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) ||
           student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
           student.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Filter search results to exclude students already in class
  const availableStudents = searchResults.filter(
    (searchStudent: Student) => !students.some((classStudent: Student) => classStudent.id === searchStudent.id)
  );



  if (classLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header Loading */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.3),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.2),transparent_50%)]"></div>
          
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-10 w-10 rounded-2xl bg-white/20" />
              <Skeleton className="h-6 w-32 bg-white/20" />
              <div className="flex space-x-2">
                <Skeleton className="h-9 w-24 rounded-2xl bg-white/20" />
                <Skeleton className="h-9 w-28 rounded-2xl bg-white/20" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-48 mx-auto bg-white/20" />
              <Skeleton className="h-4 w-32 mx-auto bg-white/20" />
              <Skeleton className="h-3 w-24 mx-auto bg-white/20" />
            </div>
          </div>
        </div>

        {/* Content Loading */}
        <div className="p-6 space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Class not found</h2>
          <Button onClick={() => setLocation('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (showStudentForm) {
    return (
      <StudentForm
        classInfo={{
          id: classData.id,
          subject: classData.subject,
          grade: classData.grade,
          className: classData.name,
          schoolName: classData.schoolName
        }}
        onClose={() => setShowStudentForm(false)}
        onSave={handleStudentAdded}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_50%)]"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/dashboard')}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="flex flex-wrap gap-2 flex-1">
              <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-white/20 rounded-lg"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Find Student</span>
                    <span className="sm:hidden">Find</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Existing Student</DialogTitle>
                    <DialogDescription>
                      Search for existing students by their name or ID number to add them to this class.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="student-search">Search Students</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="student-search"
                          placeholder="Enter student name or ID number..."
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    {/* Search Results */}
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {searchLoading ? (
                        <div className="space-y-3">
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-500">Searching students...</p>
                          </div>
                          <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg animate-pulse">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-1 flex-1">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : studentSearchTerm.length >= 2 ? (
                        availableStudents.length === 0 ? (
                          <div className="text-center py-6 text-gray-500">
                            <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                            <p>No students found matching your search</p>
                          </div>
                        ) : (
                          availableStudents.map((student: any) => (
                            <div key={student.id} className={`p-3 border rounded-lg ${
                              student.isEnrolledInSubjectGrade 
                                ? 'border-amber-200 bg-amber-50' 
                                : 'hover:bg-gray-50'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Avatar className="w-10 h-10">
                                    <AvatarFallback className="bg-blue-100 text-blue-700">
                                      {getInitials(student.firstName, student.lastName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="font-medium">{student.firstName} {student.lastName}</p>
                                    <p className="text-sm text-gray-500">ID: {student.studentId}</p>
                                    {student.isEnrolledInSubjectGrade && student.existingEnrollment && (
                                      <div className="mt-1">
                                        <div className="flex items-center space-x-1 text-xs text-amber-700">
                                          <AlertTriangle className="w-3 h-3" />
                                          <span>Already enrolled in {classData?.subject} Grade {classData?.grade}</span>
                                        </div>
                                        <p className="text-xs text-amber-600">
                                          Class: {student.existingEnrollment.className} • Teacher: {student.existingEnrollment.teacherName}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleAddExistingStudent(student)}
                                  disabled={addStudentToClassMutation.isPending || student.isEnrolledInSubjectGrade}
                                  variant={student.isEnrolledInSubjectGrade ? "secondary" : "default"}
                                  className={student.isEnrolledInSubjectGrade ? "opacity-50 cursor-not-allowed" : ""}
                                >
                                  {student.isEnrolledInSubjectGrade 
                                    ? "Already Enrolled" 
                                    : addStudentToClassMutation.isPending 
                                      ? "Adding..." 
                                      : "Add"
                                  }
                                </Button>
                              </div>
                            </div>
                          ))
                        )
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <Search className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                          <p>Enter at least 2 characters to search</p>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showCSVDialog} onOpenChange={setShowCSVDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-white/20 rounded-lg"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">CSV Upload</span>
                    <span className="sm:hidden">CSV</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Students from CSV</DialogTitle>
                    <DialogDescription>
                      Upload a CSV file with student information. Required columns: firstName, lastName, idNumber, email
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowCSVDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCSVUpload} 
                        disabled={!csvFile || uploadCSVMutation.isPending}
                      >
                        {uploadCSVMutation.isPending ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={() => setShowStudentForm(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md rounded-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Student</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-white/80" />
                <span className="text-xs text-white/80">Enrolled</span>
              </div>
              <div className="text-2xl font-bold text-white">{students.length}</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-white/80" />
                <span className="text-xs text-white/80">Active</span>
              </div>
              <div className="text-2xl font-bold text-white">{students.length}</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <School className="w-4 h-4 text-white/80" />
                <span className="text-xs text-white/80">Grade</span>
              </div>
              <div className="text-2xl font-bold text-white">{classData.grade}</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-white/80" />
                <span className="text-xs text-white/80">Subject</span>
              </div>
              <div className="text-lg font-bold text-white truncate">{classData.subject}</div>
            </div>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Students ({students.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Class Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-6">
            {/* Search */}
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search students by name, ID, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Students List */}
            {studentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {searchTerm ? 'No students found' : 'No students enrolled'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm 
                      ? 'Try adjusting your search terms'
                      : 'Add students to this class to get started'
                    }
                  </p>
                  {!searchTerm && (
                    <Button 
                      onClick={() => setShowStudentForm(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Student
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredStudents.map((student) => (
                  <Card 
                    key={student.id} 
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div 
                          className="flex items-center gap-4 flex-1 cursor-pointer"
                          onClick={() => setLocation(`/student-analytics/${student.id}/${classId}`)}
                        >
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {getInitials(student.firstName, student.lastName)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Student Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">
                                {student.firstName || 'Student'} {student.lastName || 'Profile'}
                              </h3>
                              <Badge className="bg-green-100 text-green-800">
                                Active
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">ID: {student.studentId}</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span>{student.email}</span>
                              </div>
                              {student.cellNumber && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{student.cellNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewStudentDetails(student);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  className="text-red-600 focus:text-red-600"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  <UserMinus className="w-4 h-4 mr-2" />
                                  Remove from Class
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Student</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {student.firstName} {student.lastName} from this class?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveStudent(student);
                                    }}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Remove Student
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

      {/* Student Details Dialog */}
      <Dialog open={showStudentDetails} onOpenChange={setShowStudentDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Student Details
            </DialogTitle>
            <DialogDescription>
              Complete information for {studentDetailsData?.firstName} {studentDetailsData?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          {studentDetailsData && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-gray-900 font-medium">
                      {studentDetailsData.firstName} {studentDetailsData.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Student ID</label>
                    <p className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded text-sm inline-block">
                      {studentDetailsData.studentId}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email Address</label>
                    <p className="text-gray-900">{studentDetailsData.email}</p>
                  </div>
                  {studentDetailsData.cellNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Cell Number</label>
                      <p className="text-gray-900">{studentDetailsData.cellNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Academic Information */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <School className="w-4 h-4" />
                  Academic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Grade Level</label>
                    <p className="text-gray-900 font-medium">{studentDetailsData.gradeLevel}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">School</label>
                    <p className="text-gray-900">{studentDetailsData.schoolName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Current Class</label>
                    <p className="text-gray-900">{classData?.subject} - {classData?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Class Code</label>
                    <p className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded text-sm inline-block">
                      {classData?.classCode || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Parent/Guardian Contact</label>
                    <p className="text-gray-900">{studentDetailsData.parentContact || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Enrollment Date</label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(studentDetailsData.enrolledAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowStudentDetails(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Teacher Student Progress View */}
      {showStudentProgressView && selectedStudentForProgress && (
        <TeacherStudentView
          studentId={selectedStudentForProgress}
          classId={parseInt(classId)}
          onBack={handleBackFromProgressView}
        />
      )}
          </TabsContent>

          {/* Analytics Tab Content */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Class Overview Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-blue-600" />
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{classAnalytics.totalStudents}</h3>
                      <p className="text-sm text-gray-600">Total Students</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Target className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{classAnalytics.averageScore}%</h3>
                      <p className="text-sm text-gray-600">Average Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Activity className="w-8 h-8 text-purple-600" />
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{classAnalytics.completionRate}%</h3>
                      <p className="text-sm text-gray-600">Completion Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Award className="w-8 h-8 text-yellow-600" />
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{classAnalytics.topPerformers.length}</h3>
                      <p className="text-sm text-gray-600">Top Performers (+70%)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Class Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Class Performance vs School Average
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={classAnalytics.classComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[60, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="currentClass" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Your Class" 
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="schoolAverage" 
                        stroke="#6b7280" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="School Average" 
                        dot={{ fill: '#6b7280', strokeWidth: 2, r: 3 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="topPerformingClass" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Top Class" 
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Performance Summary */}
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-blue-700">
                      {classAnalytics.classComparison[classAnalytics.classComparison.length - 1]?.currentClass}%
                    </div>
                    <div className="text-xs text-blue-600">Your Class (Latest)</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-gray-700">
                      {classAnalytics.classComparison[classAnalytics.classComparison.length - 1]?.schoolAverage}%
                    </div>
                    <div className="text-xs text-gray-600">School Average</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-green-700">
                      {classAnalytics.classComparison[classAnalytics.classComparison.length - 1]?.topPerformingClass}%
                    </div>
                    <div className="text-xs text-green-600">Top Class</div>
                  </div>
                </div>

                
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Progress Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Weekly Completion Rate Trends (Last 6 Weeks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classAnalytics.weeklyProgress?.slice(-6)?.map((item, index) => {
                        const today = new Date();
                        const currentFriday = new Date(today);
                        const dayOfWeek = today.getDay();
                        const daysToFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
                        currentFriday.setDate(today.getDate() + daysToFriday - (index * 7));
                        
                        const weekStart = new Date(currentFriday);
                        weekStart.setDate(currentFriday.getDate() - 4);
                        
                        return {
                          ...item,
                          weekLabel: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${currentFriday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        };
                      }).reverse() || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="weekLabel" 
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis domain={[0, 100]} label={{ value: '% Completion', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, name]}
                          labelFormatter={(label) => `Week: ${label}`}
                        />
                        <Bar dataKey="homeworkCompletion" fill="#3b82f6" name="Homework Completion" />
                        <Bar dataKey="exerciseCompletion" fill="#10b981" name="Exercise Completion" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Performance Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {classAnalytics.performanceDistribution.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ 
                              backgroundColor: `hsl(${index * 60}, 70%, 50%)` 
                            }}
                          />
                          <span className="text-sm font-medium">{item.range}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{item.count} students</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full"
                              style={{ 
                                width: `${item.percentage}%`,
                                backgroundColor: `hsl(${index * 60}, 70%, 50%)` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Student Performance Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-600" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {classAnalytics.topPerformers.map((student, index) => (
                      <div key={student.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-center w-8 h-8 bg-yellow-600 text-white rounded-full text-sm font-bold">
                          {index + 1}
                        </div>
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-yellow-100 text-yellow-700 text-xs">
                            {getInitials(student.firstName, student.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {student.firstName || 'Student'} {student.lastName || 'Profile'}
                          </h4>
                          <p className="text-xs text-gray-600">ID: {student.studentId}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/student-analytics/${student.id}/${classId}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Students Needing Support */}
              {classAnalytics.strugglingStudents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      Students Needing Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {classAnalytics.strugglingStudents.map((student) => (
                        <div key={student.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                              {getInitials(student.firstName, student.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {student.firstName || 'Student'} {student.lastName || 'Profile'}
                            </h4>
                            <p className="text-xs text-gray-600">ID: {student.studentId}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation(`/student-analytics/${student.id}/${classId}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Homework and Exercise Performance Reports */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Homework Performance Report */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    Homework Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Homework Overview Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700">
                        {Math.round((classAnalytics.homeworkPerformance.totalCompleted / classAnalytics.homeworkPerformance.totalAssigned) * 100)}%
                      </div>
                      <div className="text-sm text-blue-600">Completion Rate</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">
                        {classAnalytics.homeworkPerformance.averageScore}%
                      </div>
                      <div className="text-sm text-green-600">Average Score</div>
                    </div>
                  </div>

                  {/* Submission Timing */}
                  <div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">On Time</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 bg-green-500 rounded-full"
                              style={{ 
                                width: `${(classAnalytics.homeworkPerformance.onTimeSubmissions / classAnalytics.homeworkPerformance.totalAssigned) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">{classAnalytics.homeworkPerformance.onTimeSubmissions}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Late</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 bg-orange-500 rounded-full"
                              style={{ 
                                width: `${(classAnalytics.homeworkPerformance.lateSubmissions / classAnalytics.homeworkPerformance.totalAssigned) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">{classAnalytics.homeworkPerformance.lateSubmissions}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Trends Chart */}
                  <div>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={classAnalytics.homeworkPerformance.recentTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="completed" fill="#3b82f6" name="Completed" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exercise Performance Report */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Exercise Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Exercise Overview Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-purple-700">
                        {Math.round((classAnalytics.exercisePerformance.totalCompleted / classAnalytics.exercisePerformance.totalAssigned) * 100)}%
                      </div>
                      <div className="text-sm text-purple-600">Completion Rate</div>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-700">
                        {classAnalytics.exercisePerformance.averageAttempts}
                      </div>
                      <div className="text-sm text-indigo-600">Avg. Attempts</div>
                    </div>
                  </div>

                  {/* Performance Score */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-lg">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-700">
                        {classAnalytics.exercisePerformance.averageScore}%
                      </div>
                      <div className="text-sm text-purple-600">Average Exercise Score</div>
                    </div>
                  </div>

                  {/* Topic Mastery Analysis */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Topic Mastery</h4>
                    <div className="space-y-3">
                      {/* Mastered Topics */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-700">Mastered Topics</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {classAnalytics.exercisePerformance.masteredTopics.map((topic, index) => (
                            <Badge key={index} className="bg-green-100 text-green-800 text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Struggling Topics */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium text-red-700">Needs Attention</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {classAnalytics.exercisePerformance.strugglingTopics.map((topic, index) => (
                            <Badge key={index} className="bg-red-100 text-red-800 text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}