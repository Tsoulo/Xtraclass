import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, Clock, User, Star, Send, ArrowLeft, AlertTriangle, Camera } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TutoringSession } from "@shared/schema";
import type { User as UserType } from "@shared/schema";

type EnrichedSession = TutoringSession & { 
  studentName: string; 
  tutorName: string | null;
};

export default function TutorVideoCall() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [tutorNotes, setTutorNotes] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: string; message: string; time: Date }[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<{
    type: 'denied' | 'unavailable' | 'in_use' | 'unknown';
    message: string;
  } | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: session, isLoading } = useQuery<EnrichedSession>({
    queryKey: ["/api/tutoring-sessions", id],
    enabled: !!id,
  });

  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tutoring-sessions/${id}/join`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutoring-sessions", id] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (notes: string) => {
      return await apiRequest(`/api/tutoring-sessions/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ tutorNotes: notes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutoring-sessions", id] });
      setShowEndDialog(false);
      toast({
        title: "Session Completed",
        description: "The tutoring session has been marked as complete.",
      });
      if (currentUser?.role === "student") {
        setShowRatingDialog(true);
      } else {
        setLocation("/tutor-sessions");
      }
    },
  });

  const rateMutation = useMutation({
    mutationFn: async (data: { rating: number; feedback: string }) => {
      return await apiRequest(`/api/tutoring-sessions/${id}/rate`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutoring-sessions", id] });
      setShowRatingDialog(false);
      toast({
        title: "Thank You!",
        description: "Your feedback helps improve our tutoring service.",
      });
      setLocation("/student-tutoring");
    },
  });

  const { isMobile, isIOS, isSafari } = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return { isMobile: false, isIOS: false, isSafari: false };
    }
    const ua = navigator.userAgent;
    return {
      isMobile: /iPhone|iPad|iPod|Android/i.test(ua),
      isIOS: /iPhone|iPad|iPod/i.test(ua),
      isSafari: /^((?!chrome|android).)*safari/i.test(ua),
    };
  }, []);

  const getPermissionErrorMessage = (error: unknown): { type: 'denied' | 'unavailable' | 'in_use' | 'unknown'; message: string } => {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          if (isIOS) {
            return {
              type: 'denied',
              message: 'Camera access was denied. On iOS, go to Settings > Safari > Camera and select "Allow".'
            };
          }
          return {
            type: 'denied',
            message: 'Camera access was denied. Please allow camera and microphone permissions in your browser settings.'
          };
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          return {
            type: 'unavailable',
            message: 'No camera or microphone found on this device. Please connect a camera to use video calls.'
          };
        case 'NotReadableError':
        case 'TrackStartError':
          return {
            type: 'in_use',
            message: 'Your camera or microphone is being used by another app. Please close other apps using the camera and try again.'
          };
        case 'OverconstrainedError':
          return {
            type: 'unavailable',
            message: 'Your camera does not meet the requirements. Try refreshing the page.'
          };
        case 'SecurityError':
          return {
            type: 'denied',
            message: 'Camera access is blocked due to security settings. Video calls require a secure (HTTPS) connection.'
          };
        default:
          return {
            type: 'unknown',
            message: `Camera error: ${error.message}. Please refresh and try again.`
          };
      }
    }
    return {
      type: 'unknown',
      message: 'Could not access camera. Please check your device settings and try again.'
    };
  };

  const initializeMedia = useCallback(async () => {
    setIsRequestingPermission(true);
    setPermissionError(null);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new DOMException('Media devices not supported', 'NotFoundError');
      }

      const constraints = {
        video: {
          facingMode: isMobile ? 'user' : undefined,
          width: { ideal: isMobile ? 640 : 1280 },
          height: { ideal: isMobile ? 480 : 720 }
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        if (isIOS || isSafari) {
          localVideoRef.current.setAttribute('playsinline', 'true');
          localVideoRef.current.setAttribute('webkit-playsinline', 'true');
          try {
            await localVideoRef.current.play();
          } catch (playError) {
            console.log('Auto-play prevented, user interaction needed');
          }
        }
      }
      
      toast({
        title: "Camera Connected",
        description: "Your camera and microphone are ready.",
      });
    } catch (error) {
      console.error("Error accessing media devices:", error);
      const errorInfo = getPermissionErrorMessage(error);
      setPermissionError(errorInfo);
      toast({
        title: "Camera/Microphone Error",
        description: errorInfo.message,
        variant: "destructive",
      });
    } finally {
      setIsRequestingPermission(false);
    }
  }, [toast, isMobile, isIOS, isSafari]);

  const retryMediaAccess = () => {
    setPermissionError(null);
    initializeMedia();
  };

  useEffect(() => {
    if (session && (session.status === "accepted" || session.status === "in_progress")) {
      initializeMedia();
      joinMutation.mutate();
      
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [session?.status]);

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    
    if (currentUser?.role === "tutor" || currentUser?.role === "admin") {
      setShowEndDialog(true);
    } else {
      setLocation("/student-tutoring");
    }
  };

  const handleSendChat = () => {
    if (chatMessage.trim()) {
      setChatMessages(prev => [...prev, {
        sender: currentUser?.firstName || "You",
        message: chatMessage.trim(),
        time: new Date(),
      }]);
      setChatMessage("");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Session not found</p>
          <Button onClick={() => setLocation(currentUser?.role === "tutor" ? "/tutor-sessions" : "/student-tutoring")}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (session.status !== "accepted" && session.status !== "in_progress") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-2">Session is not ready</p>
          <p className="text-gray-400 mb-4">Status: {session.status}</p>
          <Button onClick={() => setLocation(currentUser?.role === "tutor" ? "/tutor-sessions" : "/student-tutoring")}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="p-4 flex items-center justify-between bg-gray-800/50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-white"
            onClick={() => setLocation(currentUser?.role === "tutor" ? "/tutor-sessions" : "/student-tutoring")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Leave
          </Button>
          <div className="text-white">
            <p className="font-medium" data-testid="text-session-subject">{session.subject}</p>
            <p className="text-sm text-gray-400">
              with {currentUser?.role === "student" ? session.tutorName : session.studentName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Live
          </Badge>
          <div className="flex items-center text-white gap-2">
            <Clock className="w-4 h-4" />
            <span data-testid="text-call-duration">{formatDuration(callDuration)}</span>
          </div>
        </div>
      </div>

      {permissionError && (
        <Alert variant="destructive" className="mx-4 mt-2 border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-red-400">Camera Access Required</AlertTitle>
          <AlertDescription className="text-red-300">
            <p className="mb-2">{permissionError.message}</p>
            {permissionError.type === 'denied' && (
              <div className="text-sm space-y-1 text-gray-300">
                <p className="font-medium">How to enable camera:</p>
                {isIOS ? (
                  <ul className="list-disc list-inside text-xs">
                    <li>Open iPhone Settings</li>
                    <li>Scroll down and tap Safari (or your browser)</li>
                    <li>Tap Camera and select "Allow"</li>
                    <li>Return here and tap "Try Again"</li>
                  </ul>
                ) : isMobile ? (
                  <ul className="list-disc list-inside text-xs">
                    <li>Tap the lock icon in your browser's address bar</li>
                    <li>Find "Camera" and change to "Allow"</li>
                    <li>Tap "Try Again" below</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside text-xs">
                    <li>Click the camera icon in your browser's address bar</li>
                    <li>Select "Always allow" for camera and microphone</li>
                    <li>Click "Try Again" below</li>
                  </ul>
                )}
              </div>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-3 border-red-500 text-red-400 hover:bg-red-500/20"
              onClick={retryMediaAccess}
              disabled={isRequestingPermission}
              data-testid="button-retry-camera-banner"
            >
              <Camera className="w-4 h-4 mr-2" />
              {isRequestingPermission ? "Connecting..." : "Try Again"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex-1 flex">
        <div className="flex-1 p-4 flex items-center justify-center relative">
          <div className="w-full max-w-4xl aspect-video bg-gray-800 rounded-xl overflow-hidden relative">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                webkit-playsinline="true"
                className="w-full h-full object-cover"
                data-testid="video-remote"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <User className="w-24 h-24 mb-4" />
                <p>Waiting for {currentUser?.role === "student" ? "tutor" : "student"} to join...</p>
              </div>
            )}
            
            <div className="absolute bottom-4 right-4 w-48 md:w-48 w-32 aspect-video bg-gray-700 rounded-lg overflow-hidden shadow-lg">
              {isRequestingPermission ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <Camera className="w-8 h-8 animate-pulse" />
                  <p className="text-xs mt-1">Connecting...</p>
                </div>
              ) : permissionError ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-red-400 p-2">
                  <AlertTriangle className="w-6 h-6" />
                  <p className="text-xs text-center mt-1">Camera blocked</p>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-xs mt-1 h-6 px-2"
                    onClick={retryMediaAccess}
                    data-testid="button-retry-camera"
                  >
                    Retry
                  </Button>
                </div>
              ) : isVideoOn && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: "scaleX(-1)" }}
                  data-testid="video-local"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-12 h-12 text-gray-500" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-80 bg-gray-800 flex flex-col hidden md:flex">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-medium text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">No messages yet</p>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={idx} className="bg-gray-700 p-2 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">{msg.sender}</p>
                  <p className="text-sm text-white">{msg.message}</p>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-700 flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 bg-gray-700 border-none rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
              data-testid="input-chat"
            />
            <Button size="sm" onClick={handleSendChat} data-testid="button-send-chat">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-800/50 flex justify-center gap-4">
        <Button
          variant={isVideoOn ? "secondary" : "destructive"}
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={toggleVideo}
          data-testid="button-toggle-video"
        >
          {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>
        <Button
          variant={isAudioOn ? "secondary" : "destructive"}
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={toggleAudio}
          data-testid="button-toggle-audio"
        >
          {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={handleEndCall}
          data-testid="button-end-call"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Tutoring Session</DialogTitle>
            <DialogDescription>
              Add notes about this session before marking it complete.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Session notes (optional)..."
            value={tutorNotes}
            onChange={(e) => setTutorNotes(e.target.value)}
            rows={4}
            data-testid="input-tutor-notes"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => completeMutation.mutate(tutorNotes)}
              disabled={completeMutation.isPending}
              data-testid="button-complete-session"
            >
              {completeMutation.isPending ? "Completing..." : "Complete Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Session</DialogTitle>
            <DialogDescription>
              How was your tutoring experience with {session.tutorName}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="focus:outline-none"
                data-testid={`button-star-${star}`}
              >
                <Star
                  className={`w-10 h-10 ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Share your feedback (optional)..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            data-testid="input-feedback"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRatingDialog(false);
                setLocation("/student-tutoring");
              }}
            >
              Skip
            </Button>
            <Button
              onClick={() => rateMutation.mutate({ rating, feedback })}
              disabled={rating === 0 || rateMutation.isPending}
              data-testid="button-submit-rating"
            >
              {rateMutation.isPending ? "Submitting..." : "Submit Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
