import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Upload, BookOpen, Target, CheckCircle, Clock, Trophy, ScrollText, Camera, X, Loader2, Calendar } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import MathText from "@/components/MathText";

function formatQuestionNumber(num: number): string {
  if (num >= 100) {
    const main = Math.floor(num / 100);
    const sub = num % 100;
    if (sub === 0) return main.toString();
    return `${main}.${sub}`;
  }
  return num.toString();
}

export default function AttemptPastPaperPage() {
  const [, setLocation] = useLocation();
  const [answers, setAnswers] = useState<Array<{ questionId: number; textAnswer: string; imageFile: File | null; imagePreview: string }>>([]);
  const [paperData, setPaperData] = useState<any>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [cameraOpen, setCameraOpen] = useState<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<number, boolean>>({});
  const [isRetrying, setIsRetrying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('attemptingPastPaper') || '{}');
    if (!data.id) {
      setLocation('/');
      return;
    }
    setPaperData(data);
  }, [setLocation]);

  const { data: fetchedQuestions, isLoading: questionsLoading } = useQuery({
    queryKey: [`/api/past-papers/${paperData.id}/questions`],
    enabled: !!paperData.id
  });

  useEffect(() => {
    if (fetchedQuestions && Array.isArray(fetchedQuestions)) {
      const sortedQuestions = [...fetchedQuestions].sort((a: any, b: any) => 
        (a.questionNumber || 0) - (b.questionNumber || 0)
      );
      setQuestions(sortedQuestions);
      
      const initialAnswers = sortedQuestions.map((q: any) => ({
        questionId: q.id,
        textAnswer: '',
        imageFile: null,
        imagePreview: ''
      }));
      setAnswers(initialAnswers);

      const initialLoadingStates: Record<number, boolean> = {};
      sortedQuestions.forEach((q: any) => {
        if (q.imageUrl) {
          initialLoadingStates[q.id] = true;
        }
      });
      setImageLoadingStates(initialLoadingStates);
    }
  }, [fetchedQuestions]);

  const { data: existingSubmission } = useQuery({
    queryKey: ['/api/past-paper-submissions', paperData.id, 'submission'],
    queryFn: () => apiRequest(`/api/past-paper-submissions/${paperData.id}`),
    enabled: !!paperData.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const submitMutation = useMutation({
    mutationFn: async (submissionData: { answers: Array<{ questionId: number; answer: string; imageUrl?: string }> }) => {
      return apiRequest(`/api/past-paper-submissions/${paperData.id}/submit`, {
        method: 'POST',
        body: JSON.stringify(submissionData),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/past-paper-submissions', paperData.id, 'submission'] });
      
      localStorage.setItem('pastPaperFeedback', JSON.stringify({
        ...data,
        paperId: paperData.id,
        paper: paperData,
        questions: questions
      }));
      localStorage.removeItem('attemptingPastPaper');
      setLocation('/past-paper-feedback');
    },
    onError: (error) => {
      console.error('Error submitting past paper:', error);
      alert('Failed to submit. Please try again.');
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
    
    submitMutation.mutate({ answers: answersWithImages });
  };

  if (!paperData.id || questionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading past paper...</p>
        </div>
      </div>
    );
  }

  const totalMarks = questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);
  const hasCompletedBefore = existingSubmission && existingSubmission.isCompleted;
  const isCompleted = hasCompletedBefore && !isRetrying;
  const previousScore = existingSubmission?.score || 0;
  const previousTotalMarks = existingSubmission?.totalMarks || totalMarks;
  const previousPercentage = previousTotalMarks > 0 ? Math.round((previousScore / previousTotalMarks) * 100) : 0;

  const handleRetry = () => {
    setIsRetrying(true);
    const initialAnswers = questions.map((q: any) => ({
      questionId: q.id,
      textAnswer: '',
      imageFile: null,
      imagePreview: ''
    }));
    setAnswers(initialAnswers);
  };

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
            <ScrollText className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800">
              {isCompleted ? 'Past Paper Review' : 'Past Paper Assessment'}
            </h1>
          </div>
          {isCompleted && (
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 sm:ml-auto">
              <CheckCircle className="w-4 h-4 mr-1" />
              Completed
            </Badge>
          )}
        </div>

        {/* Previous Score Card - shown when already completed */}
        {hasCompletedBefore && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white mb-4">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 rounded-full p-3">
                    <Trophy className="h-8 w-8 text-yellow-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80">Your Previous Score</p>
                    <p className="text-3xl font-bold">{previousScore}/{previousTotalMarks} <span className="text-lg font-normal">({previousPercentage}%)</span></p>
                  </div>
                </div>
                {!isRetrying && (
                  <Button 
                    onClick={handleRetry}
                    className="bg-white text-green-700 hover:bg-white/90 font-semibold"
                    data-testid="button-retry"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Retry Assessment
                  </Button>
                )}
                {isRetrying && (
                  <Badge className="bg-orange-500 text-white">
                    Retrying...
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-t-lg p-4 sm:p-6">
            <div>
              <CardTitle className="text-xl sm:text-2xl mb-2">{paperData.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="capitalize">{paperData.subject?.replace('-', ' ')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{paperData.year}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{questions.length} Questions</span>
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
          {questions.map((question: any, index: number) => {
            const answer = answers.find(a => a.questionId === question.id);
            const questionNumber = formatQuestionNumber(question.questionNumber || index + 1);
            
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
                      {question.topic && (
                        <Badge variant="secondary" className="text-xs">
                          {question.topic}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <MathText>{question.questionText || ''}</MathText>
                  </div>

                  {question.options && Array.isArray(question.options) && question.options.length > 0 && (
                    <div className="space-y-1 pl-4 border-l-2 border-slate-200">
                      {question.options.map((option: string, idx: number) => (
                        <div key={idx} className="text-slate-700 text-sm">
                          <MathText>{option}</MathText>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.imageUrl && (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200">
                      {imageLoadingStates[question.id] && (
                        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                      )}
                      <img 
                        src={question.imageUrl} 
                        alt={`Question ${questionNumber}`}
                        className="max-w-full h-auto max-h-64 object-contain mx-auto"
                        onLoad={() => setImageLoadingStates(prev => ({ ...prev, [question.id]: false }))}
                        onError={() => setImageLoadingStates(prev => ({ ...prev, [question.id]: false }))}
                      />
                    </div>
                  )}

                  {question.additionalImageUrls && Array.isArray(question.additionalImageUrls) && question.additionalImageUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {question.additionalImageUrls.map((imgUrl: string, idx: number) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200">
                          <img 
                            src={imgUrl} 
                            alt={`Additional ${idx + 1}`}
                            className="max-w-full h-auto max-h-32 object-contain mx-auto"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {!isCompleted && (
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

                  {isCompleted && existingSubmission?.answers && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-800 mb-1">Your Answer:</p>
                      <p className="text-sm text-green-700">
                        {existingSubmission.answers.find((a: any) => a.questionId === question.id)?.answer || 'No answer provided'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isCompleted && questions.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-3 text-lg"
              data-testid="button-submit"
            >
              {submitMutation.isPending ? (
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
          <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={closeCamera}
              className="bg-white/80"
            >
              Cancel
            </Button>
            <Button
              onClick={() => capturePhoto(cameraOpen)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Camera className="w-5 h-5 mr-2" />
              Capture
            </Button>
          </div>
        </div>
      )}

      {/* Submission Loading Overlay */}
      {submitMutation.isPending && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center flex flex-col items-center">
            <div className="loader mb-6" style={{ background: 'transparent' }}></div>
            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              Submitting Your Assessment
            </h3>
            <p className="text-white text-lg drop-shadow-lg">
              Please wait while we process your answers...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
