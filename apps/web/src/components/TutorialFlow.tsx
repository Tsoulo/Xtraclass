import { useState } from 'react';
import { useLocation } from 'wouter';
import TutorialCard from './TutorialCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen, Dumbbell, CheckCircle, Star } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface TutorialFlowProps {
  tutorialData: any;
  exerciseData: any;
  onBack?: () => void;
}

export default function TutorialFlow({ tutorialData, exerciseData, onBack }: TutorialFlowProps) {
  const [, setLocation] = useLocation();
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  const handleTutorialComplete = async () => {
    setTutorialCompleted(true);
    setShowTutorial(false);
    
    // Invalidate exercises cache to ensure new exercises appear immediately
    console.log('Tutorial completed, invalidating exercise cache');
    
    // Get all current queries to debug cache invalidation
    const allQueries = queryClient.getQueryCache().getAll();
    const exerciseQueries = allQueries.filter(q => {
      const key = q.queryKey?.[0];
      return typeof key === 'string' && key.includes('/api/exercises');
    });
    console.log('Found exercise queries to invalidate:', exerciseQueries.map(q => q.queryKey));
    console.log('All query keys in cache:', allQueries.map(q => q.queryKey));
    
    // Target specific invalidation for the exact patterns used
    console.log('Starting comprehensive cache invalidation...');
    
    // Method 1: Invalidate by predicate with better matching
    await queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey?.[0];
        const shouldInvalidate = typeof key === 'string' && (
          key.includes('/api/exercises') || 
          key === '/api/student/daily-exercise-generations'
        );
        if (shouldInvalidate) {
          console.log('Invalidating query:', query.queryKey);
        }
        return shouldInvalidate;
      }
    });
    
    // Method 2: Target the specific calendar query pattern 
    const today = new Date().toISOString().split('T')[0];
    const userGrade = localStorage.getItem('userGrade') || '8';
    const specificQueryKey = `/api/exercises?date=${today}&grade=${userGrade}`;
    console.log('Invalidating specific query:', specificQueryKey);
    await queryClient.invalidateQueries({ queryKey: [specificQueryKey] });
    
    // Method 3: Force refetch all exercise queries
    await queryClient.refetchQueries({ 
      predicate: (query) => {
        const key = query.queryKey?.[0];
        return typeof key === 'string' && key.includes('/api/exercises');
      }
    });
    
    // Method 4: Remove all exercise queries from cache and force fresh fetch
    queryClient.removeQueries({
      predicate: (query) => {
        const key = query.queryKey?.[0];
        return typeof key === 'string' && key.includes('/api/exercises');
      }
    });
  };

  const handleStartExercise = () => {
    // Store the exercise data in localStorage and navigate to attempt homework page
    // We reuse the homework attempt mechanism for exercises
    localStorage.setItem('attemptingHomework', JSON.stringify({
      ...exerciseData,
      isExercise: true,
      fromTutorial: true
    }));
    setLocation('/attempt-homework');
  };

  if (showTutorial) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Calendar
            </Button>
          )}
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Learning Tutorial</h1>
          </div>
        </div>

        {/* Tutorial Component */}
        <TutorialCard 
          tutorial={tutorialData} 
          onComplete={handleTutorialComplete}
        />
      </div>
    );
  }

  // Show exercise ready screen after tutorial completion
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => setShowTutorial(true)} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Review Tutorial
        </Button>
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-800">Practice Exercise Ready</h1>
        </div>
      </div>

      {/* Exercise Ready Card */}
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-800 mb-2">
            Tutorial Complete! 🎉
          </CardTitle>
          <p className="text-green-700">
            Great job completing the tutorial. Now you're ready to practice what you've learned!
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tutorial Summary */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              What You Learned
            </h3>
            <p className="text-gray-600 mb-3">{tutorialData.description}</p>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Completed {tutorialData.totalSteps} tutorial steps</span>
            </div>
          </div>

          {/* Exercise Preview */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-green-600" />
              Practice Exercise
            </h3>
            <p className="text-gray-600 mb-2">{exerciseData.title}</p>
            <p className="text-sm text-gray-500 mb-3">{exerciseData.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>• {exerciseData.questions?.length || 5} questions</span>
              <span>• Total marks: {exerciseData.totalMarks || 25}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => setShowTutorial(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Review Tutorial
            </Button>
            
            <Button
              onClick={handleStartExercise}
              className="bg-green-600 hover:bg-green-700 flex items-center gap-2 flex-1"
              size="lg"
            >
              <Dumbbell className="h-5 w-5" />
              Start Practice Exercise
            </Button>
          </div>

          {/* Motivational Message */}
          <div className="text-center text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
            <p>Remember to apply what you learned in the tutorial. You've got this! 💪</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}