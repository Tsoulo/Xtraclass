import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Award,
  BookOpen,
  Target,
  Filter,
  ExternalLink,
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Activity,
  PieChart
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

interface ClassAnalytics {
  id: number;
  name: string;
  totalStudents: number;
  averageScore: number;
  completionRate: number;
  activeStudents: number;
  subject: string;
  grade: string;
}

interface SchoolAnalytics {
  totalClasses: number;
  totalStudents: number;
  averagePerformance: number;
  totalHomeworkCompleted: number;
  totalExercisesCompleted: number;
  topPerformingClass: string;
}

interface DetailedClassAnalytics {
  totalStudents: number;
  averageScore: number;
  completionRate: number;
  topPerformers: any[];
  strugglingStudents: any[];
  classComparison: any[];
  weeklyProgress: any[];
  performanceDistribution: any[];
  homeworkPerformance: {
    totalAssigned: number;
    totalCompleted: number;
    averageScore: number;
    onTimeSubmissions: number;
    lateSubmissions: number;
  };
  exercisePerformance: {
    totalAssigned: number;
    totalCompleted: number;
    averageScore: number;
    perfectScores: number;
  };
}

export default function TeacherAnalytics() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("week");

  // Fetch teacher's classes
  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ['/api/classes'],
    enabled: !!user && user.role === 'teacher'
  });

  // Fetch class analytics
  const { data: classAnalytics = [], isLoading: analyticsLoading } = useQuery<ClassAnalytics[]>({
    queryKey: ['/api/teacher/analytics/classes', selectedClass, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClass !== 'all') params.append('classId', selectedClass);
      params.append('timeRange', timeRange);
      
      const url = `/api/teacher/analytics/classes${params.toString() ? '?' + params.toString() : ''}`;
      return await apiRequest(url);
    },
    enabled: !!user && user.role === 'teacher'
  });

  // Fetch school-wide analytics
  const { data: schoolAnalytics, isLoading: schoolLoading } = useQuery<SchoolAnalytics>({
    queryKey: ['/api/teacher/analytics/school', timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      
      return await apiRequest(`/api/teacher/analytics/school?${params.toString()}`);
    },
    enabled: !!user && user.role === 'teacher'
  });

  // Fetch detailed class analytics when a specific class is selected
  const { data: detailedClassAnalytics, isLoading: detailedLoading } = useQuery<DetailedClassAnalytics>({
    queryKey: ['/api/class-analytics', selectedClass],
    queryFn: async () => {
      return await apiRequest(`/api/class-analytics/${selectedClass}`);
    },
    enabled: !!user && user.role === 'teacher' && selectedClass !== 'all' && !!selectedClass
  });

  // Helper function to get initials
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || 'S'}${lastName?.[0] || 'P'}`;
  };

  const handleViewLeaderboard = () => {
    setLocation('/leaderboard');
  };

  const handleViewClassDetails = (classId: number) => {
    // Instead of navigating away, set the selected class to show detailed analytics
    setSelectedClass(classId.toString());
  };

  const isLoading = classesLoading || analyticsLoading || schoolLoading || (selectedClass !== 'all' && detailedLoading);

  // Debug logging removed for production

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 pt-16 md:pt-0 flex items-center justify-center">
        <div className="flex items-center justify-center">
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pt-16">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
              <p className="text-sm md:text-base text-slate-600 hidden sm:block">View class performance and school-wide insights</p>
            </div>
            <Button
              onClick={handleViewLeaderboard}
              className="flex items-center gap-2 self-start sm:self-auto"
              variant="outline"
              size="sm"
            >
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">View Leaderboard</span>
              <span className="sm:hidden">Leaderboard</span>
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="term">This Term</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <Tabs defaultValue="classes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="classes">Class Analytics</TabsTrigger>
            <TabsTrigger value="school">School Overview</TabsTrigger>
          </TabsList>

          {/* Class Analytics Tab */}
          <TabsContent value="classes" className="space-y-6">
            {/* Show detailed analytics when a specific class is selected */}
            {selectedClass !== "all" && detailedClassAnalytics && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    Detailed Analytics - {classAnalytics.find(c => c.id.toString() === selectedClass)?.name}
                  </h3>
                  <Button
                    onClick={() => setSelectedClass("all")}
                    variant="outline"
                    size="sm"
                  >
                    ← Back to All Classes
                  </Button>
                </div>
                
                {/* Class Overview Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Users className="w-8 h-8 text-blue-600" />
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-gray-900">{detailedClassAnalytics.totalStudents}</h3>
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
                          <h3 className="text-lg font-semibold text-gray-900">{detailedClassAnalytics.averageScore}%</h3>
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
                          <h3 className="text-lg font-semibold text-gray-900">{detailedClassAnalytics.completionRate}%</h3>
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
                          <h3 className="text-lg font-semibold text-gray-900">{detailedClassAnalytics.topPerformers?.length || 0}</h3>
                          <p className="text-sm text-gray-600">Top Performers</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Class Performance Comparison */}
                {detailedClassAnalytics.classComparison && detailedClassAnalytics.classComparison.length > 0 && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        Class Performance vs Grade Subject Average
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={detailedClassAnalytics.classComparison}>
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
                              name="Grade Subject Average" 
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
                            {detailedClassAnalytics.classComparison[detailedClassAnalytics.classComparison.length - 1]?.currentClass}%
                          </div>
                          <div className="text-xs text-blue-600">Your Class (Latest)</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-gray-700">
                            {detailedClassAnalytics.classComparison[detailedClassAnalytics.classComparison.length - 1]?.schoolAverage}%
                          </div>
                          <div className="text-xs text-gray-600">Grade Subject Average</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-green-700">
                            {detailedClassAnalytics.classComparison[detailedClassAnalytics.classComparison.length - 1]?.topPerformingClass}%
                          </div>
                          <div className="text-xs text-green-600">Top Class</div>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                )}

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Weekly Progress Chart */}
                  {detailedClassAnalytics.weeklyProgress && detailedClassAnalytics.weeklyProgress.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Weekly Progress Trends
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={detailedClassAnalytics.weeklyProgress}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="week" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="avgScore" fill="#3b82f6" name="Avg Score" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Performance Distribution */}
                  {detailedClassAnalytics.performanceDistribution && detailedClassAnalytics.performanceDistribution.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          Performance Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={(() => {
                              // Transform data to cumulative distribution
                              const originalData = detailedClassAnalytics.performanceDistribution;
                              let cumulative = 0;
                              return originalData.map(item => {
                                cumulative += item.count;
                                return {
                                  range: item.range,
                                  cumulative: cumulative,
                                  percentage: Math.round((cumulative / originalData.reduce((sum, d) => sum + d.count, 0)) * 100)
                                };
                              });
                            })()}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="range" />
                              <YAxis />
                              <Tooltip 
                                formatter={(value, name) => [
                                  name === 'cumulative' ? [`${value} students`, 'Cumulative Students'] : [`${value}%`, 'Cumulative Percentage']
                                ]}
                                labelFormatter={(label) => `Up to Score Range: ${label}`}
                              />
                              <Line 
                                type="monotone"
                                dataKey="cumulative" 
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                name="Cumulative Students"
                              />
                              <Line 
                                type="monotone"
                                dataKey="percentage" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                                name="Cumulative %"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Student Performance Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Top Performers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-600" />
                        Top Performers (Above 70%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const topPerformersAbove70 = detailedClassAnalytics.topPerformers?.filter(student => student.averageScore > 70) || [];
                        
                        if (topPerformersAbove70.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500 text-sm">No students are currently above 70%</p>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="space-y-3">
                            {topPerformersAbove70.map((student, index) => (
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
                                  <p className="text-xs text-gray-600">ID: {student.studentId} • {student.averageScore}%</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLocation(`/student-analytics/${student.id}/${selectedClass}`)}
                                >
                                  View Details
                                </Button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* Students Needing Support */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                        Students Needing Support (Bottom 10%, 30%, 40%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const underperformingStudents = detailedClassAnalytics.strugglingStudents?.filter(student => 
                          student.averageScore <= 10 || 
                          student.averageScore <= 30 || 
                          student.averageScore <= 40
                        ) || [];
                        
                        if (underperformingStudents.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500 text-sm">No students are currently underperforming</p>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="space-y-3">
                            {underperformingStudents.map((student) => (
                              <div key={student.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                <div className={`flex items-center justify-center w-8 h-8 text-white rounded-full text-xs font-bold ${
                                  student.averageScore <= 10 ? 'bg-red-700' :
                                  student.averageScore <= 30 ? 'bg-red-600' :
                                  'bg-red-500'
                                }`}>
                                  {student.averageScore <= 10 ? '10%' :
                                   student.averageScore <= 30 ? '30%' :
                                   '40%'}
                                </div>
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                                    {getInitials(student.firstName, student.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">
                                    {student.firstName || 'Student'} {student.lastName || 'Profile'}
                                  </h4>
                                  <p className="text-xs text-gray-600">ID: {student.studentId} • {student.averageScore}%</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLocation(`/student-analytics/${student.id}/${selectedClass}`)}
                                >
                                  View Details
                                </Button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {/* Homework and Exercise Performance Reports */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Homework Performance Report */}
                  {detailedClassAnalytics.homeworkPerformance && (
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
                              {Math.round((detailedClassAnalytics.homeworkPerformance.totalCompleted / detailedClassAnalytics.homeworkPerformance.totalAssigned) * 100)}%
                            </div>
                            <div className="text-sm text-blue-600">Completion Rate</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-green-700">
                              {detailedClassAnalytics.homeworkPerformance.averageScore}%
                            </div>
                            <div className="text-sm text-green-600">Average Score</div>
                          </div>
                        </div>

                        {/* Homework Count */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Homework Assignments</h4>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Assigned</span>
                            <span className="text-sm font-medium">
                              {detailedClassAnalytics.homeworkPerformance.totalAssigned}
                            </span>
                          </div>
                        </div>

                        {/* Submission Timing */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Submission Timing</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">On Time</span>
                              <span className="text-sm font-medium">
                                {detailedClassAnalytics.homeworkPerformance.onTimeSubmissions} 
                                ({Math.round((detailedClassAnalytics.homeworkPerformance.onTimeSubmissions / detailedClassAnalytics.homeworkPerformance.totalCompleted) * 100)}%)
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Late</span>
                              <span className="text-sm font-medium">
                                {detailedClassAnalytics.homeworkPerformance.lateSubmissions}
                                ({Math.round((detailedClassAnalytics.homeworkPerformance.lateSubmissions / detailedClassAnalytics.homeworkPerformance.totalCompleted) * 100)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Exercise Performance Report */}
                  {detailedClassAnalytics.exercisePerformance && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-green-600" />
                          Exercise Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Exercise Overview Stats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-green-700">
                              {detailedClassAnalytics.exercisePerformance.completionRate || 0}%
                            </div>
                            <div className="text-sm text-green-600">Completion Rate</div>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-purple-700">
                              {detailedClassAnalytics.exercisePerformance.averageScore}%
                            </div>
                            <div className="text-sm text-purple-600">Average Score</div>
                          </div>
                        </div>

                        {/* Exercise Generation and Perfect Scores */}
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Exercise Generation</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Admin Created Exercises</span>
                                <span className="text-sm font-medium">
                                  {detailedClassAnalytics.exercisePerformance.totalAssigned}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Students Generated Exercises</span>
                                <span className="text-sm font-medium">
                                  {detailedClassAnalytics.exercisePerformance.userGeneratedCount || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Submission Timing</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">On Time</span>
                                <span className="text-sm font-medium">
                                  {detailedClassAnalytics.exercisePerformance.onTimeSubmissions || 0}
                                  ({detailedClassAnalytics.exercisePerformance.totalCompleted > 0 ? Math.round(((detailedClassAnalytics.exercisePerformance.onTimeSubmissions || 0) / detailedClassAnalytics.exercisePerformance.totalCompleted) * 100) : 0}%)
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Late</span>
                                <span className="text-sm font-medium">
                                  {detailedClassAnalytics.exercisePerformance.lateSubmissions || 0}
                                  ({detailedClassAnalytics.exercisePerformance.totalCompleted > 0 ? Math.round(((detailedClassAnalytics.exercisePerformance.lateSubmissions || 0) / detailedClassAnalytics.exercisePerformance.totalCompleted) * 100) : 0}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Show class overview cards when "all" is selected or no specific class */}
            {selectedClass === "all" && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {classAnalytics.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <BookOpen className="w-12 h-12 text-slate-400 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">No Data Available</h3>
                      <p className="text-slate-600 text-center">
                        No classes found or no activity data available for the selected time period.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  classAnalytics.map((classData) => (
                    <Card key={classData.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{classData.name}</span>
                          <Badge variant="outline">
                            {classData.subject} • Grade {classData.grade}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-500" />
                              <span className="text-sm text-slate-600">Students</span>
                            </div>
                            <span className="font-medium">
                              {classData.activeStudents}/{classData.totalStudents}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-slate-600">Avg Score</span>
                            </div>
                            <span className="font-medium">{classData.averageScore}%</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-purple-500" />
                              <span className="text-sm text-slate-600">Completion</span>
                            </div>
                            <span className="font-medium">{classData.completionRate}%</span>
                          </div>

                          <Button
                            onClick={() => handleViewClassDetails(classData.id)}
                            className="w-full mt-4"
                            variant="outline"
                            size="sm"
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Detailed Class Analytics
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {/* School Overview Tab */}
          <TabsContent value="school" className="space-y-6">
            {schoolAnalytics ? (
              <>
                {/* School Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{schoolAnalytics.totalClasses}</div>
                      <p className="text-xs text-muted-foreground">Active classes</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                      <Users className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{schoolAnalytics.totalStudents}</div>
                      <p className="text-xs text-muted-foreground">Enrolled students</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{schoolAnalytics.averagePerformance}%</div>
                      <p className="text-xs text-muted-foreground">School average</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Homework Completed</CardTitle>
                      <CheckCircle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{schoolAnalytics.totalHomeworkCompleted}</div>
                      <p className="text-xs text-muted-foreground">This {timeRange}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top 3 Classes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      Top 3 Classes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {schoolAnalytics.top3Classes && schoolAnalytics.top3Classes.length > 0 ? (
                      <div className="space-y-3">
                        {schoolAnalytics.top3Classes.map((classItem: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center text-white ${
                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-orange-600'
                              }`}>
                                {index + 1}
                              </span>
                              <span className="font-medium">{classItem.name}</span>
                            </div>
                            <span className="text-lg font-bold text-green-600">{classItem.avgScore}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-600">No classes found for this grade/subject</p>
                    )}
                    
                    <Button
                      onClick={handleViewLeaderboard}
                      className="mt-4 w-full"
                      variant="outline"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      View Full Leaderboard
                    </Button>
                  </CardContent>
                </Card>

                {/* Top Performers Per Class */}
                {schoolAnalytics.classLeaderboards && schoolAnalytics.classLeaderboards.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        Top 3 Performers Per Class
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {schoolAnalytics.classLeaderboards.map((classData: any) => (
                          <div key={classData.classId}>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-slate-700">{classData.className}</h4>
                              <span className="text-sm text-slate-500">Class Avg: {classData.classAverage}%</span>
                            </div>
                            
                            {classData.topPerformers && classData.topPerformers.length > 0 ? (
                              <div className="space-y-2 ml-4">
                                {classData.topPerformers.map((student: any, index: number) => (
                                  <div key={student.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white ${
                                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-orange-600'
                                      }`}>
                                        {index + 1}
                                      </span>
                                      <span className="text-sm font-medium">
                                        {student.firstName} {student.lastName}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        ({student.totalAssignments} assignments)
                                      </span>
                                    </div>
                                    <span className="text-sm font-bold text-blue-600">{student.avgScore}%</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 ml-4">No student data available</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No School Data</h3>
                  <p className="text-slate-600">School-wide analytics are not available at the moment.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}