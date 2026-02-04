import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MathText from '@/components/MathText';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  BookOpen, 
  Lightbulb, 
  Target, 
  Trophy,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Bot,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface TutorialStep {
  stepNumber: number;
  title: string;
  explanation: string;
  example: {
    problem: string;
    solution: string;
    keyPoint: string;
  };
  keyFormula?: string;
  tips: string[];
}

interface TutorialData {
  id: string;
  title: string;
  description: string;
  totalSteps: number;
  steps: TutorialStep[];
  context: {
    grade: string;
    subject: string;
    topic: string;
    syllabus: string;
  };
}

interface TutorialCardProps {
  tutorial: TutorialData;
  onComplete: () => void;
}

function splitIntoParagraphs(text: string): string[] {
  // First try splitting by existing line breaks
  const lineBreaks = text.split(/\r?\n/).filter(p => p.trim());
  if (lineBreaks.length > 1) {
    return lineBreaks;
  }
  
  // If no line breaks, split by sentence terminators (. ! ?)
  // This handles long continuous text
  // Use a regex that preserves the punctuation
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  
  // If we got multiple sentences, group them into 2-sentence paragraphs
  if (sentences.length > 1) {
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      const chunk = sentences.slice(i, i + 2).join(' ');
      paragraphs.push(chunk);
    }
    return paragraphs;
  }
  
  // If still no splits (single sentence or no punctuation), return as-is
  return [text];
}

