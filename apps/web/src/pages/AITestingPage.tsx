import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Send, CheckCircle2, XCircle, Brain, Target, TrendingUp, AlertTriangle, Sparkles, GraduationCap, Eye, Pencil, Save, RotateCcw, Eraser, Hand, ZoomIn } from 'lucide-react';
import { useLocation } from 'wouter';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface MockQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  studentAnswer: string;
  studentAnswerImage?: string;
  marks: number;
}

interface AIFeedbackResult {
  overall: {
    score: number;
    totalMarks: number;
    percentage: number;
    grade: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  questionFeedback: Array<{
    questionId: string;
    score: number;
    maxScore: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  }>;
}

export default function AITestingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<MockQuestion[]>([
    {
      id: '1',
      question: 'Solve for x: x^2 - 5x + 6 = 0',
      correctAnswer: 'x = 2 or x = 3',
      studentAnswer: 'x^2 - 5x + 6 = (x - 2)(x - 3) = 0, so x = 2 or x = 3',
      marks: 5
    }
  ]);
  const [testContext, setTestContext] = useState({
    subject: 'mathematics',
    grade: '8',
    topic: 'Algebra',
    theme: 'Problem Solving',
    syllabus: 'CAPS',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard'
  });
  const [feedback, setFeedback] = useState<AIFeedbackResult | null>(null);
  const [mcpExercise, setMcpExercise] = useState<any | null>(null);
  const [tutorialContent, setTutorialContent] = useState<any | null>(null);
  const [simpleAIResponse, setSimpleAIResponse] = useState<any | null>(null);
  
  // Drawing tool state
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [currentDrawingQuestionId, setCurrentDrawingQuestionId] = useState<string | null>(null);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [eraserWidth, setEraserWidth] = useState(10);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [canvasMode, setCanvasMode] = useState<'draw' | 'pan'>('draw');
  const [savedCanvasPaths, setSavedCanvasPaths] = useState<any>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const canvasRef = useRef<any>(null);
  const transformRef = useRef<any>(null);

