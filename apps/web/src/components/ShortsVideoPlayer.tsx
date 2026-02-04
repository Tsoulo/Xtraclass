import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  Bot, 
  X, 
  Send,
  Play,
  Pause,
  Volume2,
  VolumeX,
  MoreVertical,
  Share,
  Bookmark,
  Mic,
  MicOff
} from "lucide-react";
import thutoAvatar from "@assets/xtraclass-logo-td.png";

interface VideoInteraction {
  lessonId: string;
  likes: number;
  dislikes: number;
  comments: Comment[];
  userLiked: boolean;
  userDisliked: boolean;
}

interface VideoComment {
  id: number;
  comment: string;
  studentName: string;
  studentId: number;
  createdAt: string;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  replies?: Comment[];
}

interface ShortsVideoPlayerProps {
  lesson: {
    id: string;
    lesson_title?: string;
    lessonTitle?: string;
    video_link?: string;
    videoLink?: string;
    description?: string;
    subject: string;
    date?: string;
    grade?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortsVideoPlayer({ lesson, isOpen, onClose }: ShortsVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [currentLesson, setCurrentLesson] = useState(lesson);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isLoadingNextVideo, setIsLoadingNextVideo] = useState(false);
  const [interaction, setInteraction] = useState<VideoInteraction>({
    lessonId: lesson.id,
    likes: 0,
    dislikes: 0,
    comments: [],
    userLiked: false,
    userDisliked: false
  });
  
  // Ref for auto-scroll functionality
  const aiChatScrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    if (chatHistory.length > 0 && aiChatScrollRef.current) {
      setTimeout(() => {
        aiChatScrollRef.current?.scrollTo({
          top: aiChatScrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [chatHistory]);

  // Cleanup media recorder when chat closes or component unmounts
  useEffect(() => {
    if (!showAIChat && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [showAIChat]);

  // Fetch all available video lessons for navigation
  const { data: fetchedLessons = [] } = useQuery({
    queryKey: ['/api/syllabus-calendar'],
    queryFn: async () => {
      const response = await apiRequest('/api/syllabus-calendar', { method: 'GET' });
      // Filter only lessons with video links
      return Array.isArray(response) ? response.filter((lesson: any) => lesson.videoLink) : [];
    },
    enabled: isOpen,
    staleTime: 300000, // 5 minutes - longer cache for lesson list
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  // Update allLessons state and currentLessonIndex when data is fetched
  useEffect(() => {
    if (fetchedLessons.length > 0) {
      setAllLessons(fetchedLessons);
      // Find current lesson index
      const currentIndex = fetchedLessons.findIndex((l: any) => l.id === currentLesson.id);
      setCurrentLessonIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [fetchedLessons, currentLesson.id]);

  // Update interaction state when lesson changes
  useEffect(() => {
    setInteraction({
      lessonId: currentLesson.id,
      likes: 0,
      dislikes: 0,
      comments: [],
      userLiked: false,
      userDisliked: false
    });
  }, [currentLesson.id]);
  
  // Fetch video comments from API - using apiRequest for proper authentication
  const { data: videoComments = [] } = useQuery({
    queryKey: ['/api/video-comments', currentLesson.id],
    queryFn: async () => {
      const response = await apiRequest(`/api/video-comments/${currentLesson.id}`, {
        method: 'GET'
      });
      return response;
    },
    enabled: !!currentLesson.id && isOpen,
    staleTime: 60000, // 60 seconds - longer cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  // Transform API comments to match the existing Comment interface
  const transformedComments: Comment[] = useMemo(() => 
    Array.isArray(videoComments) 
      ? videoComments.map((comment: VideoComment) => ({
          id: comment.id.toString(),
          text: comment.comment,
          author: comment.studentName,
          timestamp: new Date(comment.createdAt)
        }))
      : []
  , [videoComments]);

  // Fetch video likes/dislikes from API - using apiRequest for proper authentication
  const { data: videoLikesData } = useQuery({
    queryKey: ['/api/video-likes', currentLesson.id],
    queryFn: async () => {
      const response = await apiRequest(`/api/video-likes/${currentLesson.id}`, {
        method: 'GET'
      });
      return response;
    },
    enabled: !!currentLesson.id && isOpen,
    staleTime: 60000, // 60 seconds - longer cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ lessonId, comment }: { lessonId: number, comment: string }) => {
      return await apiRequest('/api/video-comments', {
        method: 'POST',
        body: JSON.stringify({ lessonId, comment })
      });
    },
    onSuccess: () => {
      // Invalidate and refetch comments for current lesson
      queryClient.invalidateQueries({ queryKey: ['/api/video-comments', currentLesson.id] });
      setNewComment("");
    }
  });

  // Like/dislike mutation
  const likeMutation = useMutation({
    mutationFn: async ({ lessonId, isLike }: { lessonId: number, isLike: boolean }) => {
      return await apiRequest('/api/video-likes', {
        method: 'POST',
        body: JSON.stringify({ lessonId, isLike })
      });
    },
    onSuccess: () => {
      // Invalidate and refetch likes for current lesson
      queryClient.invalidateQueries({ queryKey: ['/api/video-likes', currentLesson.id] });
    }
  });

  // Remove like/dislike mutation
  const removeLikeMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      return await apiRequest(`/api/video-likes/${lessonId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      // Invalidate and refetch likes for current lesson
      queryClient.invalidateQueries({ queryKey: ['/api/video-likes', currentLesson.id] });
    }
  });
  
  // Interaction data will be managed through useState and useEffect hooks above

  // Update interaction when API data changes - avoid infinite loops
  useEffect(() => {
    setInteraction(prev => ({
      ...prev,
      comments: transformedComments,
      lessonId: currentLesson.id
    }));
  }, [transformedComments.length, currentLesson.id]);

  // Separate effect for likes data to avoid infinite loops
  useEffect(() => {
    if (videoLikesData) {
      setInteraction(prev => ({
        ...prev,
        likes: (videoLikesData as any).likes || 0,
        dislikes: (videoLikesData as any).dislikes || 0,
        userLiked: (videoLikesData as any).userLiked || false,
        userDisliked: (videoLikesData as any).userDisliked || false
      }));
    }
  }, [videoLikesData]);

  // Fetch all lessons on component mount - only once per session
  useEffect(() => {
    if (isOpen && lesson && allLessons.length === 0) {
      fetchAllLessons();
    }
  }, [isOpen, lesson.id, allLessons.length]); // Changed to use lesson.id only

  // Update current lesson when lesson prop changes
  useEffect(() => {
    setCurrentLesson(lesson);
    setInteraction(prev => ({
      ...prev,
      lessonId: lesson.id
      // likes/dislikes will be set by the API query useEffect
    }));
    
    // Ensure fresh data for the new lesson
    queryClient.invalidateQueries({ queryKey: ['/api/video-comments', lesson.id] });
    queryClient.invalidateQueries({ queryKey: ['/api/video-likes', lesson.id] });
  }, [lesson.id]); // Only depend on lesson ID, not the entire lesson object

  const fetchAllLessons = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userGrade = currentUser?.gradeLevel || currentUser?.grade || '8';
      const subjects = ['mathematics', 'physical science', 'life sciences', 'english', 'history', 'geography'];
      
      // Get lessons for multiple days (current day + previous days)
      const allLessons: any[] = [];
      const today = new Date();
      
      // Fetch lessons for the current day and 7 previous days (reduced to improve performance)
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const lessonPromises = subjects.map(async (subject) => {
          try {
            const response = await fetch(
              `/api/syllabus-calendar?date=${encodeURIComponent(dateStr)}&grade=${encodeURIComponent(userGrade)}&subject=${encodeURIComponent(subject)}`
            );
            
            if (!response.ok) return [];
            
            const lessons = await response.json();
            return lessons
              .filter((lesson: any) => lesson.videoLink || lesson.video_link)
              .map((lesson: any) => ({ 
                ...lesson, 
                subject: subject,
                date: dateStr,
                grade: userGrade
              }));
          } catch (error) {
            console.error(`Error fetching lessons for ${subject} on ${dateStr}:`, error);
            return [];
          }
        });
        
        const dayLessons = await Promise.all(lessonPromises);
        allLessons.push(...dayLessons.flat());
      }
      
      // Sort lessons by date (newest first) and then by subject
      const sortedLessons = allLessons.sort((a, b) => {
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.subject.localeCompare(b.subject);
      });
      
      setAllLessons(sortedLessons);
      
      // Find current lesson index
      const currentIndex = sortedLessons.findIndex(l => l.id === lesson.id);
      setCurrentLessonIndex(currentIndex >= 0 ? currentIndex : 0);
      
    } catch (error) {
      console.error('Error fetching all lessons:', error);
    }
  };

  const videoUrl = currentLesson.video_link || currentLesson.videoLink || '';
  const title = currentLesson.lesson_title || currentLesson.lessonTitle || 'Video Lesson';
  
  // Convert YouTube URLs to embed format for better control
  const getEmbedUrl = (url: string) => {
    // Parameters: autoplay, controls, no related videos, modest branding, auto subtitles
    const params = 'autoplay=1&controls=1&rel=0&modestbranding=1&cc_load_policy=1&cc_lang_pref=en';
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?${params}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?${params}`;
    }
    return url;
  };

  const handleLike = () => {
    if (interaction.userLiked) {
      // Remove like if already liked
      removeLikeMutation.mutate(parseInt(currentLesson.id));
    } else {
      // Add like
      likeMutation.mutate({ lessonId: parseInt(currentLesson.id), isLike: true });
    }
  };

  const handleDislike = () => {
    if (interaction.userDisliked) {
      // Remove dislike if already disliked
      removeLikeMutation.mutate(parseInt(currentLesson.id));
    } else {
      // Add dislike
      likeMutation.mutate({ lessonId: parseInt(currentLesson.id), isLike: false });
    }
  };

  const handleComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate({ 
        lessonId: parseInt(currentLesson.id), 
        comment: newComment 
      });
    }
  };

  const handleAIQuestion = async () => {
    if (!aiQuestion.trim()) return;
    
    setIsLoadingAI(true);
    const currentQuestion = aiQuestion; // Store the question before clearing
    setAiQuestion(""); // Clear the text box immediately
    
    // Add user message to chat history immediately
    const newUserMessage = { role: 'user' as const, content: currentQuestion };
    setChatHistory(prev => [...prev, newUserMessage]);
    
    try {
      const response = await apiRequest('/api/video-lesson-chat', {
        method: 'POST',
        body: JSON.stringify({
          studentQuestion: currentQuestion,
          lessonId: currentLesson.id,
          lessonTitle: title,
          subject: currentLesson.subject,
          topic: (currentLesson as any).topic || 'Algebra',
          theme: (currentLesson as any).theme || 'Algebraic Expressions',
          grade: currentLesson.grade || '8',
          conversationHistory: chatHistory, // Send conversation history for context
          transcript: (currentLesson as any).videoTranscript || (currentLesson as any).video_transcript || '' // Include stored transcript if available
        })
      });

      // Add AI response to chat history
      setChatHistory(prev => [...prev, { role: 'assistant', content: response.response }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Add error message to chat
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "I apologize, but I couldn't connect to the AI assistant right now. Please try again later or contact your teacher for help." 
      }]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const startVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Audio chunk received:', event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
        
        if (audioChunksRef.current.length === 0) {
          setChatHistory(prev => [...prev, { 
            role: 'assistant', 
            content: "No audio was recorded. Please try again and speak after tapping the microphone." 
          }]);
          return;
        }
        
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Audio blob size:', audioBlob.size);
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          console.log('Sending audio for transcription, base64 length:', base64Audio?.length);
          
          try {
            const response = await apiRequest('/api/transcribe-audio', {
              method: 'POST',
              body: {
                audio: base64Audio,
                mimeType: mimeType
              }
            });
            
            console.log('Transcription response:', response);
            if (response.text) {
              setAiQuestion(response.text);
            } else if (response.error) {
              setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: "Sorry, I couldn't understand the audio. Please try again." 
              }]);
            }
          } catch (error) {
            console.error('Transcription error:', error);
            setChatHistory(prev => [...prev, { 
              role: 'assistant', 
              content: "There was an error processing your voice. Please try again or type your question." 
            }]);
          }
          setIsTranscribing(false);
        };
        reader.readAsDataURL(audioBlob);
      };
      
      // Start recording with timeslice to ensure data is collected regularly
      mediaRecorder.start(100);
      setIsListening(true);
      console.log('Recording started');
    } catch (error: any) {
      console.error('Microphone error:', error);
      if (error.name === 'NotAllowedError') {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: "Microphone access was denied. Please allow microphone access in your browser settings to use voice input." 
        }]);
      } else {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: "Could not access your microphone. Please check your device settings." 
        }]);
      }
    }
  };

  const stopVoiceInput = () => {
    console.log('Stop voice input called, recorder state:', mediaRecorderRef.current?.state);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setIsListening(false);
    }
  };

  const navigateToNextVideo = () => {
    if (allLessons.length === 0 || isLoadingNextVideo) return;
    
    setIsLoadingNextVideo(true);
    
    // Get next lesson (if we're at the end, loop to first)
    const nextIndex = (currentLessonIndex + 1) % allLessons.length;
    const nextLesson = allLessons[nextIndex];
    
    if (nextLesson) {
      setCurrentLesson(nextLesson);
      setCurrentLessonIndex(nextIndex);
      
      // Reset interaction data for new lesson - will be populated by API queries
      setInteraction({
        lessonId: nextLesson.id,
        likes: 0, // Will be populated by API
        dislikes: 0, // Will be populated by API
        comments: [], // Will be populated by useQuery
        userLiked: false, // Will be populated by API
        userDisliked: false // Will be populated by API
      });

      // Force refetch of data for the new lesson
      queryClient.invalidateQueries({ queryKey: ['/api/video-comments', nextLesson.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/video-likes', nextLesson.id] });
      
      // Reset other states
      setShowComments(false);
      setShowAIChat(false);
      setChatHistory([]); // Clear chat history for new lesson
      setAiQuestion("");
      setNewComment("");
    }
    
    setTimeout(() => setIsLoadingNextVideo(false), 300);
  };

  const navigateToPreviousVideo = () => {
    if (allLessons.length === 0 || isLoadingNextVideo) return;
    
    setIsLoadingNextVideo(true);
    
    // Get previous lesson (if we're at the start, loop to last)
    const prevIndex = currentLessonIndex === 0 ? allLessons.length - 1 : currentLessonIndex - 1;
    const prevLesson = allLessons[prevIndex];
    
    if (prevLesson) {
      setCurrentLesson(prevLesson);
      setCurrentLessonIndex(prevIndex);
      
      // Update interaction data for new lesson
      setInteraction({
        lessonId: prevLesson.id,
        likes: Math.floor(Math.random() * 200) + 50,
        dislikes: Math.floor(Math.random() * 20) + 5,
        comments: [
          {
            id: '1',
            text: `This ${prevLesson.lessonTitle || prevLesson.lesson_title} lesson is so clear!`,
            author: 'Sam P.',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
          }
        ],
        userLiked: false,
        userDisliked: false
      });
      
      // Reset other states
      setShowComments(false);
      setShowAIChat(false);
      setChatHistory([]); // Clear chat history for new lesson
      setAiQuestion("");
      setNewComment("");
    }
    
    setTimeout(() => setIsLoadingNextVideo(false), 300);
  };

  // Touch/Swipe handling - different thresholds for mobile vs tablet/desktop
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [lastWheelTime, setLastWheelTime] = useState<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    // Mobile: lower threshold (30px) for easier single-swipe navigation
    // This makes it much easier to swipe on mobile with one gesture
    const isMobile = window.innerWidth < 768;
    const swipeThreshold = isMobile ? 30 : 80; // Lower threshold for mobile
    
    const isSwipeUp = distance > swipeThreshold;
    const isSwipeDown = distance < -swipeThreshold;
    
    if (isSwipeUp) {
      navigateToNextVideo();
    } else if (isSwipeDown) {
      navigateToPreviousVideo();
    }
    
    // Reset touch states
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Mouse wheel handling for desktop - with debouncing to prevent multiple triggers
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    // Debounce wheel events - wait 500ms between navigations
    if (now - lastWheelTime < 500) return;
    
    if (e.deltaY > 50) {
      // Scrolling down = next video (require larger delta to prevent accidental triggers)
      setLastWheelTime(now);
      navigateToNextVideo();
    } else if (e.deltaY < -50) {
      // Scrolling up = previous video
      setLastWheelTime(now);
      navigateToPreviousVideo();
    }
  };

  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case 'mathematics': return 'from-red-500 to-red-600';
      case 'physical science': return 'from-blue-500 to-blue-600';
      case 'life sciences': return 'from-green-500 to-green-600';
      case 'english': return 'from-purple-500 to-purple-600';
      case 'history': return 'from-orange-500 to-orange-600';
      case 'geography': return 'from-teal-500 to-teal-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col md:flex-row">
      {/* Full Screen Video Container with Touch/Scroll Handlers */}
      <div 
        className="flex-1 h-full relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Video Player */}
        <div className="w-full h-full bg-black relative">
          {/* Loading Overlay */}
          {isLoadingNextVideo && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <div className="text-center text-white">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm">Loading next video...</p>
              </div>
            </div>
          )}
          {videoUrl ? (
            <iframe
              className="w-full h-full object-cover"
              src={getEmbedUrl(videoUrl)}
              title={title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <div className="text-center text-white">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No video available</p>
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 z-20 hover:bg-black/70 text-white rounded-full p-2 bg-[#000000]"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Video Info Overlay - Bottom Left */}
        <div className="absolute bottom-20 left-4 right-20 md:right-20 text-white z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge 
                className={`bg-gradient-to-r ${getSubjectColor(currentLesson.subject)} text-white border-0`}
              >
                {currentLesson.subject.replace('-', ' ').toUpperCase()}
              </Badge>
              {currentLesson.date && (
                <Badge className="bg-black/50 text-white border-0 text-xs">
                  {new Date(currentLesson.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Badge>
              )}
              {allLessons.length > 0 && (
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  {currentLessonIndex + 1} of {allLessons.length}
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-semibold leading-tight">{title}</h2>
            {currentLesson.description && (
              <p className="text-sm opacity-90 line-clamp-2">{currentLesson.description}</p>
            )}
            
            {/* Swipe Instructions */}
            <div className="flex items-center gap-2 mt-2 opacity-70">
              <div className="text-xs flex items-center gap-1">
                <span>↑</span>
                <span>Swipe up for next lesson</span>
              </div>
              {allLessons.length > 1 && (
                <div className="text-xs flex items-center gap-1">
                  <span>↓</span>
                  <span>Swipe down for previous</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next/Previous Video Preview Hints */}
        {allLessons.length > 1 && (
          <>
            {/* Next Video Hint - Top (positioned to avoid Close button) */}
            {allLessons[currentLessonIndex + 1] && (
              <div className="absolute top-4 right-4 left-16 text-center z-10">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
                  <p className="opacity-70">Next: {allLessons[currentLessonIndex + 1].lessonTitle || allLessons[currentLessonIndex + 1].lesson_title}</p>
                </div>
              </div>
            )}
            
            {/* Previous Video Hint - Bottom */}
            {allLessons[currentLessonIndex - 1] && (
              <div className="absolute bottom-4 right-4 left-4 text-center z-10">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
                  <p className="opacity-70">Previous: {allLessons[currentLessonIndex - 1].lessonTitle || allLessons[currentLessonIndex - 1].lesson_title}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Mobile Interactive Icons - Positioned on Video (Right Side) */}
        <div className="md:hidden absolute right-4 bottom-32 flex flex-col items-center space-y-4 z-10">
          {/* Like Button */}
          <div className="flex flex-col items-center space-y-1">
            <Button
              onClick={handleLike}
              variant="ghost"
              size="sm"
              className={`rounded-full p-3 ${
                interaction.userLiked 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-black/50 hover:bg-black/70 text-white'
              }`}
            >
              <ThumbsUp className="w-6 h-6" />
            </Button>
            <span className="text-white text-xs font-medium">{interaction.likes}</span>
          </div>

          {/* Dislike Button */}
          <div className="flex flex-col items-center space-y-1">
            <Button
              onClick={handleDislike}
              variant="ghost"
              size="sm"
              className={`rounded-full p-3 ${
                interaction.userDisliked 
                  ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                  : 'bg-black/50 hover:bg-black/70 text-white'
              }`}
            >
              <ThumbsDown className="w-6 h-6" />
            </Button>
            <span className="text-white text-xs font-medium">{interaction.dislikes}</span>
          </div>

          {/* Comments Button */}
          <div className="flex flex-col items-center space-y-1">
            <Button
              onClick={() => setShowComments(true)}
              variant="ghost"
              size="sm"
              className="rounded-full p-3 bg-black/50 hover:bg-black/70 text-white"
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
            <span className="text-white text-xs font-medium">{interaction.comments.length}</span>
          </div>

          {/* Ask Tsebo Button */}
          <div className="flex flex-col items-center space-y-1">
            <Button
              onClick={() => setShowAIChat(true)}
              variant="ghost"
              size="sm"
              className="rounded-full p-0 overflow-hidden w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              <img src={thutoAvatar} alt="Tsebo" className="w-full h-full object-cover" />
            </Button>
            <span className="text-white text-xs font-medium">Ask Tsebo</span>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center space-y-1">
            <Button
              onClick={() => {
                navigator.share?.({ title, url: videoUrl }) || 
                navigator.clipboard?.writeText(videoUrl);
              }}
              variant="ghost"
              size="sm"
              className="rounded-full p-3 bg-black/50 hover:bg-black/70 text-white"
            >
              <Share className="w-6 h-6" />
            </Button>
            <span className="text-white text-xs font-medium">Share</span>
          </div>
        </div>
      </div>

      {/* Desktop Right Side Panel - Interactive Buttons (Hidden on Mobile) */}
      <div className="hidden md:flex w-20 flex-shrink-0 flex-col items-center justify-end pb-20 space-y-6 bg-black/20">
        
        {/* Like Button */}
        <div className="flex flex-col items-center space-y-1">
          <Button
            onClick={handleLike}
            variant="ghost"
            size="sm"
            className={`rounded-full p-3 ${
              interaction.userLiked 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-black/50 hover:bg-black/70 text-white'
            }`}
          >
            <ThumbsUp className="w-6 h-6" />
          </Button>
          <span className="text-white text-xs font-medium">{interaction.likes}</span>
        </div>

        {/* Dislike Button */}
        <div className="flex flex-col items-center space-y-1">
          <Button
            onClick={handleDislike}
            variant="ghost"
            size="sm"
            className={`rounded-full p-3 ${
              interaction.userDisliked 
                ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                : 'bg-black/50 hover:bg-black/70 text-white'
            }`}
          >
            <ThumbsDown className="w-6 h-6" />
          </Button>
          <span className="text-white text-xs font-medium">{interaction.dislikes}</span>
        </div>

        {/* Comments Button */}
        <div className="flex flex-col items-center space-y-1">
          <Button
            onClick={() => setShowComments(true)}
            variant="ghost"
            size="sm"
            className="rounded-full p-3 bg-black/50 hover:bg-black/70 text-white"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          <span className="text-white text-xs font-medium">{interaction.comments.length}</span>
        </div>

        {/* Ask Tsebo Button */}
        <div className="flex flex-col items-center space-y-1">
          <Button
            onClick={() => setShowAIChat(true)}
            variant="ghost"
            size="sm"
            className="rounded-full p-0 overflow-hidden w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <img src={thutoAvatar} alt="Tsebo" className="w-full h-full object-cover" />
          </Button>
          <span className="text-white text-xs font-medium">Ask Tsebo</span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center space-y-1">
          <Button
            onClick={() => {
              navigator.share?.({ title, url: videoUrl }) || 
              navigator.clipboard?.writeText(videoUrl);
            }}
            variant="ghost"
            size="sm"
            className="rounded-full p-3 bg-black/50 hover:bg-black/70 text-white"
          >
            <Share className="w-6 h-6" />
          </Button>
          <span className="text-white text-xs font-medium">Share</span>
        </div>

        {/* More Options */}
        <div className="flex flex-col items-center space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-3 bg-black/50 hover:bg-black/70 text-white"
          >
            <MoreVertical className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Comments Bottom Sheet */}
      <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Comments ({interaction.comments.length})
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 space-y-4 mt-4 max-h-[50vh] overflow-y-auto">
            {interaction.comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {comment.author[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.author}</span>
                    <span className="text-xs text-gray-500">
                      {comment.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 min-h-[40px] max-h-[100px] resize-none"
            />
            <Button 
              onClick={handleComment}
              size="sm"
              className="self-end"
              disabled={!newComment.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* AI Chat Bottom Sheet */}
      <Sheet open={showAIChat} onOpenChange={setShowAIChat}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <img src={thutoAvatar} alt="Tsebo" className="w-6 h-6 rounded-full object-cover" />
              Ask Tsebo about this lesson
            </SheetTitle>
          </SheetHeader>
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-hidden mt-4">
            <div 
              ref={aiChatScrollRef}
              className="h-full space-y-4 overflow-y-auto pr-2" 
              style={{ scrollBehavior: 'smooth' }}
            >
              {/* Welcome message when no chat history */}
              {chatHistory.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Ask me anything about this lesson - concepts, examples, or clarifications!
                  </p>
                  
                  {/* Quick Question Suggestions */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Can you explain this step by step?",
                      "What's the key concept here?",
                      "How do I solve similar problems?",
                      "Why does this method work?",
                      "Explain this video in Zulu Language"
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => setAiQuestion(suggestion)}
                        className="text-xs"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Display full conversation history */}
              {chatHistory.map((message, index) => (
                <div 
                  key={index} 
                  className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  {message.role === 'assistant' ? (
                    // Tsebo Response
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 max-w-[85%]">
                      <div className="flex items-start gap-3">
                        <img src={thutoAvatar} alt="Tsebo" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // User Question
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg p-4 max-w-[85%]">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoadingAI && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <img src={thutoAvatar} alt="Tsebo" className="w-8 h-8 rounded-full object-cover" />
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Add padding at bottom to ensure content isn't hidden behind input */}
              <div className="h-4"></div>
            </div>
          </div>

          {/* Fixed Input Area */}
          <div className="flex-shrink-0 flex gap-2 mt-4 pt-4 border-t bg-white">
            <div className="flex-1 relative">
              <Textarea
                placeholder={isTranscribing ? "Processing your voice..." : isListening ? "Listening... Tap stop when done" : "Ask your question here..."}
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                className={`w-full min-h-[60px] max-h-[120px] resize-none pr-12 ${isListening ? 'border-red-400 bg-red-50' : ''} ${isTranscribing ? 'border-purple-400 bg-purple-50' : ''}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                className={`absolute right-2 bottom-2 p-2 h-8 w-8 ${isListening ? 'text-red-500 bg-red-100 hover:bg-red-200 animate-pulse' : isTranscribing ? 'text-purple-500' : 'text-gray-500 hover:text-purple-500'}`}
                disabled={isLoadingAI || isTranscribing}
              >
                {isTranscribing ? (
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                ) : isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button 
              onClick={handleAIQuestion}
              size="sm"
              className="self-end bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              disabled={!aiQuestion.trim() || isLoadingAI}
            >
              {isLoadingAI ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}