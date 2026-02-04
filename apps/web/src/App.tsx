import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import React, { useEffect } from "react";
import Landing from "@/pages/Landing";
import LandingSlider from "@/components/LandingSlider";
import Registration from "@/pages/Registration";
import ParentDashboard from "@/pages/ParentDashboard";
import SignIn from "@/pages/SignIn";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsConditions from "@/pages/TermsConditions";
import About from "@/pages/About";
import Messages from "@/pages/Messages";
import StudentDashboard from "@/components/StudentDashboard";
import StudentHomework from "@/pages/StudentHomework";
import StudentHomeworkCalendar from "@/components/StudentHomeworkCalendar";
import StudentAssessments from "@/components/StudentAssessments";
import GenerateLesson from "@/components/GenerateLesson";
import Settings from "@/components/Settings";
import ParentSettings from "@/components/ParentSettings";
import AddChildren from "@/components/AddChildren";
import ViewClass from "@/components/ViewClass";
import SubjectDetails from "@/components/SubjectDetails";
import Leaderboard from "@/components/Leaderboard";
import Calendar from "@/components/Calendar";
import StudentCalendar from "@/components/StudentCalendar";
import HomeworkFeedbackPage from "@/pages/HomeworkFeedback";
import TutorialExerciseFeedback from "@/pages/TutorialExerciseFeedback";
import ExerciseFeedback from "@/pages/ExerciseFeedback";
import TutorialFlowPage from "@/pages/TutorialFlowPage";
import AttemptHomeworkPage from "@/pages/AttemptHomework";
import AttemptExercisePage from "@/pages/AttemptExercise";
import BaselineAssessmentAttemptPage from "@/pages/BaselineAssessmentAttempt";
import BaselineFeedbackPage from "@/pages/BaselineFeedback";
import AITestingPage from "@/pages/AITestingPage";
import ExerciseGenerationPage from "@/pages/ExerciseGenerationPage";
import ParentAnalytics from "@/components/ParentAnalytics";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import PromptTester from "@/pages/PromptTester";
import PromptBuilder from "@/pages/PromptBuilder";
import StudentManagement from "@/pages/StudentManagement";
import StudentProfile from "@/pages/StudentProfile";
import StudentAnalytics from "@/pages/StudentAnalytics";
import ClassSchedule from "@/pages/ClassSchedule";
import ClassAssignments from "@/pages/ClassAssignments";
import StudentSettings from "@/components/StudentSettings";
import TeacherAnalytics from "@/pages/TeacherAnalytics";
import Subscription from "@/pages/Subscription";
import SubscriptionCallback from "@/pages/SubscriptionCallback";
import StudentConsentRequest from "@/pages/StudentConsentRequest";
import ParentConsent from "@/pages/ParentConsent";
import VerifyEmail from "@/pages/VerifyEmail";
import WebhookTest from "@/pages/WebhookTest";
import PastPaperQuestions from "@/pages/PastPaperQuestions";
import AttemptPastPaperPage from "@/pages/AttemptPastPaper";
import PastPaperFeedbackPage from "@/pages/PastPaperFeedback";
import VoiceTutor from "@/pages/VoiceTutor";
import StudentTutoringSessions from "@/pages/StudentTutoringSessions";
import TutorSessionsDashboard from "@/pages/TutorSessionsDashboard";
import TutorVideoCall from "@/pages/TutorVideoCall";
import NotFound from "@/pages/not-found";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/signin");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// Public Route Component (redirects if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  console.log('[PublicRoute] isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('[PublicRoute] Redirecting authenticated user...');
      if (user?.role === 'admin') {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  if (isLoading) {
    console.log('[PublicRoute] Showing loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    console.log('[PublicRoute] Authenticated, returning null (redirecting)');
    return null;
  }

  console.log('[PublicRoute] Rendering children');
  return <>{children}</>;
}

// Admin Route Component (for admin-only access)
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation("/admin");
      } else if (user?.role !== 'admin') {
        setLocation("/dashboard"); // Redirect non-admin users to their dashboard
      }
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}

