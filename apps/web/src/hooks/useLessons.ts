import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface CalendarLesson {
  id: number;
  date: string;
  grade: string;
  subject: string;
  topicId: number;
  themeId: number;
  lessonTitle: string;
  description: string;
  videoLink?: string;
  objectives?: string[];
  activities?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateLessonData {
  date: string;
  grade: string;
  subject: string;
  topicId: number;
  themeId: number;
  lessonTitle: string;
  description: string;
  videoLink?: string;
  objectives?: string[];
  activities?: any;
}

export function useLessons(date?: string, grade?: string, subject?: string) {
  return useQuery({
    queryKey: ["lessons", date, grade, subject],
    queryFn: () => {
      if (!date || !grade || !subject) {
        return [];
      }
      
      return apiRequest(
        `/api/syllabus-calendar?date=${encodeURIComponent(date)}&grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}`
      ) as Promise<CalendarLesson[]>;
    },
    enabled: Boolean(date && grade && subject),
  });
}

export function useMonthlyLessons(year: number, month: number, grade?: string, subject?: string) {
  return useQuery({
    queryKey: ["monthly-lessons", year, month, grade, subject],
    queryFn: () => {
      if (!grade || !subject) {
        return [];
      }
      
      // Get all lessons for the month using local date formatting
      const startDateObj = new Date(year, month, 1);
      const endDateObj = new Date(year, month + 1, 0);
      
      const startDate = `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, '0')}-${String(startDateObj.getDate()).padStart(2, '0')}`;
      const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;
      
      return apiRequest(
        `/api/syllabus-calendar?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}`
      ) as Promise<CalendarLesson[]>;
    },
    enabled: Boolean(grade && subject),
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lessonData: CreateLessonData): Promise<CalendarLesson> => {
      const response = await apiRequest("/api/syllabus-calendar", {
        method: "POST",
        body: JSON.stringify(lessonData)
      });
      return response;
    },
    onSuccess: (newLesson) => {
      // Invalidate all lesson-related queries
      queryClient.invalidateQueries({
        queryKey: ["lessons"]
      });
      
      // Invalidate monthly lessons for the month containing this lesson
      const lessonDate = new Date(newLesson.date);
      queryClient.invalidateQueries({
        queryKey: ["monthly-lessons", lessonDate.getFullYear(), lessonDate.getMonth(), newLesson.grade, newLesson.subject]
      });
      
      // Also invalidate all monthly lessons to be safe
      queryClient.invalidateQueries({
        queryKey: ["monthly-lessons"]
      });
    },
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...lessonData }: Partial<CalendarLesson> & { id: number }) => {
      const response = await apiRequest(`/api/syllabus-calendar/${id}`, {
        method: "PUT",
        body: JSON.stringify(lessonData)
      });
      return response;
    },
    onSuccess: (updatedLesson) => {
      queryClient.invalidateQueries({
        queryKey: ["lessons", updatedLesson.date, updatedLesson.grade, updatedLesson.subject]
      });
      queryClient.invalidateQueries({
        queryKey: ["lessons"]
      });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/syllabus-calendar/${id}`, {
        method: "DELETE"
      });
      return id;
    },
    onSuccess: () => {
      // Invalidate all lesson-related queries
      queryClient.invalidateQueries({
        queryKey: ["lessons"]
      });
      
      // Also invalidate all monthly lessons
      queryClient.invalidateQueries({
        queryKey: ["monthly-lessons"]
      });
    },
  });
}