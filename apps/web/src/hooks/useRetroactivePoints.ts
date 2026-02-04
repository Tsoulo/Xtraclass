import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function useRetroactivePoints() {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/users/calculate-retroactive-points', {
        method: 'POST'
      });
      return response;
    },
    onSuccess: async (data) => {
      // Refresh user data to show updated points
      await refreshUser();
      
      if (data.retroactivePoints > 0) {
        toast({
          title: "Points Added!",
          description: `Added ${data.retroactivePoints} retroactive points. Total: ${data.totalPoints}`,
        });
      } else {
        toast({
          title: "Points Up to Date",
          description: "No retroactive points to add.",
        });
      }
    },
    onError: (error) => {
      console.error('Error calculating retroactive points:', error);
      toast({
        title: "Error",
        description: "Failed to calculate retroactive points. Please try again.",
        variant: "destructive",
      });
    }
  });
}