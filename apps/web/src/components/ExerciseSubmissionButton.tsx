import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Play, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ExerciseSubmissionButtonProps {
  exerciseId: number;
  onAttempt: () => void;
  isTutorial?: boolean;
  exercise?: any;
}

export default function ExerciseSubmissionButton({ exerciseId, onAttempt, isTutorial = false, exercise }: ExerciseSubmissionButtonProps) {
  const [, setLocation] = useLocation();
  
  // Check if exercise is already completed
  const { data: existingSubmission, isLoading } = useQuery({
    queryKey: ['/api/exercises', exerciseId, 'submission'],
    queryFn: () => apiRequest(`/api/exercises/${exerciseId}/submission`),
  });

  const colorTheme = isTutorial 
    ? { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'bg-purple-200', text: 'text-purple-700', button: 'bg-purple-600 hover:bg-purple-700' }
    : { bg: 'bg-green-50', border: 'border-green-200', accent: 'bg-green-200', text: 'text-green-700', button: 'bg-green-600 hover:bg-green-700' };

  if (isLoading) {
    return (
      <div className={`p-3 ${colorTheme.bg} rounded-xl border ${colorTheme.border} text-center`}>
        <div className="animate-pulse">
          <div className={`h-10 ${colorTheme.accent} rounded w-32 mx-auto`}></div>
        </div>
      </div>
    );
  }

  if (existingSubmission && existingSubmission.isCompleted) {
    const handleViewAnalysis = () => {
      if (exercise && existingSubmission) {
        const feedbackData = {
          exercise: exercise,
          id: exerciseId,
          exerciseId: exerciseId,
          feedback: existingSubmission.feedback || {},
          answers: existingSubmission.answers || [],
          score: existingSubmission.score || 0,
          totalMarks: existingSubmission.totalMarks || 0
        };
        localStorage.setItem('exerciseFeedback', JSON.stringify(feedbackData));
        setLocation('/exercise-feedback');
      }
    };

    return (
      <div className={`p-3 ${colorTheme.bg} rounded-xl border ${colorTheme.border}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${colorTheme.text} ${isTutorial ? 'border-purple-300 bg-purple-100' : 'border-green-300 bg-green-100'}`}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Completed
            </Badge>
          </div>
          <div className={`text-xs ${isTutorial ? 'text-purple-600' : 'text-green-600'} font-semibold`}>
            Score: {existingSubmission.score || 0}/{existingSubmission.totalMarks || 0} marks
          </div>
          <Button
            onClick={handleViewAnalysis}
            size="sm"
            className={`${colorTheme.button} text-white px-4 py-2 h-auto text-xs font-medium w-full`}
            data-testid="button-view-analysis"
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            View Analysis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 ${colorTheme.bg} rounded-xl border ${colorTheme.border} text-center`}>
      <Button 
        onClick={onAttempt}
        className={`${colorTheme.button} text-white px-6 py-2`}
      >
        <Play className="w-4 h-4 mr-2" />
        {isTutorial ? 'Start Tutorial Learning' : 'Attempt Exercise'}
      </Button>
    </div>
  );
}