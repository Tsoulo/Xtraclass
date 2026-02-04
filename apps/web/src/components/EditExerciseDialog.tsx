import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, X, Edit, Upload, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTopicsWithThemes } from "@/hooks/useTopics";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import { buildApiUrl } from "@/lib/api";

interface GeneratedQuestion {
  question: string;
  answer: string;
  marks: number;
  imageType?: string;
  imageParams?: any;
  imageUrl?: string;
}

interface EditExerciseDialogProps {
  exercise: any;
  selectedGrade: string;
  selectedSubject: string;
  onSuccess?: () => void;
}

interface QuestionForm {
  id?: number;
  topicId: number;
  themeId: number;
  question: string;
  answer: string;
  marks: number;
  imageUrl?: string;
}

interface Theme {
  id: number;
  name: string;
  description: string;
  topicId: number;
}

export default function EditExerciseDialog({ 
  exercise, 
  selectedGrade, 
  selectedSubject, 
  onSuccess 
}: EditExerciseDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Exercise form state
  const [exerciseForm, setExerciseForm] = useState({
    title: exercise.title || "",
    description: exercise.description || "",
    difficulty: exercise.difficulty || "medium"
  });

  // Questions state
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionForm>({
    topicId: 0,
    themeId: 0,
    question: "",
    answer: "",
    marks: 5
  });

  // Theme management
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
  
  // AI Reference Image state
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [referenceImagePreviews, setReferenceImagePreviews] = useState<string[]>([]);
  const [isGeneratingFromReference, setIsGeneratingFromReference] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showApprovalPreview, setShowApprovalPreview] = useState(false);
  const [currentApprovalIndex, setCurrentApprovalIndex] = useState(0);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  
  // Get topics and themes
  const { topics, isLoading: topicsLoading } = useTopicsWithThemes(selectedGrade, selectedSubject);

  // Initialize questions when dialog opens
  useEffect(() => {
    if (open && exercise.questions) {
      setQuestions(exercise.questions.map((q: any) => ({
        id: q.id,
        topicId: q.topicId,
        themeId: q.themeId,
        question: q.question,
        answer: q.answer,
        marks: q.marks,
        imageUrl: q.imageUrl
      })));
    }
  }, [open, exercise]);

  // Update available themes when topic changes
  useEffect(() => {
    if (currentQuestion.topicId > 0 && topics.length > 0) {
      const selectedTopic = topics.find(t => t.id === currentQuestion.topicId);
      const newThemes = selectedTopic?.themes || [];
      setAvailableThemes(newThemes);
    } else {
      setAvailableThemes([]);
    }
  }, [currentQuestion.topicId]);

  const addQuestion = () => {
    if (currentQuestion.topicId === 0 || currentQuestion.themeId === 0 || !currentQuestion.question.trim() || !currentQuestion.answer.trim()) {
      toast({
        title: "Incomplete Question",
        description: "Please fill in all fields for the question.",
        variant: "destructive",
      });
      return;
    }

    setQuestions(prev => [...prev, { ...currentQuestion }]);
    setCurrentQuestion({
      topicId: 0,
      themeId: 0,
      question: "",
      answer: "",
      marks: 5
    });
    setAvailableThemes([]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // AI Reference Image handlers
  const handleReferenceImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setReferenceImages(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
    setReferenceImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearReferenceImages = () => {
    setReferenceImages([]);
    setReferenceImagePreviews([]);
    setGeneratedQuestions([]);
    setShowApprovalPreview(false);
    setCurrentApprovalIndex(0);
  };

  const generateFromReferenceImages = async () => {
    if (referenceImages.length === 0 || currentQuestion.topicId === 0 || currentQuestion.themeId === 0) {
      toast({
        title: "Missing Information",
        description: "Please select topic, theme, and upload at least one reference image.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingFromReference(true);

    try {
      const selectedTopic = topics.find(t => t.id === currentQuestion.topicId);
      const selectedTheme = availableThemes.find(t => t.id === currentQuestion.themeId);
      const token = authService.getToken();

      const formData = new FormData();
      referenceImages.forEach(img => {
        formData.append('referenceImages', img);
      });
      formData.append('topicId', currentQuestion.topicId.toString());
      formData.append('themeId', currentQuestion.themeId.toString());
      formData.append('grade', selectedGrade);
      formData.append('topicName', selectedTopic?.name || '');
      formData.append('themeName', selectedTheme?.name || '');

      const response = await fetch(buildApiUrl('/api/exercises/generate-from-reference'), {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate question');
      }

      const data = await response.json();
      
      setGeneratedQuestions([{
        question: data.question,
        answer: data.answer,
        marks: data.marks || 5,
        imageType: data.imageType,
        imageParams: data.imageParams,
        imageUrl: data.generatedImageUrl || data.imageUrl
      }]);
      setShowApprovalPreview(true);
      setCurrentApprovalIndex(0);

      toast({
        title: "Question Generated",
        description: "Review the generated question before adding it.",
      });
    } catch (error: any) {
      console.error('Error generating from reference:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate question from reference images.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFromReference(false);
    }
  };

  const approveGeneratedQuestion = () => {
    const currentQ = generatedQuestions[currentApprovalIndex];
    if (!currentQ) return;

    const newQuestion: QuestionForm = {
      topicId: currentQuestion.topicId,
      themeId: currentQuestion.themeId,
      question: currentQ.question,
      answer: currentQ.answer,
      marks: currentQ.marks,
      imageUrl: currentQ.imageUrl
    };

    setQuestions(prev => [...prev, newQuestion]);
    
    toast({
      title: "Question Added",
      description: "The generated question has been added to the exercise.",
    });

    clearReferenceImages();
  };

  const skipCurrentQuestion = () => {
    clearReferenceImages();
    toast({
      title: "Question Discarded",
      description: "The generated question was discarded.",
    });
  };

  const handleUpdateExercise = async () => {
    if (!exerciseForm.title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a title for the exercise.",
        variant: "destructive",
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "No Questions",
        description: "Please add at least one question to the exercise.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const exerciseData = {
        title: exerciseForm.title.trim(),
        description: exerciseForm.description?.trim() || "",
        difficulty: exerciseForm.difficulty,
        questions: questions.map(q => ({
          topicId: q.topicId,
          themeId: q.themeId,
          question: q.question,
          answer: q.answer,
          marks: q.marks,
          imageUrl: q.imageUrl || null,
          attachments: []
        }))
      };

      // Update exercise with questions
      await apiRequest(`/api/exercises/${exercise.id}`, {
        method: 'PUT',
        body: JSON.stringify(exerciseData)
      });
      
      toast({
        title: "Success",
        description: `Exercise updated successfully!`,
      });

      // Close dialog and reset
      setOpen(false);
      
      // Invalidate queries to refresh data - use predicate to match all exercise queries
      console.log('Invalidating exercise queries after edit...');
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const matches = query.queryKey[0] && 
                         typeof query.queryKey[0] === 'string' && 
                         query.queryKey[0].includes('/api/exercises');
          if (matches) {
            console.log('Invalidating query:', query.queryKey[0]);
          }
          return matches;
        },
        refetchType: 'all'
      });
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error: any) {
      console.error("Error updating exercise:", error);
      toast({
        title: "Error",
        description: `Failed to update exercise: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
          <DialogDescription>
            Update the exercise details and questions for {selectedGrade} {selectedSubject}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Exercise Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exercise Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={exerciseForm.title}
                  onChange={(e) => setExerciseForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter exercise title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={exerciseForm.description}
                  onChange={(e) => setExerciseForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter exercise description"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={exerciseForm.difficulty} onValueChange={(value) => setExerciseForm(prev => ({ ...prev, difficulty: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Existing Questions */}
          {questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Questions ({questions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">Question {index + 1}:</span>
                            <span className="text-sm text-gray-600">({question.marks} marks)</span>
                          </div>
                          <p className="text-sm mb-2">{question.question}</p>
                          <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                            <strong>Answer:</strong> {question.answer}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add New Question */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="topic">Topic</Label>
                  <Select value={currentQuestion.topicId.toString()} onValueChange={(value) => {
                    setCurrentQuestion(prev => ({ ...prev, topicId: parseInt(value), themeId: 0 }));
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id.toString()}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select 
                    value={currentQuestion.themeId.toString()} 
                    onValueChange={(value) => setCurrentQuestion(prev => ({ ...prev, themeId: parseInt(value) }))}
                    disabled={availableThemes.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableThemes.map((theme) => (
                        <SelectItem key={theme.id} value={theme.id.toString()}>
                          {theme.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="Enter the question"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="answer">Answer</Label>
                <Textarea
                  id="answer"
                  value={currentQuestion.answer}
                  onChange={(e) => setCurrentQuestion(prev => ({ ...prev, answer: e.target.value }))}
                  placeholder="Enter the answer"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="marks">Marks</Label>
                <Input
                  id="marks"
                  type="number"
                  min="1"
                  value={currentQuestion.marks}
                  onChange={(e) => setCurrentQuestion(prev => ({ ...prev, marks: parseInt(e.target.value) || 5 }))}
                />
              </div>

              <Button onClick={addQuestion} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>

              {/* AI Reference Image Section */}
              <div className="border-t pt-4 mt-4">
                <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-purple-800 text-sm">AI from Reference Images</h5>
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">Vision AI + Python</span>
                  </div>
                  
                  <p className="text-xs text-purple-700 mb-3">
                    Upload reference images and AI will analyze them together to create ONE matching question with a Python-generated diagram.
                  </p>
                  
                  {showApprovalPreview && generatedQuestions.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded">
                        <span>Generated question ready for review</span>
                      </div>
                      
                      <div className="p-3 bg-white rounded border border-purple-200">
                        <h6 className="font-medium text-sm text-purple-800 mb-2">Generated Question Preview</h6>
                        {generatedQuestions[currentApprovalIndex]?.imageUrl && (
                          <div className="mb-2">
                            <img 
                              src={generatedQuestions[currentApprovalIndex].imageUrl} 
                              alt="Generated diagram" 
                              className="max-h-32 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setEnlargedImageUrl(generatedQuestions[currentApprovalIndex].imageUrl || null)}
                            />
                            <p className="text-xs text-gray-500 mt-1">Click to enlarge</p>
                          </div>
                        )}
                        <p className="text-sm mb-2">{generatedQuestions[currentApprovalIndex]?.question}</p>
                        <p className="text-sm text-green-700 bg-green-50 p-2 rounded mb-2">
                          <strong>Answer:</strong> {generatedQuestions[currentApprovalIndex]?.answer}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>Type: {generatedQuestions[currentApprovalIndex]?.imageType || 'N/A'}</span>
                          <span>Marks: {generatedQuestions[currentApprovalIndex]?.marks}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={approveGeneratedQuestion}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Question
                        </Button>
                        <Button
                          onClick={skipCurrentQuestion}
                          variant="outline"
                          size="sm"
                        >
                          Discard
                        </Button>
                        <Button
                          onClick={clearReferenceImages}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {referenceImagePreviews.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {referenceImagePreviews.map((preview, index) => (
                            <div key={index} className="relative">
                              <img 
                                src={preview} 
                                alt={`Reference ${index + 1}`} 
                                className="h-16 w-16 object-cover rounded border"
                              />
                              <button
                                onClick={() => removeReferenceImage(index)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <label className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleReferenceImageSelect}
                            className="hidden"
                          />
                          <div className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 text-sm">
                            <Upload className="h-4 w-4 text-purple-600" />
                            <span className="text-purple-700">
                              {referenceImagePreviews.length > 0 ? 'Add More' : 'Upload Reference Images'}
                            </span>
                          </div>
                        </label>
                        
                        {referenceImagePreviews.length > 0 && (
                          <Button
                            onClick={generateFromReferenceImages}
                            disabled={isGeneratingFromReference || currentQuestion.topicId === 0 || currentQuestion.themeId === 0}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                            size="sm"
                          >
                            {isGeneratingFromReference ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-1" />
                                Generate
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {currentQuestion.topicId === 0 || currentQuestion.themeId === 0 ? (
                        <p className="text-xs text-amber-600">Select topic and theme above first</p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enlarged Image Modal */}
          {enlargedImageUrl && (
            <div 
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setEnlargedImageUrl(null)}
            >
              <div className="relative max-w-4xl max-h-[90vh]">
                <img 
                  src={enlargedImageUrl} 
                  alt="Enlarged diagram" 
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                />
                <button
                  onClick={() => setEnlargedImageUrl(null)}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateExercise} 
              disabled={isUpdating || topicsLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isUpdating ? "Updating..." : "Update Exercise"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}