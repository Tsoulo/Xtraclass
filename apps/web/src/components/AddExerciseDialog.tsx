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
import { Plus, Trash2, Save, X, Sparkles, ImagePlus, Loader2, LineChart, Triangle, Circle as CircleIcon, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTopicsWithThemes } from "@/hooks/useTopics";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import { buildApiUrl } from "@/lib/api";
import MathText from "@/components/MathText";

interface AddExerciseDialogProps {
  selectedGrade: string;
  selectedSubject: string;
  selectedDate: string;
  onSuccess?: () => void;
}

interface QuestionForm {
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

interface Topic {
  id: number;
  name: string;
  description: string;
  grade: string;
  subject: string;
  themes: Theme[];
}

export default function AddExerciseDialog({ 
  selectedGrade, 
  selectedSubject, 
  selectedDate,
  onSuccess 
}: AddExerciseDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  
  // Exercise form state
  const [exerciseForm, setExerciseForm] = useState({
    date: selectedDate,
    title: "",
    description: "",
    difficulty: "medium"
  });
  
  // Questions state
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionForm>({
    topicId: 0,
    themeId: 0,
    question: "",
    answer: "",
    marks: 5,
    imageUrl: undefined
  });

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Math image generator state
  const [mathImageType, setMathImageType] = useState<string>('linear');
  const [mathImageParams, setMathImageParams] = useState<Record<string, any>>({});
  const [isGeneratingMathImage, setIsGeneratingMathImage] = useState(false);
  const [generatedMathImageUrl, setGeneratedMathImageUrl] = useState<string | null>(null);

  // WolframAlpha image generator state
  const [wolframImageType, setWolframImageType] = useState<string>('linear');
  const [wolframImageParams, setWolframImageParams] = useState<Record<string, any>>({});
  const [isGeneratingWolframImage, setIsGeneratingWolframImage] = useState(false);
  const [generatedWolframImageUrl, setGeneratedWolframImageUrl] = useState<string | null>(null);

  // Reference image AI generation state (supports multiple images)
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [referenceImagePreviews, setReferenceImagePreviews] = useState<string[]>([]);
  const [isGeneratingFromReference, setIsGeneratingFromReference] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<{
    question: string;
    answer: string;
    marks: number;
    imageUrl: string | null;
    imageType: string;
    imageParams: Record<string, any>;
  }[]>([]);
  const [showApprovalPreview, setShowApprovalPreview] = useState(false);
  const [currentApprovalIndex, setCurrentApprovalIndex] = useState(0);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);

  // AI Generation settings
  const [questionCount, setQuestionCount] = useState(5);
  const [aiImageGenerator, setAiImageGenerator] = useState<'python' | 'wolfram'>('python');

  // Theme management
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
  
  // Get topics and themes
  const { topics, isLoading: topicsLoading } = useTopicsWithThemes(selectedGrade, selectedSubject);

  // Update exercise date when selectedDate changes
  useEffect(() => {
    setExerciseForm(prev => ({ ...prev, date: selectedDate }));
  }, [selectedDate]);

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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return null;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const token = authService.getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildApiUrl('/api/exercises/upload-question-image'), {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to upload image' }));
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setGeneratedMathImageUrl(null);
    setGeneratedWolframImageUrl(null);
    setCurrentQuestion(prev => ({ ...prev, imageUrl: undefined }));
  };

