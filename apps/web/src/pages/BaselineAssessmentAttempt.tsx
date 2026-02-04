import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Target, 
  CheckCircle, 
  Trophy,
  Brain,
  Loader2,
  BookOpen,
  Upload,
  Camera,
  X,
  Calendar
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import MathText from "@/components/MathText";

interface BaselineExercise {
  id: number;
  title: string;
  description: string;
  questions: Array<{
    id: number;
    question: string;
    marks: number;
    imageUrl?: string;
    options?: string[];
  }>;
  baselineTopicId: number;
  topicName?: string;
}

export default function BaselineAssessmentAttemptPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Array<{ questionId: number; textAnswer: string; imageFile: File | null; imagePreview: string }>>([]);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [exercises, setExercises] = useState<BaselineExercise[]>([]);
  const [cameraOpen, setCameraOpen] = useState<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<number, boolean>>({});
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('baselineAssessmentData') || 'null');
    if (!data || !data.assessmentId) {
      setLocation('/');
      return;
    }
    setAssessmentData(data);
  }, [setLocation]);

  const { data: baselineData, isLoading } = useQuery({
    queryKey: ['/api/baseline-assessment', assessmentData?.assessmentId],
    queryFn: () => apiRequest(`/api/baseline-assessment/${assessmentData?.assessmentId}`),
    enabled: !!assessmentData?.assessmentId,
  });

  useEffect(() => {
    if (baselineData?.exercises) {
      setExercises(baselineData.exercises);
      
      const allQuestions = baselineData.exercises.flatMap((ex: BaselineExercise) => 
        ex.questions?.map(q => ({ ...q, exerciseId: ex.id })) || []
      );
      
      const initialAnswers = allQuestions.map((q: any) => ({
        questionId: q.id,
        textAnswer: '',
        imageFile: null,
        imagePreview: ''
      }));
      setAnswers(initialAnswers);

      const initialLoadingStates: Record<number, boolean> = {};
      allQuestions.forEach((q: any) => {
        if (q.imageUrl || (q.attachments && q.attachments.length > 0)) {
          initialLoadingStates[q.id] = true;
        }
      });
      setImageLoadingStates(initialLoadingStates);
    }
  }, [baselineData]);

  const submitBaselineMutation = useMutation({
    mutationFn: async (submissionData: any) => {
      return apiRequest(`/api/baseline-assessment/${assessmentData?.assessmentId}/submit`, {
        method: 'POST',
        body: JSON.stringify(submissionData),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/baseline-assessment'] });
      localStorage.removeItem('baselineAssessmentData');
      
      localStorage.setItem('baselineFeedback', JSON.stringify(data));
      
      toast({
        title: "Assessment Submitted!",
        description: "Your baseline assessment has been submitted for AI grading.",
      });
      
      setLocation('/baseline-feedback');
    },
    onError: (error) => {
      console.error('Error submitting baseline:', error);
      toast({
        title: "Submission Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTextAnswerChange = (questionId: number, text: string) => {
    setAnswers(prev => prev.map(answer => 
      answer.questionId === questionId 
        ? { ...answer, textAnswer: text }
        : answer
    ));
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxWidth = 1920;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          try {
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            resolve(compressedBase64);
          } catch (error) {
            reject(new Error('Failed to compress image'));
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (questionId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const isImage = file.type.startsWith('image/') || file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|heic|heif)$/);
    if (!isImage) {
      alert('Please upload a valid image file');
      return;
    }
    
    if (file.size > 20 * 1024 * 1024) {
      alert('Image is too large. Please upload an image smaller than 20MB.');
      return;
    }
    
    try {
      const compressedBase64 = await compressImage(file);
      setAnswers(prev => prev.map(answer =>
        answer.questionId === questionId
          ? { ...answer, imageFile: file, imagePreview: compressedBase64 }
          : answer
      ));
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try a different photo.');
    }
  };

  const removeImage = (questionId: number) => {
    setAnswers(prev => prev.map(answer =>
      answer.questionId === questionId
        ? { ...answer, imageFile: null, imagePreview: '' }
        : answer
    ));
  };

  const openCamera = async (questionId: number) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      setStream(mediaStream);
      setCameraOpen(questionId);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const capturePhoto = (questionId: number) => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setAnswers(prev => prev.map(answer =>
          answer.questionId === questionId
            ? { ...answer, imageFile: null, imagePreview: imageData }
            : answer
        ));
      }
    }
    closeCamera();
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraOpen(null);
  };

  const handleSubmit = async () => {
    const hasAnswers = answers.some(answer => answer.textAnswer.trim() || answer.imagePreview);
    if (!hasAnswers) {
      alert('Please provide at least one answer.');
      return;
    }
    
    const answersWithImages = await Promise.all(
      answers
        .filter(answer => answer.textAnswer.trim() || answer.imagePreview)
        .map(async (answer) => {
          let imageUrl = undefined;
          if (answer.imagePreview) {
            if (answer.imageFile) {
              imageUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(answer.imageFile!);
              });
            } else {
              imageUrl = answer.imagePreview;
            }
          }
          return {
            questionId: answer.questionId,
            answer: answer.textAnswer || '',
            imageUrl
          };
        })
    );
    
    const submissionData = {
      exercises: exercises.map(ex => ({
        exerciseId: ex.id,
        answers: answersWithImages.filter(a => 
          ex.questions?.some(q => q.id === a.questionId)
        )
      }))
    };
    
    submitBaselineMutation.mutate(submissionData);
  };


  if (isLoading || !assessmentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading baseline assessment...</p>
        </div>
      </div>
    );
  }

  if (!exercises.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Assessment Found</h2>
            <p className="text-gray-600 mb-4">The baseline assessment could not be loaded.</p>
            <Button onClick={() => setLocation('/calendar')}>Go to Calendar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allQuestions = exercises.flatMap((ex: BaselineExercise, exIndex: number) => 
    ex.questions?.map((q, qIndex) => ({ 
      ...q, 
      exerciseId: ex.id, 
      exerciseTitle: ex.title,
      globalIndex: exIndex * 100 + qIndex
    })) || []
  );
  const totalMarks = allQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

  const paperTitle = exercises[0]?.title?.replace('Baseline Assessment: ', '') || 'Baseline Assessment';
  const subject = baselineData?.assessment?.subject || assessmentData?.subject || 'Mathematics';
  const grade = baselineData?.assessment?.grade || assessmentData?.grade || '8';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-100 pb-20 md:pt-16">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')} 
            className="flex items-center gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800">
              Baseline Assessment
            </h1>
          </div>
        </div>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-t-lg p-4 sm:p-6">
            <div>
              <CardTitle className="text-xl sm:text-2xl mb-2">{paperTitle}</CardTitle>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="capitalize">{subject.replace('-', ' ')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Grade {grade}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{allQuestions.length} Questions</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{totalMarks} Marks</span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {allQuestions.map((question: any, index: number) => {
            const answer = answers.find(a => a.questionId === question.id);
            const questionNumber = index + 1;
            const questionImage = question.imageUrl;
            const hasOptions = question.options && Array.isArray(question.options) && question.options.length > 0;
            
            return (
              <Card key={question.id} className="border-0 shadow-md bg-white/90 backdrop-blur-sm" data-testid={`question-card-${question.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-700 font-bold">
                        Q{questionNumber}
                      </Badge>
                      <Badge variant="outline" className="text-slate-600">
                        {question.marks || 0} marks
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <MathText>{question.question || ''}</MathText>
                  </div>

                  {hasOptions && (
                    <div className="space-y-2 pl-4 border-l-2 border-orange-200">
                      {question.options.map((option: string, idx: number) => (
                        <label 
                          key={idx} 
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            answer?.textAnswer === option 
                              ? 'bg-orange-100 border border-orange-300' 
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option}
                            checked={answer?.textAnswer === option}
                            onChange={() => handleTextAnswerChange(question.id, option)}
                            className="w-4 h-4 text-orange-600"
                          />
                          <span className="text-slate-700">
                            <MathText>{option}</MathText>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {questionImage && (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200">
                      {imageLoadingStates[question.id] && (
                        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                      )}
                      <img 
                        src={questionImage} 
                        alt={`Question ${questionNumber}`}
                        className="max-w-full h-auto max-h-64 object-contain mx-auto"
                        onLoad={() => setImageLoadingStates(prev => ({ ...prev, [question.id]: false }))}
                        onError={() => setImageLoadingStates(prev => ({ ...prev, [question.id]: false }))}
                      />
                    </div>
                  )}

                  {!hasOptions && (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Type your answer here..."
                        value={answer?.textAnswer || ''}
                        onChange={(e) => handleTextAnswerChange(question.id, e.target.value)}
                        className="min-h-[100px] resize-y"
                        data-testid={`textarea-answer-${question.id}`}
                      />

                      <div className="flex flex-wrap gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(question.id, e)}
                          />
                          <div className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-700 transition-colors">
                            <Upload className="w-4 h-4" />
                            <span>Upload</span>
                          </div>
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCamera(question.id)}
                          className="flex items-center gap-1"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Camera</span>
                        </Button>
                      </div>

                      {answer?.imagePreview && (
                        <div className="relative inline-block">
                          <img
                            src={answer.imagePreview}
                            alt="Your uploaded answer"
                            className="max-w-full h-auto max-h-40 rounded-lg border border-slate-200"
                          />
                          <button
                            onClick={() => removeImage(question.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {allQuestions.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={submitBaselineMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-3 text-lg"
              data-testid="button-submit"
            >
              {submitBaselineMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Submit Answers
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {cameraOpen !== null && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center justify-center gap-4 p-4 bg-black">
            <Button
              variant="outline"
              onClick={closeCamera}
              className="text-white border-white hover:bg-white/20"
            >
              <X className="w-5 h-5 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={() => capturePhoto(cameraOpen)}
              className="bg-white text-black hover:bg-white/90 px-8"
            >
              <Camera className="w-5 h-5 mr-2" />
              Capture
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
