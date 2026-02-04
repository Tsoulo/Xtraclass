import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Settings, 
  Activity,
  LogOut,
  Database,
  UserCheck,
  Heart,
  Webhook,
  Menu,
  RefreshCw,
  TrendingUp,
  School,
  MapPin,
  BarChart3,
  CreditCard,
  XCircle,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@/assets/xtraclass-logo-td.png";
import AdminSidebar from "@/components/AdminSidebar";
import AdminTopics from "@/components/AdminTopics";
import AdminAddLesson from "@/components/AdminAddLesson";
import AdminCalendar from "@/components/AdminCalendar";
import AdminSchools from "@/components/AdminSchools";
import AdminOrganizations from "@/components/AdminOrganizations";
import AdminPastPapers from "@/components/AdminPastPapers";
import AdminReportedIssues from "@/components/AdminReportedIssues";
import PromptBuilder from "@/pages/PromptBuilder";
import AdminSubscriptionSettings from "@/components/AdminSubscriptionSettings";
import AdminEmailTemplates from "@/components/AdminEmailTemplates";
import ImageCompare from "@/components/ImageCompare";

interface AdminStats {
  id: number;
  totalUsers: number;
  activeStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalTutors: number;
  totalAdmins: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  lastUpdatedAt: string;
  // Performance metrics
  dailyUserOnboarding: { date: string; count: number }[];
  dailySchoolOnboarding: { date: string; count: number }[];
  totalStudents: number;
  studentsByProvince: { province: string; count: number }[];
  // Subscription metrics
  subscriptionsByStatus: { status: string; count: number }[];
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  failedSubscriptions: number;
  monthlyRevenue: number;
  dailySubscriptions: { date: string; count: number }[];
  dailyCancellations: { date: string; count: number }[];
}

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  trial: '#3b82f6',
  cancelled: '#f59e0b',
  failed: '#ef4444',
  expired: '#6b7280',
  pending_parent_consent: '#8b5cf6'
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [pageData, setPageData] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    retry: 1,
  });

  const refreshStatsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/stats/refresh");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Stats Refreshed", description: "Dashboard statistics have been recalculated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to refresh statistics.", variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been securely logged out of the admin panel.",
      });
      setLocation('/admin');
    } catch (error) {
      toast({
        title: "Logout Error",
        description: "There was an issue logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (page: string, data?: any) => {
    setCurrentPage(page);
    setPageData(data);
  };

  if (!user || user.role !== 'admin') {
    setLocation('/admin');
    return null;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "syllabus":
        return (
          <AdminCalendar
            grade={pageData?.grade}
            subject={pageData?.subject}
            subjectName={pageData?.subjectName}
          />
        );
      case "topics":
        return (
          <AdminTopics
            grade={pageData?.grade}
            subject={pageData?.subject}
            subjectName={pageData?.subjectName}
          />
        );
      case "add-lesson":
        return (
          <AdminAddLesson
            grade={pageData?.grade}
            subject={pageData?.subject}
            subjectName={pageData?.subjectName}
          />
        );
      case "schools":
        return <AdminSchools />;
      case "organizations":
        return <AdminOrganizations />;
      case "past-papers":
        return <AdminPastPapers />;
      case "email-templates":
        return <AdminEmailTemplates />;
      case "reported-issues":
        return <AdminReportedIssues />;
      case "prompt-builder":
        return <PromptBuilder />;
      case "subscription-settings":
        return <AdminSubscriptionSettings />;
      case "image-compare":
        return <ImageCompare />;
      default:
        return (
          <div className="flex-1 p-4 lg:p-6">
            {/* Welcome Section */}
            <div className="mb-6 lg:mb-8 flex justify-between items-start">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-2">
                  Welcome back, {user.firstName}!
                </h2>
                <p className="text-sm lg:text-base text-slate-600">
                  Here's an overview of the XtraClass.ai platform status and key metrics.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshStatsMutation.mutate()}
                disabled={refreshStatsMutation.isPending}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshStatsMutation.isPending ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>

            {/* Stats Error State */}
            {statsError && (
              <Card className="border-red-200 bg-red-50 mb-6">
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-red-600">
                    Failed to load statistics. Click Refresh to try again.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
                  <CardTitle className="text-xs lg:text-sm font-medium text-slate-600">
                    Total Users
                  </CardTitle>
                  <Users className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />
                </CardHeader>
                <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
                  <div className="text-lg lg:text-2xl font-bold text-slate-900">
                    {statsLoading ? "..." : statsError ? "-" : (stats?.totalUsers ?? 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-green-600 mt-1 hidden sm:block">
                    {statsError ? "" : `+${stats?.newUsersThisMonth ?? 0} this month`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
                  <CardTitle className="text-xs lg:text-sm font-medium text-slate-600">
                    Active Students
                  </CardTitle>
                  <GraduationCap className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                </CardHeader>
                <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
                  <div className="text-lg lg:text-2xl font-bold text-slate-900">
                    {statsLoading ? "..." : statsError ? "-" : (stats?.activeStudents ?? 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 hidden sm:block">
                    {!statsError && "enrolled students"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
                  <CardTitle className="text-xs lg:text-sm font-medium text-slate-600">
                    Teachers
                  </CardTitle>
                  <BookOpen className="h-3 w-3 lg:h-4 lg:w-4 text-purple-600" />
                </CardHeader>
                <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
                  <div className="text-lg lg:text-2xl font-bold text-slate-900">
                    {statsLoading ? "..." : statsError ? "-" : (stats?.totalTeachers ?? 0)}
                  </div>
                  <p className="text-xs text-green-600 mt-1 hidden sm:block">
                    {statsError ? "" : `+${stats?.newUsersThisWeek ?? 0} this week`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2 p-3 lg:p-6">
                  <CardTitle className="text-xs lg:text-sm font-medium text-slate-600">
                    Parents
                  </CardTitle>
                  <Heart className="h-3 w-3 lg:h-4 lg:w-4 text-red-600" />
                </CardHeader>
                <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
                  <div className="text-lg lg:text-2xl font-bold text-slate-900">
                    {statsLoading ? "..." : statsError ? "-" : (stats?.totalParents ?? 0)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 hidden sm:block">
                    {!statsError && "registered parents"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Subscription Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6 lg:mb-8">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Active</span>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-green-800">
                    {statsLoading ? "..." : (stats?.activeSubscriptions ?? 0)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Trial</span>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-blue-800">
                    {statsLoading ? "..." : (stats?.trialSubscriptions ?? 0)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">Cancelled</span>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-amber-800">
                    {statsLoading ? "..." : (stats?.cancelledSubscriptions ?? 0)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-medium text-red-700">Failed</span>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-red-800">
                    {statsLoading ? "..." : (stats?.failedSubscriptions ?? 0)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">Revenue (MTD)</span>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-emerald-800">
                    R{statsLoading ? "..." : ((stats?.monthlyRevenue ?? 0) / 100).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
              {/* User Onboarding Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    User Onboarding Trend (30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="h-48 flex items-center justify-center text-slate-500">Loading...</div>
                  ) : stats?.dailyUserOnboarding?.length ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={stats.dailyUserOnboarding}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                        />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip 
                          labelFormatter={(d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                          formatter={(value: number) => [value, 'Users']}
                        />
                        <Area type="monotone" dataKey="count" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-500">No data</div>
                  )}
                  <div className="mt-2 text-center text-sm font-medium text-green-600">
                    Total: {stats?.dailyUserOnboarding?.reduce((sum, d) => sum + d.count, 0) ?? 0} new users
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Status Pie Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    Subscription Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="h-48 flex items-center justify-center text-slate-500">Loading...</div>
                  ) : stats?.subscriptionsByStatus?.length ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={stats.subscriptionsByStatus}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          label={({ status, count }) => `${status}: ${count}`}
                          labelLine={false}
                        >
                          {stats.subscriptionsByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [value, name.charAt(0).toUpperCase() + name.slice(1)]} />
                        <Legend 
                          formatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ')}
                          wrapperStyle={{ fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-500">No subscription data</div>
                  )}
                </CardContent>
              </Card>

              {/* Daily Subscriptions vs Cancellations Bar Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    New Subscriptions (30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="h-48 flex items-center justify-center text-slate-500">Loading...</div>
                  ) : stats?.dailySubscriptions?.length ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={stats.dailySubscriptions}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric' })}
                        />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip 
                          labelFormatter={(d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}
                          formatter={(value: number) => [value, 'New Subs']}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-500">No subscription data</div>
                  )}
                  <div className="mt-2 text-center text-sm font-medium text-blue-600">
                    Total: {stats?.dailySubscriptions?.reduce((sum, d) => sum + d.count, 0) ?? 0} new subscriptions
                  </div>
                </CardContent>
              </Card>

              {/* Cancellations Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <XCircle className="w-4 h-4 text-amber-600" />
                    Cancellations (30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="h-48 flex items-center justify-center text-slate-500">Loading...</div>
                  ) : stats?.dailyCancellations?.length ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={stats.dailyCancellations}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric' })}
                        />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip 
                          labelFormatter={(d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}
                          formatter={(value: number) => [value, 'Cancellations']}
                        />
                        <Area type="monotone" dataKey="count" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-500">No cancellations</div>
                  )}
                  <div className="mt-2 text-center text-sm font-medium text-amber-600">
                    Total: {stats?.dailyCancellations?.reduce((sum, d) => sum + d.count, 0) ?? 0} cancellations
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Geographic & Role Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
              {/* Students by Province */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    Students by Province
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="h-48 flex items-center justify-center text-slate-500">Loading...</div>
                  ) : stats?.studentsByProvince?.length ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={stats.studentsByProvince} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="province" type="category" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip formatter={(value: number) => [value, 'Students']} />
                        <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-500">No province data</div>
                  )}
                </CardContent>
              </Card>

              {/* School Onboarding Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <School className="w-4 h-4 text-blue-600" />
                    School Onboarding Trend (30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="h-48 flex items-center justify-center text-slate-500">Loading...</div>
                  ) : stats?.dailySchoolOnboarding?.length ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={stats.dailySchoolOnboarding}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                        />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip 
                          labelFormatter={(d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}
                          formatter={(value: number) => [value, 'Schools']}
                        />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-500">No data</div>
                  )}
                  <div className="mt-2 text-center text-sm font-medium text-blue-600">
                    Total: {stats?.dailySchoolOnboarding?.reduce((sum, d) => sum + d.count, 0) ?? 0} new schools
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-4 lg:gap-6 mb-6 lg:mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Common administrative tasks and tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Link href="/admin/webhook-test">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        data-testid="button-webhook-test"
                      >
                        <Webhook className="w-4 h-4 mr-2" />
                        Webhook Test Tool
                      </Button>
                    </Link>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Users className="w-4 h-4 mr-2" />
                      Manage Users
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Database className="w-4 h-4 mr-2" />
                      Database Management
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Role Permissions
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Settings className="w-4 h-4 mr-2" />
                      System Settings
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-4">
                    Advanced admin features coming soon
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Admin Notice */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-900 mb-1">
                      Administrative Access
                    </h3>
                    <p className="text-sm text-blue-700">
                      You have full administrative privileges on this platform. Use these permissions responsibly 
                      and ensure all actions comply with platform policies and security guidelines.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <AdminSidebar 
        onPageChange={handlePageChange} 
        currentPage={currentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
          <div className="px-4 lg:px-6">
            <div className="flex justify-between items-center h-14 lg:h-16">
              {/* Mobile Menu Button + Logo */}
              <div className="flex items-center gap-2 lg:gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden p-2"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="w-8 h-6 lg:w-10 lg:h-8 flex items-center justify-center">
                  <img 
                    src={logoImage} 
                    alt="XtraClass.ai Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                    Admin Dashboard
                  </h1>
                  <p className="text-xs lg:text-sm text-slate-500 hidden md:block">System Administration Portal</p>
                </div>
              </div>

              {/* User Info and Logout */}
              <div className="flex items-center gap-2 lg:gap-4">
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 hidden sm:flex">
                  <Shield className="w-3 h-3 mr-1" />
                  <span className="hidden md:inline">Administrator</span>
                  <span className="md:hidden">Admin</span>
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Render Current Page */}
        <div className="flex-1 overflow-auto">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}