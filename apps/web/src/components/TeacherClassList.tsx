import { useState } from "react";
import { useClasses } from "@/hooks/useClasses";
import { Loader2, BookOpen, Users, Calendar, Clock, CheckCircle, Share, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Class } from "@shared/schema";

// Extend Class type to include actual student count, assessment count, and class average
type ClassWithStudentCount = Class & {
  actualStudentCount?: number;
  actualAssessmentCount?: number;
  classAverageScore?: number;
};

type RecentActivity = {
  type: 'submission' | 'lesson';
  message: string;
  timeAgo: string;
  count?: number;
};

// Recent Activity Component
function RecentActivitySection({ classId }: { classId: number }) {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['recent-activity', classId],
    queryFn: () => apiRequest(`/api/classes/${classId}/recent-activity`),
    staleTime: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
            <span className="text-gray-400">Loading activity...</span>
          </div>
        </div>
      </div>
    );
  }

  const activities = activity?.activities || [];

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
      <div className="space-y-2">
        {activities.length === 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <span className="text-gray-500">No recent activity</span>
          </div>
        ) : (
          activities.slice(0, 2).map((item: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${item.type === 'submission' ? 'bg-green-400' : 'bg-blue-400'}`}></div>
              <span className="text-gray-600">{item.message}</span>
              <span className="text-gray-400 ml-auto">{item.timeAgo}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function TeacherClassList() {
  const { data: classes, isLoading, error } = useClasses() as { 
    data: ClassWithStudentCount[] | undefined, 
    isLoading: boolean, 
    error: any 
  };
  const [, setLocation] = useLocation();
  const [loadingAssessments, setLoadingAssessments] = useState<number | null>(null);

  const handleAssessmentClick = async (classId: number) => {
    setLoadingAssessments(classId);
    // Add a small delay to show the loading state
    setTimeout(() => {
      setLocation(`/dashboard/assignments/${classId}`);
      setLoadingAssessments(null);
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="loader scale-75"></div>
      </div>
    );
  }

  if (error) {
    // Check if this is a subscription error
    const isSubscriptionError = error?.status === 403 && error?.data?.requiresSubscription;
    
    if (isSubscriptionError) {
      // Redirect to subscription page
      setLocation('/subscription');
      return null;
    }
    
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-8 w-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium mb-2 text-gray-800">Unable to load classes</h3>
        <p className="text-gray-600">Please try again later</p>
      </div>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-8 w-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium mb-2 text-gray-800">No classes yet</h3>
        <p className="text-gray-600">Create your first class to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {classes.map((classItem) => (
        <div key={classItem.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h3 className="font-bold text-xl text-gray-800">{classItem.name}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                {classItem.subject} • Grade {classItem.grade}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{classItem.maxStudents || 30} max students</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200">
                    {classItem.classCode}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{classItem.actualStudentCount || 0}</div>
              <div className="text-xs text-gray-500">Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{classItem.actualAssessmentCount ?? 0}</div>
              <div className="text-xs text-gray-500">Assessments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {classItem.classAverageScore ? `${classItem.classAverageScore}%` : '0%'}
              </div>
              <div className="text-xs text-gray-500">Avg Score</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              onClick={() => setLocation(`/dashboard/students/${classItem.id}`)}
            >
              <Users className="h-4 w-4 mr-2" />
              Students
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
              onClick={() => handleAssessmentClick(classItem.id)}
              disabled={loadingAssessments === classItem.id}
            >
              {loadingAssessments === classItem.id ? (
                <div className="flex items-center justify-center">
                  <div className="loader scale-[0.2] mr-2"></div>
                </div>
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Assessments
            </Button>
          </div>

          {/* Recent Activity */}
          <RecentActivitySection classId={classItem.id} />
        </div>
      ))}
    </div>
  );
}