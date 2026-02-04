import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { X, Upload, FileImage, BookOpen, Target, Edit3, CheckCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface AttemptExerciseProps {
  exercise: {
    id: number;
    title: string;
    subject: string;
    difficulty: string;
    questions: Array<{
      id: number;
      questionNumber: number;
      question: string;
      marks: number;
      imageUrl?: string;
    }>;
  };
  onClose: () => void;
  onSubmit: (answers: Array<{ questionId: number; answer: string; imageFile?: File }>) => void;
  onHomeworkSubmit?: (homework: any, answers: any[]) => void;
  isHomework?: boolean;
}

export default function AttemptExercise({ exercise, onClose, onSubmit, onHomeworkSubmit, isHomework }: AttemptExerciseProps) {
  const [, setLocation] = useLocation();
  const [answers, setAnswers] = useState<Array<{ questionId: number; textAnswer: string; imageFile: File | null; imagePreview: string }>>([]);

  // Check if exercise is already completed
  const { data: existingSubmission } = useQuery({
    queryKey: ['/api/exercises', exercise.id, 'submission'],
    queryFn: () => apiRequest(`/api/exercises/${exercise.id}/submission`),
    enabled: !isHomework, // Only check for regular exercises, not homework
  });

  // Mutation for submitting exercises
  const submitExerciseMutation = useMutation({
    mutationFn: async (submissionData: { answers: Array<{ questionId: number; answer: string }>; score: number }) => {
      return apiRequest(`/api/exercises/${exercise.id}/submit`, {
        method: 'POST',
        body: JSON.stringify(submissionData),
      });
    },
    onSuccess: (data) => {
      // Store the submission data for the homework feedback page
      const feedbackData = {
        exerciseId: exercise.id,
        exercise: exercise,
        score: data.score || 0,
        totalMarks: data.totalMarks || exercise.questions.reduce((sum, q) => sum + q.marks, 0),
        answers: data.answers || [],
        isExercise: true, // Flag to identify this as an exercise
        ...data
      };
      localStorage.setItem('homeworkFeedback', JSON.stringify(feedbackData));
      
      // Invalidate exercise-related queries so calendar refreshes automatically
      queryClient.invalidateQueries({
        queryKey: ['/api/exercises', exercise.id, 'submission']
      });
      
      // Invalidate general exercise queries for calendar refresh
      queryClient.invalidateQueries({
        predicate: (query) => {
          const hasExerciseKey = query.queryKey.some(key => 
            typeof key === 'string' && key.startsWith('/api/exercises')
          );
          return hasExerciseKey;
        }
      });
      
      // Navigate to homework feedback page (same as homework flow)
      setLocation('/homework-feedback');
    },
    onError: (error) => {
      console.error('Error submitting exercise:', error);
      alert('Failed to submit exercise. Please try again.');
    },
  });

  // Initialize answers array for all questions
  useEffect(() => {
    const initialAnswers = exercise.questions.map(q => ({
      questionId: q.id,
      textAnswer: '',
      imageFile: null,
      imagePreview: ''
    }));
    setAnswers(initialAnswers);
  }, [exercise.questions]);

  // Format mathematical expressions with proper superscripts
  const formatMathExpression = (text: string): string => {
    if (!text) return text;
    
    return text
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

  const handleImageUpload = (questionId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setAnswers(prev => prev.map(answer => 
          answer.questionId === questionId 
            ? { ...answer, imageFile: file, imagePreview: preview }
            : answer
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextAnswerChange = (questionId: number, text: string) => {
    setAnswers(prev => prev.map(answer => 
      answer.questionId === questionId 
        ? { ...answer, textAnswer: text }
        : answer
    ));
  };

  const handleSubmit = () => {
    const hasAnswers = answers.some(answer => answer.textAnswer.trim() || answer.imageFile);
    if (!hasAnswers) {
      alert('Please provide at least one answer.');
      return;
    }
    
    const submissionData = answers
      .filter(answer => answer.textAnswer.trim() || answer.imageFile)
      .map(answer => ({
        questionId: answer.questionId,
        answer: answer.textAnswer,
        imageFile: answer.imageFile || undefined
      }));
    
    if (isHomework && onHomeworkSubmit) {
      // Handle homework submission with feedback
      onHomeworkSubmit(exercise, submissionData);
    } else {
      // Handle regular exercise submission using the API
      const apiSubmissionData = {
        answers: submissionData.map(answer => ({
          questionId: answer.questionId,
          answer: answer.answer
        })),
        score: 0 // Basic score - can be enhanced later
      };
      submitExerciseMutation.mutate(apiSubmissionData);
    }
  };

  const removeImage = (questionId: number) => {
    setAnswers(prev => prev.map(answer => 
      answer.questionId === questionId 
        ? { ...answer, imageFile: null, imagePreview: '' }
        : answer
    ));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900">
              Exercise Attempt
            </h2>
            {existingSubmission && existingSubmission.isCompleted && (
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                <CheckCircle className="w-4 h-4 mr-1" />
                Completed
              </Badge>
            )}
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Exercise Header */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {exercise.title}
              </h3>
              <Badge variant="secondary" className="ml-auto">
                {exercise.questions.reduce((total, q) => total + q.marks, 0)} marks total
              </Badge>
            </div>
            
            <div className="text-sm text-gray-600">
              {exercise.questions.length} question{exercise.questions.length !== 1 ? 's' : ''} • {exercise.difficulty} difficulty
            </div>
          </div>

          {/* Questions and Answer Input Section */}
          {exercise.questions.map((question, index) => {
            const answer = answers.find(a => a.questionId === question.id);
            if (!answer) return null;

            return (
              <div key={question.id} className="border border-gray-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Question {question.questionNumber}
                  </h4>
                  <Badge variant="outline">
                    {question.marks} mark{question.marks !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                    {formatMathExpression(question.question)}
                  </p>
                  
                  {/* Display question image if available */}
                  {question.imageUrl && (
                    <div className="mt-3">
                      <img 
                        src={question.imageUrl} 
                        alt={`Question ${question.questionNumber} image`}
                        className="max-w-full h-auto rounded border border-gray-200"
                      />
                    </div>
                  )}
                </div>

                {/* Answer Input */}
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
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Upload Solution Image (Optional)
                    </Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(question.id, e)}
                        className="hidden"
                        id={`image-upload-${question.id}`}
                      />
                      <label
                        htmlFor={`image-upload-${question.id}`}
                        className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                      >
                        <Upload className="w-6 h-6 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Click to upload solution image
                        </span>
                      </label>
                    </div>

                    {/* Image Preview */}
                    {answer.imagePreview && (
                      <div className="relative border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={answer.imagePreview}
                          alt="Solution preview"
                          className="w-full h-auto"
                        />
                        <button
                          onClick={() => removeImage(question.id)}
                          className="absolute top-2 right-2 p-1 bg-red-100 hover:bg-red-200 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit All Answers
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="px-6"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}