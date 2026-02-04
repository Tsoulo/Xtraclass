import { useQuery } from '@tanstack/react-query';
import { buildApiUrl } from '@/lib/api';
import { authService } from '@/lib/auth';

export interface TopicAnalysis {
  strengths: string[];
  weaknesses: string[];
  completedExercises: number;
  totalExercises: number;
  completedHomework: number;
  totalHomework: number;
  aiTutorialSuggestions: string[];
}

export function useTopicAnalysis(topicId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['/api/student/topics', topicId, 'analysis'],
    queryFn: async () => {
      const token = authService.getToken();
      const response = await fetch(buildApiUrl(`/api/student/topics/${topicId}/analysis`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch topic analysis');
      }
      
      return response.json() as TopicAnalysis;
    },
    enabled: enabled && !!topicId
  });
}