export default function TutorialCard({ tutorial, onComplete }: TutorialCardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepChatExpanded, setStepChatExpanded] = useState(false);
  const [exampleChatExpanded, setExampleChatExpanded] = useState(false);
  const [stepChatEnlarged, setStepChatEnlarged] = useState(false);
  const [exampleChatEnlarged, setExampleChatEnlarged] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [stepChatHistory, setStepChatHistory] = useState<Array<{type: 'user' | 'ai', message: string, timestamp: Date}>>([]);
  const [exampleChatHistory, setExampleChatHistory] = useState<Array<{type: 'user' | 'ai', message: string, timestamp: Date}>>([]);
  const { toast } = useToast();

  const handleNextStep = () => {
    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(currentStep);
    setCompletedSteps(newCompletedSteps);

    if (currentStep < tutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      // Clear chat histories when moving to next step
      setStepChatHistory([]);
      setExampleChatHistory([]);
      setChatQuestion('');
      // Collapse chat sections
      setStepChatExpanded(false);
      setExampleChatExpanded(false);
      setStepChatEnlarged(false);
      setExampleChatEnlarged(false);
      // Scroll to top of page when advancing to next step
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Tutorial completed
      onComplete();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Clear chat histories when moving to previous step
      setStepChatHistory([]);
      setExampleChatHistory([]);
      setChatQuestion('');
      // Collapse chat sections
      setStepChatExpanded(false);
      setExampleChatExpanded(false);
      setStepChatEnlarged(false);
      setExampleChatEnlarged(false);
      // Scroll to top of page when going back to previous step
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // AI Chat functionality for Step Chat
  const stepAskAIMutation = useMutation({
    mutationFn: async (question: string) => {
      const currentStepData = tutorial.steps[currentStep];
      return await apiRequest('/api/tutorial-chat', {
        method: 'POST',
        body: JSON.stringify({
          studentQuestion: question,
          tutorialContext: {
            tutorialTitle: tutorial.title,
            currentStep: currentStep + 1,
            totalSteps: tutorial.totalSteps,
            stepTitle: currentStepData.title,
            stepContent: currentStepData.explanation,
            grade: tutorial.context.grade,
            subject: tutorial.context.subject,
            topic: tutorial.context.topic,
            section: 'explanation'
          }
        })
      });
    },
    onSuccess: (response) => {
      setStepChatHistory(prev => [
        ...prev,
        { type: 'ai', message: response.answer, timestamp: new Date() }
      ]);
      setChatQuestion('');
    },
    onError: (error: any) => {
      console.error('Step chat error:', error);
      toast({
        title: "Chat Error",
        description: "Sorry, I couldn't process your question right now. Please try again.",
        variant: "destructive"
      });
    }
  });

  // AI Chat functionality for Example Chat
  const exampleAskAIMutation = useMutation({
    mutationFn: async (question: string) => {
      const currentStepData = tutorial.steps[currentStep];
      return await apiRequest('/api/tutorial-chat', {
        method: 'POST',
        body: JSON.stringify({
          studentQuestion: question,
          tutorialContext: {
            tutorialTitle: tutorial.title,
            currentStep: currentStep + 1,
            totalSteps: tutorial.totalSteps,
            stepTitle: currentStepData.title,
            example: currentStepData.example,
            grade: tutorial.context.grade,
            subject: tutorial.context.subject,
            topic: tutorial.context.topic,
            section: 'example'
          }
        })
      });
    },
    onSuccess: (response) => {
      setExampleChatHistory(prev => [
        ...prev,
        { type: 'ai', message: response.answer, timestamp: new Date() }
      ]);
      setChatQuestion('');
    },
    onError: (error: any) => {
      console.error('Example chat error:', error);
      toast({
        title: "Chat Error",
        description: "Sorry, I couldn't process your question right now. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleStepChatSubmit = () => {
    if (!chatQuestion.trim()) return;
    const userMessage = {
      type: 'user' as const,
      message: chatQuestion,
      timestamp: new Date()
    };
    setStepChatHistory(prev => [...prev, userMessage]);
    stepAskAIMutation.mutate(chatQuestion);
  };

  const handleExampleChatSubmit = () => {
    if (!chatQuestion.trim()) return;
    const userMessage = {
      type: 'user' as const,
      message: chatQuestion,
      timestamp: new Date()
    };
    setExampleChatHistory(prev => [...prev, userMessage]);
    exampleAskAIMutation.mutate(chatQuestion);
  };

  const step = tutorial.steps[currentStep];
  const isLastStep = currentStep === tutorial.steps.length - 1;
  const progress = ((completedSteps.size) / tutorial.steps.length) * 100;

  if (!step) {
    return (
      <div className="text-center p-6">
        <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Tutorial Complete!</h3>
        <p className="text-gray-600 mb-4">Great job! You've completed all tutorial steps.</p>
        <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
          Start Practice Exercise
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-800">{tutorial.title}</h2>
          <Badge variant="secondary">
            Step {currentStep + 1} of {tutorial.steps.length}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mb-3">{tutorial.description}</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% complete</p>
      </div>

      {/* Tutorial Step Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl text-blue-800">{step.title}</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Explanation */}
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Understanding the Concept
            </h4>
            <div className="text-gray-700 leading-relaxed">
              <MathText>{step.explanation}</MathText>
            </div>
            
            {/* Ask AI Button for step explanation */}
            <div className="pt-3 mt-3 border-t border-gray-100">
              <Button
                onClick={() => setStepChatExpanded(!stepChatExpanded)}
                variant="outline"
                size="sm"
                className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 flex items-center justify-center gap-2"
              >
                <Bot className="h-4 w-4" />
                Need help with this step?
                {stepChatExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {stepChatHistory.length > 0 && (
                  <Badge variant="secondary" className="bg-blue-200 text-blue-800 text-xs ml-1">
                    {Math.floor(stepChatHistory.length / 2)}
                  </Badge>
                )}
              </Button>
              
              {/* Collapsible Chat Container */}
              {stepChatExpanded && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  {/* Chat Header with Enlarge Button */}
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-gray-700">Step Discussion</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStepChatEnlarged(!stepChatEnlarged)}
                      className="text-gray-500 hover:text-gray-700 h-6 px-2"
                    >
                      {stepChatEnlarged ? (
                        <>
                          <Minimize2 className="w-3 h-3 mr-1" />
                          <span className="text-xs">Minimize</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3 h-3 mr-1" />
                          <span className="text-xs">Enlarge</span>
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Chat History */}
                  {stepChatHistory.length > 0 ? (
                    <div className={`overflow-y-auto space-y-2 ${
                      stepChatEnlarged ? 'max-h-96' : 'max-h-48'
                    }`}>
                      {stepChatHistory.map((msg, index) => (
                        <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-2 rounded-lg text-sm ${
                            msg.type === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white border border-gray-200'
                          }`}>
                            <div className="flex items-start gap-2">
                              {msg.type === 'ai' && <Bot className="h-3 w-3 mt-0.5 text-blue-600" />}
                              <div className="flex-1">
                                <MathText className="text-sm leading-snug sm:leading-normal whitespace-pre-wrap break-words">{msg.message}</MathText>
                              </div>
                            </div>
                            <p className="text-xs mt-1 opacity-70">
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-2">
                      <Bot className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                      <p className="text-sm">Ask me anything about this step!</p>
                    </div>
                  )}
                  
                  {/* Chat Input */}
                  <div className="flex gap-2 items-end">
                    <Textarea
                      placeholder="Ask about this step... (Ctrl+Enter to send)"
                      value={chatQuestion}
                      onChange={(e) => setChatQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          e.preventDefault();
                          handleStepChatSubmit();
                        }
                      }}
                      className="flex-1 text-sm min-h-[60px] max-h-[120px] resize-y"
                      disabled={stepAskAIMutation.isPending}
                    />
                    <Button
                      onClick={handleStepChatSubmit}
                      disabled={!chatQuestion.trim() || stepAskAIMutation.isPending}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {stepAskAIMutation.isPending ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Quick Questions */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      "Explain differently?",
                      "Another example?",
                      "What if I'm stuck?"
                    ].map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setChatQuestion(question === "Explain differently?" ? "Can you explain this step differently?" : question === "Another example?" ? "Can you give another example?" : "What if I get stuck here?")}
                        className="text-xs h-6 px-2"
                        disabled={stepAskAIMutation.isPending}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Key Formula (if provided) */}
          {step.keyFormula && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">📝 Key Formula</h4>
              <div className="block w-full max-w-full bg-white px-3 py-2 rounded border text-sm overflow-x-auto leading-relaxed">
                <MathText className="font-mono whitespace-pre-wrap break-words">{step.keyFormula}</MathText>
              </div>
            </div>
          )}

          <Separator />

          {/* Example */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Worked Example
            </h4>
            
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-800 mb-1">Problem:</p>
                <div className="text-gray-700 bg-white p-3 rounded border break-words overflow-x-auto">
                  <MathText>{step.example.problem}</MathText>
                </div>
              </div>
              
              <div>
                <p className="font-medium text-gray-800 mb-1">Solution:</p>
                <div className="text-gray-700 bg-white p-3 rounded border overflow-x-auto">
                  <MathText className="whitespace-pre-wrap break-words">{step.example.solution}</MathText>
                </div>
              </div>
              
              <div className="bg-green-100 p-3 rounded border-l-4 border-green-500">
                <p className="font-medium text-green-800 mb-1">Key Takeaway:</p>
                <div className="text-green-700">
                  <MathText>{step.example.keyPoint}</MathText>
                </div>
              </div>
              
              {/* Ask AI Button - within example container */}
              <div className="pt-2">
                <Button
                  onClick={() => setExampleChatExpanded(!exampleChatExpanded)}
                  variant="outline"
                  size="sm"
                  className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100 flex items-center justify-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  Ask Tsebo about this example
                  {exampleChatExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {exampleChatHistory.length > 0 && (
                    <Badge variant="secondary" className="bg-green-200 text-green-800 text-xs ml-1">
                      {Math.floor(exampleChatHistory.length / 2)}
                    </Badge>
                  )}
                </Button>
                
                {/* Collapsible Chat Container for Example */}
                {exampleChatExpanded && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    {/* Chat Header with Enlarge Button */}
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-green-700">Example Discussion</h5>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExampleChatEnlarged(!exampleChatEnlarged)}
                        className="text-green-500 hover:text-green-700 h-6 px-2"
                      >
                        {exampleChatEnlarged ? (
                          <>
                            <Minimize2 className="w-3 h-3 mr-1" />
                            <span className="text-xs">Minimize</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3 h-3 mr-1" />
                            <span className="text-xs">Enlarge</span>
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* Chat History */}
                    {exampleChatHistory.length > 0 ? (
                      <div className={`overflow-y-auto space-y-2 ${
                        exampleChatEnlarged ? 'max-h-96' : 'max-h-48'
                      }`}>
                        {exampleChatHistory.map((msg, index) => (
                          <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-2 rounded-lg text-sm ${
                              msg.type === 'user' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-white border border-green-200'
                            }`}>
                              <div className="flex items-start gap-2">
                                {msg.type === 'ai' && <Bot className="h-3 w-3 mt-0.5 text-green-600" />}
                                <div className="flex-1">
                                  <MathText className="text-sm leading-snug sm:leading-normal whitespace-pre-wrap break-words">{msg.message}</MathText>
                                </div>
                              </div>
                              <p className="text-xs mt-1 opacity-70">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-2">
                        <Bot className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                        <p className="text-sm">Ask me about this example!</p>
                      </div>
                    )}
                    
                    {/* Chat Input */}
                    <div className="flex gap-2 items-end">
                      <Textarea
                        placeholder="Ask about this example... (Ctrl+Enter to send)"
                        value={chatQuestion}
                        onChange={(e) => setChatQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                            handleExampleChatSubmit();
                          }
                        }}
                        className="flex-1 text-sm min-h-[60px] max-h-[120px] resize-y"
                        disabled={exampleAskAIMutation.isPending}
                      />
                      <Button
                        onClick={handleExampleChatSubmit}
                        disabled={!chatQuestion.trim() || exampleAskAIMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {exampleAskAIMutation.isPending ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Quick Questions */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        "Different approach?",
                        "More examples?",
                        "Why this method?"
                      ].map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => setChatQuestion(question === "Different approach?" ? "Can you show a different approach to this problem?" : question === "More examples?" ? "Can you give more examples like this one?" : "Why do we use this method?")}
                          className="text-xs h-6 px-2"
                          disabled={exampleAskAIMutation.isPending}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tips */}
          {step.tips && step.tips.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 mb-2">💡 Helpful Tips</h4>
              <ul className="space-y-1">
                {step.tips.map((tip, index) => (
                  <li key={index} className="text-purple-700 flex items-start gap-2">
                    <span className="text-purple-500 mt-1">•</span>
                    <MathText>{tip}</MathText>
                  </li>
                ))}
              </ul>
            </div>
          )}



          {/* Navigation */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="w-full sm:w-auto h-10 px-3 text-sm sm:h-10 sm:px-4 sm:text-base flex items-center gap-1 sm:gap-2"
              data-testid="tutorial-prev-button"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              Previous
            </Button>

            <div className="order-2 sm:order-none flex items-center justify-center gap-1 sm:gap-2 min-w-0" data-testid="tutorial-status">
              {completedSteps.has(currentStep) && (
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              )}
              <span className="text-xs sm:text-sm text-gray-600 text-center whitespace-normal">
                {completedSteps.has(currentStep) ? 'Step completed' : 'Click Next when ready'}
              </span>
            </div>

            <Button
              onClick={handleNextStep}
              className="w-full sm:w-auto h-10 px-3 text-sm sm:h-10 sm:px-4 sm:text-base bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-1 sm:gap-2"
              data-testid="tutorial-next-button"
            >
              {isLastStep ? 'Complete Tutorial' : 'Next'}
              {!isLastStep && <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />}
              {isLastStep && <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}