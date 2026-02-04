import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Class, InsertClass } from "@shared/schema";

export function useClasses() {
  return useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: true,
    retry: false // Don't retry on auth errors
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (classData: Omit<InsertClass, "teacherId" | "classCode">) => {
      console.log("Creating class with data:", classData);
      return await apiRequest("/api/classes", {
        method: "POST",
        body: JSON.stringify(classData),
        headers: {
          "Content-Type": "application/json"
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Success",
        description: "Class created successfully"
      });
    },
    onError: (error: Error) => {
      console.error("Class creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create class",
        variant: "destructive"
      });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<InsertClass> }) => {
      return await apiRequest(`/api/classes/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
        headers: {
          "Content-Type": "application/json"
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Success",
        description: "Class updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update class",
        variant: "destructive"
      });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/classes/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Success",
        description: "Class deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete class",
        variant: "destructive"
      });
    },
  });
}