// Admin Login Route Component (redirects admin users if already authenticated)
function AdminLoginRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'admin') {
      setLocation("/admin/dashboard");
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  if (isAuthenticated && user?.role === 'admin') {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Public routes - redirect to dashboard if authenticated */}
      <Route path="/">
        <PublicRoute>
          <Landing />
        </PublicRoute>
      </Route>
      <Route path="/signin">
        <PublicRoute>
          <SignIn />
        </PublicRoute>
      </Route>
      <Route path="/forgot-password">
        <PublicRoute>
          <ForgotPassword />
        </PublicRoute>
      </Route>
      <Route path="/reset-password/:token">
        <PublicRoute>
          <ResetPassword />
        </PublicRoute>
      </Route>
      <Route path="/landing">
        <PublicRoute>
          <Landing />
        </PublicRoute>
      </Route>
      <Route path="/home">
        <PublicRoute>
          <LandingSlider />
        </PublicRoute>
      </Route>
      <Route path="/about">
        <PublicRoute>
          <About />
        </PublicRoute>
      </Route>
      <Route path="/register">
        <PublicRoute>
          <Registration />
        </PublicRoute>
      </Route>
      <Route path="/register/:rest*">
        <PublicRoute>
          <Registration />
        </PublicRoute>
      </Route>

      {/* Admin routes */}
      <Route path="/admin">
        <AdminLoginRoute>
          <AdminLogin />
        </AdminLoginRoute>
      </Route>
      <Route path="/admin/dashboard">
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      </Route>
      <Route path="/admin/prompt-tester/:id">
        <AdminRoute>
          <PromptTester />
        </AdminRoute>
      </Route>
      <Route path="/prompt-builder">
        <AdminRoute>
          <PromptBuilder />
        </AdminRoute>
      </Route>
      <Route path="/admin/webhook-test">
        <AdminRoute>
          <WebhookTest />
        </AdminRoute>
      </Route>
      <Route path="/admin/past-papers/:id/questions">
        <AdminRoute>
          <PastPaperQuestions />
        </AdminRoute>
      </Route>

      {/* Protected routes - require authentication */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <ParentDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/add-children">
        <ProtectedRoute>
          <AddChildren />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/student/:childId">
        {(params) => (
          <ProtectedRoute>
            <StudentDashboard childId={params.childId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/student/:childId/homework">
        {(params) => (
          <ProtectedRoute>
            <StudentHomework childId={params.childId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/view-class">
        <ProtectedRoute>
          <ViewClass />
        </ProtectedRoute>
      </Route>
      <Route path="/subject-details">
        <ProtectedRoute>
          <SubjectDetails />
        </ProtectedRoute>
      </Route>
      <Route path="/leaderboard">
        <ProtectedRoute>
          <Leaderboard />
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute>
          <TeacherAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/student-management/:classId">
        {(params) => (
          <ProtectedRoute>
            <StudentManagement classId={params.classId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/student-profile/:studentId">
        {(params) => (
          <ProtectedRoute>
            <StudentProfile studentId={params.studentId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/student-profile/:studentId/:classId">
        {(params) => (
          <ProtectedRoute>
            <StudentProfile studentId={params.studentId} classId={params.classId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/student-analytics/:studentId/:classId">
        {(params) => (
          <ProtectedRoute>
            <StudentAnalytics studentId={params.studentId} classId={params.classId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/student-assessments/:studentId">
        {(params) => (
          <ProtectedRoute>
            <StudentAssessments studentId={params.studentId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/generate-lesson/:studentId">
        {(params) => (
          <ProtectedRoute>
            <GenerateLesson studentId={params.studentId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/parent-settings">
        <ProtectedRoute>
          <ParentSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/student-settings">
        <ProtectedRoute>
          <StudentSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/calendar">
        <ProtectedRoute>
          <Calendar />
        </ProtectedRoute>
      </Route>
      <Route path="/parent-analytics">
        <ProtectedRoute>
          <ParentAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/student-calendar">
        <ProtectedRoute>
          <StudentCalendar />
        </ProtectedRoute>
      </Route>
      <Route path="/homework-feedback">
        <ProtectedRoute>
          <HomeworkFeedbackPage />
        </ProtectedRoute>
      </Route>
      <Route path="/tutorial-flow">
        <ProtectedRoute>
          <TutorialFlowPage />
        </ProtectedRoute>
      </Route>
      <Route path="/tutorial-feedback">
        <ProtectedRoute>
          <TutorialExerciseFeedback />
        </ProtectedRoute>
      </Route>
      <Route path="/exercise-feedback">
        <ProtectedRoute>
          <ExerciseFeedback />
        </ProtectedRoute>
      </Route>
      <Route path="/attempt-homework">
        <ProtectedRoute>
          <AttemptHomeworkPage />
        </ProtectedRoute>
      </Route>
      <Route path="/attempt-exercise">
        <ProtectedRoute>
          <AttemptExercisePage />
        </ProtectedRoute>
      </Route>
      <Route path="/baseline-assessment">
        <ProtectedRoute>
          <BaselineAssessmentAttemptPage />
        </ProtectedRoute>
      </Route>
      <Route path="/attempt-past-paper">
        <ProtectedRoute>
          <AttemptPastPaperPage />
        </ProtectedRoute>
      </Route>
      <Route path="/past-paper-feedback">
        <ProtectedRoute>
          <PastPaperFeedbackPage />
        </ProtectedRoute>
      </Route>
      <Route path="/baseline-feedback">
        <ProtectedRoute>
          <BaselineFeedbackPage />
        </ProtectedRoute>
      </Route>
      <Route path="/voice-tutor">
        <ProtectedRoute>
          <VoiceTutor />
        </ProtectedRoute>
      </Route>
      <Route path="/student-tutoring">
        <ProtectedRoute>
          <StudentTutoringSessions />
        </ProtectedRoute>
      </Route>
      <Route path="/tutor-sessions">
        <ProtectedRoute>
          <TutorSessionsDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/tutor-call/:id">
        {(params) => (
          <ProtectedRoute>
            <TutorVideoCall />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/ai-testing">
        <ProtectedRoute>
          <AITestingPage />
        </ProtectedRoute>
      </Route>
      <Route path="/generate-exercises">
        <ProtectedRoute>
          <ExerciseGenerationPage />
        </ProtectedRoute>
      </Route>
      <Route path="/student-homework">
        <ProtectedRoute>
          <StudentHomeworkCalendar />
        </ProtectedRoute>
      </Route>
      <Route path="/student-homework/:childId">
        {(params) => (
          <ProtectedRoute>
            <StudentHomework childId={params.childId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/schedule/:classId">
        {(params) => (
          <ProtectedRoute>
            <ClassSchedule classId={params.classId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/students/:classId">
        {(params) => (
          <ProtectedRoute>
            <StudentManagement classId={params.classId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/assignments/:classId">
        {(params) => (
          <ProtectedRoute>
            <ClassAssignments classId={params.classId} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/messages">
        <ProtectedRoute>
          <Messages />
        </ProtectedRoute>
      </Route>
      <Route path="/subscription">
        <ProtectedRoute>
          <Subscription />
        </ProtectedRoute>
      </Route>
      <Route path="/subscription/request-consent">
        <ProtectedRoute>
          <StudentConsentRequest />
        </ProtectedRoute>
      </Route>
      <Route path="/subscription/callback">
        <ProtectedRoute>
          <SubscriptionCallback />
        </ProtectedRoute>
      </Route>
      <Route path="/parent-consent/:token">
        <ParentConsent />
      </Route>
      <Route path="/verify-email/:token">
        <VerifyEmail />
      </Route>
      <Route path="/privacy">
        <PrivacyPolicy />
      </Route>
      <Route path="/terms">
        <TermsConditions />
      </Route>
      {/* Fallback to 404 - catch all unmatched routes */}
      <Route path="/:rest*">
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      console.error('[ErrorBoundary] Caught error:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-4">Please refresh the page</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default App;