  // Restore canvas paths when mode changes
  useEffect(() => {
    if (canvasRef.current && savedCanvasPaths) {
      const timer = setTimeout(async () => {
        try {
          await canvasRef.current?.loadPaths(savedCanvasPaths);
        } catch (error) {
          console.error('Error restoring canvas paths:', error);
        }
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [canvasMode, savedCanvasPaths]);

  const addQuestion = () => {
    const newQuestion: MockQuestion = {
      id: Date.now().toString(),
      question: '',
      correctAnswer: '',
      studentAnswer: '',
      marks: 5
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof MockQuestion, value: string | number) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const submitForGrading = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/ai-grading', {
        method: 'POST',
        body: JSON.stringify({
          questions: questions.map(q => ({
            id: q.id,
            question: q.question,
            correctAnswer: q.correctAnswer,
            marks: q.marks
          })),
          studentAnswers: questions.map(q => ({
            questionId: q.id,
            answer: q.studentAnswer,
            imageUrl: q.studentAnswerImage
          })),
          context: testContext
        })
      });
    },
    onSuccess: (result) => {
      setFeedback(result);
      toast({
        title: "Grading Complete!",
        description: `Score: ${result.overall.score}/${result.overall.totalMarks} (${result.overall.percentage}%)`,
      });
    },
    onError: (error) => {
      toast({
        title: "Grading Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const generateExercise = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/mcp/generate-exercise', {
        method: 'POST',
        body: JSON.stringify({
          subject: testContext.subject,
          grade: testContext.grade,
          topic: testContext.topic,
          theme: testContext.theme,
          difficulty: testContext.difficulty,
          syllabus: testContext.syllabus,
        })
      });
    },
    onSuccess: (result) => {
      setMcpExercise(result);
      toast({
        title: "Exercise Generated!",
        description: "MCP server generated a new exercise.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const generateTutorial = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/mcp/generate-tutorial', {
        method: 'POST',
        body: JSON.stringify({
          subject: testContext.subject,
          grade: testContext.grade,
          topic: testContext.topic,
          theme: testContext.theme,
          difficulty: testContext.difficulty,
        })
      });
    },
    onSuccess: (result) => {
      setTutorialContent(result);
      toast({
        title: "Tutorial Generated!",
        description: "MCP server generated a tutorial.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const testSimpleAI = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/mcp/test-simple-ai', {
        method: 'POST',
        body: JSON.stringify({
          message: "What is 2 + 2?"
        })
      });
    },
    onSuccess: (result) => {
      setSimpleAIResponse(result);
      toast({
        title: "Simple AI Test Complete!",
        description: "Got response from MCP server.",
      });
    },
    onError: (error) => {
      toast({
        title: "AI Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Brain className="w-8 h-8 text-purple-600" />
              AI Testing Center
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Test AI grading, exercise generation, and tutorial creation
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
          >
            Back to Home
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Test Context */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Test Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      value={testContext.subject}
                      onChange={(e) => setTestContext({ ...testContext, subject: e.target.value })}
                      placeholder="e.g., mathematics"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Grade</label>
                    <Input
                      value={testContext.grade}
                      onChange={(e) => setTestContext({ ...testContext, grade: e.target.value })}
                      placeholder="e.g., 8"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Topic</label>
                    <Input
                      value={testContext.topic}
                      onChange={(e) => setTestContext({ ...testContext, topic: e.target.value })}
                      placeholder="e.g., Algebra"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Theme</label>
                    <Input
                      value={testContext.theme}
                      onChange={(e) => setTestContext({ ...testContext, theme: e.target.value })}
                      placeholder="e.g., Problem Solving"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Syllabus</label>
                    <Input
                      value={testContext.syllabus}
                      onChange={(e) => setTestContext({ ...testContext, syllabus: e.target.value })}
                      placeholder="e.g., CAPS"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Difficulty</label>
                    <select
                      value={testContext.difficulty}
                      onChange={(e) => setTestContext({ ...testContext, difficulty: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Questions & Answers
                  </span>
                  <Button onClick={addQuestion} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Question
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((q, index) => (
                  <div key={q.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge>Question {index + 1}</Badge>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={q.marks}
                          onChange={(e) => updateQuestion(q.id, 'marks', parseInt(e.target.value))}
                          className="w-20"
                          placeholder="Marks"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(q.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Question</label>
                      <Textarea
                        value={q.question}
                        onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                        placeholder="Enter the question..."
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Correct Answer (for AI reference)</label>
                      <Textarea
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(q.id, 'correctAnswer', e.target.value)}
                        placeholder="Enter the correct answer..."
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Student Answer</label>
                      <div className="flex gap-2">
                        <Textarea
                          value={q.studentAnswer}
                          onChange={(e) => updateQuestion(q.id, 'studentAnswer', e.target.value)}
                          placeholder="Enter student's answer..."
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentDrawingQuestionId(q.id);
                            setIsDrawingOpen(true);
                          }}
                          className="shrink-0"
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Draw
                        </Button>
                      </div>
                      {q.studentAnswerImage && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          Drawing attached
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <Separator className="my-4" />

                <div className="flex gap-2">
                  <Button 
                    onClick={() => submitForGrading.mutate()}
                    disabled={submitForGrading.isPending}
                    className="flex-1"
                  >
                    {submitForGrading.isPending ? (
                      <>Grading...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit for AI Grading
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* MCP Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  MCP AI Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => generateExercise.mutate()}
                  disabled={generateExercise.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {generateExercise.isPending ? 'Generating...' : 'Generate Exercise (MCP)'}
                </Button>

                <Button 
                  onClick={() => generateTutorial.mutate()}
                  disabled={generateTutorial.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {generateTutorial.isPending ? 'Generating...' : 'Generate Tutorial (MCP)'}
                </Button>

                <Button 
                  onClick={() => testSimpleAI.mutate()}
                  disabled={testSimpleAI.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {testSimpleAI.isPending ? 'Testing...' : 'Test Simple AI (MCP)'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Feedback Results */}
            {feedback && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    AI Grading Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Overall Score */}
                  <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                        {feedback.overall.score}/{feedback.overall.totalMarks}
                      </div>
                      <div className="text-xl font-semibold mt-1">
                        {feedback.overall.percentage}% - Grade {feedback.overall.grade}
                      </div>
                    </div>
                  </div>

                  {/* Strengths */}
                  {feedback.overall.strengths.length > 0 && (
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        Strengths
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {feedback.overall.strengths.map((strength, i) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {feedback.overall.weaknesses.length > 0 && (
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Areas for Improvement
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {feedback.overall.weaknesses.map((weakness, i) => (
                          <li key={i}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {feedback.overall.recommendations.length > 0 && (
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-blue-500" />
                        Recommendations
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {feedback.overall.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Question-by-Question Feedback */}
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold">Question Feedback</h3>
                    {feedback.questionFeedback.map((qf, index) => (
                      <div key={qf.questionId} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Question {index + 1}</Badge>
                          <span className="font-semibold">
                            {qf.score}/{qf.maxScore} marks
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{qf.feedback}</p>
                        {qf.strengths.length > 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                            ✓ {qf.strengths.join(', ')}
                          </div>
                        )}
                        {qf.improvements.length > 0 && (
                          <div className="text-xs text-orange-600 dark:text-orange-400">
                            ⚠ {qf.improvements.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* MCP Exercise Result */}
            {mcpExercise && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generated Exercise (MCP)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(mcpExercise, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* MCP Tutorial Result */}
            {tutorialContent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generated Tutorial (MCP)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(tutorialContent, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Simple AI Test Result */}
            {simpleAIResponse && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Simple AI Test (MCP)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Question:</h4>
                      <p className="text-gray-700 dark:text-gray-300">{simpleAIResponse.question}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">AI Response:</h4>
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300">{simpleAIResponse.response}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Drawing/Writing Tool Modal */}
      <Dialog open={isDrawingOpen} onOpenChange={setIsDrawingOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Draw/Write Your Answer
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between border-b pb-3">
              <ToggleGroup 
                type="single" 
                value={canvasMode} 
                onValueChange={async (value) => {
                  if (value) {
                    // Save canvas paths before switching modes
                    if (canvasRef.current) {
                      try {
                        const paths = await canvasRef.current.exportPaths();
                        setSavedCanvasPaths(paths);
                      } catch (error) {
                        console.error('Error saving canvas paths:', error);
                      }
                    }
                    
                    setCanvasMode(value as 'draw' | 'pan');
                  }
                }}
              >
                <ToggleGroupItem value="draw" className="flex items-center gap-1">
                  <Pencil className="w-4 h-4" />
                  Draw
                </ToggleGroupItem>
                <ToggleGroupItem value="pan" className="flex items-center gap-1">
                  <Hand className="w-4 h-4" />
                  Pan/Zoom
                </ToggleGroupItem>
              </ToggleGroup>
              
              <div className="text-xs text-muted-foreground">
                {canvasMode === 'draw' ? '✏️ Drawing enabled' : '🤚 Pan & zoom enabled'}
              </div>
            </div>
            
            {/* Drawing Controls - Only visible in Draw mode */}
            {canvasMode === 'draw' && (
              <div className="flex items-center gap-4 flex-wrap border-b pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Stroke Size:</span>
                  <Slider
                    value={[strokeWidth]}
                    onValueChange={(value) => setStrokeWidth(value[0])}
                    min={1}
                    max={20}
                    step={1}
                    className="w-32"
                  />
                  <span className="text-sm text-gray-600 w-8">{strokeWidth}px</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Color:</span>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-12 h-8 rounded border cursor-pointer"
                  />
                </div>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  canvasRef.current?.eraseMode(true);
                }}
              >
                <Eraser className="w-4 h-4 mr-1" />
                Eraser
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  canvasRef.current?.eraseMode(false);
                }}
              >
                <Pencil className="w-4 h-4 mr-1" />
                Pen
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  canvasRef.current?.clearCanvas();
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  canvasRef.current?.undo();
                }}
              >
                Undo
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  canvasRef.current?.redo();
                }}
              >
                Redo
              </Button>
              
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCanvasHeight(canvasHeight + 200);
                    }}
                  >
                    Extend Canvas ↓
                  </Button>
                </div>
              </div>
            )}
            
            {/* Drawing Canvas */}
            <div 
              className="border-2 border-gray-300 rounded-lg overflow-hidden relative"
              style={{ 
                maxHeight: '60vh',
                cursor: canvasMode === 'pan' ? 'grab' : 'crosshair'
              }}
            >
              {canvasMode === 'draw' ? (
                // Draw Mode: Scale applied to actual canvas dimensions
                <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newScale = Math.max(0.5, canvasScale - 0.25);
                        setCanvasScale(newScale);
                      }}
                      className="h-8 w-8 p-0"
                      title="Zoom Out"
                    >
                      <ZoomIn className="h-4 w-4 rotate-180" />
                    </Button>
                    <span className="text-xs font-medium">{Math.round(canvasScale * 100)}%</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newScale = Math.min(4, canvasScale + 0.25);
                        setCanvasScale(newScale);
                      }}
                      className="h-8 w-8 p-0"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCanvasScale(1)}
                      className="h-8 px-2 text-xs"
                      title="Reset Zoom"
                    >
                      Reset
                    </Button>
                  </div>
                  <ReactSketchCanvas
                    ref={canvasRef}
                    width={`${800 * canvasScale}px`}
                    height={`${canvasHeight * canvasScale}px`}
                    strokeWidth={strokeWidth * canvasScale}
                    strokeColor={strokeColor}
                    canvasColor="#FFFFFF"
                    exportWithBackgroundImage={true}
                    style={{
                      border: 'none',
                    }}
                  />
                </div>
              ) : (
                // Pan Mode: Zoom enabled for viewing, drawing disabled
                <TransformWrapper
                  ref={transformRef}
                  initialScale={canvasScale}
                  minScale={0.5}
                  maxScale={4}
                  centerOnInit={false}
                  limitToBounds={false}
                  panning={{ disabled: false }}
                  pinch={{ disabled: false }}
                  wheel={{ disabled: false }}
                  doubleClick={{ disabled: true }}
                  onTransformed={(ref) => {
                    if (ref?.state?.scale) {
                      setCanvasScale(ref.state.scale);
                    }
                  }}
                >
                  {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white rounded-lg shadow-md p-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => zoomIn()}
                          className="h-8 w-8 p-0"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => zoomOut()}
                          className="h-8 w-8 p-0"
                          title="Zoom Out"
                        >
                          <ZoomIn className="h-4 w-4 rotate-180" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            resetTransform();
                            setCanvasScale(1);
                          }}
                          className="h-8 w-8 p-0 text-xs"
                          title="Reset View"
                        >
                          1:1
                        </Button>
                      </div>
                      
                      <TransformComponent
                        wrapperStyle={{
                          width: '100%',
                          height: '60vh',
                        }}
                      >
                        <ReactSketchCanvas
                          ref={canvasRef}
                          width="800px"
                          height={`${canvasHeight}px`}
                          strokeWidth={strokeWidth}
                          strokeColor={strokeColor}
                          canvasColor="#FFFFFF"
                          exportWithBackgroundImage={true}
                          style={{
                            border: 'none',
                            pointerEvents: 'none',
                          }}
                        />
                      </TransformComponent>
                    </>
                  )}
                </TransformWrapper>
              )}
            </div>
            
            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
              {canvasMode === 'draw' ? (
                <><strong>Draw Mode:</strong> Zoom level: {Math.round(canvasScale * 100)}% • Draw at current zoom • Scroll to see more</>
              ) : (
                <><strong>Pan/Zoom Mode:</strong> Pinch to zoom • Drag to pan • Zoom carries over to Draw mode</>
              )}
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDrawingOpen(false);
                  setCanvasHeight(600);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (currentDrawingQuestionId && canvasRef.current) {
                    try {
                      const imageData = await canvasRef.current.exportImage('png');
                      updateQuestion(currentDrawingQuestionId, 'studentAnswerImage', imageData);
                      toast({
                        title: "Drawing saved!",
                        description: "Your answer has been saved as an image.",
                      });
                      setIsDrawingOpen(false);
                      setCanvasHeight(600);
                    } catch (error) {
                      console.error('Error exporting drawing:', error);
                      toast({
                        title: "Error",
                        description: "Failed to save drawing",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Drawing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
