import { useQuery } from "@tanstack/react-query";

export function useMonthlyExercises(
  year: number,
  month: number,
  grade: string,
  subject: string
) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
  
  return useQuery({
    queryKey: [`/api/exercises?startDate=${startDate}&endDate=${endDate}&grade=${grade}&subject=${subject}`],
    enabled: Boolean(grade && subject && grade !== "undefined" && subject !== "undefined"),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useExercisesForDate(date: Date, exercises: any[] = []) {
  const dateStr = date.toISOString().split('T')[0];
  return exercises.filter(exercise => exercise.date === dateStr);
}