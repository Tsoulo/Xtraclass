import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Copy, Check, Loader2, AlertCircle, Clock, Bot, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { buildApiUrl } from "@/lib/api";
import MathText from "@/components/MathText";

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptData {
  success: boolean;
  video_id?: string;
  language?: string;
  is_auto_generated?: boolean;
  full_text?: string;
  segments?: TranscriptSegment[];
  segment_count?: number;
  error?: string;
}

interface TranscriptViewerProps {
  videoUrl: string;
  lessonTitle?: string;
  lessonId?: number;
  subject?: string;
  topic?: string;
  theme?: string;
  grade?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TranscriptViewer({ videoUrl, lessonTitle, lessonId, subject, topic, theme, grade }: TranscriptViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{type: 'user' | 'ai', message: string, timestamp: Date}>>([]);
  const { toast } = useToast();

  const { data: transcript, isLoading, error, refetch } = useQuery<TranscriptData>({
    queryKey: ['/api/youtube/transcript', videoUrl, lessonId],
    queryFn: async () => {
      // Include lessonId to check database for stored transcripts first
      const params = new URLSearchParams({ videoUrl });
      if (lessonId) {
        params.append('lessonId', lessonId.toString());
      }
      const response = await fetch(buildApiUrl(`/api/youtube/transcript?${params.toString()}`));
      if (!response.ok) {
        throw new Error('Failed to fetch transcript');
      }
      return response.json();
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 30,
    retry: false
  });

  const askTseboMutation = useMutation({
    mutationFn: async (question: string) => {
      return await apiRequest('/api/video-lesson-chat', {
        method: 'POST',
        body: JSON.stringify({
          studentQuestion: question,
          lessonId: lessonId || 0,
          lessonTitle: lessonTitle || 'Video Lesson',
          subject: subject || 'General',
          topic: topic || 'General Topic',
          theme: theme || 'General Theme',
          grade: grade || '10',
          transcript: transcript?.full_text || ''
        })
      });
    },
    onSuccess: (response) => {
      setChatHistory(prev => [
        ...prev,
        { type: 'ai', message: response.response, timestamp: new Date() }
      ]);
      setChatQuestion('');
    },
    onError: (error: any) => {
      console.error('Ask Tsebo error:', error);
      toast({
        title: "Chat Error",
        description: "Sorry, I couldn't process your question right now. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCopy = async () => {
    if (transcript?.full_text) {
      await navigator.clipboard.writeText(transcript.full_text);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Transcript copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChatSubmit = () => {
    if (!chatQuestion.trim()) return;
    const userMessage = {
      type: 'user' as const,
      message: chatQuestion,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessage]);
    askTseboMutation.mutate(chatQuestion);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          View Transcript
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Video Transcript
          </SheetTitle>
          {lessonTitle && (
            <p className="text-sm text-muted-foreground">{lessonTitle}</p>
          )}
        </SheetHeader>
        
        <div className="mt-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Fetching transcript...</p>
            </div>
          )}

          {!isLoading && transcript?.success && transcript.segments && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {transcript.is_auto_generated ? 'Auto-generated' : 'Manual'} • {transcript.language?.toUpperCase()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy All
                    </>
                  )}
                </Button>
              </div>

              {/* Ask Tsebo Chat Section */}
              <div className="border rounded-lg bg-blue-50 border-blue-200">
                <Button
                  onClick={() => setChatExpanded(!chatExpanded)}
                  variant="ghost"
                  className="w-full flex items-center justify-between p-3 h-auto"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700 font-medium">Ask Tsebo about this video</span>
                  </div>
                  {chatExpanded ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-blue-600" />}
                </Button>
                
                {chatExpanded && (
                  <div className="p-3 pt-0 space-y-3">
                    {chatHistory.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {chatHistory.map((msg, index) => (
                          <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-2 rounded-lg text-sm ${
                              msg.type === 'user' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-white border border-blue-200'
                            }`}>
                              <div className="flex items-start gap-2">
                                {msg.type === 'ai' && <Bot className="h-3 w-3 mt-0.5 text-blue-600 flex-shrink-0" />}
                                <div className="flex-1">
                                  <MathText className="text-sm leading-snug whitespace-pre-wrap break-words">{msg.message}</MathText>
                                </div>
                              </div>
                              <p className="text-xs mt-1 opacity-70">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-2">
                        <Bot className="h-6 w-6 mx-auto mb-1 text-blue-400" />
                        <p className="text-sm">Ask me anything about this video!</p>
                        <p className="text-xs text-gray-400 mt-1">I'll use the transcript to give you specific answers.</p>
                      </div>
                    )}
                    
                    <div className="flex gap-2 items-end">
                      <Textarea
                        placeholder="Ask about the video content..."
                        value={chatQuestion}
                        onChange={(e) => setChatQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                            handleChatSubmit();
                          }
                        }}
                        className="flex-1 text-sm min-h-[60px] max-h-[100px] resize-y bg-white"
                        disabled={askTseboMutation.isPending}
                      />
                      <Button
                        onClick={handleChatSubmit}
                        disabled={!chatQuestion.trim() || askTseboMutation.isPending}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {askTseboMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {[
                        "Summarize this video",
                        "What are the key points?",
                        "Explain the main concept"
                      ].map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => setChatQuestion(question)}
                          className="text-xs h-6 px-2 bg-white"
                          disabled={askTseboMutation.isPending}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <ScrollArea className="h-[calc(100vh-380px)] pr-4">
                <div className="space-y-3">
                  {transcript.segments.map((segment, index) => (
                    <div 
                      key={index} 
                      className="group p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground min-w-[50px] pt-0.5">
                          <Clock className="h-3 w-3" />
                          {formatTime(segment.start)}
                        </span>
                        <p className="text-sm leading-relaxed flex-1">{segment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {!isLoading && transcript && !transcript.success && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
              <h4 className="font-medium text-gray-900 mb-2">Transcript Not Available</h4>
              <p className="text-sm text-muted-foreground max-w-xs mb-4">
                {transcript.error || "This video doesn't have a transcript available."}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h4 className="font-medium text-gray-900 mb-2">Error Loading Transcript</h4>
              <p className="text-sm text-muted-foreground max-w-xs mb-4">
                There was a problem fetching the transcript.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
