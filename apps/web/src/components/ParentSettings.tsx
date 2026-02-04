import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Bell, Shield, Palette, Globe, Mail, Phone, Camera, Edit, Save, X, Settings } from "lucide-react";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";

interface ParentProfile {
  firstName: string;
  lastName: string;
  email: string;
  cellNumber: string;
  role: string;
  profilePhoto?: string;
  relationshipToChild?: string;
  emergencyContact?: string;
  workAddress?: string;
  occupation?: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  homeworkReminders: boolean;
  gradeUpdates: boolean;
  messageAlerts: boolean;
  weeklyReports: boolean;
  attendanceAlerts: boolean;
  parentTeacherConferences: boolean;
}

interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timeZone: string;
  dateFormat: string;
  gradeSystem: string;
}

export default function ParentSettings() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'app' | 'privacy'>('profile');
  const [isEditing, setIsEditing] = useState(false);

  // Sample parent data
  const [parentProfile, setParentProfile] = useState<ParentProfile>({
    firstName: "Michael",
    lastName: "Johnson", 
    email: "michael.johnson@email.com",
    cellNumber: "+27 82 555 0123",
    role: "parent",
    relationshipToChild: "Father",
    emergencyContact: "+27 82 555 0124",
    workAddress: "123 Business Park, Cape Town",
    occupation: "Software Engineer"
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: false,
    homeworkReminders: true,
    gradeUpdates: true,
    messageAlerts: true,
    weeklyReports: false,
    attendanceAlerts: true,
    parentTeacherConferences: true
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'light',
    language: 'English',
    timeZone: 'Africa/Johannesburg',
    dateFormat: 'DD/MM/YYYY',
    gradeSystem: 'Percentage'
  });

  const handleBack = () => {
    const previousRoute = localStorage.getItem('previousRoute');
    if (previousRoute && previousRoute !== '/parent-settings') {
      setLocation(previousRoute);
    } else {
      setLocation('/add-children'); // Default parent home
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    // In a real app, save to backend
    console.log('Profile saved:', parentProfile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values if needed
  };

  const updateNotificationSetting = (key: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateAppSetting = (key: keyof AppSettings, value: string) => {
    setAppSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Photo Section */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage src={parentProfile.profilePhoto} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-green-400 to-green-600 text-white">
              {parentProfile.firstName[0]}{parentProfile.lastName[0]}
            </AvatarFallback>
          </Avatar>
          {isEditing && (
            <Button
              size="sm"
              className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 bg-green-500 hover:bg-green-600"
            >
              <Camera className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-800">
            {parentProfile.firstName} {parentProfile.lastName}
          </h3>
          <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800">
            Parent
          </Badge>
        </div>
      </div>

      {/* Profile Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">First Name</label>
            <Input
              value={parentProfile.firstName}
              onChange={(e) => setParentProfile(prev => ({ ...prev, firstName: e.target.value }))}
              disabled={!isEditing}
              className="bg-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Last Name</label>
            <Input
              value={parentProfile.lastName}
              onChange={(e) => setParentProfile(prev => ({ ...prev, lastName: e.target.value }))}
              disabled={!isEditing}
              className="bg-white"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block flex items-center">
            <Mail className="w-4 h-4 mr-2" />
            Email Address
          </label>
          <Input
            type="email"
            value={parentProfile.email}
            onChange={(e) => setParentProfile(prev => ({ ...prev, email: e.target.value }))}
            disabled={!isEditing}
            className="bg-white"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block flex items-center">
            <Phone className="w-4 h-4 mr-2" />
            Cell Number
          </label>
          <Input
            value={parentProfile.cellNumber}
            onChange={(e) => setParentProfile(prev => ({ ...prev, cellNumber: e.target.value }))}
            disabled={!isEditing}
            className="bg-white"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Relationship to Child</label>
          <Select
            value={parentProfile.relationshipToChild}
            onValueChange={(value) => setParentProfile(prev => ({ ...prev, relationshipToChild: value }))}
            disabled={!isEditing}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Father">Father</SelectItem>
              <SelectItem value="Mother">Mother</SelectItem>
              <SelectItem value="Guardian">Guardian</SelectItem>
              <SelectItem value="Grandparent">Grandparent</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Emergency Contact</label>
          <Input
            value={parentProfile.emergencyContact}
            onChange={(e) => setParentProfile(prev => ({ ...prev, emergencyContact: e.target.value }))}
            disabled={!isEditing}
            className="bg-white"
            placeholder="Alternative contact number"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Occupation</label>
          <Input
            value={parentProfile.occupation}
            onChange={(e) => setParentProfile(prev => ({ ...prev, occupation: e.target.value }))}
            disabled={!isEditing}
            className="bg-white"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Work Address</label>
          <Input
            value={parentProfile.workAddress}
            onChange={(e) => setParentProfile(prev => ({ ...prev, workAddress: e.target.value }))}
            disabled={!isEditing}
            className="bg-white"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            className="flex-1 bg-green-500 hover:bg-green-600"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Communication Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <p className="font-medium text-slate-800">Email Notifications</p>
              <p className="text-sm text-slate-600">Receive updates via email</p>
            </div>
            <Switch
              checked={notificationSettings.emailNotifications}
              onCheckedChange={(checked) => updateNotificationSetting('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <p className="font-medium text-slate-800">SMS Notifications</p>
              <p className="text-sm text-slate-600">Receive updates via text message</p>
            </div>
            <Switch
              checked={notificationSettings.smsNotifications}
              onCheckedChange={(checked) => updateNotificationSetting('smsNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <p className="font-medium text-slate-800">Push Notifications</p>
              <p className="text-sm text-slate-600">Receive notifications on your device</p>
            </div>
            <Switch
              checked={notificationSettings.pushNotifications}
              onCheckedChange={(checked) => updateNotificationSetting('pushNotifications', checked)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Academic Updates</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <p className="font-medium text-slate-800">Homework Reminders</p>
              <p className="text-sm text-slate-600">Get notified about upcoming homework</p>
            </div>
            <Switch
              checked={notificationSettings.homeworkReminders}
              onCheckedChange={(checked) => updateNotificationSetting('homeworkReminders', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <p className="font-medium text-slate-800">Grade Updates</p>
              <p className="text-sm text-slate-600">Receive notifications when grades are posted</p>
            </div>
            <Switch
              checked={notificationSettings.gradeUpdates}
              onCheckedChange={(checked) => updateNotificationSetting('gradeUpdates', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <p className="font-medium text-slate-800">Attendance Alerts</p>
              <p className="text-sm text-slate-600">Get notified about attendance issues</p>
            </div>
            <Switch
              checked={notificationSettings.attendanceAlerts}
              onCheckedChange={(checked) => updateNotificationSetting('attendanceAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <p className="font-medium text-slate-800">Parent-Teacher Conferences</p>
              <p className="text-sm text-slate-600">Receive conference scheduling updates</p>
            </div>
            <Switch
              checked={notificationSettings.parentTeacherConferences}
              onCheckedChange={(checked) => updateNotificationSetting('parentTeacherConferences', checked)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Communication Alerts</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <p className="font-medium text-slate-800">Message Alerts</p>
              <p className="text-sm text-slate-600">Get notified about new messages from teachers</p>
            </div>
            <Switch
              checked={notificationSettings.messageAlerts}
              onCheckedChange={(checked) => updateNotificationSetting('messageAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <p className="font-medium text-slate-800">Weekly Reports</p>
              <p className="text-sm text-slate-600">Receive weekly progress summaries</p>
            </div>
            <Switch
              checked={notificationSettings.weeklyReports}
              onCheckedChange={(checked) => updateNotificationSetting('weeklyReports', checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <Palette className="w-5 h-5 mr-2" />
          Appearance
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Theme</label>
            <Select
              value={appSettings.theme}
              onValueChange={(value) => updateAppSetting('theme', value)}
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
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          Localization
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Language</label>
            <Select
              value={appSettings.language}
              onValueChange={(value) => updateAppSetting('language', value)}
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

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Time Zone</label>
            <Select
              value={appSettings.timeZone}
              onValueChange={(value) => updateAppSetting('timeZone', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Johannesburg">South Africa (CAT)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                <SelectItem value="America/New_York">New York (EST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Date Format</label>
            <Select
              value={appSettings.dateFormat}
              onValueChange={(value) => updateAppSetting('dateFormat', value)}
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

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Grade System</label>
            <Select
              value={appSettings.gradeSystem}
              onValueChange={(value) => updateAppSetting('gradeSystem', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Percentage">Percentage (0-100%)</SelectItem>
                <SelectItem value="Letter">Letter Grades (A-F)</SelectItem>
                <SelectItem value="Points">Points (1-7)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Privacy & Security
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h4 className="font-medium text-slate-800 mb-2">Data Sharing</h4>
            <p className="text-sm text-slate-600 mb-3">
              Control how your child's academic information is shared with other parents and teachers.
            </p>
            <Button variant="outline" className="w-full">
              Manage Data Sharing
            </Button>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h4 className="font-medium text-slate-800 mb-2">Account Security</h4>
            <p className="text-sm text-slate-600 mb-3">
              Change your password and manage two-factor authentication.
            </p>
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
              <Button variant="outline" className="w-full">
                Setup Two-Factor Authentication
              </Button>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h4 className="font-medium text-slate-800 mb-2">Export Data</h4>
            <p className="text-sm text-slate-600 mb-3">
              Download a copy of your child's academic records and progress reports.
            </p>
            <Button variant="outline" className="w-full">
              Request Data Export
            </Button>
          </div>

          <div className="p-4 bg-white rounded-xl border border-red-200 bg-red-50">
            <h4 className="font-medium text-red-800 mb-2">Danger Zone</h4>
            <p className="text-sm text-red-600 mb-3">
              Permanently delete your account and all associated data.
            </p>
            <Button variant="destructive" className="w-full">
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 md:pt-16">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-2xl border-b border-white/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-slate-800">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* Tab Navigation */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/30 mb-6">
          <div className="flex overflow-x-auto">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'app', label: 'App Settings', icon: Settings },
              { id: 'privacy', label: 'Privacy', icon: Shield }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-4 px-6 font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-green-600 border-b-2 border-green-500 bg-green-50'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/30 p-6">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'app' && renderAppTab()}
          {activeTab === 'privacy' && renderPrivacyTab()}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}