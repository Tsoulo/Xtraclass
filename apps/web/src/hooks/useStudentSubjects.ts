import { useQuery } from '@tanstack/react-query';
import { buildApiUrl } from '@/lib/api';
import { authService } from '@/lib/auth';

export function useStudentSubjects() {
  return useQuery({
    queryKey: ['/api/student/subjects'],
    queryFn: async () => {
      const token = authService.getToken();
      const response = await fetch(buildApiUrl('/api/student/subjects'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || errorData.message || 'Failed to fetch subjects') as any;
        error.status = response.status;
        error.requiresSubscription = errorData.requiresSubscription;
        error.data = errorData;
        throw error;
      }
      
      return response.json() as string[];
    }
  });
}