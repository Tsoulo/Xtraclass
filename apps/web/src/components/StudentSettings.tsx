import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, Bell, Palette, Shield, School, GraduationCap, Users, Phone, Mail, MapPin, Calendar, Award, BookOpen, Save, Edit3, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

interface StudentProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  cellNumber: string | null;
  role: string;
  points: number;
  gradeLevel: string | null;
  schoolName: string | null;
  parentContact: string | null;
  studentId: string | null;
  subjects: string[];
  parentInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    cellNumber: string;
    relationshipToChild: string;
  };
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  homeworkReminders: boolean;
  gradeUpdates: boolean;
  messageAlerts: boolean;
  weeklyReports: boolean;
}

interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timeZone: string;
  dateFormat: string;
  gradeSystem: string;
}

export default function StudentSettings() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'app' | 'privacy'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showParentContact, setShowParentContact] = useState(false);

  // Fetch student profile data
  const { data: studentProfile, isLoading } = useQuery({
    queryKey: ['/api/student/profile'],
    enabled: !!user && user.role === 'student'
  });

  // Fetch student subjects
  const { data: studentSubjects } = useQuery({
    queryKey: ['/api/student/subjects'],
    enabled: !!user && user.role === 'student'
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: false,
    homeworkReminders: true,
    gradeUpdates: true,
    messageAlerts: true,
    weeklyReports: false
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'light',
    language: 'English',
    timeZone: 'Africa/Johannesburg',
    dateFormat: 'DD/MM/YYYY',
    gradeSystem: 'Percentage'
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<StudentProfile>) => 
      apiRequest('/api/student/profile', {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student/profile'] });
      setIsEditing(false);
    }
  });

  const handleBack = () => {
    const previousRoute = localStorage.getItem('previousRoute');
    if (previousRoute && previousRoute !== '/student-settings') {
      setLocation(previousRoute);
    } else {
      setLocation('/dashboard');
    }
  };

  const handleSave = () => {
    if (studentProfile) {
      updateProfileMutation.mutate(studentProfile);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    queryClient.invalidateQueries({ queryKey: ['/api/student/profile'] });
  };

  const updateNotificationSetting = (key: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAppSettingChange = (key: keyof AppSettings, value: string) => {
    setAppSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const formatSubjectName = (subject: string) => {
    return subject.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'app', label: 'App Settings', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Shield }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pt-16">
        <div className="animate-pulse space-y-4 p-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const profile = studentProfile as StudentProfile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pt-16">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"></div>
        <div className="relative px-6 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>

          {/* Profile Header */}
          <div className="flex items-center space-x-4">
            <Avatar className="w-20 h-20 border-4 border-white/20">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.firstName}${profile?.lastName}`} />
              <AvatarFallback className="text-xl font-bold">
                {profile?.firstName?.[0]}{profile?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">
                {profile?.firstName} {profile?.lastName}
              </h2>
              <p className="text-blue-100 text-sm">
                Grade {profile?.gradeLevel} Student
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                  <Award className="w-3 h-3 mr-1" />
                  {profile?.points || 0} Points
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                  <School className="w-3 h-3 mr-1" />
                  {profile?.schoolName || 'No School'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 bg-white shadow-sm z-10 px-6 py-4">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-6 py-6 space-y-6">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-500" />
                  <span>Personal Information</span>
                </CardTitle>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={updateProfileMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile?.firstName || ''}
                      disabled={!isEditing}
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile?.lastName || ''}
                      disabled={!isEditing}
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ''}
                      disabled={!isEditing}
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cellNumber">Cell Number</Label>
                    <Input
                      id="cellNumber"
                      value={profile?.cellNumber || ''}
                      disabled={!isEditing}
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Academic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-green-500" />
                  <span>Academic Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      value={profile?.studentId || 'Not Available'}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gradeLevel">Grade Level</Label>
                    <Input
                      id="gradeLevel"
                      value={profile?.gradeLevel || 'Not Available'}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schoolName">School</Label>
                    <Input
                      id="schoolName"
                      value={profile?.schoolName || 'Not Available'}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalPoints">Total Points</Label>
                    <Input
                      id="totalPoints"
                      value={`${profile?.points || 0} points`}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                </div>
                
                {/* Subjects */}
                <div className="space-y-2">
                  <Label>Enrolled Subjects</Label>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(studentSubjects) && studentSubjects.length > 0 ? (
                      studentSubjects.map((subject: string) => (
                        <Badge key={subject} variant="secondary" className="flex items-center space-x-1">
                          <BookOpen className="w-3 h-3" />
                          <span>{formatSubjectName(subject)}</span>
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No subjects enrolled</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parent/Guardian Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    <span>Parent/Guardian Information</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowParentContact(!showParentContact)}
                  >
                    {showParentContact ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Show
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showParentContact ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parentContact">Parent Contact</Label>
                      <Input
                        id="parentContact"
                        value={profile?.parentContact || 'Not Available'}
                        disabled
                        className="bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                    {profile?.parentInfo && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="parentName">Parent Name</Label>
                          <Input
                            id="parentName"
                            value={`${profile.parentInfo.firstName} ${profile.parentInfo.lastName}`}
                            disabled
                            className="bg-gray-50 dark:bg-gray-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="parentEmail">Parent Email</Label>
                          <Input
                            id="parentEmail"
                            value={profile.parentInfo.email}
                            disabled
                            className="bg-gray-50 dark:bg-gray-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="relationship">Relationship</Label>
                          <Input
                            id="relationship"
                            value={profile.parentInfo.relationshipToChild || 'Not Specified'}
                            disabled
                            className="bg-gray-50 dark:bg-gray-800"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Click "Show" to view parent/guardian contact information
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-500" />
                <span>Notification Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* General Notifications */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">General Notifications</h3>
                <div className="space-y-3">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                    { key: 'smsNotifications', label: 'SMS Notifications', description: 'Receive notifications via SMS' },
                    { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive browser push notifications' }
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-gray-500">{description}</p>
                      </div>
                      <Switch
                        checked={notificationSettings[key as keyof NotificationSettings]}
                        onCheckedChange={(checked) => updateNotificationSetting(key as keyof NotificationSettings, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Academic Notifications */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Academic Notifications</h3>
                <div className="space-y-3">
                  {[
                    { key: 'homeworkReminders', label: 'Homework Reminders', description: 'Get reminded about upcoming homework deadlines' },
                    { key: 'gradeUpdates', label: 'Grade Updates', description: 'Notification when grades are posted' },
                    { key: 'messageAlerts', label: 'Message Alerts', description: 'New messages from teachers or classmates' },
                    { key: 'weeklyReports', label: 'Weekly Reports', description: 'Weekly progress summary reports' }
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-gray-500">{description}</p>
                      </div>
                      <Switch
                        checked={notificationSettings[key as keyof NotificationSettings]}
                        onCheckedChange={(checked) => updateNotificationSetting(key as keyof NotificationSettings, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'app' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-blue-500" />
                <span>App Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={appSettings.theme}
                    onValueChange={(value) => handleAppSettingChange('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={appSettings.language}
                    onValueChange={(value) => handleAppSettingChange('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Afrikaans">Afrikaans</SelectItem>
                      <SelectItem value="Zulu">Zulu</SelectItem>
                      <SelectItem value="Xhosa">Xhosa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeZone">Time Zone</Label>
                  <Select
                    value={appSettings.timeZone}
                    onValueChange={(value) => handleAppSettingChange('timeZone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Johannesburg">South Africa (SAST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={appSettings.dateFormat}
                    onValueChange={(value) => handleAppSettingChange('dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gradeSystem">Grade System</Label>
                  <Select
                    value={appSettings.gradeSystem}
                    onValueChange={(value) => handleAppSettingChange('gradeSystem', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Percentage">Percentage (%)</SelectItem>
                      <SelectItem value="Letter">Letter Grades (A-F)</SelectItem>
                      <SelectItem value="Points">Points System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'privacy' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <span>Privacy & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Data Privacy</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your personal information is protected and only shared with authorized school personnel and your parents/guardians.
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">Account Security</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your account is secured with encrypted passwords and secure authentication.
                  </p>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-2">Academic Records</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Your grades and academic progress are private and only accessible to you, your teachers, and your parents/guardians.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}