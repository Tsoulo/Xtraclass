import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Brain, 
  CheckCircle2, 
  Loader2, 
  BookOpen,
  Calculator,
  Atom,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface BaselineAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentGrade: string;
  availableSubjects: string[];
}

function formatSubjectName(subject: string): string {
  return subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getSubjectIcon(subject: string) {
  switch (subject) {
    case 'mathematics':
    case 'mathematical-literacy':
      return Calculator;
    case 'physical-science':
      return Atom;
    default:
      return BookOpen;
  }
}

export default function BaselineAssessmentModal({
  isOpen,
  onClose,
  studentGrade,
  availableSubjects
}: BaselineAssessmentModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [step, setStep] = useState<'intro' | 'select' | 'generating' | 'ready'>('intro');
  const [generationProgress, setGenerationProgress] = useState(0);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Reset modal state when it opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSubject("");
      setStep('intro');
      setGenerationProgress(0);
    }
  }, [isOpen]);

  const startBaselineMutation = useMutation({
    mutationFn: async (subject: string) => {
      return await apiRequest('/api/baseline-assessment/start', {
        method: 'POST',
        body: JSON.stringify({ subject })
      });
    },
    onMutate: () => {
      setStep('generating');
      setGenerationProgress(10);
      
      const interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 1000);
      
      return { interval };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/baseline-assessment/status'] });
      
      // Check if any exercises were actually created
      if (!data.topicsGenerated || data.topicsGenerated === 0) {
        setStep('select');
        setGenerationProgress(0);
        toast({
          title: "Generation Failed",
          description: "No exercises could be created. Please try again or select a different subject.",
          variant: "destructive"
        });
        return;
      }
      
      // Store the assessment data for the dedicated baseline page
      localStorage.setItem('baselineAssessmentData', JSON.stringify({
        assessmentId: data.assessment?.id,
        subject: selectedSubject,
        grade: studentGrade,
        topicsGenerated: data.topicsGenerated
      }));
      
      setGenerationProgress(100);
      setStep('ready');
      
      toast({
        title: "Baseline Assessment Ready!",
        description: data.pastPaper 
          ? `Loaded ${data.pastPaper.questionCount} questions from ${data.pastPaper.year} past paper.`
          : `Assessment loaded with ${data.topicsGenerated} sections.`
      });
    },
    onError: (error: any) => {
      setStep('select');
      setGenerationProgress(0);
      
      toast({
        title: "Error",
        description: error.message || "Failed to start baseline assessment",
        variant: "destructive"
      });
    }
  });

  const handleStartAssessment = () => {
    if (!selectedSubject) {
      toast({
        title: "Select a Subject",
        description: "Please choose a subject to begin your assessment",
        variant: "destructive"
      });
      return;
    }
    startBaselineMutation.mutate(selectedSubject);
  };

  const handleGoToAssessment = () => {
    onClose();
    setLocation('/baseline-assessment');
  };

  const handleSkip = () => {
    onClose();
  };

  const renderIntroStep = () => (
    <div className="space-y-6 py-4">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
          <Target className="w-10 h-10 text-white" />
        </div>
      </div>
      
      <div className="text-center space-y-3">
        <h3 className="text-xl font-bold text-gray-900">Welcome to XtraClass!</h3>
        <p className="text-gray-600">
          Before we begin, let's understand your current knowledge level. 
          This baseline assessment will help us personalize your learning experience.
        </p>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-800">Personalized Learning</p>
            <p className="text-sm text-gray-600">We'll identify your strengths and areas for improvement</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-800">Real Past Paper Questions</p>
            <p className="text-sm text-gray-600">Using authentic exam questions from previous years</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-800">Complete at Your Own Pace</p>
            <p className="text-sm text-gray-600">Take your time - there's no rush</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleSkip}
          data-testid="button-skip-baseline"
        >
          Skip for Now
        </Button>
        <Button
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          onClick={() => setStep('select')}
          data-testid="button-start-baseline"
        >
          Let's Begin
        </Button>
      </div>
    </div>
  );

  const renderSelectStep = () => {
    // Handle case when no subjects are available
    if (!availableSubjects || availableSubjects.length === 0) {
      return (
        <div className="space-y-6 py-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-xl font-bold text-gray-900">No Subjects Available</h3>
            <p className="text-gray-600">
              You need to be enrolled in a class to take a baseline assessment. 
              Please contact your teacher to join a class first.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSkip}
            data-testid="button-close-no-subjects"
          >
            Close
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-gray-900">Choose Your Subject</h3>
          <p className="text-gray-600">
            Select which subject you'd like to assess first. You can do other subjects later.
          </p>
        </div>

        <div className="space-y-4">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full h-14" data-testid="select-baseline-subject">
              <SelectValue placeholder="Select a subject" />
            </SelectTrigger>
            <SelectContent>
              {availableSubjects.map((subject) => {
                const Icon = getSubjectIcon(subject);
                return (
                  <SelectItem key={subject} value={subject} data-testid={`select-item-${subject}`}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{formatSubjectName(subject)}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {selectedSubject && (
            <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-700">
                  <strong>Grade {studentGrade} {formatSubjectName(selectedSubject)}</strong>
                  <br />
                  We'll load questions from a past exam paper to assess your current level.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep('intro')}
            data-testid="button-back-baseline"
          >
            Back
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            onClick={handleStartAssessment}
            disabled={!selectedSubject || startBaselineMutation.isPending}
            data-testid="button-generate-baseline"
          >
            Load Assessment
          </Button>
        </div>
      </div>
    );
  };

  const renderGeneratingStep = () => (
    <div className="space-y-6 py-8">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
          <Brain className="w-10 h-10 text-white" />
        </div>
      </div>
      
      <div className="text-center space-y-3">
        <h3 className="text-xl font-bold text-gray-900">Loading Your Assessment</h3>
        <p className="text-gray-600">
          Setting up past paper questions for {formatSubjectName(selectedSubject)}...
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={generationProgress} className="h-3" />
        <p className="text-sm text-center text-gray-500">
          {Math.round(generationProgress)}% complete
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Please wait...</span>
      </div>
    </div>
  );

  const renderReadyStep = () => (
    <div className="space-y-6 py-4">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
      </div>
      
      <div className="text-center space-y-3">
        <h3 className="text-xl font-bold text-gray-900">Assessment Ready!</h3>
        <p className="text-gray-600">
          Your baseline assessment for {formatSubjectName(selectedSubject)} has been created 
          using real past paper questions.
        </p>
      </div>

      <div className="bg-green-50 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-700">
          Complete the assessment at your own pace. Your answers will be graded 
          to help us understand your current level.
        </p>
      </div>

      <Button
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        onClick={handleGoToAssessment}
        data-testid="button-go-to-assessment"
      >
        Start Assessment
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && step !== 'generating' && onClose()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => step === 'generating' && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">
            {step === 'intro' && 'Baseline Assessment'}
            {step === 'select' && 'Choose Subject'}
            {step === 'generating' && 'Creating Assessment'}
            {step === 'ready' && 'All Set!'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'intro' && renderIntroStep()}
        {step === 'select' && renderSelectStep()}
        {step === 'generating' && renderGeneratingStep()}
        {step === 'ready' && renderReadyStep()}
      </DialogContent>
    </Dialog>
  );
}
