import { useState, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { 
  Upload, 
  Download, 
  FileText, 
  Calendar, 
  Eye,
  Trash2,
  Plus,
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  X,
  BookOpen,
  Image as ImageIcon,
  Crop,
  Save
} from "lucide-react";
import type { PastPaper, InsertPastPaper, PastPaperQuestion } from "@shared/schema";

function formatQuestionNumber(num: number): string {
  if (num >= 100) {
    const mainQ = Math.floor(num / 100);
    const subQ = num % 100;
    return subQ > 0 ? `${mainQ}.${subQ}` : `${mainQ}`;
  }
  return String(num);
}

function sortQuestions(questions: PastPaperQuestion[]): PastPaperQuestion[] {
  return [...questions].sort((a, b) => {
    // Sort primarily by question number to maintain natural order
    // (e.g., 1.1, 1.2, 2.1, 2.2, 3.1 instead of grouping by section)
    return (a.questionNumber || 0) - (b.questionNumber || 0);
  });
}

function MathText({ text }: { text: string }) {
  const parts = useMemo(() => {
    if (!text) return [];
    const regex = /\$([^$]+)\$/g;
    const result: { type: 'text' | 'math'; content: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      result.push({ type: 'math', content: match[1] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      result.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return result;
  }, [text]);

  return (
    <span>
      {parts.map((part, i) =>
        part.type === 'math' ? (
          <InlineMath key={i} math={part.content} />
        ) : (
          <span key={i}>{part.content}</span>
        )
      )}
    </span>
  );
}

const subjects = [
  { id: "mathematics", name: "Mathematics" },
  { id: "mathematical-literacy", name: "Mathematical Literacy" },
  { id: "physical-science", name: "Physical Science" }
];

const grades = [
  { id: "8", name: "Grade 8" },
  { id: "9", name: "Grade 9" },
  { id: "10", name: "Grade 10" },
  { id: "11", name: "Grade 11" },
  { id: "12", name: "Grade 12" }
];

const paperTypes = [
  { id: "exam", name: "Exam" },
  { id: "test", name: "Test" },
  { id: "assignment", name: "Assignment" }
];

export default function AdminPastPapers() {
  const [, navigate] = useLocation();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [extractingPaperId, setExtractingPaperId] = useState<number | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [viewingPaper, setViewingPaper] = useState<PastPaper | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<{url: string; alt: string} | null>(null);
  const [croppingQuestion, setCroppingQuestion] = useState<{
    questionId: number;
    imageUrl: string;
    questionNumber: number;
  } | null>(null);
  const [addingImageToQuestion, setAddingImageToQuestion] = useState<{
    questionId: number;
    questionNumber: number;
    pastPaperId: number;
  } | null>(null);
  const [cropSelection, setCropSelection] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const [uploadForm, setUploadForm] = useState<Partial<InsertPastPaper>>({
    title: "",
    subject: "",
    grade: "",
    year: new Date().getFullYear(),
    paperType: "",
    fileUrl: "",
    fileName: "",
    fileSize: 0
  });
  const { toast } = useToast();

  // Fetch past papers based on selected filters
  const { data: pastPapers = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/past-papers', selectedSubject, selectedGrade],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subject', selectedSubject);
      if (selectedGrade) params.append('grade', selectedGrade);
      return apiRequest(`/api/past-papers?${params.toString()}`);
    },
    enabled: !!selectedSubject && !!selectedGrade
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: InsertPastPaper) => 
      apiRequest('/api/past-papers', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Past paper uploaded successfully"
      });
      setShowUploadForm(false);
      setUploadForm({
        title: "",
        subject: "",
        grade: "",
        year: new Date().getFullYear(),
        paperType: "",
        fileUrl: "",
        fileName: "",
        fileSize: 0
      });
      queryClient.invalidateQueries({ queryKey: ['/api/past-papers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload past paper",
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => 
      apiRequest(`/api/past-papers/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Past paper deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/past-papers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete past paper",
        variant: "destructive"
      });
    }
  });

  // Extract questions mutation
  const extractMutation = useMutation({
    mutationFn: async (paperId: number) => {
      setExtractingPaperId(paperId);
      return apiRequest(`/api/past-papers/${paperId}/extract`, {
        method: 'POST'
      });
    },
    onSuccess: (data, paperId) => {
      setExtractingPaperId(null);
      toast({
        title: "Extraction Complete",
        description: `Successfully extracted ${data.questionsCount || 0} questions from the paper`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/past-papers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/past-papers', paperId, 'questions'] });
    },
    onError: (error: any) => {
      setExtractingPaperId(null);
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract questions from the paper",
        variant: "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/past-papers'] });
    }
  });

  // Query for extracted questions when viewing a paper
  const { data: extractedQuestions = [], isLoading: questionsLoading } = useQuery<PastPaperQuestion[]>({
    queryKey: ['/api/past-papers', viewingPaper?.id, 'questions'],
    queryFn: () => apiRequest(`/api/past-papers/${viewingPaper?.id}/questions`),
    enabled: !!viewingPaper?.id
  });

  // Crop image mutation
  const cropMutation = useMutation({
    mutationFn: async ({ questionId, imageUrl, cropX, cropY, cropWidth, cropHeight, originalWidth, originalHeight }: {
      questionId: number;
      imageUrl: string;
      cropX: number;
      cropY: number;
      cropWidth: number;
      cropHeight: number;
      originalWidth: number;
      originalHeight: number;
    }) => {
      return apiRequest(`/api/past-paper-questions/${questionId}/crop-image`, {
        method: 'POST',
        body: JSON.stringify({ imageUrl, cropX, cropY, cropWidth, cropHeight, originalWidth, originalHeight })
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Image Cropped",
        description: "The image has been cropped and saved successfully"
      });
      setCroppingQuestion(null);
      setCropSelection(null);
      // Invalidate questions to refresh the image
      if (viewingPaper?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/past-papers', viewingPaper.id, 'questions'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Crop Failed",
        description: error.message || "Failed to crop the image",
        variant: "destructive"
      });
    }
  });

  // Query for available page images when adding images
  const { data: availablePages = [] } = useQuery<{pageNumber: number; url: string}[]>({
    queryKey: ['/api/past-papers', addingImageToQuestion?.pastPaperId, 'page-images'],
    queryFn: async () => {
      const result = await apiRequest(`/api/past-papers/${addingImageToQuestion?.pastPaperId}/page-images`);
      return result.pages || [];
    },
    enabled: !!addingImageToQuestion?.pastPaperId
  });

  // Add image mutation
  const addImageMutation = useMutation({
    mutationFn: async ({ questionId, pageNumber }: { questionId: number; pageNumber: number }) => {
      return apiRequest(`/api/past-paper-questions/${questionId}/add-image`, {
        method: 'POST',
        body: JSON.stringify({ pageNumber })
      });
    },
    onSuccess: () => {
      toast({
        title: "Image Added",
        description: "The page image has been added to this question"
      });
      setAddingImageToQuestion(null);
      if (viewingPaper?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/past-papers', viewingPaper.id, 'questions'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Image",
        description: error.message || "Could not add the image",
        variant: "destructive"
      });
    }
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async ({ questionId, imageType, imageIndex }: { 
      questionId: number; 
      imageType: 'primary' | 'additional'; 
      imageIndex?: number 
    }) => {
      return apiRequest(`/api/past-paper-questions/${questionId}/delete-image`, {
        method: 'DELETE',
        body: JSON.stringify({ imageType, imageIndex })
      });
    },
    onSuccess: () => {
      toast({
        title: "Image Deleted",
        description: "The image has been removed from this question"
      });
      if (viewingPaper?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/past-papers', viewingPaper.id, 'questions'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Image",
        description: error.message || "Could not delete the image",
        variant: "destructive"
      });
    }
  });

  // State for enlarged page preview in Add Page dialog
  const [enlargedPageImage, setEnlargedPageImage] = useState<{ url: string; pageNumber: number } | null>(null);

  // Crop handlers - calculate position relative to the image element directly
  const handleCropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropImageRef.current) return;
    const imgRect = cropImageRef.current.getBoundingClientRect();
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;
    // Ensure coordinates are within image bounds
    const clampedX = Math.max(0, Math.min(x, imgRect.width));
    const clampedY = Math.max(0, Math.min(y, imgRect.height));
    setCropSelection({ startX: clampedX, startY: clampedY, endX: clampedX, endY: clampedY });
    setIsDragging(true);
  }, []);

  const handleCropMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !cropImageRef.current) return;
    const imgRect = cropImageRef.current.getBoundingClientRect();
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;
    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(x, imgRect.width));
    const clampedY = Math.max(0, Math.min(y, imgRect.height));
    setCropSelection(prev => prev ? { ...prev, endX: clampedX, endY: clampedY } : null);
  }, [isDragging]);

  const handleCropMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSaveCrop = useCallback(() => {
    if (!croppingQuestion || !cropSelection || !cropImageRef.current) return;
    
    const { startX, startY, endX, endY } = cropSelection;
    const cropX = Math.min(startX, endX);
    const cropY = Math.min(startY, endY);
    const cropWidth = Math.abs(endX - startX);
    const cropHeight = Math.abs(endY - startY);
    
    if (cropWidth < 20 || cropHeight < 20) {
      toast({
        title: "Selection Too Small",
        description: "Please select a larger area to crop",
        variant: "destructive"
      });
      return;
    }

    const img = cropImageRef.current;
    cropMutation.mutate({
      questionId: croppingQuestion.questionId,
      imageUrl: croppingQuestion.imageUrl,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      originalWidth: img.clientWidth,
      originalHeight: img.clientHeight
    });
  }, [croppingQuestion, cropSelection, cropMutation, toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB for base64 storage)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }

      setIsReadingFile(true);
      // Convert file to base64 for storage (enables PDF extraction)
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setUploadForm(prev => ({
          ...prev,
          fileName: file.name,
          fileUrl: base64Data, // Store as base64 data URL
          fileSize: file.size
        }));
        setIsReadingFile(false);
        toast({
          title: "File Ready",
          description: `${file.name} loaded successfully`
        });
      };
      reader.onerror = () => {
        setIsReadingFile(false);
        toast({
          title: "Error",
          description: "Failed to read file. Please try again.",
          variant: "destructive"
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.subject || !uploadForm.grade || !uploadForm.paperType || !uploadForm.fileUrl) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    uploadMutation.mutate(uploadForm as InsertPastPaper);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || subjectId;
  };

  const getExtractionStatusBadge = (status: string | null, paperId: number) => {
    if (extractingPaperId === paperId) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Extracting...
        </Badge>
      );
    }
    
    switch (status) {
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Extracted
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            <Sparkles className="w-3 h-3 mr-1" />
            Not Extracted
          </Badge>
        );
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Past Papers</h2>
              <p className="text-slate-600">
                Manage and organize past papers for students
              </p>
            </div>
            <Button
              onClick={() => setShowUploadForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Paper
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filter Past Papers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Area */}
        {!selectedSubject || !selectedGrade ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  Select Subject and Grade
                </h3>
                <p className="text-slate-600">
                  Choose a subject and grade level to view available past papers
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading past papers...</p>
              </div>
            </CardContent>
          </Card>
        ) : pastPapers.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  No past papers available
                </h3>
                <p className="text-slate-600 mb-4">
                  No past papers available for {getSubjectName(selectedSubject)} - Grade {selectedGrade}
                </p>
                <Button
                  onClick={() => setShowUploadForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload First Paper
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastPapers.map((paper: PastPaper) => (
              <Card key={paper.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(paper.id)}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`delete-paper-${paper.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{paper.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{paper.paperType}</Badge>
                    <Badge variant="outline">{paper.year}</Badge>
                    {getExtractionStatusBadge((paper as any).extractionStatus, paper.id)}
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>{paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      <span>{formatFileSize(paper.fileSize || 0)}</span>
                    </div>
                    {(paper as any).extractedQuestionsCount > 0 && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Sparkles className="w-3 h-3" />
                        <span>{(paper as any).extractedQuestionsCount} questions extracted</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(paper.fileUrl, '_blank')}
                      data-testid={`view-paper-${paper.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = paper.fileUrl;
                        link.download = paper.fileName;
                        link.click();
                      }}
                      data-testid={`download-paper-${paper.id}`}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                  
                  {/* Extract Questions Button */}
                  <div className="flex gap-2">
                    <Button 
                      variant={(paper as any).extractionStatus === 'completed' ? "outline" : "default"}
                      size="sm" 
                      className="flex-1"
                      onClick={() => extractMutation.mutate(paper.id)}
                      disabled={extractingPaperId === paper.id || (paper as any).extractionStatus === 'processing'}
                      data-testid={`extract-questions-${paper.id}`}
                    >
                      {extractingPaperId === paper.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1" />
                          {(paper as any).extractionStatus === 'completed' ? 'Re-extract' : 'Extract Questions'}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* View Extracted Questions Button */}
                  {(paper as any).extractionStatus === 'completed' && (paper as any).extractedQuestionsCount > 0 && (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate(`/admin/past-papers/${paper.id}/questions`)}
                      data-testid={`view-questions-${paper.id}`}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      View {(paper as any).extractedQuestionsCount} Questions
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Form Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle>Upload Past Paper</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={uploadForm.title}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Mathematics Final Exam 2023"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Year *</Label>
                      <Input
                        id="year"
                        type="number"
                        value={uploadForm.year}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                        placeholder="2024"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upload-subject">Subject *</Label>
                      <Select 
                        value={uploadForm.subject} 
                        onValueChange={(value) => setUploadForm(prev => ({ ...prev, subject: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upload-grade">Grade *</Label>
                      <Select 
                        value={uploadForm.grade} 
                        onValueChange={(value) => setUploadForm(prev => ({ ...prev, grade: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {grades.map((grade) => (
                            <SelectItem key={grade.id} value={grade.id}>
                              {grade.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paper-type">Paper Type *</Label>
                      <Select 
                        value={uploadForm.paperType} 
                        onValueChange={(value) => setUploadForm(prev => ({ ...prev, paperType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {paperTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="file">File * (PDF, max 10MB)</Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        disabled={isReadingFile}
                        required
                      />
                      {isReadingFile && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Reading file...
                        </div>
                      )}
                      {uploadForm.fileUrl && uploadForm.fileUrl.startsWith('data:') && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          {uploadForm.fileName} ready
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowUploadForm(false);
                        setIsReadingFile(false);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={uploadMutation.isPending || isReadingFile || !uploadForm.fileUrl?.startsWith('data:')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Uploading...
                        </>
                      ) : isReadingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Reading File...
                        </>
                      ) : "Upload Paper"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Question Viewer Dialog */}
        <Dialog open={!!viewingPaper} onOpenChange={(open) => !open && setViewingPaper(null)}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold">{viewingPaper?.title}</DialogTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{getSubjectName(viewingPaper?.subject || '')}</Badge>
                    <Badge variant="outline">Grade {viewingPaper?.grade}</Badge>
                    <Badge variant="outline">{viewingPaper?.year}</Badge>
                    <Badge className="bg-green-100 text-green-700">
                      {(viewingPaper as any)?.extractedQuestionsCount || extractedQuestions.length} Questions
                    </Badge>
                  </div>
                </div>
              </div>
            </DialogHeader>
            
            <ScrollArea className="flex-1 px-6 py-4">
              {questionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-slate-600">Loading questions...</span>
                </div>
              ) : extractedQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mb-3 opacity-50" />
                  <p>No questions found for this paper.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortQuestions(extractedQuestions).map((q, index) => (
                    <div 
                      key={q.id} 
                      className="p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                      data-testid={`question-${q.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-700 font-bold text-lg">Q{formatQuestionNumber(q.questionNumber || index + 1)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {q.section && (
                              <Badge variant="secondary" className="text-xs">Section {q.section}</Badge>
                            )}
                            {q.topic && (
                              <Badge variant="outline" className="text-xs">{q.topic}</Badge>
                            )}
                            {q.difficulty && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  q.difficulty === 'easy' ? 'border-green-500 text-green-700' :
                                  q.difficulty === 'hard' ? 'border-red-500 text-red-700' :
                                  'border-yellow-500 text-yellow-700'
                                }`}
                              >
                                {q.difficulty}
                              </Badge>
                            )}
                            {((q as any).imageUrl || ((q as any).additionalImageUrls && (q as any).additionalImageUrls.length > 0)) && (
                              <Badge variant="outline" className="text-xs border-purple-500 text-purple-700">
                                <ImageIcon className="w-3 h-3 mr-1" />
                                {(() => {
                                  const total = ((q as any).imageUrl ? 1 : 0) + ((q as any).additionalImageUrls?.length || 0);
                                  return total > 1 ? `${total} Images` : 'Has Image';
                                })()}
                              </Badge>
                            )}
                            <Badge className="bg-blue-100 text-blue-700 text-xs ml-auto">
                              {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                            </Badge>
                          </div>
                          
                          {/* Primary image */}
                          {(q as any).imageUrl && (
                            <div className="mb-3 border rounded-lg overflow-hidden bg-slate-50">
                              <div className="text-xs text-slate-500 px-2 py-1 bg-slate-200">Primary Image</div>
                              <img 
                                src={(q as any).imageUrl} 
                                alt={`Question ${formatQuestionNumber(q.questionNumber || index + 1)} image`}
                                className="max-w-full h-auto max-h-64 object-contain mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                                data-testid={`question-image-${q.id}`}
                                onClick={() => setEnlargedImage({
                                  url: (q as any).imageUrl,
                                  alt: `Question ${formatQuestionNumber(q.questionNumber || index + 1)} image`
                                })}
                                title="Click to enlarge"
                              />
                              <div className="flex justify-center gap-2 py-2 bg-slate-100 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCroppingQuestion({
                                      questionId: q.id,
                                      imageUrl: (q as any).imageUrl,
                                      questionNumber: q.questionNumber || index + 1
                                    });
                                    setCropSelection(null);
                                  }}
                                  data-testid={`crop-image-${q.id}`}
                                >
                                  <Crop className="w-4 h-4 mr-1" />
                                  Crop Image
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Are you sure you want to delete this primary image?')) {
                                      deleteImageMutation.mutate({
                                        questionId: q.id,
                                        imageType: 'primary'
                                      });
                                    }
                                  }}
                                  disabled={deleteImageMutation.isPending}
                                  data-testid={`delete-primary-image-${q.id}`}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* Additional images */}
                          {(q as any).additionalImageUrls && (q as any).additionalImageUrls.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {(q as any).additionalImageUrls.map((imgUrl: string, imgIdx: number) => (
                                <div key={imgIdx} className="border rounded-lg overflow-hidden bg-slate-50">
                                  <div className="flex items-center justify-between px-2 py-1 bg-purple-100">
                                    <span className="text-xs text-slate-500">Additional Image {imgIdx + 1}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-red-600 hover:bg-red-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Are you sure you want to delete this additional image?')) {
                                          deleteImageMutation.mutate({
                                            questionId: q.id,
                                            imageType: 'additional',
                                            imageIndex: imgIdx
                                          });
                                        }
                                      }}
                                      disabled={deleteImageMutation.isPending}
                                      data-testid={`delete-additional-image-${q.id}-${imgIdx}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <img 
                                    src={imgUrl} 
                                    alt={`Question ${formatQuestionNumber(q.questionNumber || index + 1)} additional image ${imgIdx + 1}`}
                                    className="max-w-full h-auto max-h-64 object-contain mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                                    data-testid={`question-additional-image-${q.id}-${imgIdx}`}
                                    onClick={() => setEnlargedImage({
                                      url: imgUrl,
                                      alt: `Question ${formatQuestionNumber(q.questionNumber || index + 1)} additional image ${imgIdx + 1}`
                                    })}
                                    title="Click to enlarge"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Add Page button */}
                          <div className="mb-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAddingImageToQuestion({
                                questionId: q.id,
                                questionNumber: q.questionNumber || index + 1,
                                pastPaperId: q.pastPaperId
                              })}
                              data-testid={`add-page-image-${q.id}`}
                              className="text-purple-600 border-purple-300 hover:bg-purple-50"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Page
                            </Button>
                          </div>
                          
                          <div className="text-slate-800 text-base leading-relaxed">
                            <MathText text={q.questionText} />
                          </div>
                          
                          {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                            <div className="mt-3 space-y-1.5 pl-4 border-l-2 border-slate-200">
                              {q.options.map((option: string, optIndex: number) => (
                                <div key={optIndex} className="text-slate-700">
                                  <MathText text={option} />
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="mt-2 text-xs text-slate-500">
                            Type: {q.questionType}
                            {q.subQuestionOf && ` | Sub-question of Q${q.subQuestionOf}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <div className="px-6 py-4 border-t shrink-0 bg-slate-50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">
                  Showing {extractedQuestions.length} questions
                </span>
                <Button variant="outline" onClick={() => setViewingPaper(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={!!enlargedImage} onOpenChange={(open) => !open && setEnlargedImage(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
            <DialogHeader className="sr-only">
              <DialogTitle>Enlarged Image</DialogTitle>
              <DialogDescription>Full size view of the question image</DialogDescription>
            </DialogHeader>
            {enlargedImage && (
              <div className="relative flex items-center justify-center">
                <button
                  onClick={() => setEnlargedImage(null)}
                  className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  data-testid="close-enlarged-image"
                >
                  <X className="h-5 w-5" />
                </button>
                <img 
                  src={enlargedImage.url} 
                  alt={enlargedImage.alt}
                  className="max-w-full max-h-[85vh] object-contain"
                  data-testid="enlarged-image"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!croppingQuestion} onOpenChange={(open) => {
          if (!open) {
            setCroppingQuestion(null);
            setCropSelection(null);
          }
        }}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-4">
            <DialogHeader>
              <DialogTitle>Crop Image - Question {croppingQuestion && formatQuestionNumber(croppingQuestion.questionNumber)}</DialogTitle>
              <DialogDescription>
                Click and drag on the image to select the area you want to keep.
              </DialogDescription>
            </DialogHeader>
            {croppingQuestion && (
              <div className="flex flex-col gap-4">
                <div 
                  className="flex justify-center border rounded-lg overflow-hidden bg-slate-100 cursor-crosshair select-none"
                  data-testid="crop-container"
                >
                  <div 
                    className="relative inline-block"
                    onMouseDown={handleCropMouseDown}
                    onMouseMove={handleCropMouseMove}
                    onMouseUp={handleCropMouseUp}
                    onMouseLeave={handleCropMouseUp}
                  >
                    <img 
                      ref={cropImageRef}
                      src={croppingQuestion.imageUrl} 
                      alt={`Question ${formatQuestionNumber(croppingQuestion.questionNumber)} image`}
                      className="max-w-full max-h-[70vh] object-contain pointer-events-none block"
                      draggable={false}
                      data-testid="crop-source-image"
                    />
                    {cropSelection && (
                      <div 
                        className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
                        style={{
                          left: Math.min(cropSelection.startX, cropSelection.endX),
                          top: Math.min(cropSelection.startY, cropSelection.endY),
                          width: Math.abs(cropSelection.endX - cropSelection.startX),
                          height: Math.abs(cropSelection.endY - cropSelection.startY)
                        }}
                        data-testid="crop-selection"
                      />
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-600">
                    {cropSelection 
                      ? `Selection: ${Math.round(Math.abs(cropSelection.endX - cropSelection.startX))} x ${Math.round(Math.abs(cropSelection.endY - cropSelection.startY))} pixels`
                      : 'Click and drag to select crop area'
                    }
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCroppingQuestion(null);
                        setCropSelection(null);
                      }}
                      data-testid="cancel-crop"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveCrop}
                      disabled={!cropSelection || cropMutation.isPending}
                      data-testid="save-crop"
                    >
                      {cropMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Cropped Image
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Page Image Dialog */}
        <Dialog open={!!addingImageToQuestion} onOpenChange={(open) => {
          if (!open) {
            setAddingImageToQuestion(null);
            setEnlargedPageImage(null);
          }
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                Add Page Image - Question {addingImageToQuestion && formatQuestionNumber(addingImageToQuestion.questionNumber)}
              </DialogTitle>
              <DialogDescription>
                Click on a page to add it, or click "Preview" to see it larger first.
              </DialogDescription>
            </DialogHeader>
            
            {/* Enlarged page preview */}
            {enlargedPageImage && (
              <div className="mb-4 border-2 border-purple-500 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-purple-100 px-3 py-2">
                  <span className="font-medium">Page {enlargedPageImage.pageNumber} Preview</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (addingImageToQuestion) {
                          addImageMutation.mutate({
                            questionId: addingImageToQuestion.questionId,
                            pageNumber: enlargedPageImage.pageNumber
                          });
                        }
                      }}
                      disabled={addImageMutation.isPending}
                      data-testid={`add-enlarged-page-${enlargedPageImage.pageNumber}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add This Page
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEnlargedPageImage(null)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Close Preview
                    </Button>
                  </div>
                </div>
                <div className="bg-white p-2 flex justify-center">
                  <img 
                    src={enlargedPageImage.url} 
                    alt={`Page ${enlargedPageImage.pageNumber}`}
                    className="max-w-full max-h-[50vh] object-contain"
                  />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {availablePages.length === 0 ? (
                <div className="col-span-full text-center py-8 text-slate-500">
                  No page images available. Extract questions first to generate page images.
                </div>
              ) : (
                availablePages.map((page) => (
                  <div 
                    key={page.pageNumber}
                    className="border-2 rounded-lg overflow-hidden hover:border-purple-500 transition-colors"
                    data-testid={`page-container-${page.pageNumber}`}
                  >
                    <div className="bg-slate-100 px-2 py-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium">Page {page.pageNumber}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEnlargedPageImage({ url: page.url, pageNumber: page.pageNumber });
                          }}
                          data-testid={`preview-page-${page.pageNumber}`}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                    <div 
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        if (addingImageToQuestion) {
                          addImageMutation.mutate({
                            questionId: addingImageToQuestion.questionId,
                            pageNumber: page.pageNumber
                          });
                        }
                      }}
                    >
                      <img 
                        src={page.url} 
                        alt={`Page ${page.pageNumber}`}
                        className="w-full h-56 object-cover object-top"
                      />
                      <div className="bg-purple-50 text-center py-1.5 text-xs text-purple-700 font-medium">
                        Click to Add
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {addImageMutation.isPending && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Adding image...
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}