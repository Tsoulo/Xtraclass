import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { buildApiUrl } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";

export interface TopicFeedback {
  id: number;
  studentId: number;
  topicId: number;
  subject: string;
  grade: string;
  strengths: string[];
  improvements: string[];
  lastScore: number | null;
  lastTotalMarks: number | null;
  lastPercentage: number | null;
  sourceType: string;
  sourceId: number;
  updatedAt: string;
  createdAt: string;
}

export function useTopicFeedback(studentId: number, topicId: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['/api/students', studentId, 'topics', topicId, 'feedback'],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/students/${studentId}/topics/${topicId}/feedback`);
        return response;
      } catch (error) {
        // If it's a 404, return null instead of throwing
        if (error instanceof Error && error.message.includes('404')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!user && !!studentId && !!topicId,
    retry: 1,
    staleTime: 0, // Always fetch fresh data 
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchInterval: 10000, // Check for updates every 10 seconds
  });
}

export function useTopicFeedbackBySubject(studentId: number, subject: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['/api/students', studentId, 'feedback'],
    queryFn: async () => {
      const response = await fetch(buildApiUrl(`/api/students/${studentId}/feedback?subject=${subject}`), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch topic feedback');
      }
      return response.json();
    },
    enabled: !!user && !!studentId && !!subject,
    retry: 1,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}