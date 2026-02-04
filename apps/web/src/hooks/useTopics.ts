import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import type { Topic, Theme } from "@shared/schema";

export interface TopicWithThemes extends Topic {
  themes: Theme[];
}

// Hook for fetching topics by grade and subject
export function useTopics(grade?: string, subject?: string) {
  return useQuery({
    queryKey: ['/api/topics', grade, subject],
    queryFn: () => apiRequest(`/api/topics?grade=${grade}&subject=${subject}`) as Promise<Topic[]>,
    enabled: !!(grade && subject),
  });
}

// Hook for fetching themes for multiple topics
export function useThemes(topics: Topic[]) {
  const topicIds = topics.map(t => t.id).sort().join(',');
  
  return useQuery({
    queryKey: ['/api/themes', topicIds],
    queryFn: async () => {
      if (!topics.length) return [];
      
      const themesPromises = topics.map(async (topic) => {
        const themes = await apiRequest(`/api/themes?topicId=${topic.id}`) as Theme[];
        return { topicId: topic.id, themes };
      });
      
      const results = await Promise.all(themesPromises);
      return results.flatMap(result => result.themes);
    },
    enabled: topics.length > 0,
  });
}

// Hook for getting topics with their themes combined
export function useTopicsWithThemes(grade?: string, subject?: string): {
  topics: TopicWithThemes[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data: topics = [], isLoading: topicsLoading, error: topicsError } = useTopics(grade, subject);
  const { data: allThemes = [], isLoading: themesLoading } = useThemes(topics);

  const topicsWithThemes: TopicWithThemes[] = topics.map(topic => ({
    ...topic,
    themes: allThemes.filter(theme => theme.topicId === topic.id)
  }));

  return {
    topics: topicsWithThemes,
    isLoading: topicsLoading || themesLoading,
    error: topicsError
  };
}

// Hook for topic mutations (admin only)
export function useTopicMutations(grade?: string, subject?: string) {
  const queryClient = useQueryClient();

  const createTopic = useMutation({
    mutationFn: async (topicData: { name: string; description: string }) => {
      const response = await apiRequest('/api/topics', {
        method: 'POST',
        body: JSON.stringify({
          ...topicData,
          grade,
          subject
        })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/topics', grade, subject] });
    },
  });

  const updateTopic = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; name: string; description: string }) => {
      const response = await apiRequest(`/api/topics/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/topics', grade, subject] });
    },
  });

  const deleteTopic = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/topics/${id}`, {
        method: 'DELETE'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/topics', grade, subject] });
    },
  });

  return { createTopic, updateTopic, deleteTopic };
}

// Hook for theme mutations (admin only)
export function useThemeMutations(topics: Topic[]) {
  const queryClient = useQueryClient();

  const createTheme = useMutation({
    mutationFn: async (themeData: { name: string; description: string; topicId: number }) => {
      const response = await apiRequest('/api/themes', {
        method: 'POST',
        body: JSON.stringify(themeData)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
    },
  });

  const updateTheme = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; name: string; description: string }) => {
      const response = await apiRequest(`/api/themes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
    },
  });

  const deleteTheme = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/themes/${id}`, {
        method: 'DELETE'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
    },
  });

  return { createTheme, updateTheme, deleteTheme };
}