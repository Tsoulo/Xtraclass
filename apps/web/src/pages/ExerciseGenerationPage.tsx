import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Brain, 
  Target, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  BookOpen,
  TrendingDown,
  Lightbulb
} from 'lucide-react';
import { useLocation } from 'wouter';

interface GeneratedExercise {
  id: string;
  title: string;
  description: string;
  questions: Array<{
    id: string;
    question: string;
    answer: string;
    marks: number;
    type: 'multiple-choice' | 'short-answer' | 'calculation' | 'essay';
  }>;
  totalMarks: number;
  estimatedDuration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  adaptiveReason: string;
}

interface ExerciseGenerationData {
  context: {
    subject: string;
    grade: string;
    topic: string;
    difficulty: string;
  };
  feedback: any;
  questions: any[];
  totalMarks: number;
  improvements: string[];
}

export default function ExerciseGenerationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [generationData, setGenerationData] = useState<ExerciseGenerationData | null>(null);
  const [generatedExercise, setGeneratedExercise] = useState<GeneratedExercise | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('exerciseGenerationData');
    if (stored) {
      setGenerationData(JSON.parse(stored));
    }
  }, []);

  const generateExercise = useMutation({
    mutationFn: async () => {
      if (!generationData) throw new Error('No generation data available');
      
      return await apiRequest('/api/generate-adaptive-exercise', {
        method: 'POST',
        body: JSON.stringify({
          context: {
            ...generationData.context,
            syllabus: 'CAPS'
          },
          feedbackAnalysis: {
            improvements: generationData.improvements,
            overallPerformance: generationData.feedback.overall.percentage,
            weakAreas: generationData.feedback.overall.improvements
          },
          originalQuestions: generationData.questions.map(q => ({
            question: q.question,
            studentAnswer: q.studentAnswer,
            correctAnswer: q.correctAnswer
          }))
        })
      });
    },
    onSuccess: (result) => {
      setGeneratedExercise(result);
      toast({
        title: "Adaptive Exercise Generated!",
        description: `Created ${result.questions.length} questions targeting your improvement areas`,
      });
    },
    onError: (error: any) => {
      console.error('Exercise generation error:', error);
      toast({
        title: "Generation Failed",
        description: "There was an error generating the exercise.",
        variant: "destructive"
      });
    }
  });

  if (!generationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Generation Data</h3>
              <p className="text-gray-500 mb-4">
                Please return to the AI Testing Center and complete a test first.
              </p>
              <Button onClick={() => setLocation('/ai-testing')} className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Back to AI Testing</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 break-words">Adaptive Exercise Generator</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">AI-powered practice exercises based on your performance</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/ai-testing')}
            className="shrink-0 w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="truncate">Back to Testing</span>
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Side - Analysis & Generation */}
          <div className="space-y-6">
            {/* Performance Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                  Performance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {generationData.feedback.overall.percentage}%
                    </div>
                    <Badge 
                      variant={generationData.feedback.overall.percentage >= 80 ? "default" : 
                               generationData.feedback.overall.percentage >= 60 ? "secondary" : "destructive"}
                    >
                      Grade: {generationData.feedback.overall.grade}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2 text-red-700">Areas Needing Improvement:</h4>
                    <ul className="space-y-1">
                      {generationData.improvements.map((improvement, index) => (
                        <li key={index} className="text-sm text-gray-700">
                          • {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exercise Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  Generate Practice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <strong>Subject:</strong> {generationData.context.subject}<br />
                    <strong>Grade:</strong> {generationData.context.grade}<br />
                    <strong>Topic:</strong> {generationData.context.topic}
                  </div>
                  
                  <Button 
                    onClick={() => generateExercise.mutate()}
                    disabled={generateExercise.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {generateExercise.isPending ? (
                      <div className="flex items-center justify-center min-w-0">
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin shrink-0" />
                        <span className="truncate">Generating Adaptive Exercise...</span>
                      </div>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">Generate Targeted Practice</span>
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-gray-500">
                    The AI will create easier questions focusing on the areas you struggled with.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Generated Exercise */}
          <div className="space-y-6">
            {generatedExercise ? (
              <>
                {/* Exercise Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      {generatedExercise.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      {generatedExercise.description}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <div className="text-lg sm:text-xl font-semibold text-blue-600">
                          {generatedExercise.questions.length}
                        </div>
                        <div className="text-xs text-gray-500">Questions</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <div className="text-lg sm:text-xl font-semibold text-green-600">
                          {generatedExercise.totalMarks}
                        </div>
                        <div className="text-xs text-gray-500">Total Marks</div>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded-lg">
                        <div className="text-lg sm:text-xl font-semibold text-purple-600 flex items-center justify-center">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          {generatedExercise.estimatedDuration}m
                        </div>
                        <div className="text-xs text-gray-500">Duration</div>
                      </div>
                    </div>
                    
                    <Badge variant={
                      generatedExercise.difficulty === 'easy' ? 'secondary' : 
                      generatedExercise.difficulty === 'medium' ? 'default' : 'destructive'
                    }>
                      {generatedExercise.difficulty.toUpperCase()} Difficulty
                    </Badge>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Adaptive Focus:</strong> {generatedExercise.adaptiveReason}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Questions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Practice Questions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {generatedExercise.questions.map((question, index) => (
                      <div key={question.id} className="p-3 sm:p-4 border rounded-lg bg-gray-50">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                          <h4 className="font-medium text-sm sm:text-base">Question {index + 1}</h4>
                          <Badge variant="outline" className="self-start sm:self-auto text-xs">{question.marks} marks</Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-3 break-words">{question.question}</p>
                        <div className="text-xs text-gray-500 mb-2 break-words">
                          <strong>Answer:</strong> <span className="break-all">{question.answer}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          <strong>Type:</strong> {question.type.replace('-', ' ')}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                      <Button 
                        onClick={() => generateExercise.mutate()}
                        disabled={generateExercise.isPending}
                        variant="outline"
                        className="w-full sm:flex-1 min-w-0"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">Generate New</span>
                      </Button>
                      <Button 
                        onClick={() => {
                          // TODO: Implement exercise practice mode
                          toast({
                            title: "Practice Mode",
                            description: "Practice mode coming soon!",
                          });
                        }}
                        className="w-full sm:flex-1 min-w-0"
                        size="sm"
                      >
                        <Target className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">Start Practice</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">Ready to Generate</h3>
                  <p className="text-gray-500">
                    Click "Generate Targeted Practice" to create personalized exercises based on your performance analysis.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}