  // Handle reference image selection for AI generation (supports multiple)
  const handleReferenceImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setReferenceImages(prev => [...prev, ...newFiles]);
      
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReferenceImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Remove a specific reference image
  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
    setReferenceImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Generate ONE question from ALL reference images using AI vision
  const generateFromReferenceImage = async () => {
    if (referenceImages.length === 0 || currentQuestion.topicId === 0 || currentQuestion.themeId === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a topic, theme, and upload at least one reference image.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingFromReference(true);
    setGeneratedQuestions([]);
    setCurrentApprovalIndex(0);
    
    try {
      const selectedTopic = topics.find(t => t.id === currentQuestion.topicId);
      const selectedTheme = availableThemes.find(t => t.id === currentQuestion.themeId);
      const token = authService.getToken();
      
      // Send ALL images in a single request - AI will analyze them together
      const formData = new FormData();
      referenceImages.forEach((file, index) => {
        formData.append('referenceImages', file);
      });
      formData.append('topicId', currentQuestion.topicId.toString());
      formData.append('themeId', currentQuestion.themeId.toString());
      formData.append('grade', selectedGrade);
      formData.append('topicName', selectedTopic?.name || '');
      formData.append('themeName', selectedTheme?.name || '');
      formData.append('imageGenerator', aiImageGenerator);

      const response = await fetch(buildApiUrl('/api/exercises/generate-from-reference'), {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate question' }));
        throw new Error(errorData.error || 'Failed to generate question');
      }

      const data = await response.json();
      
      // Single question result from all images
      setGeneratedQuestions([{
        question: data.question,
        answer: data.answer || '',
        marks: data.marks || 5,
        imageUrl: data.generatedImageUrl,
        imageType: data.imageType,
        imageParams: data.imageParams || {}
      }]);
      setShowApprovalPreview(true);
      
      toast({
        title: "Question Generated",
        description: "Review the question below and approve to add it.",
      });
    } catch (error) {
      console.error('Error generating from reference:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate question from reference images.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFromReference(false);
    }
  };

  // Approve current question and move to next or finish
  const approveGeneratedQuestion = () => {
    if (generatedQuestions.length === 0) return;
    
    const currentQ = generatedQuestions[currentApprovalIndex];
    
    // Add to questions list directly
    const newQuestion: QuestionForm = {
      topicId: currentQuestion.topicId,
      themeId: currentQuestion.themeId,
      question: currentQ.question,
      answer: currentQ.answer,
      marks: currentQ.marks,
      imageUrl: currentQ.imageUrl || undefined
    };
    setQuestions(prev => [...prev, newQuestion]);
    
    // Move to next question or finish
    if (currentApprovalIndex < generatedQuestions.length - 1) {
      setCurrentApprovalIndex(prev => prev + 1);
      toast({
        title: "Question Added",
        description: `Question ${currentApprovalIndex + 1} of ${generatedQuestions.length} added. Review the next one.`,
      });
    } else {
      // All done
      setShowApprovalPreview(false);
      setReferenceImages([]);
      setReferenceImagePreviews([]);
      setGeneratedQuestions([]);
      setCurrentApprovalIndex(0);
      
      toast({
        title: "All Questions Added",
        description: `${generatedQuestions.length} question${generatedQuestions.length > 1 ? 's have' : ' has'} been added to the exercise.`,
      });
    }
  };

  // Skip current question and move to next
  const skipCurrentQuestion = () => {
    if (currentApprovalIndex < generatedQuestions.length - 1) {
      setCurrentApprovalIndex(prev => prev + 1);
    } else {
      setShowApprovalPreview(false);
      setReferenceImages([]);
      setReferenceImagePreviews([]);
      setGeneratedQuestions([]);
      setCurrentApprovalIndex(0);
      
      toast({
        title: "Review Complete",
        description: "Finished reviewing generated questions.",
      });
    }
  };

  // Approve all remaining questions at once
  const approveAllQuestions = () => {
    const remainingQuestions = generatedQuestions.slice(currentApprovalIndex);
    const newQuestions: QuestionForm[] = remainingQuestions.map(q => ({
      topicId: currentQuestion.topicId,
      themeId: currentQuestion.themeId,
      question: q.question,
      answer: q.answer,
      marks: q.marks,
      imageUrl: q.imageUrl || undefined
    }));
    
    setQuestions(prev => [...prev, ...newQuestions]);
    setShowApprovalPreview(false);
    setReferenceImages([]);
    setReferenceImagePreviews([]);
    setGeneratedQuestions([]);
    setCurrentApprovalIndex(0);
    
    toast({
      title: "All Questions Added",
      description: `${remainingQuestions.length} question${remainingQuestions.length > 1 ? 's have' : ' has'} been added to the exercise.`,
    });
  };

  // Clear reference images and preview
  const clearReferenceImage = () => {
    setReferenceImages([]);
    setReferenceImagePreviews([]);
    setGeneratedQuestions([]);
    setShowApprovalPreview(false);
    setCurrentApprovalIndex(0);
  };

  // Generate math image using Python matplotlib
  const generateMathImage = async () => {
    setIsGeneratingMathImage(true);
    try {
      const token = authService.getToken();
      
      // Transform UI params to backend format for special types
      let transformedParams = { ...mathImageParams };
      
      // Parse comma-separated strings into arrays where needed
      if (mathImageType === 'cyclicQuadrilateral' && mathImageParams.anglesStr) {
        transformedParams.angles = mathImageParams.anglesStr.split(',').map((s: string) => parseFloat(s.trim())).filter((n: number) => !isNaN(n));
      }
      
      if (mathImageType === 'vector') {
        transformedParams.vectors = [{
          x: mathImageParams.vectorX || 3,
          y: mathImageParams.vectorY || 2,
          label: 'a',
          color: 'blue'
        }];
      }
      
      if (mathImageType === 'similarityCongruence') {
        transformedParams.type = mathImageParams.similarType || 'similar';
      }
      
      const response = await fetch(buildApiUrl('/api/math-image/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: mathImageType,
          params: transformedParams
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate image' }));
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      setGeneratedMathImageUrl(data.imageUrl);
      setImagePreview(data.imageUrl);
      setCurrentQuestion(prev => ({ ...prev, imageUrl: data.imageUrl }));
      
      toast({
        title: "Image Generated",
        description: "Math image generated successfully. You can now add the question.",
      });
    } catch (error) {
      console.error('Error generating math image:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate math image.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMathImage(false);
    }
  };

  // Generate image using WolframAlpha API
  const generateWolframImage = async () => {
    setIsGeneratingWolframImage(true);
    try {
      const token = authService.getToken();
      
      // Transform UI params to backend format
      let transformedParams = { ...wolframImageParams };
      
      const response = await fetch(buildApiUrl('/api/wolfram/generate-image'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: wolframImageType,
          params: transformedParams
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate image' }));
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      setGeneratedWolframImageUrl(data.imageUrl);
      setImagePreview(data.imageUrl);
      setCurrentQuestion(prev => ({ ...prev, imageUrl: data.imageUrl }));
      
      toast({
        title: "Image Generated",
        description: "WolframAlpha image generated successfully. You can now add the question.",
      });
    } catch (error) {
      console.error('Error generating WolframAlpha image:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate WolframAlpha image.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingWolframImage(false);
    }
  };

  // Get default params based on image type
  const getDefaultParams = (type: string): Record<string, any> => {
    switch (type) {
      case 'linear':
        return { m: 2, c: 1, xMin: -10, xMax: 10, showGrid: true };
      case 'quadratic':
        return { a: 1, b: 0, c: 0, xMin: -10, xMax: 10, showGrid: true };
      case 'trig':
        return { function: 'sin', amplitude: 1, period: 6.28, phase: 0, xMin: -10, xMax: 10 };
      case 'exponential':
        return { a: 1, base: 2, c: 0, xMin: -5, xMax: 5 };
      case 'logarithm':
        return { a: 1, base: 2.718, c: 0, xMin: 0.1, xMax: 10 };
      case 'hyperbola':
        return { a: 1, c: 0, xMin: -10, xMax: 10 };
      case 'triangle':
        return { points: [[0, 0], [4, 0], [2, 3]], labels: ['A', 'B', 'C'], showSides: true, fill: false };
      case 'circle':
        return { center: [0, 0], radius: 3, showCenter: true, showRadius: true };
      case 'rectangle':
        return { origin: [0, 0], width: 6, height: 4, labels: ['A', 'B', 'C', 'D'], showDimensions: true };
      case 'angle':
        return { vertex: [0, 0], angle1: 0, angle2: 45, rayLength: 5, showMeasurement: true };
      case 'numberLine':
        return { start: -10, end: 10, showIntegers: true, markedPoints: [{ value: 3, label: 'P', color: 'red' }] };
      case 'coordinatePlane':
        return { points: [{ x: 2, y: 3, label: 'A' }, { x: -1, y: 2, label: 'B' }], xRange: [-10, 10], yRange: [-10, 10], connectPoints: false };
      case 'fraction':
        return { numerator: 3, denominator: 4, shape: 'circle' };
      case 'venn':
        return { sets: 2, labels: ['A', 'B'], showLabels: true };
      case 'pie':
        return { values: [30, 20, 50], labels: ['Part A', 'Part B', 'Part C'], showPercentages: true };
      case 'bar':
        return { values: [4, 7, 2, 5], labels: ['Mon', 'Tue', 'Wed', 'Thu'], title: 'Data' };
      case 'transformation':
        return { originalPoints: [[0, 0], [2, 0], [2, 2], [0, 2]], transformation: 'translate', transformParams: { dx: 3, dy: 2 } };
      case 'cyclicQuadrilateral':
        return { radius: 4, angles: [30, 100, 200, 280], labels: ['A', 'B', 'C', 'D'], showCircle: true, showAngles: true, showDiagonals: false };
      case 'tangentSecant':
        return { radius: 3, tangentAngle: 90, showTangent: true, showSecant: true, secantAngle: 30, showRadiusToTangent: true };
      case 'bearing':
        return { bearing: 45, distance: 5, showCompass: true, startLabel: 'A', endLabel: 'B', showAngle: true };
      case 'vector':
        return { vectors: [{ x: 3, y: 2, label: 'a', color: 'blue' }], origin: [0, 0], showComponents: false, showResultant: false };
      case 'similarityCongruence':
        return { type: 'similar', scale: 0.6, triangle1: [[0, 0], [4, 0], [2, 3]], offset: [6, 0], showTicks: true, showAngles: true };
      case 'circleTheorem':
        return { theorem: 'inscribed_angle', radius: 4, showLabels: true, showAngleValues: true };
      case 'proofDiagram':
        return { proofType: 'triangle_midpoints', showLabels: true, showMarkings: true };
      case 'parallelLines':
        return { spacing: 3, transversalAngle: 60, showAngles: true, showLabels: true };
      default:
        return {};
    }
  };

  // Update params when type changes
  useEffect(() => {
    setMathImageParams(getDefaultParams(mathImageType));
  }, [mathImageType]);

  // Update wolfram params when type changes
  useEffect(() => {
    setWolframImageParams(getWolframDefaultParams(wolframImageType));
  }, [wolframImageType]);

  // Get default params for WolframAlpha based on image type
  const getWolframDefaultParams = (type: string): Record<string, any> => {
    switch (type) {
      case 'linear':
        return { m: 2, c: 1 };
      case 'quadratic':
        return { a: 1, b: 0, c: 0 };
      case 'trig':
        return { function: 'sin', amplitude: 1, period: 360 };
      case 'exponential':
        return { a: 1, base: 2, c: 0 };
      case 'logarithm':
        return { a: 1, base: 10, c: 0 };
      case 'hyperbola':
        return { a: 1, c: 0 };
      case 'circle':
        return { radius: 3 };
      case '3d_surface':
        return { surfaceType: 'paraboloid' };
      case 'custom':
        return { expression: '' };
      default:
        return {};
    }
  };

  const addQuestion = async () => {
    // Check if answer is provided
    if (!currentQuestion.answer.trim()) {
      toast({
        title: "Missing Answer",
        description: "Please provide an answer for the question.",
        variant: "destructive",
      });
      return;
    }

    // Check if at least question text OR image is provided
    const hasQuestionText = currentQuestion.question.trim().length > 0;
    const hasImage = selectedImage || currentQuestion.imageUrl;
    
    if (!hasQuestionText && !hasImage) {
      toast({
        title: "Missing Question",
        description: "Please provide either question text or upload an image.",
        variant: "destructive",
      });
      return;
    }

    if (currentQuestion.topicId === 0 || currentQuestion.themeId === 0) {
      toast({
        title: "Missing Topic/Theme",
        description: "Please select both topic and theme for the question.",
        variant: "destructive",
      });
      return;
    }

    // Upload image if one is selected
    let imageUrl = currentQuestion.imageUrl;
    if (selectedImage && !imageUrl) {
      imageUrl = await handleImageUpload();
      if (!imageUrl) {
        // Upload failed, don't add the question
        return;
      }
    }

    const newQuestion = { ...currentQuestion, imageUrl };
    console.log('Adding question to array:', newQuestion);
    setQuestions(prev => {
      const updated = [...prev, newQuestion];
      console.log('Questions array after add:', updated);
      return updated;
    });
    
    toast({
      title: "Question Added",
      description: `Question ${questions.length + 1} added successfully.`,
    });
    
    // Reset current question form
    setCurrentQuestion({
      topicId: 0,
      themeId: 0,
      question: "",
      answer: "",
      marks: 5,
      imageUrl: undefined
    });
    setAvailableThemes([]);
    clearImage();
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // AI Question Generation function
  const generateQuestionsWithAI = async () => {
    if (!selectedGrade || !selectedSubject) {
      toast({
        title: "Missing Information",
        description: "Grade and subject are required for AI generation.",
        variant: "destructive",
      });
      return;
    }

    // Require topic selection for AI generation
    if (!currentQuestion.topicId || currentQuestion.topicId === 0) {
      toast({
        title: "Topic Required",
        description: "Please select a topic before generating questions.",
        variant: "destructive",
      });
      return;
    }

    // Get topic and theme context if available
    const selectedTopic = topics?.find(t => t.id === currentQuestion.topicId);
    const selectedTheme = availableThemes.find(th => th.id === currentQuestion.themeId);
    
    // Build context with topic and theme information
    let topicContext = exerciseForm.title || `${selectedGrade} ${selectedSubject.replace('-', ' ')}`;
    let themeContext = '';
    
    if (selectedTopic) {
      topicContext = selectedTopic.name;
      if (selectedTheme) {
        themeContext = selectedTheme.name;
      }
    }

    setIsGeneratingQuestions(true);

    try {
      const result = await apiRequest('/api/mcp/test-basic-exercise', {
        method: 'POST',
        body: JSON.stringify({
          context: {
            grade: selectedGrade,
            subject: selectedSubject,
            topic: topicContext,
            theme: themeContext,
            difficulty: exerciseForm.difficulty,
            syllabus: 'CAPS'
          },
          numQuestions: questionCount
        })
      });
      
      if (result.status === 'success' && result.exercise?.questions) {
        // Convert MCP questions to exercise questions format
        const generatedQuestions: QuestionForm[] = result.exercise.questions.map((q: any) => ({
          topicId: currentQuestion.topicId || 0,
          themeId: currentQuestion.themeId || 0,
          question: q.question,
          answer: q.solution || '',
          marks: q.marks || 5
        }));

        // Add generated questions to existing questions
        setQuestions(prev => [...prev, ...generatedQuestions]);
        
        const contextInfo = themeContext ? `${topicContext} - ${themeContext}` : topicContext;
        toast({
          title: "Questions Generated!",
          description: `Successfully generated ${generatedQuestions.length} questions for ${contextInfo}.`,
        });
        
      } else {
        throw new Error('Failed to generate questions');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleCreateExercise = async () => {
    console.log('handleCreateExercise - Current state:', {
      date: exerciseForm.date,
      title: exerciseForm.title,
      questionsCount: questions.length,
      questions: questions
    });
    
    if (!exerciseForm.date || !exerciseForm.title.trim() || questions.length === 0) {
      console.log('Validation failed:', {
        hasDate: !!exerciseForm.date,
        hasTitle: !!exerciseForm.title.trim(),
        questionsLength: questions.length
      });
      toast({
        title: "Missing Information",
        description: "Please fill in exercise details and add at least one question.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedGrade || !selectedSubject) {
      toast({
        title: "Missing Grade/Subject",
        description: "Grade and subject are required.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const exerciseData = {
        date: exerciseForm.date,
        grade: selectedGrade,
        subject: selectedSubject,
        title: exerciseForm.title.trim(),
        description: exerciseForm.description?.trim() || "",
        difficulty: exerciseForm.difficulty,
        term: null,
        week: null
      };

      const questionsData = questions.map((q) => ({
        topicId: q.topicId,
        themeId: q.themeId,
        question: q.question.trim(),
        answer: q.answer.trim(),
        marks: q.marks,
        imageUrl: q.imageUrl,
        attachments: []
      }));

      console.log('Creating exercise with payload:', JSON.stringify({
        ...exerciseData,
        questions: questionsData
      }, null, 2));

      const response = await apiRequest('/api/exercises', {
        method: 'POST',
        body: JSON.stringify({
          ...exerciseData,
          questions: questionsData
        })
      });
      
      toast({
        title: "Success",
        description: `Exercise created with ${questions.length} question${questions.length !== 1 ? 's' : ''}!`,
      });

      // Reset form
      setExerciseForm({
        date: selectedDate,
        title: "",
        description: "",
        difficulty: "medium"
      });
      setQuestions([]);
      setCurrentQuestion({
        topicId: 0,
        themeId: 0,
        question: "",
        answer: "",
        marks: 5
      });
      setAvailableThemes([]);
      
      // Close dialog
      setOpen(false);
      
      // Invalidate queries to refresh data - match both exercise and student assignment queries
      console.log('Invalidating exercise and assignment queries after creation...');
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          const matches = Boolean(key && 
                         typeof key === 'string' && 
                         (key.includes('/api/exercises') || key.includes('/api/students')));
          if (matches) {
            console.log('Invalidating query:', key);
          }
          return matches;
        },
        refetchType: 'active'
      });
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error("Error creating exercise:", error);
      toast({
        title: "Error",
        description: `Failed to create exercise: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Exercise
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Exercise</DialogTitle>
          <DialogDescription>
            Create a new exercise with multiple questions for Grade {selectedGrade} {selectedSubject.replace('-', ' ')} on {selectedDate}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Exercise Details */}
          <Card>
            <CardHeader>
              <CardTitle>Exercise Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={exerciseForm.date}
                    onChange={(e) => setExerciseForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select 
                    value={exerciseForm.difficulty} 
                    onValueChange={(value) => setExerciseForm(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="title">Exercise Title</Label>
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
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Questions ({questions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Added Questions List */}
              {questions.length > 0 && (
                <div className="space-y-2">
                  {questions.map((q, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                      <div className="flex-1">
                        <p className="font-medium">Question {index + 1}</p>
                        {q.question ? (
                          <p className="text-sm text-gray-600 truncate">{q.question}</p>
                        ) : q.imageUrl ? (
                          <p className="text-sm text-blue-600 italic flex items-center gap-1">
                            <ImagePlus className="h-4 w-4" />
                            Image question
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-500">{q.marks} marks</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add New Question Form */}
              <div className="space-y-4 p-4 border rounded">
                <h4 className="font-medium">Add Question</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="topic">Topic</Label>
                    <Select 
                      value={currentQuestion.topicId > 0 ? currentQuestion.topicId.toString() : ""} 
                      onValueChange={(value) => setCurrentQuestion(prev => ({ ...prev, topicId: parseInt(value), themeId: 0 }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {topics?.map((topic) => (
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
                      value={currentQuestion.themeId > 0 ? currentQuestion.themeId.toString() : ""} 
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
                    {availableThemes.length === 0 && currentQuestion.topicId > 0 && (
                      <p className="text-sm text-gray-500 mt-1">No themes available for this topic</p>
                    )}
                  </div>
                </div>

                {/* AI Question Generation */}
                <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <h5 className="font-medium text-purple-800 text-sm">AI Question Generator</h5>
                    </div>
                    {currentQuestion.topicId === 0 && (
                      <span className="text-xs text-orange-600">⚠️ Select topic first</span>
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="questionCount" className="text-xs text-purple-700">Questions to Generate</Label>
                      <Input
                        id="questionCount"
                        type="number"
                        min="1"
                        max="20"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="mt-1 h-9"
                        disabled={isGeneratingQuestions}
                      />
                    </div>
                    <Button
                      onClick={generateQuestionsWithAI}
                      disabled={isGeneratingQuestions || !selectedGrade || !selectedSubject || currentQuestion.topicId === 0}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-9"
                      size="sm"
                    >
                      {isGeneratingQuestions ? (
                        <>
                          <span className="animate-spin mr-1">⏳</span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="question">Question Text (Optional if image is provided)</Label>
                  <Textarea
                    id="question"
                    value={currentQuestion.question}
                    onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="Enter question text or upload an image below"
                    rows={3}
                  />
                </div>

                {/* Image Section - Upload or Generate */}
                <div className="space-y-3">
                  <Label>Question Image (Optional)</Label>
                  
                  {/* Preview if image exists */}
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Question preview" 
                        className="max-w-full h-auto max-h-48 rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={clearImage}
                        className="absolute top-2 right-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      {generatedMathImageUrl && (
                        <span className="absolute bottom-2 left-2 bg-green-600 text-white px-2 py-1 text-xs rounded">
                          Generated with Python
                        </span>
                      )}
                    </div>
                  ) : (
                    <Tabs defaultValue="upload" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="upload" className="text-xs">
                          <ImagePlus className="h-3 w-3 mr-1" />
                          Upload
                        </TabsTrigger>
                        <TabsTrigger value="generate" className="text-xs">
                          <LineChart className="h-3 w-3 mr-1" />
                          Python
                        </TabsTrigger>
                        <TabsTrigger value="wolfram" className="text-xs">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Wolfram
                        </TabsTrigger>
                        <TabsTrigger value="aiReference" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="upload" className="mt-3">
                        <div className="flex items-center gap-2">
                          <Input
                            id="questionImage"
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="flex-1"
                            data-testid="input-question-image"
                          />
                          <ImagePlus className="h-5 w-5 text-gray-400" />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="generate" className="mt-3 space-y-3">
                        <div className="p-3 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-3">
                            <LineChart className="h-4 w-4 text-green-600" />
                            <h5 className="font-medium text-green-800 text-sm">Math Image Generator</h5>
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Python + Matplotlib</span>
                          </div>
                          
                          {/* Image Type Selection */}
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs text-green-700">Image Type</Label>
                              <Select value={mathImageType} onValueChange={setMathImageType}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="linear">Linear Graph (y = mx + c)</SelectItem>
                                  <SelectItem value="quadratic">Quadratic Graph (y = ax² + bx + c)</SelectItem>
                                  <SelectItem value="trig">Trigonometric (sin, cos, tan)</SelectItem>
                                  <SelectItem value="exponential">Exponential Graph</SelectItem>
                                  <SelectItem value="logarithm">Logarithm Graph</SelectItem>
                                  <SelectItem value="hyperbola">Hyperbola (y = a/x)</SelectItem>
                                  <SelectItem value="triangle">Triangle</SelectItem>
                                  <SelectItem value="circle">Circle</SelectItem>
                                  <SelectItem value="rectangle">Rectangle</SelectItem>
                                  <SelectItem value="angle">Angle</SelectItem>
                                  <SelectItem value="numberLine">Number Line</SelectItem>
                                  <SelectItem value="coordinatePlane">Coordinate Plane</SelectItem>
                                  <SelectItem value="fraction">Fraction Visual</SelectItem>
                                  <SelectItem value="venn">Venn Diagram</SelectItem>
                                  <SelectItem value="pie">Pie Chart</SelectItem>
                                  <SelectItem value="bar">Bar Chart</SelectItem>
                                  <SelectItem value="transformation">Transformation</SelectItem>
                                  <SelectItem value="cyclicQuadrilateral">Cyclic Quadrilateral</SelectItem>
                                  <SelectItem value="tangentSecant">Tangent & Secant</SelectItem>
                                  <SelectItem value="bearing">Bearings</SelectItem>
                                  <SelectItem value="vector">Vectors</SelectItem>
                                  <SelectItem value="similarityCongruence">Similarity & Congruence</SelectItem>
                                  <SelectItem value="circleTheorem">Circle Theorems</SelectItem>
                                  <SelectItem value="proofDiagram">Proof Diagrams</SelectItem>
                                  <SelectItem value="parallelLines">Parallel Lines & Transversal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Dynamic Parameter Inputs based on type */}
                            {mathImageType === 'linear' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Gradient (m)</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.m || 2}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, m: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Y-Intercept (c)</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.c || 0}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, c: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'quadratic' && (
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">a</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.a || 1}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, a: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">b</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.b || 0}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, b: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">c</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.c || 0}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, c: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'trig' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Function</Label>
                                  <Select 
                                    value={mathImageParams.function || 'sin'} 
                                    onValueChange={(v) => setMathImageParams(prev => ({ ...prev, function: v }))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="sin">sin(x)</SelectItem>
                                      <SelectItem value="cos">cos(x)</SelectItem>
                                      <SelectItem value="tan">tan(x)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Amplitude</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.amplitude || 1}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, amplitude: parseFloat(e.target.value) || 1 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'circle' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Radius</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.radius || 3}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, radius: parseFloat(e.target.value) || 1 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div className="flex items-end gap-2">
                                  <label className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={mathImageParams.showRadius !== false}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, showRadius: e.target.checked }))}
                                    />
                                    Show Radius
                                  </label>
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'angle' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Start Angle (°)</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.angle1 || 0}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, angle1: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">End Angle (°)</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.angle2 || 45}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, angle2: parseFloat(e.target.value) || 45 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'fraction' && (
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">Numerator</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.numerator || 3}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, numerator: parseInt(e.target.value) || 1 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Denominator</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.denominator || 4}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, denominator: parseInt(e.target.value) || 1 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Shape</Label>
                                  <Select 
                                    value={mathImageParams.shape || 'circle'} 
                                    onValueChange={(v) => setMathImageParams(prev => ({ ...prev, shape: v }))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="circle">Circle</SelectItem>
                                      <SelectItem value="rectangle">Rectangle</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'venn' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Number of Sets</Label>
                                  <Select 
                                    value={String(mathImageParams.sets || 2)} 
                                    onValueChange={(v) => setMathImageParams(prev => ({ ...prev, sets: parseInt(v) }))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="2">2 Sets</SelectItem>
                                      <SelectItem value="3">3 Sets</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'triangle' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Vertices (format: 0,0 4,0 2,3)</Label>
                                  <Input
                                    type="text"
                                    value={mathImageParams.verticesStr || '0,0 4,0 2,3'}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, verticesStr: e.target.value }))}
                                    className="h-8"
                                    placeholder="0,0 4,0 2,3"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Labels (e.g., A,B,C)</Label>
                                  <Input
                                    type="text"
                                    value={mathImageParams.labelsStr || 'A,B,C'}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, labelsStr: e.target.value }))}
                                    className="h-8"
                                    placeholder="A,B,C"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={mathImageParams.showSides !== false}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, showSides: e.target.checked }))}
                                    />
                                    Show Side Lengths
                                  </label>
                                  <label className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={mathImageParams.fill === true}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, fill: e.target.checked }))}
                                    />
                                    Fill Shape
                                  </label>
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'rectangle' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Width</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.width || 6}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, width: parseFloat(e.target.value) || 1 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Height</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.height || 4}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, height: parseFloat(e.target.value) || 1 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'exponential' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Base</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.base || 2}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, base: parseFloat(e.target.value) || 2 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Coefficient (a)</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.a || 1}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, a: parseFloat(e.target.value) || 1 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'logarithm' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Base (e=2.718)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={mathImageParams.base || 2.718}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, base: parseFloat(e.target.value) || 2.718 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Coefficient (a)</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.a || 1}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, a: parseFloat(e.target.value) || 1 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'hyperbola' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Coefficient (a)</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.a || 1}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, a: parseFloat(e.target.value) || 1 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Vertical Shift (c)</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.c || 0}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, c: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'numberLine' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Start</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.start ?? -10}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, start: parseFloat(e.target.value) }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">End</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.end ?? 10}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, end: parseFloat(e.target.value) }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'coordinatePlane' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Points (format: A:2,3 B:-1,2)</Label>
                                  <Input
                                    type="text"
                                    value={mathImageParams.pointsStr || 'A:2,3 B:-1,2'}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, pointsStr: e.target.value }))}
                                    className="h-8"
                                    placeholder="A:2,3 B:-1,2 C:0,0"
                                  />
                                </div>
                                <label className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={mathImageParams.connectPoints === true}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, connectPoints: e.target.checked }))}
                                  />
                                  Connect Points with Lines
                                </label>
                              </div>
                            )}
                            
                            {mathImageType === 'pie' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Values (comma-separated)</Label>
                                  <Input
                                    type="text"
                                    value={mathImageParams.valuesStr || '30,20,50'}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, valuesStr: e.target.value }))}
                                    className="h-8"
                                    placeholder="30, 20, 50"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Labels (comma-separated)</Label>
                                  <Input
                                    type="text"
                                    value={mathImageParams.labelsStr || 'A,B,C'}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, labelsStr: e.target.value }))}
                                    className="h-8"
                                    placeholder="Category A, Category B, Category C"
                                  />
                                </div>
                                <label className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={mathImageParams.showPercentages !== false}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, showPercentages: e.target.checked }))}
                                  />
                                  Show Percentages
                                </label>
                              </div>
                            )}
                            
                            {mathImageType === 'bar' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Chart Title</Label>
                                  <Input
                                    type="text"
                                    value={mathImageParams.title || 'Data'}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, title: e.target.value }))}
                                    className="h-8"
                                    placeholder="Chart title"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Values (comma-separated)</Label>
                                  <Input
                                    type="text"
                                    value={mathImageParams.valuesStr || '4,7,2,5'}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, valuesStr: e.target.value }))}
                                    className="h-8"
                                    placeholder="4, 7, 2, 5"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Labels (comma-separated)</Label>
                                  <Input
                                    type="text"
                                    value={mathImageParams.labelsStr || 'A,B,C,D'}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, labelsStr: e.target.value }))}
                                    className="h-8"
                                    placeholder="Category A, Category B, Category C"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {mathImageType === 'transformation' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Transformation Type</Label>
                                  <Select 
                                    value={mathImageParams.transformation || 'translate'} 
                                    onValueChange={(v) => setMathImageParams(prev => ({ ...prev, transformation: v }))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="translate">Translation</SelectItem>
                                      <SelectItem value="reflect">Reflection</SelectItem>
                                      <SelectItem value="rotate">Rotation</SelectItem>
                                      <SelectItem value="scale">Scaling</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <p className="text-xs text-green-600">Shows original shape and its transformation</p>
                              </div>
                            )}
                            
                            {mathImageType === 'cyclicQuadrilateral' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Vertex Angles (4 values, comma-separated)</Label>
                                  <Input
                                    type="text"
                                    value={mathImageParams.anglesStr || '30,100,200,280'}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, anglesStr: e.target.value }))}
                                    className="h-8"
                                    placeholder="30,100,200,280"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={mathImageParams.showDiagonals === true}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, showDiagonals: e.target.checked }))}
                                    />
                                    Show Diagonals
                                  </label>
                                  <label className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={mathImageParams.showAngles !== false}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, showAngles: e.target.checked }))}
                                    />
                                    Show Angle Markers
                                  </label>
                                </div>
                                <p className="text-xs text-green-600">Quadrilateral inscribed in circle (opposite angles = 180°)</p>
                              </div>
                            )}
                            
                            {mathImageType === 'tangentSecant' && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={mathImageParams.showTangent !== false}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, showTangent: e.target.checked }))}
                                    />
                                    Show Tangent
                                  </label>
                                  <label className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={mathImageParams.showSecant !== false}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, showSecant: e.target.checked }))}
                                    />
                                    Show Secant
                                  </label>
                                </div>
                                <div>
                                  <Label className="text-xs">Tangent Point (angle in degrees)</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.tangentAngle || 90}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, tangentAngle: parseFloat(e.target.value) || 90 }))}
                                    className="h-8"
                                  />
                                </div>
                                <p className="text-xs text-green-600">Shows tangent perpendicular to radius at touch point</p>
                              </div>
                            )}
                            
                            {mathImageType === 'bearing' && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">Bearing (degrees from N)</Label>
                                    <Input
                                      type="number"
                                      value={mathImageParams.bearing || 45}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, bearing: parseFloat(e.target.value) || 0 }))}
                                      className="h-8"
                                      min="0"
                                      max="360"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Distance</Label>
                                    <Input
                                      type="number"
                                      value={mathImageParams.distance || 5}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, distance: parseFloat(e.target.value) || 5 }))}
                                      className="h-8"
                                    />
                                  </div>
                                </div>
                                <label className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={mathImageParams.showCompass !== false}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, showCompass: e.target.checked }))}
                                  />
                                  Show Compass Rose
                                </label>
                                <p className="text-xs text-green-600">Direction measured clockwise from North</p>
                              </div>
                            )}
                            
                            {mathImageType === 'vector' && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">Vector X component</Label>
                                    <Input
                                      type="number"
                                      value={mathImageParams.vectorX || 3}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, vectorX: parseFloat(e.target.value) || 0 }))}
                                      className="h-8"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Vector Y component</Label>
                                    <Input
                                      type="number"
                                      value={mathImageParams.vectorY || 2}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, vectorY: parseFloat(e.target.value) || 0 }))}
                                      className="h-8"
                                    />
                                  </div>
                                </div>
                                <label className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={mathImageParams.showComponents === true}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, showComponents: e.target.checked }))}
                                  />
                                  Show Components
                                </label>
                                <p className="text-xs text-green-600">Arrow diagram with magnitude and direction</p>
                              </div>
                            )}
                            
                            {mathImageType === 'similarityCongruence' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Type</Label>
                                  <Select 
                                    value={mathImageParams.similarType || 'similar'} 
                                    onValueChange={(v) => setMathImageParams(prev => ({ ...prev, similarType: v }))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="similar">Similar Triangles</SelectItem>
                                      <SelectItem value="congruent">Congruent Triangles</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {mathImageParams.similarType === 'similar' && (
                                  <div>
                                    <Label className="text-xs">Scale Factor</Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={mathImageParams.scale || 0.6}
                                      onChange={(e) => setMathImageParams(prev => ({ ...prev, scale: parseFloat(e.target.value) || 0.6 }))}
                                      className="h-8"
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-green-600">Two triangles with corresponding side/angle markers</p>
                              </div>
                            )}
                            
                            {mathImageType === 'circleTheorem' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Circle Theorem</Label>
                                  <Select 
                                    value={mathImageParams.theorem || 'inscribed_angle'} 
                                    onValueChange={(v) => setMathImageParams(prev => ({ ...prev, theorem: v }))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="inscribed_angle">Central & Inscribed Angle</SelectItem>
                                      <SelectItem value="semicircle">Angle in Semicircle (90°)</SelectItem>
                                      <SelectItem value="tangent_chord">Tangent-Chord Angle</SelectItem>
                                      <SelectItem value="equal_chords">Equal Chords</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <p className="text-xs text-green-600">Illustrates circle theorem with angle markers</p>
                              </div>
                            )}
                            
                            {mathImageType === 'proofDiagram' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Proof Type</Label>
                                  <Select 
                                    value={mathImageParams.proofType || 'triangle_midpoints'} 
                                    onValueChange={(v) => setMathImageParams(prev => ({ ...prev, proofType: v }))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="triangle_midpoints">Triangle Midpoint Theorem</SelectItem>
                                      <SelectItem value="isosceles">Isosceles Triangle</SelectItem>
                                      <SelectItem value="exterior_angle">Exterior Angle Theorem</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <p className="text-xs text-green-600">Common proof diagrams with markings</p>
                              </div>
                            )}
                            
                            {mathImageType === 'parallelLines' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Transversal Angle (degrees)</Label>
                                  <Input
                                    type="number"
                                    value={mathImageParams.transversalAngle || 60}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, transversalAngle: parseFloat(e.target.value) || 60 }))}
                                    className="h-8"
                                    min="10"
                                    max="170"
                                  />
                                </div>
                                <label className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={mathImageParams.showAngles !== false}
                                    onChange={(e) => setMathImageParams(prev => ({ ...prev, showAngles: e.target.checked }))}
                                  />
                                  Show Angle Markers
                                </label>
                                <p className="text-xs text-green-600">Parallel lines with transversal and angle pairs</p>
                              </div>
                            )}
                            
                            <Button
                              onClick={generateMathImage}
                              disabled={isGeneratingMathImage}
                              className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                              size="sm"
                            >
                              {isGeneratingMathImage ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <LineChart className="h-4 w-4 mr-2" />
                                  Generate Image
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="wolfram" className="mt-3 space-y-3">
                        <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="h-4 w-4 text-orange-600" />
                            <h5 className="font-medium text-orange-800 text-sm">WolframAlpha Generator</h5>
                            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">WolframAlpha API</span>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs text-orange-700">Image Type</Label>
                              <Select value={wolframImageType} onValueChange={setWolframImageType}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="linear">Linear Graph (y = mx + c)</SelectItem>
                                  <SelectItem value="quadratic">Quadratic Graph (y = ax² + bx + c)</SelectItem>
                                  <SelectItem value="trig">Trigonometric (sin, cos, tan)</SelectItem>
                                  <SelectItem value="exponential">Exponential Graph</SelectItem>
                                  <SelectItem value="logarithm">Logarithm Graph</SelectItem>
                                  <SelectItem value="hyperbola">Hyperbola (y = a/x)</SelectItem>
                                  <SelectItem value="circle">Circle</SelectItem>
                                  <SelectItem value="3d_surface">3D Surface</SelectItem>
                                  <SelectItem value="custom">Custom Expression</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {wolframImageType === 'linear' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Gradient (m)</Label>
                                  <Input
                                    type="number"
                                    value={wolframImageParams.m || 2}
                                    onChange={(e) => setWolframImageParams(prev => ({ ...prev, m: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Y-Intercept (c)</Label>
                                  <Input
                                    type="number"
                                    value={wolframImageParams.c || 0}
                                    onChange={(e) => setWolframImageParams(prev => ({ ...prev, c: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {wolframImageType === 'quadratic' && (
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">a</Label>
                                  <Input
                                    type="number"
                                    value={wolframImageParams.a || 1}
                                    onChange={(e) => setWolframImageParams(prev => ({ ...prev, a: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">b</Label>
                                  <Input
                                    type="number"
                                    value={wolframImageParams.b || 0}
                                    onChange={(e) => setWolframImageParams(prev => ({ ...prev, b: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">c</Label>
                                  <Input
                                    type="number"
                                    value={wolframImageParams.c || 0}
                                    onChange={(e) => setWolframImageParams(prev => ({ ...prev, c: parseFloat(e.target.value) || 0 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {wolframImageType === 'trig' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Function</Label>
                                  <Select 
                                    value={wolframImageParams.function || 'sin'} 
                                    onValueChange={(v) => setWolframImageParams(prev => ({ ...prev, function: v }))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="sin">sin(x)</SelectItem>
                                      <SelectItem value="cos">cos(x)</SelectItem>
                                      <SelectItem value="tan">tan(x)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Amplitude</Label>
                                  <Input
                                    type="number"
                                    value={wolframImageParams.amplitude || 1}
                                    onChange={(e) => setWolframImageParams(prev => ({ ...prev, amplitude: parseFloat(e.target.value) || 1 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}

                            {wolframImageType === 'exponential' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Coefficient (a)</Label>
                                  <Input
                                    type="number"
                                    value={wolframImageParams.a || 1}
                                    onChange={(e) => setWolframImageParams(prev => ({ ...prev, a: parseFloat(e.target.value) || 1 }))}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Base</Label>
                                  <Input
                                    type="number"
                                    value={wolframImageParams.base || 2}
                                    onChange={(e) => setWolframImageParams(prev => ({ ...prev, base: parseFloat(e.target.value) || 2 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}

                            {wolframImageType === 'circle' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Radius</Label>
                                  <Input
                                    type="number"
                                    value={wolframImageParams.radius || 3}
                                    onChange={(e) => setWolframImageParams(prev => ({ ...prev, radius: parseFloat(e.target.value) || 3 }))}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            )}

                            {wolframImageType === '3d_surface' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Surface Type</Label>
                                  <Select 
                                    value={wolframImageParams.surfaceType || 'paraboloid'} 
                                    onValueChange={(v) => setWolframImageParams(prev => ({ ...prev, surfaceType: v }))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="paraboloid">Paraboloid (z = x² + y²)</SelectItem>
                                      <SelectItem value="saddle">Saddle (z = x² - y²)</SelectItem>
                                      <SelectItem value="sphere">Sphere</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            {wolframImageType === 'custom' && (
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Math Expression</Label>
                                  <Input
                                    type="text"
                                    value={wolframImageParams.expression || ''}
                                    onChange={(e) => setWolframImageParams(prev => ({ ...prev, expression: e.target.value }))}
                                    className="h-8"
                                    placeholder="e.g., plot sin(x) + cos(2x)"
                                  />
                                </div>
                                <p className="text-xs text-orange-600">Enter any WolframAlpha-compatible expression</p>
                              </div>
                            )}
                            
                            <Button
                              onClick={generateWolframImage}
                              disabled={isGeneratingWolframImage}
                              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
                              size="sm"
                            >
                              {isGeneratingWolframImage ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <BarChart3 className="h-4 w-4 mr-2" />
                                  Generate with WolframAlpha
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="aiReference" className="mt-3 space-y-3">
                        <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                            <h5 className="font-medium text-purple-800 text-sm">AI from Reference Images</h5>
                            <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">Vision AI</span>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <Label className="text-xs text-purple-700">Image Generator:</Label>
                            <div className="flex gap-1 bg-purple-100 rounded p-0.5">
                              <button
                                type="button"
                                onClick={() => setAiImageGenerator('python')}
                                className={`px-2 py-1 text-xs rounded transition-colors ${aiImageGenerator === 'python' ? 'bg-white text-purple-800 shadow-sm' : 'text-purple-600 hover:text-purple-800'}`}
                              >
                                Python
                              </button>
                              <button
                                type="button"
                                onClick={() => setAiImageGenerator('wolfram')}
                                className={`px-2 py-1 text-xs rounded transition-colors ${aiImageGenerator === 'wolfram' ? 'bg-white text-orange-800 shadow-sm' : 'text-purple-600 hover:text-purple-800'}`}
                              >
                                WolframAlpha
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-xs text-purple-700 mb-3">
                            Upload reference images and AI will analyze them to create a matching question with a {aiImageGenerator === 'python' ? 'Python/matplotlib' : 'WolframAlpha'}-generated diagram.
                          </p>
                          
                          {showApprovalPreview && generatedQuestions.length > 0 ? (
                            <div className="space-y-3">
                              <div className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded">
                                <span>Generated question ready for review</span>
                              </div>
                              
                              <div className="p-3 bg-white rounded border border-purple-200">
                                <h6 className="font-medium text-sm text-purple-800 mb-2">Generated Question Preview</h6>
                                {generatedQuestions[currentApprovalIndex]?.imageUrl && (
                                  <img 
                                    src={generatedQuestions[currentApprovalIndex].imageUrl!} 
                                    alt="Generated diagram" 
                                    className="max-w-full h-auto max-h-48 rounded border mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setEnlargedImageUrl(generatedQuestions[currentApprovalIndex].imageUrl)}
                                    title="Click to enlarge"
                                  />
                                )}
                                <div className="text-sm text-gray-800 mb-2">
                                  <MathText>{generatedQuestions[currentApprovalIndex]?.question || ''}</MathText>
                                </div>
                                <div className="flex gap-2 text-xs text-gray-600">
                                  <span>Answer: <MathText>{generatedQuestions[currentApprovalIndex]?.answer || ''}</MathText></span>
                                  <span>|</span>
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
                                  onClick={clearReferenceImage}
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
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-purple-700 font-medium">{referenceImagePreviews.length} image{referenceImagePreviews.length > 1 ? 's' : ''} selected</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={clearReferenceImage}
                                      className="h-6 px-2 text-xs"
                                    >
                                      Clear All
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {referenceImagePreviews.map((preview, index) => (
                                      <div key={index} className="relative">
                                        <img 
                                          src={preview} 
                                          alt={`Reference ${index + 1}`} 
                                          className="w-16 h-16 object-cover rounded border"
                                        />
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => removeReferenceImage(index)}
                                          className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleReferenceImageSelect}
                                  className="flex-1"
                                />
                              </div>
                              
                              {currentQuestion.topicId === 0 || currentQuestion.themeId === 0 ? (
                                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                  Please select a topic and theme above before generating.
                                </p>
                              ) : null}
                              
                              <Button
                                onClick={generateFromReferenceImage}
                                disabled={isGeneratingFromReference || referenceImages.length === 0 || currentQuestion.topicId === 0 || currentQuestion.themeId === 0}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                size="sm"
                              >
                                {isGeneratingFromReference ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Analyzing {referenceImages.length} image{referenceImages.length > 1 ? 's' : ''}...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Generate from {referenceImages.length || 'Reference'} Image{referenceImages.length !== 1 ? 's' : ''}
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                  
                  {isUploadingImage && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading image...</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="answer">Answer</Label>
                  <Textarea
                    id="answer"
                    value={currentQuestion.answer}
                    onChange={(e) => setCurrentQuestion(prev => ({ ...prev, answer: e.target.value }))}
                    placeholder="Enter answer"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="marks">Marks</Label>
                  <Input
                    id="marks"
                    type="number"
                    value={currentQuestion.marks}
                    onChange={(e) => setCurrentQuestion(prev => ({ ...prev, marks: parseInt(e.target.value) || 5 }))}
                    min="1"
                    max="50"
                    className="w-24"
                  />
                </div>
                
                <Button onClick={addQuestion} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleCreateExercise} 
              className="flex-1"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Exercise
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Enlarged Image Modal */}
    {enlargedImageUrl && (
      <div 
        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
        onClick={() => setEnlargedImageUrl(null)}
      >
        <div className="relative max-w-4xl max-h-[90vh]">
          <img 
            src={enlargedImageUrl} 
            alt="Enlarged diagram" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => setEnlargedImageUrl(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )}
  </>
  );
}