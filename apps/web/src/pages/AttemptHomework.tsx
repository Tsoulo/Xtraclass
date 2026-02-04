import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, FileImage, BookOpen, Target, Edit3, CheckCircle, Send, Maximize2, Minimize2, ChevronLeft, ChevronRight, Grid3X3, Monitor, Flag, Camera, X } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AttemptHomeworkPageProps {
  exercise?: any;
}

export default function AttemptHomeworkPage({ exercise }: AttemptHomeworkPageProps) {
  const [, setLocation] = useLocation();
  const [answers, setAnswers] = useState<Array<{ questionId: string; textAnswer: string; imageFile: File | null; imagePreview: string }>>([]);
  const [homeworkData, setHomeworkData] = useState<any>({});
  const [expandedTextarea, setExpandedTextarea] = useState<string | null>(null);
  const [isFullScreenMode, setIsFullScreenMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [currentReportQuestion, setCurrentReportQuestion] = useState<any>(null);
  const [reportType, setReportType] = useState("");
  const [reportComments, setReportComments] = useState("");
  const [cameraOpen, setCameraOpen] = useState<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const reportIssueMutation = useMutation({
    mutationFn: async (reportData: any) => {
      return apiRequest('/api/question-reports', {
        method: 'POST',
        body: reportData,
      });
    },
    onSuccess: () => {
      setReportDialogOpen(false);
      setReportType("");
      setReportComments("");
      setCurrentReportQuestion(null);
      alert('Thank you for your report. We will review the question and improve it.');
    },
    onError: (error) => {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    },
  });

  const submitHomeworkMutation = useMutation({
    mutationFn: async (submissionData: { answers: Array<{ questionId: string; answer: string; imageUrl?: string }> }) => {
      console.log('Submitting with answers:', submissionData.answers);
      
      // Check if this is an exercise (from tutorial) or homework
      if (homeworkData.isExercise || homeworkData.fromTutorial) {
        // Submit as exercise
        return apiRequest(`/api/exercises/${homeworkData.id}/submit`, {
          method: 'POST',
          body: submissionData,
        });
      } else {
        // Submit as homework
        return apiRequest(`/api/homework/${homeworkData.id}/submit`, {
          method: 'POST',
          body: submissionData,
        });
      }
    },
    onSuccess: (data) => {
      // Clear the saved answers from localStorage
      const storageKey = `homework_answers_${homeworkData.id}`;
      localStorage.removeItem(storageKey);
      console.log('🗑️ Cleared saved answers from localStorage');
      
      // Store the submission data for the feedback page
      if (homeworkData.isExercise || homeworkData.fromTutorial) {
        // For exercises, store in tutorialFeedback and navigate to tutorial-feedback
        const feedbackData = {
          ...data,
          exerciseId: homeworkData.id,
          exercise: homeworkData,
          isExercise: true,
          fromTutorial: true
        };
        localStorage.setItem('tutorialFeedback', JSON.stringify(feedbackData));
        console.log('✅ Stored tutorial feedback data:', feedbackData);
        localStorage.removeItem('attemptingHomework');
        
        // Use longer timeout and verify data is saved before navigation (fixes mobile issue)
        setTimeout(() => {
          // Verify the data is actually in localStorage
          const savedData = localStorage.getItem('tutorialFeedback');
          console.log('🔍 Verifying saved data exists:', savedData ? 'YES' : 'NO');
          console.log('🔄 Navigating to tutorial feedback page...');
          setLocation('/tutorial-feedback');
        }, 300);
      } else {
        // For homework, store in homeworkFeedback and navigate to homework-feedback
        localStorage.setItem('homeworkFeedback', JSON.stringify(data));
        localStorage.removeItem('attemptingHomework');
        
        // Use longer timeout and verify data is saved before navigation
        setTimeout(() => {
          const savedData = localStorage.getItem('homeworkFeedback');
          console.log('🔍 Verifying homework data exists:', savedData ? 'YES' : 'NO');
          setLocation('/homework-feedback');
        }, 300);
      }
    },
    onError: (error) => {
      console.error('Error submitting:', error);
      const itemType = homeworkData.isExercise || homeworkData.fromTutorial ? 'exercise' : 'homework';
      alert(`Failed to submit ${itemType}. Please try again.`);
    },
  });

  // Load homework data once on component mount
  useEffect(() => {
    const data = exercise || JSON.parse(localStorage.getItem('attemptingHomework') || '{}');
    console.log('🔍 AttemptHomework - Raw data from localStorage:', data);
    console.log('🔍 AttemptHomework - Questions field type:', typeof data.questions);
    console.log('🔍 AttemptHomework - Questions content:', data.questions);
    
    // Parse questions if they're stored as a JSON string
    if (typeof data.questions === 'string') {
      try {
        data.questions = JSON.parse(data.questions);
        console.log('🔍 AttemptHomework - Parsed questions from string:', data.questions);
      } catch (e) {
        console.error('❌ Failed to parse questions JSON:', e);
        data.questions = [];
      }
    } else if (!Array.isArray(data.questions)) {
      data.questions = [];
    }
    
    console.log('🔍 AttemptHomework - Final questions array length:', data.questions?.length || 0);
    setHomeworkData(data);
    
    // Initialize answers array - ALWAYS create entries for ALL questions first
    if (data.questions && data.questions.length > 0) {
      // Create base answers for all questions
      const baseAnswers = data.questions.map((q: any) => ({
        questionId: String(q.id), // Normalize to string to avoid type mismatch
        textAnswer: '',
        imageFile: null,
        imagePreview: ''
      }));
      
      // Try to restore saved answers from localStorage
      const storageKey = `homework_answers_${data.id}`;
      const savedAnswers = localStorage.getItem(storageKey);
      
      if (savedAnswers) {
        try {
          const parsed = JSON.parse(savedAnswers);
          console.log('📦 Restoring answers from localStorage:', parsed.length);
          
          // Create a map of saved answers by questionId for quick lookup
          const savedMap = new Map(
            parsed.map((saved: any) => [String(saved.questionId), saved])
          );
          
          // Merge saved answers into base answers
          const mergedAnswers = baseAnswers.map((base: any) => {
            const saved: any = savedMap.get(base.questionId);
            if (saved) {
              return {
                ...base,
                textAnswer: saved.textAnswer || '',
                imagePreview: saved.imageData || ''
              };
            }
            return base;
          });
          
          console.log('✅ Merged answers - total questions:', mergedAnswers.length);
          setAnswers(mergedAnswers);
        } catch (e) {
          console.error('Failed to parse saved answers, using base answers:', e);
          setAnswers(baseAnswers);
        }
      } else {
        console.log('🔍 No saved answers, initialized fresh for questions:', baseAnswers.length);
        setAnswers(baseAnswers);
      }
    }
  }, []); // Empty dependency array - only run once on mount

  // DISABLED: Save answers to localStorage - this was causing mobile reloads
  // Text answers are now only saved on submit, not on every change
  // useEffect(() => {
  //   if (answers.length > 0 && homeworkData.id) {
  //     const storageKey = `homework_answers_${homeworkData.id}`;
  //     const answersToSave = answers.map(answer => ({
  //       questionId: answer.questionId,
  //       textAnswer: answer.textAnswer,
  //       imageData: '',
  //       hasImage: false
  //     }));
  //     try {
  //       localStorage.setItem(storageKey, JSON.stringify(answersToSave));
  //     } catch (error: any) {
  //       console.error('Failed to save to localStorage:', error);
  //     }
  //   }
  // }, [answers, homeworkData.id]);

  // Extract only the question part, removing any solution steps that may have leaked in
  // ULTRA-CONSERVATIVE: Only remove explicitly marked solutions on their own line
  const extractQuestionOnly = (text: string): string => {
    if (!text) return text;
    
    // Only remove content that appears after a newline or double-space followed by:
    // "Solution:", "Answer:"  (avoid "Step n:" to prevent breaking instructional questions)
    // This catches cases like: "Solve for x: 3x=10\nSolution: x=10/3"
    const solutionMarkers = [
      /(?:\n|\s{2,})Solution:/i,
      /(?:\n|\s{2,})Answer:/i,
    ];
    
    let cleanedText = text;
    
    for (const marker of solutionMarkers) {
      const match = cleanedText.match(marker);
      if (match && match.index !== undefined) {
        // Truncate at the solution marker
        cleanedText = cleanedText.substring(0, match.index).trim();
        break; // Stop after first marker found
      }
    }
    
    return cleanedText;
  };

  // Format mathematical expressions with proper superscripts
  const formatMathExpression = (text: string): string => {
    if (!text) return text;
    
    // First extract only the question part
    const questionOnly = extractQuestionOnly(text);
    
    // Then format math expressions
    return questionOnly
      .replace(/(\w|\))\^0/g, '$1⁰')
      .replace(/(\w|\))\^1/g, '$1¹')
      .replace(/(\w|\))\^2/g, '$1²')
      .replace(/(\w|\))\^3/g, '$1³')
      .replace(/(\w|\))\^4/g, '$1⁴')
      .replace(/(\w|\))\^5/g, '$1⁵')
      .replace(/(\w|\))\^6/g, '$1⁶')
      .replace(/(\w|\))\^7/g, '$1⁷')
      .replace(/(\w|\))\^8/g, '$1⁸')
      .replace(/(\w|\))\^9/g, '$1⁹')
      .replace(/(\w|\))\^(-?\w+)/g, '$1^($2)');
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
      
      const normalizedId = String(questionId);
      setAnswers(prev => {
        const index = prev.findIndex(a => a.questionId === normalizedId);
        
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], imageFile: file, imagePreview: compressedBase64 };
          return updated;
        } else {
          return [...prev, {
            questionId: normalizedId,
            textAnswer: '',
            imageFile: file,
            imagePreview: compressedBase64
          }];
        }
      });
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try a different photo or use the camera feature.');
    }
  };

  const handleTextAnswerChange = (questionId: number, text: string) => {
    const normalizedId = String(questionId);
    setAnswers(prev => {
      const index = prev.findIndex(a => a.questionId === normalizedId);
      
      if (index >= 0) {
        // Update existing answer
        const updated = [...prev];
        updated[index] = { ...updated[index], textAnswer: text };
        return updated;
      } else {
        // Upsert: add new answer if somehow missing
        return [...prev, {
          questionId: normalizedId,
          textAnswer: text,
          imageFile: null,
          imagePreview: ''
        }];
      }
    });
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
          
          // If we have an image preview (either from file upload or restored from localStorage)
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
              // Already base64 from localStorage restore
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
    
    submitHomeworkMutation.mutate(submissionData);
  };

  const removeImage = (questionId: number) => {
    const normalizedId = String(questionId);
    setAnswers(prev => prev.map(answer => 
      answer.questionId === normalizedId 
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
        
        const normalizedId = String(questionId);
        setAnswers(prev => {
          const index = prev.findIndex(a => a.questionId === normalizedId);
          
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = { 
              ...updated[index], 
              imageFile: null,
              imagePreview: imageData 
            };
            return updated;
          } else {
            return [...prev, {
              questionId: normalizedId,
              textAnswer: '',
              imageFile: null,
              imagePreview: imageData
            }];
          }
        });
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

  // No cleanup needed for base64 images
  useEffect(() => {
    return () => {
      // Cleanup handled automatically with base64
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only cleanup on unmount

  const handleBack = () => {
    // Clear attempting homework data and return to calendar
    localStorage.removeItem('attemptingHomework');
    setLocation('/calendar');
  };

  const openReportDialog = (question: any) => {
    setCurrentReportQuestion(question);
    setReportDialogOpen(true);
  };

  const submitReport = () => {
    if (!reportType || !reportComments.trim() || !currentReportQuestion) return;

    const issueTypeMap: { [key: string]: string } = {
      'unclear_question': 'Unclear Question Wording',
      'missing_information': 'Missing Information',
      'question_error': 'Question Error/Typo',
      'technical_issue': 'Technical Issue',
      'upload_problem': 'Upload Problem',
      'other': 'Other'
    };

    const reportData = {
      homeworkId: homeworkData.id,
      exerciseId: homeworkData.isExercise || homeworkData.fromTutorial ? homeworkData.id : null,
      topicId: homeworkData.topicId || null,
      themeId: homeworkData.themeId || null,
      questionId: currentReportQuestion.id,
      reportType,
      title: issueTypeMap[reportType],
      comments: reportComments,
      studentAnswer: answers.find(a => a.questionId === String(currentReportQuestion.id))?.textAnswer || '',
      expectedScore: null,
      questionText: currentReportQuestion.question,
      questionNumber: currentReportQuestion.questionNumber,
      maxPoints: currentReportQuestion.marks,
      context: 'attempting_homework'
    };

    reportIssueMutation.mutate(reportData);
  };

  if (!homeworkData.title) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <Card className="p-4 sm:p-6 w-full max-w-sm sm:max-w-md">
          <div className="text-center">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              No {homeworkData.isExercise || homeworkData.fromTutorial ? 'Exercise' : 'Homework'} Found
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              The {homeworkData.isExercise || homeworkData.fromTutorial ? 'exercise' : 'homework'} you're trying to access could not be found.
            </p>
            <Button onClick={() => setLocation('/calendar')} className="w-full h-11 sm:h-10 text-base" size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Calendar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isFullScreenMode) {
    // Full Screen Mode - Takes over entire viewport
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-auto">
        <div className="min-h-screen p-3 sm:p-4 md:p-6">
          <div className="max-w-full sm:max-w-4xl lg:max-w-5xl mx-auto">
            {/* Full Screen Header with Exit Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-1">
                <Button
                  onClick={() => setIsFullScreenMode(false)}
                  variant="outline"
                  size="default"
                  className="flex items-center gap-2 h-10 sm:h-9 text-sm w-full sm:w-auto"
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span className="sm:hidden">Exit</span>
                  <span className="hidden sm:inline">Exit Full Screen</span>
                </Button>
                <div className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  <span className="sm:hidden">{homeworkData.title}</span>
                  <span className="hidden sm:inline">{homeworkData.title} - Full Screen Mode</span>
                </div>
              </div>
              
              <Button
                onClick={handleSubmit}
                size="default"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 h-11 sm:h-10 text-base sm:text-sm w-full sm:w-auto"
                disabled={submitHomeworkMutation.isPending}
              >
                <Send className="w-4 h-4" />
                <span className="font-medium">
                  {submitHomeworkMutation.isPending ? 'Submitting...' : 
                    `Submit ${homeworkData.isExercise || homeworkData.fromTutorial ? 'Exercise' : 'Homework'}`}
                </span>
              </Button>
            </div>

            {/* Question Navigation */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6 sm:mb-8">
              <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
                <Button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                  size="default"
                  className="h-11 sm:h-9 px-4 text-base sm:text-sm flex-1 sm:flex-none"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-base sm:text-lg text-gray-600 font-medium whitespace-nowrap px-2">
                  {currentQuestionIndex + 1} of {homeworkData.questions?.length}
                </span>
                <Button
                  onClick={() => setCurrentQuestionIndex(Math.min(homeworkData.questions?.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === homeworkData.questions?.length - 1}
                  variant="outline"
                  size="default"
                  className="h-11 sm:h-9 px-4 text-base sm:text-sm flex-1 sm:flex-none"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 flex-wrap">
                {homeworkData.questions?.map((_: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-10 h-10 sm:w-9 sm:h-9 rounded-full text-sm font-medium transition-colors touch-manipulation ${
                      index === currentQuestionIndex
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300 active:bg-gray-400'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Full Screen Question Content */}
            {homeworkData.questions?.[currentQuestionIndex] && (() => {
              const question = homeworkData.questions[currentQuestionIndex];
              const answer = answers.find((a: any) => a.questionId === String(question.id));
              if (!answer) return null;

              return (
                <div className="space-y-8">
                  {/* Question Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0 sm:justify-between bg-blue-50 p-4 sm:p-6 rounded-xl">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-900 flex items-center gap-2 sm:gap-3">
                      <Target className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-blue-600" />
                      Question {question.questionNumber}
                    </h3>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openReportDialog(question)}
                        className="text-gray-600 hover:text-gray-800 text-sm px-3 py-2 h-9"
                        data-testid={`button-report-question-fullscreen-${question.id}`}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Report Issue
                      </Button>
                      <Badge variant="outline" className="text-base sm:text-lg px-3 py-1 sm:px-4 sm:py-2">
                        {question.marks} mark{question.marks !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8">
                    <p className="text-base sm:text-lg lg:text-xl text-gray-800 leading-relaxed">{question.question}</p>
                  </div>

                  {/* Answer Input Section */}
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor={`fullscreen-answer-${question.id}`} className="text-lg sm:text-xl font-medium text-gray-700 flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" />
                        Your Answer
                      </Label>
                      <Textarea
                        id={`fullscreen-answer-${question.id}`}
                        placeholder="Type your answer here... (Full screen mode is perfect for equations!)"
                        value={answer.textAnswer}
                        onChange={(e) => handleTextAnswerChange(question.id, e.target.value)}
                        className="min-h-[200px] sm:min-h-[300px] lg:min-h-[400px] text-base sm:text-lg lg:text-xl leading-relaxed resize-none border-2 focus:border-blue-500 touch-manipulation"
                        rows={15}
                        style={{
                          fontSize: window.innerWidth < 640 ? '16px' : window.innerWidth < 1024 ? '18px' : '20px',
                          lineHeight: '1.8'
                        }}
                      />
                    </div>

                    {/* Image Upload Section */}
                    <div>
                      <Label className="text-lg sm:text-xl font-medium text-gray-700 flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                        <FileImage className="w-5 h-5 sm:w-6 sm:h-6" />
                        Upload Image (Optional)
                      </Label>
                      
                      {answer.imagePreview ? (
                        <div className="relative">
                          <img 
                            src={answer.imagePreview} 
                            alt="Answer upload" 
                            className="max-w-full h-48 sm:h-64 lg:h-80 object-contain border-2 rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(question.id)}
                            className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-lg"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 lg:p-12">
                          <div className="text-center mb-6">
                            <Upload className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mx-auto mb-4 sm:mb-6 text-gray-400" />
                            <p className="text-lg sm:text-xl text-gray-600 mb-2">Upload an image</p>
                            <p className="text-base sm:text-lg text-gray-500">PNG, JPG up to 10MB</p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(question.id, e)}
                              className="hidden"
                              id={`fullscreen-image-${question.id}`}
                            />
                            <label 
                              htmlFor={`fullscreen-image-${question.id}`} 
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700 transition font-medium text-base sm:text-lg"
                            >
                              <Upload className="w-5 h-5" />
                              Choose File
                            </label>
                            <button
                              type="button"
                              onClick={() => openCamera(question.id)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-base sm:text-lg"
                            >
                              <Camera className="w-5 h-5" />
                              Take Photo
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-none sm:max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Button
              onClick={handleBack}
              variant="ghost"
              size="default"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 h-10 sm:h-9 text-base sm:text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">Back to Calendar</span>
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                {homeworkData.isExercise || homeworkData.fromTutorial ? 'Practice Exercise' : 'Homework Assignment'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-none sm:max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Homework Header */}
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{homeworkData.title}</h2>
                  <p className="text-sm text-gray-600">{homeworkData.subject} • {homeworkData.difficulty}</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full">
                {/* View Toggle Button */}
                <Button
                  onClick={() => setIsFullScreenMode(!isFullScreenMode)}
                  variant="outline"
                  size="default"
                  className="flex items-center justify-center gap-2 h-11 sm:h-9 text-base sm:text-sm flex-1 sm:flex-initial"
                >
                  {isFullScreenMode ? (
                    <>
                      <Grid3X3 className="w-4 h-4" />
                      <span className="sm:hidden">All</span>
                      <span className="hidden sm:inline">All Questions</span>
                    </>
                  ) : (
                    <>
                      <Monitor className="w-4 h-4" />
                      <span className="sm:hidden">Full Screen</span>
                      <span className="hidden sm:inline">Full Screen</span>
                    </>
                  )}
                </Button>
                
                <Badge variant="secondary" className="text-sm sm:text-base px-3 py-2 justify-center flex-1 sm:flex-initial">
                  {homeworkData.questions?.reduce((total: number, q: any) => total + q.marks, 0)} marks total
                </Badge>
              </div>
            </div>
            
            {homeworkData.description && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <p className="text-sm sm:text-base text-blue-800">{homeworkData.description}</p>
              </div>
            )}

            <div className="mt-4 text-sm sm:text-base text-gray-600">
              {homeworkData.questions?.length} question{homeworkData.questions?.length !== 1 ? 's' : ''} • Complete all questions to submit
            </div>
          </Card>

          {/* Questions and Answer Input Section */}
          {!isFullScreenMode ? (
            // Normal View - All Questions
            homeworkData.questions?.map((question: any, index: number) => {
              const answer = answers.find(a => a.questionId === String(question.id));
              if (!answer) return null;

              return (
                <Card key={question.id} className="p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 sm:justify-between">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 flex items-center gap-2">
                        <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        Question {question.questionNumber}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openReportDialog(question)}
                          className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1 h-7"
                          data-testid={`button-report-question-${question.id}`}
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          Report Issue
                        </Button>
                        <Badge variant="outline" className="text-sm px-2 py-1">
                          {question.marks} mark{question.marks !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <p className="text-sm sm:text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                      {formatMathExpression(question.question)}
                    </p>
                  </div>

                  {/* Answer Input Section */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor={`answer-${question.id}`} className="text-sm sm:text-base font-medium text-gray-700 flex items-center gap-2">
                          <Edit3 className="w-4 h-4" />
                          Your Answer
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="default"
                          onClick={() => setExpandedTextarea(expandedTextarea === question.id ? null : question.id)}
                          className="text-gray-500 hover:text-gray-700 h-9 sm:h-8 text-sm px-3"
                        >
                          {expandedTextarea === question.id ? (
                            <>
                              <Minimize2 className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Minimize</span>
                              <span className="sm:hidden">Min</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Enlarge</span>
                              <span className="sm:hidden">Max</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <Textarea
                        id={`answer-${question.id}`}
                        placeholder="Type your answer here... (Use the Enlarge button for better equation writing)"
                        value={answer.textAnswer}
                        onChange={(e) => handleTextAnswerChange(question.id, e.target.value)}
                        className={`mt-2 resize-none transition-all duration-300 touch-manipulation ${
                          expandedTextarea === question.id 
                            ? "min-h-[300px] sm:min-h-[400px] text-base sm:text-lg leading-relaxed" 
                            : "min-h-[120px] sm:min-h-[100px] text-base"
                        }`}
                        rows={expandedTextarea === question.id ? 15 : 5}
                        style={{
                          fontSize: expandedTextarea === question.id ? (window.innerWidth < 640 ? '16px' : '18px') : '16px',
                          lineHeight: expandedTextarea === question.id ? '1.6' : '1.4'
                        }}
                      />
                    </div>

                    {/* Image Upload Section */}
                    <div>
                      <Label className="text-sm sm:text-base font-medium text-gray-700 flex items-center gap-2 mb-2">
                        <FileImage className="w-4 h-4" />
                        Upload Image (Optional)
                      </Label>
                      
                      {answer.imagePreview ? (
                        <div className="relative">
                          <img 
                            src={answer.imagePreview} 
                            alt="Answer upload" 
                            className="max-w-full h-36 sm:h-48 object-contain border rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(question.id)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6">
                          <div className="text-center mb-4">
                            <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" />
                            <p className="text-sm sm:text-base text-gray-600 mb-1">Upload an image</p>
                            <p className="text-xs sm:text-sm text-gray-500">PNG, JPG up to 10MB</p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <input
                              type="file"
                              accept="image/*,.heic,.heif"
                              onChange={(e) => handleImageUpload(question.id, e)}
                              className="hidden"
                              id={`image-${question.id}`}
                            />
                            <label 
                              htmlFor={`image-${question.id}`} 
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
                  </div>
                </div>
              </Card>
            );
          })
          ) : null}

          {/* Submit Section */}
          <Card className="p-4 sm:p-6 mb-4 sm:mb-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0 sm:justify-between">
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Ready to Submit?</h3>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Review your answers before submitting your {homeworkData.isExercise || homeworkData.fromTutorial ? 'exercise' : 'homework'}.
                </p>
              </div>
              <Button 
                onClick={handleSubmit}
                size="default"
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 h-12 sm:h-auto text-base sm:text-sm font-medium w-full sm:w-auto px-6"
                disabled={submitHomeworkMutation.isPending}
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-center">
                  {submitHomeworkMutation.isPending ? 'Submitting...' : 
                    `Submit ${homeworkData.isExercise || homeworkData.fromTutorial ? 'Exercise' : 'Homework'}`}
                </span>
              </Button>
            </div>
          </Card>
        </div>

        {/* Report Issue Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-600" />
                Report Issue with Question
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="report-type">Issue Type *</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of issue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unclear_question">Unclear Question Wording</SelectItem>
                    <SelectItem value="missing_information">Missing Information</SelectItem>
                    <SelectItem value="question_error">Question Error/Typo</SelectItem>
                    <SelectItem value="technical_issue">Technical Issue</SelectItem>
                    <SelectItem value="upload_problem">Upload Problem</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="report-comments">Detailed Comments *</Label>
                <Textarea
                  id="report-comments"
                  value={reportComments}
                  onChange={(e) => setReportComments(e.target.value)}
                  placeholder="Please describe the issue with this question in detail..."
                  className="min-h-[100px]"
                  data-testid="textarea-report-comments"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-medium text-gray-800 mb-1">Question Information:</p>
                <p className="text-gray-600">Question {currentReportQuestion?.questionNumber}: {currentReportQuestion?.question?.substring(0, 100)}{currentReportQuestion?.question?.length > 100 ? '...' : ''}</p>
                <p className="text-gray-600">Worth: {currentReportQuestion?.marks} mark{currentReportQuestion?.marks !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setReportDialogOpen(false)}
                data-testid="button-cancel-report"
              >
                Cancel
              </Button>
              <Button 
                onClick={submitReport}
                disabled={reportIssueMutation.isPending || !reportType || !reportComments.trim()}
                data-testid="button-submit-report"
              >
                {reportIssueMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>

      {/* Full-Screen Camera Overlay */}
      {cameraOpen !== null && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col" style={{ height: '100dvh' }}>
          <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div 
            className="p-4 bg-black/50 flex gap-3 flex-shrink-0" 
            style={{ 
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
              minHeight: '100px'
            }}
          >
            <Button
              onClick={() => capturePhoto(cameraOpen)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-lg py-6 min-h-[60px]"
            >
              <Camera className="w-6 h-6 mr-2" />
              Capture Photo
            </Button>
            <Button
              onClick={closeCamera}
              variant="outline"
              className="flex-1 text-lg py-6 bg-white/90 min-h-[60px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Submission Loading Overlay */}
      {submitHomeworkMutation.isPending && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center flex flex-col items-center">
            <div className="loader mb-6" style={{ background: 'transparent' }}></div>
            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              Submitting Your {homeworkData.isExercise || homeworkData.fromTutorial ? 'Exercise' : 'Homework'}
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