import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, BookOpen, Target, Edit3, CheckCircle, Clock, Trophy, Dumbbell, Camera, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function AttemptExercisePage() {
  const [, setLocation] = useLocation();
  const [answers, setAnswers] = useState<Array<{ questionId: number; textAnswer: string; imageFile: File | null; imagePreview: string }>>([]);
  const [exerciseData, setExerciseData] = useState<any>({});
  const [cameraOpen, setCameraOpen] = useState<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<number, boolean>>({});
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load exercise data from localStorage
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('attemptingExercise') || '{}');
    if (!data.id) {
      setLocation('/calendar');
      return;
    }
    
    setExerciseData(data);
    
    // Initialize answers for each question
    const initialAnswers = data.questions?.map((q: any) => ({
      questionId: q.id,
      textAnswer: '',
      imageFile: null,
      imagePreview: ''
    })) || [];
    setAnswers(initialAnswers);
    
    // Initialize loading states for questions with images
    const initialLoadingStates: Record<number, boolean> = {};
    data.questions?.forEach((q: any) => {
      if (q.imageUrl) {
        initialLoadingStates[q.id] = true;
      }
    });
    setImageLoadingStates(initialLoadingStates);
  }, [setLocation]);

  // Check if exercise is already completed
  const { data: existingSubmission } = useQuery({
    queryKey: ['/api/exercises', exerciseData.id, 'submission'],
    queryFn: () => apiRequest(`/api/exercises/${exerciseData.id}/submission`),
    enabled: !!exerciseData.id,
  });

  const submitExerciseMutation = useMutation({
    mutationFn: async (submissionData: { answers: Array<{ questionId: string; answer: string }> }) => {
      console.log('Submitting exercise with answers:', submissionData.answers);
      
      return apiRequest(`/api/exercises/${exerciseData.id}/submit`, {
        method: 'POST',
        body: JSON.stringify(submissionData),
      });
    },
    onSuccess: (data) => {
      // Invalidate submission cache so UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['/api/exercises', exerciseData.id, 'submission'] });
      
      // Store the submission data for the feedback page
      localStorage.setItem('exerciseFeedback', JSON.stringify({
        ...data,
        exerciseId: exerciseData.id,
        exercise: exerciseData,
        isExercise: true
      }));
      localStorage.removeItem('attemptingExercise');
      setLocation('/exercise-feedback');
    },
    onError: (error) => {
      console.error('Error submitting exercise:', error);
      alert('Failed to submit exercise. Please try again.');
    },
  });

  const handleTextAnswerChange = (questionId: number, text: string) => {
    setAnswers(prev => prev.map(answer => 
      answer.questionId === questionId 
        ? { ...answer, textAnswer: text }
        : answer
    ));
  };

  // Helper function to compress and convert images for iOS compatibility
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onerror = () => reject(new Error('Failed to load image'));
        
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if image is too large (max 1920px width)
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
          
          // Draw and compress image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with quality 0.8 (good balance of quality/size)
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
    
    // Check if file is an image (accept any image type, including HEIC)
    const isImage = file.type.startsWith('image/') || file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|heic|heif)$/);
    
    if (!isImage) {
      alert('Please upload a valid image file (JPG, PNG, GIF, or HEIC)');
      return;
    }
    
    // Check file size (max 20MB before compression)
    if (file.size > 20 * 1024 * 1024) {
      alert('Image is too large. Please upload an image smaller than 20MB.');
      return;
    }
    
    try {
      // Compress and convert image (handles HEIC and large images from iOS)
      const compressedBase64 = await compressImage(file);
      
      setAnswers(prev => prev.map(answer =>
        answer.questionId === questionId
          ? { ...answer, imageFile: file, imagePreview: compressedBase64 }
          : answer
      ));
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try a different photo or use the camera feature.');
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
    
    // Prepare answers with images (either from file or already base64)
    const answersWithImages = await Promise.all(
      answers
        .filter(answer => answer.textAnswer.trim() || answer.imagePreview)
        .map(async (answer) => {
          let imageUrl = undefined;
          
          // If we have an image preview (either from file upload or camera capture)
          if (answer.imagePreview) {
            // If we have a file object, convert it; otherwise use the existing base64
            if (answer.imageFile) {
              imageUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(answer.imageFile!);
              });
            } else {
              // Already base64 from camera capture
              imageUrl = answer.imagePreview;
            }
          }
          
          return {
            questionId: answer.questionId.toString(),
            answer: answer.textAnswer || '',
            imageUrl
          };
        })
    );
    
    const submissionData = {
      answers: answersWithImages
    };
    
    submitExerciseMutation.mutate(submissionData);
  };

  const formatMathExpression = (text: string) => {
    return text.replace(/\^(\w+|\d+)/g, (match, exp) => `^${exp}`);
  };

  if (!exerciseData.id) {
    return <div>Loading...</div>;
  }

  const totalMarks = exerciseData.questions?.reduce((sum: number, q: any) => sum + (q.marks || 5), 0) || 0;
  const isCompleted = existingSubmission && existingSubmission.isCompleted;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pt-16">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/calendar')} 
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Calendar</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800">
              {isCompleted ? 'Exercise Review' : 'Exercise Attempt'}
            </h1>
          </div>
          {isCompleted && (
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 sm:ml-auto">
              <CheckCircle className="w-4 h-4 mr-1" />
              Completed
            </Badge>
          )}
        </div>

        {/* Exercise Header Card */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg p-4 sm:p-6">
            <div>
              <CardTitle className="text-xl sm:text-2xl mb-2">{exerciseData.title}</CardTitle>
              {exerciseData.description && (
                <p className="text-purple-100 mb-3 text-sm sm:text-base">{exerciseData.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{exerciseData.questions?.length || 0} Questions</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{totalMarks} Marks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="capitalize">{exerciseData.difficulty}</span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Questions */}
        <div className="space-y-6">
          {exerciseData.questions?.map((question: any, index: number) => {
            const answer = answers.find(a => a.questionId === question.id);
            if (!answer) return null;

            return (
              <Card key={question.id} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      Question {question.questionNumber || index + 1}
                    </CardTitle>
                    <Badge variant="outline">
                      {question.marks || 5} mark{(question.marks || 5) !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Text */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 space-y-3">
                    {question.question && (
                      <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {formatMathExpression(question.question)}
                      </p>
                    )}
                    
                    {/* Display question image if available */}
                    {question.imageUrl && (
                      <div className="mt-3">
                        {imageLoadingStates[question.id] ? (
                          <div className="flex justify-center items-center py-12">
                            <div className="loader"></div>
                          </div>
                        ) : (
                          <img 
                            src={question.imageUrl} 
                            alt={`Question ${question.questionNumber || index + 1} image`}
                            className="max-w-full h-auto rounded border border-gray-200"
                            style={{ display: imageLoadingStates[question.id] ? 'none' : 'block' }}
                          />
                        )}
                        <img 
                          src={question.imageUrl} 
                          alt=""
                          className="hidden"
                          onLoad={() => setImageLoadingStates(prev => ({ ...prev, [question.id]: false }))}
                          onError={() => setImageLoadingStates(prev => ({ ...prev, [question.id]: false }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* Answer Input Section */}
                  <div className="space-y-4">
                    <h5 className="text-md font-medium text-gray-900 flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-green-600" />
                      Your Answer
                    </h5>
                    
                    {/* Text Answer */}
                    <div className="space-y-2">
                      <Label htmlFor={`text-answer-${question.id}`} className="text-sm font-medium text-gray-700">
                        Written Solution
                      </Label>
                      <Textarea
                        id={`text-answer-${question.id}`}
                        value={answer.textAnswer}
                        onChange={(e) => handleTextAnswerChange(question.id, e.target.value)}
                        placeholder="Show your work step by step..."
                        className="min-h-[100px] resize-none"
                        disabled={isCompleted}
                      />
                    </div>

                    {/* Image Upload */}
                    {!isCompleted && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">
                          Upload Solution Image (Optional)
                        </Label>
                        
                        {answer.imagePreview ? (
                          <div className="relative border border-gray-200 rounded-lg overflow-hidden">
                            <img
                              src={answer.imagePreview}
                              alt="Solution preview"
                              className="w-full h-auto"
                            />
                            <button
                              onClick={() => removeImage(question.id)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                            <div className="text-center mb-4">
                              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm text-gray-600">Upload an image</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(question.id, e)}
                                className="hidden"
                                id={`image-upload-${question.id}`}
                              />
                              <label
                                htmlFor={`image-upload-${question.id}`}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700 transition font-medium text-sm"
                              >
                                <Upload className="w-4 h-4" />
                                Choose File
                              </label>
                              <button
                                type="button"
                                onClick={() => openCamera(question.id)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                              >
                                <Camera className="w-4 h-4" />
                                Take Photo
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        {!isCompleted && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mt-6">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  disabled={submitExerciseMutation.isPending}
                >
                  {submitExerciseMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit All Answers
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setLocation('/calendar')}
                  variant="outline"
                  className="px-8"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {isCompleted && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mt-6">
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
                <CheckCircle className="w-6 h-6" />
                <span className="text-lg font-medium">Exercise Completed!</span>
              </div>
              <p className="text-gray-600 mb-4">
                You have already completed this exercise. Check your feedback for detailed results.
              </p>
              <Button
                onClick={() => setLocation('/exercise-feedback')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Trophy className="w-4 h-4 mr-2" />
                View Feedback
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full-Screen Camera Overlay */}
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
          <div className="p-4 bg-black/50 flex gap-3">
            <Button
              onClick={() => capturePhoto(cameraOpen)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-lg py-6"
            >
              <Camera className="w-6 h-6 mr-2" />
              Capture Photo
            </Button>
            <Button
              onClick={closeCamera}
              variant="outline"
              className="flex-1 text-lg py-6 bg-white/90"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Submission Loading Overlay */}
      {submitExerciseMutation.isPending && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center flex flex-col items-center">
            <div className="loader mb-6" style={{ background: 'transparent' }}></div>
            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              Submitting Your Exercise
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