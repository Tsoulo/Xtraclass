import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { buildApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { 
  ArrowLeft,
  Trash2,
  Plus,
  Loader2,
  X,
  Image as ImageIcon,
  Crop,
  Save,
  Eye,
  Upload
} from "lucide-react";
import type { PastPaper, PastPaperQuestion } from "@shared/schema";

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

export default function PastPaperQuestions() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const paperId = parseInt(id || "0");
  
  const [selectedQuestion, setSelectedQuestion] = useState<PastPaperQuestion | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [showAddPage, setShowAddPage] = useState(false);
  const [croppingQuestion, setCroppingQuestion] = useState<{
    questionId: number;
    imageUrl: string;
    questionNumber: number;
  } | null>(null);
  const [cropSelection, setCropSelection] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    isDragging: boolean;
  } | null>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingType, setUploadingType] = useState<'primary' | 'additional' | null>(null);

  const { data: paper, isLoading: paperLoading } = useQuery<PastPaper>({
    queryKey: ['/api/past-papers', paperId],
    queryFn: () => apiRequest(`/api/past-papers/${paperId}`),
    enabled: !!paperId
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<PastPaperQuestion[]>({
    queryKey: ['/api/past-papers', paperId, 'questions'],
    queryFn: () => apiRequest(`/api/past-papers/${paperId}/questions`),
    enabled: !!paperId
  });

  const { data: availablePages = [] } = useQuery<{pageNumber: number; url: string}[]>({
    queryKey: ['/api/past-papers', paperId, 'page-images'],
    queryFn: async () => {
      const result = await apiRequest(`/api/past-papers/${paperId}/page-images`);
      return result.pages || [];
    },
    enabled: !!paperId && showAddPage
  });

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
      toast({ title: "Image Deleted", description: "The image has been removed" });
      queryClient.invalidateQueries({ queryKey: ['/api/past-papers', paperId, 'questions'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Delete Image", description: error.message, variant: "destructive" });
    }
  });

  const addImageMutation = useMutation({
    mutationFn: async ({ questionId, pageNumber }: { questionId: number; pageNumber: number }) => {
      return apiRequest(`/api/past-paper-questions/${questionId}/add-image`, {
        method: 'POST',
        body: JSON.stringify({ pageNumber })
      });
    },
    onSuccess: () => {
      toast({ title: "Image Added", description: "The page image has been added" });
      setShowAddPage(false);
      queryClient.invalidateQueries({ queryKey: ['/api/past-papers', paperId, 'questions'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Add Image", description: error.message, variant: "destructive" });
    }
  });

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
    onSuccess: () => {
      toast({ title: "Image Cropped", description: "The image has been cropped and saved" });
      setCroppingQuestion(null);
      setCropSelection(null);
      queryClient.invalidateQueries({ queryKey: ['/api/past-papers', paperId, 'questions'] });
    },
    onError: (error: any) => {
      toast({ title: "Crop Failed", description: error.message, variant: "destructive" });
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ questionId, file, imageType }: { questionId: number; file: File; imageType: 'primary' | 'additional' }) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('imageType', imageType);
      
      const response = await fetch(buildApiUrl(`/api/past-paper-questions/${questionId}/upload-image`), {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Image Uploaded", description: "The image has been uploaded successfully" });
      setUploadingType(null);
      queryClient.invalidateQueries({ queryKey: ['/api/past-papers', paperId, 'questions'] });
    },
    onError: (error: any) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
      setUploadingType(null);
    }
  });

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedQuestion && uploadingType) {
      uploadImageMutation.mutate({ questionId: selectedQuestion.id, file, imageType: uploadingType });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedQuestion, uploadingType, uploadImageMutation]);

  const handleCropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropImageRef.current) return;
    const rect = cropImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropSelection({ startX: x, startY: y, endX: x, endY: y, isDragging: true });
  }, []);

  const handleCropMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropSelection?.isDragging || !cropImageRef.current) return;
    const rect = cropImageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setCropSelection(prev => prev ? { ...prev, endX: x, endY: y } : null);
  }, [cropSelection?.isDragging]);

  const handleCropMouseUp = useCallback(() => {
    if (cropSelection) {
      setCropSelection(prev => prev ? { ...prev, isDragging: false } : null);
    }
  }, [cropSelection]);

  const handleSaveCrop = useCallback(() => {
    if (!cropSelection || !croppingQuestion || !cropImageRef.current) return;
    const img = cropImageRef.current;
    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    
    const cropX = Math.min(cropSelection.startX, cropSelection.endX);
    const cropY = Math.min(cropSelection.startY, cropSelection.endY);
    const cropWidth = Math.abs(cropSelection.endX - cropSelection.startX);
    const cropHeight = Math.abs(cropSelection.endY - cropSelection.startY);
    
    if (cropWidth < 10 || cropHeight < 10) {
      toast({ title: "Selection too small", description: "Please select a larger area", variant: "destructive" });
      return;
    }
    
    cropMutation.mutate({
      questionId: croppingQuestion.questionId,
      imageUrl: croppingQuestion.imageUrl,
      cropX, cropY, cropWidth, cropHeight,
      originalWidth: displayWidth,
      originalHeight: displayHeight
    });
  }, [cropSelection, croppingQuestion, cropMutation, toast]);

  const sortedQuestions = useMemo(() => sortQuestions(questions), [questions]);

  // Keep selectedQuestion in sync with updated data
  useEffect(() => {
    if (selectedQuestion && questions.length > 0) {
      const updatedQuestion = questions.find(q => q.id === selectedQuestion.id);
      if (updatedQuestion && JSON.stringify(updatedQuestion) !== JSON.stringify(selectedQuestion)) {
        setSelectedQuestion(updatedQuestion);
      }
    }
  }, [questions, selectedQuestion]);

  if (paperLoading || questionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Paper not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold">{paper.subject} - Grade {paper.grade}</h1>
              <p className="text-sm text-slate-500">{paper.year} {paper.paperType} • {sortedQuestions.length} questions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Question List */}
          <Card className="h-[calc(100vh-180px)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Questions</CardTitle>
            </CardHeader>
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="p-4 space-y-3">
                {sortedQuestions.map((q, index) => (
                  <div 
                    key={q.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedQuestion?.id === q.id 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedQuestion(q)}
                    data-testid={`question-item-${q.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-700 font-bold">Q{formatQuestionNumber(q.questionNumber || index + 1)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1 flex-wrap">
                          {q.section && <Badge variant="secondary" className="text-xs">Section {q.section}</Badge>}
                          {q.topic && <Badge variant="outline" className="text-xs">{q.topic}</Badge>}
                          {((q as any).imageUrl || ((q as any).additionalImageUrls?.length > 0)) && (
                            <Badge variant="outline" className="text-xs border-purple-500 text-purple-700">
                              <ImageIcon className="w-3 h-3 mr-0.5" />
                              {(() => {
                                const total = ((q as any).imageUrl ? 1 : 0) + ((q as any).additionalImageUrls?.length || 0);
                                return total > 1 ? `${total}` : '';
                              })()}
                            </Badge>
                          )}
                          <Badge className="bg-blue-100 text-blue-700 text-xs ml-auto">{q.marks}m</Badge>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2">
                          <MathText text={q.questionText} />
                        </p>
                        
                        {/* Image thumbnails in list */}
                        {((q as any).imageUrl || ((q as any).additionalImageUrls?.length > 0)) && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {(q as any).imageUrl && (
                              <img 
                                src={(q as any).imageUrl} 
                                alt="Primary"
                                className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                                onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: (q as any).imageUrl, title: `Q${formatQuestionNumber(q.questionNumber || index + 1)} - Primary` }); }}
                              />
                            )}
                            {(q as any).additionalImageUrls?.map((imgUrl: string, idx: number) => (
                              <img 
                                key={idx}
                                src={imgUrl} 
                                alt={`Additional ${idx + 1}`}
                                className="w-16 h-16 object-cover rounded border border-purple-300 cursor-pointer hover:opacity-80"
                                onClick={(e) => { e.stopPropagation(); setPreviewImage({ url: imgUrl, title: `Q${formatQuestionNumber(q.questionNumber || index + 1)} - Additional ${idx + 1}` }); }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Right: Question Details & Image Preview */}
          <div className="space-y-4">
            {showAddPage && selectedQuestion ? (
              <Card className="h-[calc(100vh-180px)]">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Add Page to Q{formatQuestionNumber(selectedQuestion.questionNumber || 0)}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddPage(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <ScrollArea className="h-[calc(100%-60px)]">
                  <div className="p-4 grid grid-cols-2 gap-4">
                    {availablePages.map((page) => (
                      <div 
                        key={page.pageNumber}
                        className="border-2 rounded-lg overflow-hidden hover:border-purple-500 transition-colors"
                      >
                        <div className="bg-slate-100 px-2 py-1.5 flex items-center justify-between">
                          <span className="text-sm font-medium">Page {page.pageNumber}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => setPreviewImage({ url: page.url, title: `Page ${page.pageNumber}` })}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Preview
                          </Button>
                        </div>
                        <div 
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => addImageMutation.mutate({ questionId: selectedQuestion.id, pageNumber: page.pageNumber })}
                        >
                          <img src={page.url} alt={`Page ${page.pageNumber}`} className="w-full h-48 object-cover object-top" />
                          <div className="bg-purple-50 text-center py-1.5 text-xs text-purple-700 font-medium">Click to Add</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            ) : croppingQuestion ? (
              <Card className="h-[calc(100vh-180px)]">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Crop Image - Q{formatQuestionNumber(croppingQuestion.questionNumber)}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => { setCroppingQuestion(null); setCropSelection(null); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <div className="p-4 flex flex-col gap-4 h-[calc(100%-60px)]">
                  <div 
                    className="flex-1 flex justify-center border rounded-lg overflow-hidden bg-slate-100 cursor-crosshair select-none"
                    onMouseDown={handleCropMouseDown}
                    onMouseMove={handleCropMouseMove}
                    onMouseUp={handleCropMouseUp}
                    onMouseLeave={handleCropMouseUp}
                  >
                    <div className="relative inline-block">
                      <img 
                        ref={cropImageRef}
                        src={croppingQuestion.imageUrl} 
                        alt="Crop source"
                        className="max-w-full max-h-[50vh] object-contain pointer-events-none block"
                        draggable={false}
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
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-600">
                      {cropSelection ? `${Math.round(Math.abs(cropSelection.endX - cropSelection.startX))} x ${Math.round(Math.abs(cropSelection.endY - cropSelection.startY))} px` : 'Click and drag to select'}
                    </p>
                    <Button onClick={handleSaveCrop} disabled={!cropSelection || cropMutation.isPending}>
                      {cropMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Crop
                    </Button>
                  </div>
                </div>
              </Card>
            ) : selectedQuestion ? (
              <Card className="h-[calc(100vh-180px)] overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Q{formatQuestionNumber(selectedQuestion.questionNumber || 0)}</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowAddPage(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Page
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => { setUploadingType('additional'); fileInputRef.current?.click(); }}
                        disabled={uploadImageMutation.isPending}
                      >
                        {uploadImageMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-1" />
                        )}
                        Upload
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {selectedQuestion.section && <Badge variant="secondary">Section {selectedQuestion.section}</Badge>}
                    {selectedQuestion.topic && <Badge variant="outline">{selectedQuestion.topic}</Badge>}
                    {selectedQuestion.difficulty && (
                      <Badge variant="outline" className={
                        selectedQuestion.difficulty === 'easy' ? 'border-green-500 text-green-700' :
                        selectedQuestion.difficulty === 'hard' ? 'border-red-500 text-red-700' :
                        'border-yellow-500 text-yellow-700'
                      }>
                        {selectedQuestion.difficulty}
                      </Badge>
                    )}
                    <Badge className="bg-blue-100 text-blue-700">{selectedQuestion.marks} marks</Badge>
                  </div>
                </CardHeader>
                <ScrollArea className="h-[calc(100%-100px)]">
                  <div className="p-4 space-y-4">
                    <div className="text-slate-800">
                      <MathText text={selectedQuestion.questionText} />
                    </div>

                    {selectedQuestion.options && Array.isArray(selectedQuestion.options) && selectedQuestion.options.length > 0 && (
                      <div className="space-y-1 pl-4 border-l-2 border-slate-200">
                        {selectedQuestion.options.map((option: string, idx: number) => (
                          <div key={idx} className="text-slate-700"><MathText text={option} /></div>
                        ))}
                      </div>
                    )}

                    {/* Primary Image */}
                    {(selectedQuestion as any).imageUrl && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-2 py-1 bg-slate-100">
                          <span className="text-xs text-slate-500">Primary Image</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setPreviewImage({ url: (selectedQuestion as any).imageUrl, title: 'Primary Image' })}>
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setCroppingQuestion({ questionId: selectedQuestion.id, imageUrl: (selectedQuestion as any).imageUrl, questionNumber: selectedQuestion.questionNumber || 0 })}>
                              <Crop className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-red-600 hover:bg-red-100" onClick={() => {
                              if (confirm('Delete this primary image?')) {
                                deleteImageMutation.mutate({ questionId: selectedQuestion.id, imageType: 'primary' });
                              }
                            }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <img 
                          src={(selectedQuestion as any).imageUrl} 
                          alt="Question image"
                          className="max-w-full h-auto max-h-48 object-contain mx-auto cursor-pointer hover:opacity-80"
                          onClick={() => setPreviewImage({ url: (selectedQuestion as any).imageUrl, title: 'Primary Image' })}
                        />
                      </div>
                    )}

                    {/* Additional Images */}
                    {(selectedQuestion as any).additionalImageUrls?.map((imgUrl: string, idx: number) => (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-2 py-1 bg-purple-50">
                          <span className="text-xs text-slate-500">Additional Image {idx + 1}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setPreviewImage({ url: imgUrl, title: `Additional Image ${idx + 1}` })}>
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-red-600 hover:bg-red-100" onClick={() => {
                              if (confirm('Delete this additional image?')) {
                                deleteImageMutation.mutate({ questionId: selectedQuestion.id, imageType: 'additional', imageIndex: idx });
                              }
                            }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <img 
                          src={imgUrl} 
                          alt={`Additional image ${idx + 1}`}
                          className="max-w-full h-auto max-h-48 object-contain mx-auto cursor-pointer hover:opacity-80"
                          onClick={() => setPreviewImage({ url: imgUrl, title: `Additional Image ${idx + 1}` })}
                        />
                      </div>
                    ))}

                    <div className="text-xs text-slate-500 pt-2 border-t">
                      Type: {selectedQuestion.questionType}
                      {selectedQuestion.subQuestionOf && ` | Sub-question of Q${selectedQuestion.subQuestionOf}`}
                    </div>
                  </div>
                </ScrollArea>
              </Card>
            ) : (
              <Card className="h-[calc(100vh-180px)] flex items-center justify-center">
                <p className="text-slate-400">Select a question to view details</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileUpload}
      />

      {/* Full-screen Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{previewImage?.title || 'Image Preview'}</DialogTitle>
            <DialogDescription>Full size view of the image</DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="relative w-full h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b">
                <span className="font-medium text-slate-700">{previewImage.title}</span>
                <Button variant="ghost" size="sm" onClick={() => setPreviewImage(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1 flex items-center justify-center bg-slate-50 p-4 min-h-[70vh]">
                <img 
                  src={previewImage.url} 
                  alt={previewImage.title}
                  className="max-w-full max-h-[80vh] object-contain"
                  data-testid="preview-modal-image"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
