import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface Notification {
  id: number;
  userId: number;
  type: string;
  itemId: number;
  title: string;
  message: string;
  isRead: boolean;
  itemDate: string;
  createdAt: string;
  readAt?: string;
}

export function useNotificationCount() {
  return useQuery<{ unreadCount: number }>({
    queryKey: ['/api/notifications/count'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useNotifications(limit = 50, offset = 0) {
  return useQuery<Notification[]>({
    queryKey: ['/api/notifications', { limit, offset }],
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      return apiRequest('/api/notifications/read-all', {
        method: 'PUT',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });
}