import { useQuery } from '@tanstack/react-query';
import { buildApiUrl } from '@/lib/api';
import { authService } from '@/lib/auth';

export interface TopicProgress {
  id: number;
  name: string;
  description: string;
  grade: string;
  subject: string;
  createdAt: string;
  progress: number;
  exerciseProgress: number;
  homeworkProgress: number;
  mastery: string;
  lastStudied: string;
}

export interface SubjectAggregates {
  totalCompleted: number;
  totalAvailable: number;
  topicsStarted: number;
  totalTopics: number;
  percentComplete: number;
}

export interface TopicProgressResponse {
  topics: TopicProgress[];
  subjectAggregates: SubjectAggregates;
}

export function useTopicProgress(subject: string) {
  return useQuery({
    queryKey: ['/api/student/topics', subject],
    queryFn: async () => {
      const token = authService.getToken();
      const response = await fetch(buildApiUrl(`/api/student/topics/${subject}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch topic progress');
      }
      
      return response.json() as TopicProgressResponse;
    },
    enabled: !!subject, // Only run when subject is provided
    staleTime: 0, // Force fresh data every time for topic progress
    refetchOnMount: true // Always refetch when component mounts
  });
}