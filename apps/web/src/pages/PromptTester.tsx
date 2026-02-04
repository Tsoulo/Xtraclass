import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play, Loader2, Save, Upload, RotateCcw, Camera, X, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";

// Types
interface AiPrompt {
  id: number;
  name: string;
  category: string;
  description: string;
  promptText: string;
  variables: string[];
  exampleUsage?: string;
  isActive: boolean;
  isPublished: boolean;
}

// Variable extraction utility
const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function extractVariables(text: string): string[] {
  const matches = text.matchAll(VARIABLE_REGEX);
  const variables = Array.from(matches, match => match[1]);
  // Use Set to deduplicate and return sorted array for stable rendering
  return Array.from(new Set(variables)).sort();
}

// Helper to check if variable is image-related
function isImageVariable(varName: string): boolean {
  return varName.toLowerCase().includes('image') || 
         varName.toLowerCase().includes('photo') ||
         varName.toLowerCase().includes('picture');
}

// Schema for test form
const testSchema = z.object({
  promptText: z.string().min(1),
  variables: z.record(z.string()),
});

export default function PromptTester() {
  const [location, setLocation] = useLocation();
  const [testResult, setTestResult] = useState<{ 
    success: boolean; 
    processedPrompt?: string; 
    result?: string; 
    error?: string;
    savedPageImages?: Array<{ imageId: string; pageNumber: number; url: string; filename: string }>;
  } | null>(null);
  const [detectedVars, setDetectedVars] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string>("");
  const [questionImageBase64, setQuestionImageBase64] = useState<string>("");
  const [variableImages, setVariableImages] = useState<Record<string, string>>({});
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentImageVariable, setCurrentImageVariable] = useState<string | null>(null);
  const [currentImageType, setCurrentImageType] = useState<'question' | 'answer' | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>("");
  const [pdfUploadProgress, setPdfUploadProgress] = useState<number>(0);
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const { toast } = useToast();
  
  // Extract prompt ID from URL path (e.g., /admin/prompt-tester/123)
  const promptId = location.split('/').pop();
  const numericPromptId = promptId ? parseInt(promptId) : null;

  // Load persisted image from localStorage on mount and when prompt changes
  useEffect(() => {
    if (!numericPromptId) return;
    
    const storageKey = `promptTester_image_${numericPromptId}`;
    const savedImage = localStorage.getItem(storageKey);
    if (savedImage) {
      setImageBase64(savedImage);
      setImagePreview(savedImage);
    } else {
      // Clear image if no saved image for this prompt
      setImageBase64("");
      setImagePreview("");
      setImageFile(null);
    }
  }, [numericPromptId]);

  // Fetch specific prompt
  const { data: prompt, isLoading } = useQuery({
    queryKey: ["/api/ai-prompts", numericPromptId],
    queryFn: () => apiRequest(`/api/ai-prompts/${numericPromptId}`),
    enabled: !!numericPromptId,
  });

  // Fetch MCP prompts for detecting original source
  const { data: mcpPrompts = [] } = useQuery({
    queryKey: ["/api/mcp/prompts"],
    staleTime: 30 * 1000,
    retry: 1,
  });

  // Helper function to get MCP version of a prompt for resetting
  const getMCPPrompt = (prompt: AiPrompt | null) => {
    if (!prompt || !mcpPrompts || !Array.isArray(mcpPrompts)) return null;
    
    return mcpPrompts.find((mcp: any) => 
      mcp.name.toLowerCase().trim() === prompt.name.toLowerCase().trim() &&
      mcp.category === prompt.category
    );
  };

  // Test form setup
  const testForm = useForm({
    resolver: zodResolver(testSchema),
    defaultValues: {
      promptText: "",
      variables: {},
    },
  });

  // Update form when prompt loads
  useEffect(() => {
    if (prompt) {
      const initialVars = extractVariables(prompt.promptText);
      setDetectedVars(initialVars);
      testForm.reset({
        promptText: prompt.promptText,
        variables: initialVars.reduce((acc: Record<string, string>, variable: string) => {
          acc[variable] = "";
          return acc;
        }, {}),
      });
    }
  }, [prompt, testForm]);

  // Watch for changes to prompt text and dynamically update variables
  const watchPromptText = testForm.watch("promptText");
  
  useEffect(() => {
    if (watchPromptText !== undefined) {
      const newVars = extractVariables(watchPromptText || "");
      const currentVars = testForm.getValues("variables") || {};
      
      // Remove variables that are no longer in the prompt
      for (const existingVar of Object.keys(currentVars)) {
        if (!newVars.includes(existingVar)) {
          testForm.unregister(`variables.${existingVar}` as any);
        }
      }
      
      // Add new variables with empty values
      for (const newVar of newVars) {
        if (!(currentVars as Record<string, any>)[newVar]) {
          testForm.setValue(`variables.${newVar}` as any, "");
        }
      }
      
      // Update detected variables for rendering
      setDetectedVars(newVars);
    }
  }, [watchPromptText, testForm]);

  // Test prompt mutation
  const testPromptMutation = useMutation({
    mutationFn: (data: { 
      promptText: string; 
      variables: Record<string, string>;
      images?: {
        questionImageUrl?: string;
        studentAnswerImageUrl?: string;
        variableImages?: Record<string, string>;
      };
      pdfBase64?: string;
    }) => 
      apiRequest("/api/ai-prompts/test", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (result) => {
      setTestResult(result);
      setIsConvertingPdf(false);
      toast({
        title: "Test Completed",
        description: "View the results below",
        variant: "default"
      });
    },
    onError: (error: any) => {
      setTestResult({ 
        success: false, 
        error: error.message || "Test failed" 
      });
      setIsConvertingPdf(false);
      toast({
        title: "Test Failed",
        description: error.message || "Test failed",
        variant: "destructive"
      });
    }
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Image size must be less than 5MB",
        variant: "destructive"
      });
      event.target.value = '';
      return;
    }

    // Convert to base64 for persistence across page reloads
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImageFile(file);
      setImagePreview(base64);
      setImageBase64(base64);
      // Save to localStorage with prompt-specific key
      if (numericPromptId) {
        const storageKey = `promptTester_image_${numericPromptId}`;
        localStorage.setItem(storageKey, base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuestionImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Image size must be less than 5MB",
        variant: "destructive"
      });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setQuestionImageFile(file);
      setQuestionImagePreview(base64);
      setQuestionImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleVariableImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, varName: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Image size must be less than 5MB",
        variant: "destructive"
      });
      event.target.value = '';
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setVariableImages(prev => ({
        ...prev,
        [varName]: base64
      }));
      // Update form value with base64
      testForm.setValue(`variables.${varName}` as any, base64);
      toast({
        title: "Image uploaded",
        description: `Image set for ${varName}`,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeVariableImage = (varName: string) => {
    setVariableImages(prev => {
      const newImages = { ...prev };
      delete newImages[varName];
      return newImages;
    });
    testForm.setValue(`variables.${varName}` as any, "");
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setImageBase64("");
    // Clear from localStorage with prompt-specific key
    if (numericPromptId) {
      const storageKey = `promptTester_image_${numericPromptId}`;
      localStorage.removeItem(storageKey);
    }
  };

  const removeQuestionImage = () => {
    setQuestionImageFile(null);
    setQuestionImagePreview("");
    setQuestionImageBase64("");
  };

  const openCamera = async (varName?: string, imageType?: 'question' | 'answer') => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      setStream(mediaStream);
      setCameraOpen(true);
      setCurrentImageVariable(varName || null);
      setCurrentImageType(imageType || null);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast({
        title: "Camera Access Denied",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        
        // If capturing for a specific variable
        if (currentImageVariable) {
          setVariableImages(prev => ({
            ...prev,
            [currentImageVariable]: imageData
          }));
          testForm.setValue(`variables.${currentImageVariable}` as any, imageData);
          toast({
            title: "Photo captured",
            description: `Image set for ${currentImageVariable}`,
          });
        } else if (currentImageType === 'question') {
          // Question image
          setQuestionImagePreview(imageData);
          setQuestionImageBase64(imageData);
          toast({
            title: "Photo captured",
            description: "Question image captured successfully",
          });
        } else {
          // Answer image (default)
          setImagePreview(imageData);
          setImageBase64(imageData);
          
          // Persist to localStorage
          if (numericPromptId) {
            const storageKey = `promptTester_image_${numericPromptId}`;
            localStorage.setItem(storageKey, imageData);
          }
          toast({
            title: "Photo captured",
            description: "Answer image captured successfully",
          });
        }
      }
    }
    closeCamera();
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
    setCurrentImageVariable(null);
    setCurrentImageType(null);
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "PDF too large",
        description: "PDF size must be less than 25MB",
        variant: "destructive"
      });
      event.target.value = '';
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive"
      });
      event.target.value = '';
      return;
    }

    setPdfFile(file);
    setPdfUploadProgress(0);

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setPdfUploadProgress(progress);
      }
    };
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPdfBase64(base64);
      setPdfUploadProgress(100);
      toast({
        title: "PDF uploaded",
        description: `${file.name} ready for processing`,
      });
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Failed to read PDF file",
        variant: "destructive"
      });
      setPdfFile(null);
      setPdfUploadProgress(0);
    };
    reader.readAsDataURL(file);
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfBase64("");
    setPdfUploadProgress(0);
    const input = document.getElementById('pdf-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const onTestSubmit = async (data: any) => {
    // Collect all images for the AI vision API
    const images: {
      questionImageUrl?: string;
      studentAnswerImageUrl?: string;
      variableImages?: Record<string, string>;
    } = {};
    
    // Add question image if provided
    if (questionImageBase64) {
      images.questionImageUrl = questionImageBase64;
    }
    
    // Add student answer image if provided
    if (imageBase64) {
      images.studentAnswerImageUrl = imageBase64;
    }
    
    // Add variable images if any are provided
    if (variableImages && Object.keys(variableImages).length > 0) {
      images.variableImages = variableImages;
    }
    
    // If PDF is uploaded, show converting status
    if (pdfBase64) {
      setIsConvertingPdf(true);
    }
    
    testPromptMutation.mutate({
      promptText: data.promptText,
      variables: data.variables,
      images: Object.keys(images).length > 0 ? images : undefined,
      pdfBase64: pdfBase64 || undefined
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Prompt not found</p>
        <Button 
          variant="outline" 
          onClick={() => setLocation("/admin/prompt-builder")}
          className="mt-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Prompt Builder
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 w-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/admin/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Prompt Builder
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Test AI Prompt</h1>
          <p className="text-gray-500">Test and validate your prompt with sample data</p>
        </div>
      </div>

      {/* Prompt Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-600" />
            {prompt.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-700 text-sm font-medium mb-1">Category: {prompt.category}</p>
            <p className="text-blue-700 text-sm">{prompt.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Test Configuration - Two Column Layout */}
      <Form {...testForm}>
        <form onSubmit={testForm.handleSubmit(onTestSubmit)} id="test-form">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Prompt Text */}
            <Card>
              <CardHeader>
                <CardTitle>Prompt Text</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={testForm.control}
                  name="promptText"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={18} 
                          className="font-mono text-sm border-2 border-blue-200 focus:border-blue-500 min-h-[450px]"
                          placeholder="Edit your prompt text here..."
                          data-testid="textarea-prompt-text"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="mt-4 space-y-3">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={async () => {
                      const currentPromptText = testForm.getValues('promptText');
                      const detectedVariables = extractVariables(currentPromptText);
                      try {
                        await apiRequest(`/api/ai-prompts/${promptId}`, {
                          method: 'PUT',
                          body: JSON.stringify({
                            name: prompt.name,
                            category: prompt.category,
                            description: prompt.description,
                            promptText: currentPromptText,
                            variables: detectedVariables
                          })
                        });
                        // Invalidate cache to refresh the data
                        queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts", numericPromptId] });
                        queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/mcp/prompts"] });
                        toast({ title: "Prompt saved successfully!" });
                      } catch (error) {
                        toast({ 
                          title: "Failed to save prompt", 
                          variant: "destructive" 
                        });
                      }
                    }}
                    data-testid="button-save-prompt"
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  
                  {/* Reset Button */}
                  <Button 
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      // Try to get MCP version first, fall back to database version
                      const mcpPrompt = getMCPPrompt(prompt);
                      const originalPromptText = mcpPrompt ? mcpPrompt.promptText : prompt.promptText;
                      const originalVars = extractVariables(originalPromptText);
                      
                      setDetectedVars(originalVars);
                      testForm.reset({
                        promptText: originalPromptText,
                        variables: originalVars.reduce((acc: Record<string, string>, variable: string) => {
                          acc[variable] = "";
                          return acc;
                        }, {})
                      });
                      // Clear test results
                      setTestResult(null);
                      
                      const resetSource = mcpPrompt ? "MCP source" : "database version";
                      toast({ 
                        title: `Reset to original prompt successfully`,
                        description: `Restored from ${resetSource}`
                      });
                    }}
                    data-testid="button-reset-prompt"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Original
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Variables & Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Test Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Variables Section */}
                {detectedVars && detectedVars.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-base font-semibold">Test Variables</div>
                    <p className="text-sm text-gray-600 mb-4">
                      Provide sample values for each variable. Use multi-line text areas for longer content.
                    </p>
                    <div className="grid gap-4">
                      {detectedVars.map((variable: string, index: number) => (
                        <FormField
                          key={variable}
                          control={testForm.control}
                          name={`variables.${variable}` as keyof typeof testForm.control._defaultValues}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                {`{{${variable}}}`}
                              </FormLabel>
                              <FormControl>
                                {isImageVariable(variable) ? (
                                  // Image upload UI for image variables
                                  <div>
                                    {variableImages[variable] ? (
                                      <div className="border-2 border-gray-300 rounded-lg p-3">
                                        <div className="relative">
                                          <img 
                                            src={variableImages[variable]} 
                                            alt={`${variable} preview`} 
                                            className="max-w-full h-auto rounded-lg max-h-[200px] mx-auto"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => removeVariableImage(variable)}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-lg"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 text-center">
                                          Image uploaded for {variable}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                        <div className="text-center mb-3">
                                          <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                                          <p className="text-xs text-gray-500">Upload image for this variable</p>
                                        </div>
                                        <div className="flex gap-2">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleVariableImageUpload(e, variable)}
                                            className="hidden"
                                            id={`variable-image-${variable}`}
                                            data-testid={`input-variable-image-${variable}`}
                                          />
                                          <label htmlFor={`variable-image-${variable}`} className="flex-1">
                                            <Button 
                                              type="button" 
                                              variant="outline" 
                                              size="sm"
                                              className="w-full"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                document.getElementById(`variable-image-${variable}`)?.click();
                                              }}
                                            >
                                              <Upload className="w-3 h-3 mr-1" />
                                              Choose File
                                            </Button>
                                          </label>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openCamera(variable)}
                                            className="flex-1"
                                          >
                                            <Camera className="w-3 h-3 mr-1" />
                                            Camera
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  // Regular text input for non-image variables
                                  <Textarea
                                    value={String(field.value || "")}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                    placeholder={`Enter sample value for ${variable}...`}
                                    rows={3}
                                    className="resize-y"
                                    data-testid={`textarea-test-variable-${variable}`}
                                  />
                                )}
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* PDF Upload Section */}
                <div className="space-y-4">
                  <div className="text-base font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-500" />
                    PDF Document (Optional)
                  </div>
                  <p className="text-xs text-gray-500">
                    Upload a PDF file to send directly to the AI for analysis. The PDF pages will be converted to images and processed by GPT-4o Vision. (max 25MB)
                  </p>
                  
                  {pdfFile ? (
                    <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-red-500" />
                          <div>
                            <p className="font-medium text-gray-900">{pdfFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removePdf}
                          className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {pdfUploadProgress > 0 && pdfUploadProgress < 100 && (
                        <div className="mt-3">
                          <Progress value={pdfUploadProgress} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            Uploading... {pdfUploadProgress}%
                          </p>
                        </div>
                      )}
                      {pdfUploadProgress === 100 && (
                        <p className="text-xs text-green-600 mt-2 text-center font-medium">
                          Ready for processing
                        </p>
                      )}
                      {isConvertingPdf && (
                        <div className="mt-3 flex items-center justify-center gap-2 text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Converting PDF pages to images...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-red-200 rounded-lg p-6 bg-red-50/50">
                      <div className="text-center mb-4">
                        <FileText className="w-8 h-8 mx-auto text-red-400 mb-2" />
                        <p className="text-sm text-gray-500">Upload PDF for AI vision analysis</p>
                      </div>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                        className="hidden"
                        id="pdf-upload"
                        data-testid="input-pdf-upload"
                      />
                      <label htmlFor="pdf-upload" className="block">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          className="w-full border-red-200 hover:bg-red-100"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('pdf-upload')?.click();
                          }}
                        >
                          <FileText className="w-4 h-4 mr-2 text-red-500" />
                          Choose PDF File
                        </Button>
                      </label>
                    </div>
                  )}
                </div>

                {/* Question Image Upload Section */}
                <div className="space-y-4">
                  <div className="text-base font-semibold">Question Image (Optional)</div>
                  <p className="text-xs text-gray-500">
                    Upload an image of the question/problem for testing (max 5MB)
                  </p>
                  
                  {questionImagePreview ? (
                    <div className="border-2 border-gray-300 rounded-lg p-4">
                      <div className="relative">
                        <img 
                          src={questionImagePreview} 
                          alt="Question preview" 
                          className="max-w-full h-auto rounded-lg max-h-[300px] mx-auto"
                        />
                        <button
                          type="button"
                          onClick={removeQuestionImage}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        {questionImageFile?.name || "Question image"}
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="text-center mb-4">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Upload question image for testing</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQuestionImageUpload}
                          className="hidden"
                          id="question-image-upload"
                          data-testid="input-question-image-upload"
                        />
                        <label htmlFor="question-image-upload" className="flex-1">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.preventDefault();
                              document.getElementById('question-image-upload')?.click();
                            }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Choose File
                          </Button>
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openCamera(undefined, 'question')}
                          className="flex-1"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Take Photo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Student Answer Image Upload Section */}
                <div className="space-y-4">
                  <div className="text-base font-semibold">Student Answer Image (Optional)</div>
                  <p className="text-xs text-gray-500">
                    Upload student's handwritten work or answer image for testing grading prompts (max 5MB)
                  </p>
                  
                  {imagePreview ? (
                    <div className="border-2 border-gray-300 rounded-lg p-4">
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Test preview" 
                          className="max-w-full h-auto rounded-lg max-h-[300px] mx-auto"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        {imageFile?.name || "Uploaded image"}
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="text-center mb-4">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Upload student's answer image for testing</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="prompt-image-upload"
                          data-testid="input-image-upload"
                        />
                        <label htmlFor="prompt-image-upload" className="flex-1">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.preventDefault();
                              document.getElementById('prompt-image-upload')?.click();
                            }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Choose File
                          </Button>
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openCamera(undefined, 'answer')}
                          className="flex-1"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Take Photo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4">
                  {/* Test Button */}
                  <Button 
                    type="submit" 
                    disabled={testPromptMutation.isPending} 
                    data-testid="button-test-prompt"
                    size="lg"
                    className="w-full"
                  >
                    {testPromptMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Test Prompt
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>

      {/* Test Results */}
      {testResult && (
        <div className="space-y-6">
          {/* Request Container */}
          {testResult.success && testResult.processedPrompt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Play className="w-4 h-4" />
                  Prompt Sent to AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg max-h-80 overflow-y-auto bg-blue-50 border border-blue-200">
                  <pre className="text-sm whitespace-pre-wrap break-words text-blue-700">
                    {testResult.processedPrompt}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Response Container */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResult.success ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    AI Response
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Test Failed
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg max-h-[500px] overflow-y-auto ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <pre className={`text-sm whitespace-pre-wrap break-words ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.success ? testResult.result : testResult.error}
                </pre>
              </div>
            </CardContent>
          </Card>
          
          {/* Saved PDF Page Images */}
          {testResult.success && testResult.savedPageImages && testResult.savedPageImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  Saved PDF Page Images ({testResult.savedPageImages.length} pages)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {testResult.savedPageImages.map((img) => (
                    <div key={img.imageId} className="border rounded-lg p-2 bg-white shadow-sm">
                      <a 
                        href={img.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block hover:opacity-80 transition-opacity"
                      >
                        <img 
                          src={img.url} 
                          alt={`Page ${img.pageNumber}`}
                          className="w-full h-32 object-contain border rounded"
                        />
                      </a>
                      <div className="mt-2 text-xs text-gray-600">
                        <p className="font-medium">Page {img.pageNumber}</p>
                        <a 
                          href={img.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate block"
                        >
                          {img.filename}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Full-Screen Camera Overlay */}
      {cameraOpen && (
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
              onClick={capturePhoto}
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
    </div>
  );
}