import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import TutorialFlow from '@/components/TutorialFlow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { buildApiUrl } from '@/lib/api';

export default function TutorialFlowPage() {
  const [, setLocation] = useLocation();
  const [tutorialData, setTutorialData] = useState<any>(null);
  const [exerciseData, setExerciseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    // Get tutorial flow data from localStorage
    const flowData = localStorage.getItem('tutorialFlowData');
    if (flowData) {
      try {
        const parsed = JSON.parse(flowData);
        setTutorialData(parsed.tutorial);
        setExerciseData(parsed.exercise);
        
        // If no tutorial data but we have an exercise that needs tutorial, 
        // extract it from the exercise's tutorialContent field
        if (!parsed.tutorial && parsed.exercise) {
          // Check if exercise has stored tutorial content
          if (parsed.exercise.tutorialContent || parsed.exercise.tutorial_content) {
            try {
              const tutorialContent = parsed.exercise.tutorialContent || parsed.exercise.tutorial_content;
              const rawTutorial = typeof tutorialContent === 'string' 
                ? JSON.parse(tutorialContent) 
                : tutorialContent;
              
              // Convert the raw tutorial data to the expected format
              const convertedTutorial = convertTutorialFormat(rawTutorial, parsed.exercise);
              setTutorialData(convertedTutorial);
              setIsLoading(false);
              console.log('Tutorial extracted from exercise successfully');
            } catch (error) {
              console.error('Error parsing tutorial content from exercise:', error);
              // Fallback to generating tutorial
              generateTutorialForExercise(parsed.exercise);
            }
          } else {
            // Fallback: generate tutorial based on the exercise data
            console.log('No tutorial content found, generating fallback tutorial');
            generateTutorialForExercise(parsed.exercise);
          }
        } else if (parsed.tutorial) {
          // Tutorial data exists, use it directly
          setTutorialData(parsed.tutorial);
          setIsLoading(false);
          console.log('Tutorial data loaded from storage');
        } else {
          // No tutorial at all, generate one
          console.log('No tutorial found, generating one for exercise');
          generateTutorialForExercise(parsed.exercise || {});
        }
      } catch (error) {
        console.error('Error parsing tutorial flow data:', error);
        setHasError(true);
        setIsLoading(false);
      }
    } else {
      // No tutorial data, show error
      setHasError(true);
      setIsLoading(false);
    }
  }, [setLocation]);

  // Convert stored tutorial format to expected TutorialCard format
  const convertTutorialFormat = (rawTutorial: any, exercise: any) => {
    const steps = [];
    
    // Handle MCP-generated tutorial format (has steps array)
    if (rawTutorial.steps && Array.isArray(rawTutorial.steps)) {
      console.log('Converting MCP tutorial format with steps:', rawTutorial.steps.length);
      return {
        id: `tutorial_${exercise.id}`,
        title: rawTutorial.title || exercise.title || "Tutorial",
        description: rawTutorial.description || "Complete this tutorial before starting the practice exercise",
        totalSteps: rawTutorial.steps.length,
        steps: rawTutorial.steps.map((step: any, index: number) => ({
          stepNumber: index + 1,
          title: step.title || `Step ${index + 1}`,
          explanation: step.explanation || step.content || 'Step explanation',
          example: step.example || {
            problem: step.exampleProblem || "Practice problem",
            solution: step.exampleSolution || "Step-by-step solution",
            keyPoint: step.keyPoint || "Key learning point"
          },
          keyFormula: step.keyFormula,
          tips: Array.isArray(step.tips) ? step.tips : step.tips ? [step.tips] : ["Practice this concept"]
        })),
        context: {
          grade: exercise.grade || "8",
          subject: exercise.subject || "mathematics",
          topic: exercise.title || "Practice",
          syllabus: "CAPS"
        }
      };
    }

    // Create introduction step for legacy format
    if (rawTutorial.explanation) {
      steps.push({
        stepNumber: 1,
        title: "Introduction",
        explanation: rawTutorial.explanation,
        example: {
          problem: "Let's get started with the basics",
          solution: rawTutorial.description || "Follow along with the examples",
          keyPoint: "Understanding the fundamentals is key to success"
        },
        tips: ["Take your time to understand each concept", "Practice makes perfect"]
      });
    }
    
    // Create steps for each example
    if (rawTutorial.examples && Array.isArray(rawTutorial.examples)) {
      rawTutorial.examples.forEach((example: string, index: number) => {
        steps.push({
          stepNumber: steps.length + 1,
          title: `Example ${index + 1}`,
          explanation: `Let's work through this step-by-step example to understand the concept better.`,
          example: {
            problem: example,
            solution: `Follow the step-by-step solution`,
            keyPoint: `Key concept demonstrated in example ${index + 1}`
          },
          tips: [`Focus on the method used here`, `This technique will help in similar problems`]
        });
      });
    }
    
    // Create summary step
    steps.push({
      stepNumber: steps.length + 1,
      title: "Summary & Practice",
      explanation: "Now that you've learned the concepts, you're ready to practice with some questions.",
      example: {
        problem: "Apply what you've learned",
        solution: "Use the techniques from the examples",
        keyPoint: "Practice reinforces learning"
      },
      tips: ["Review the examples if you get stuck", "Take your time with each question"]
    });
    
    return {
      id: `tutorial_${exercise.id}`,
      title: rawTutorial.title || exercise.title || "Tutorial",
      description: rawTutorial.description || "Complete this tutorial before starting the practice exercise",
      totalSteps: steps.length,
      steps: steps,
      context: {
        grade: exercise.grade || "8",
        subject: exercise.subject || "mathematics",
        topic: exercise.title || "Practice",
        syllabus: "CAPS"
      }
    };
  };

  const generateTutorialForExercise = async (exercise: any) => {
    try {
      console.log('Generating tutorial for exercise:', exercise);
      
      // Extract improvement areas from exercise data
      const improvementAreas = exercise.weaknessAreas || exercise.description?.split('feedback:')[1]?.split(',') || [];
      
      const response = await fetch(buildApiUrl(`/api/tutorial/generate`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: {
            grade: exercise.grade || '8',
            subject: exercise.subject || 'mathematics',
            topic: exercise.title || 'Algebra',
            syllabus: 'CAPS'
          },
          improvementAreas: improvementAreas,
          targetConcepts: []
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.tutorial) {
          setTutorialData(data.tutorial);
          setIsLoading(false);
          console.log('Tutorial generated successfully');
        }
      } else {
        console.error('Failed to generate tutorial');
        // Fallback to basic tutorial structure
        setTutorialData({
          id: `tutorial_${Date.now()}`,
          title: `Tutorial: ${exercise.title}`,
          description: 'Step-by-step learning guide',
          totalSteps: 1,
          steps: [{
            stepNumber: 1,
            title: 'Understanding the Concept',
            explanation: 'This tutorial will help you understand the key concepts.',
            example: {
              problem: 'Sample problem',
              solution: 'Step-by-step solution',
              keyPoint: 'Key takeaway'
            },
            tips: ['Practice regularly', 'Take your time']
          }]
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error generating tutorial:', error);
      setIsLoading(false);
    }
  };

  const handleBackToOrigin = () => {
    // Get the tutorial flow data to determine where we came from
    const flowData = localStorage.getItem('tutorialFlowData');
    if (flowData) {
      try {
        const parsed = JSON.parse(flowData);
        // Check if we came from homework feedback or calendar
        if (parsed.generatedFrom === 'homework-feedback') {
          setLocation('/homework-feedback');
        } else {
          // Default to calendar for all other cases
          setLocation('/calendar');
        }
      } catch (error) {
        console.error('Error parsing tutorial flow data:', error);
        setLocation('/calendar');
      }
    } else {
      // No flow data, go to calendar
      setLocation('/calendar');
    }
  };

  // Show loading dialog while data is being prepared
  if (isLoading) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Preparing Your Tutorial</h3>
            <p className="text-sm text-gray-600 text-center">
              We're setting up your personalized learning experience...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error screen if data couldn't be loaded
  if (hasError || !tutorialData || !exerciseData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              No Tutorial Data Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-4">
              We couldn't find any tutorial data to display. This might happen if you navigated here directly without generating a tutorial first.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setLocation('/')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Button>
              <Button onClick={() => setLocation('/homework-feedback')}>
                <BookOpen className="h-4 w-4 mr-2" />
                Go to Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TutorialFlow 
        tutorialData={tutorialData} 
        exerciseData={exerciseData}
        onBack={handleBackToOrigin}
      />
    </div>
  );
}