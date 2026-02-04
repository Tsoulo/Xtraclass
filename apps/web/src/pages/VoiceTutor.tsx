import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";
import { buildApiUrl } from "@/lib/api";
import MathText from "@/components/MathText";
import { 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  Send,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Monitor,
  MonitorOff,
  RotateCcw,
  X,
  Upload,
  Pause,
  Play,
  AudioLines
} from "lucide-react";

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";
type InputSource = "camera" | "screen";

export default function VoiceTutor() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [inputSource, setInputSource] = useState<InputSource>("camera");
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  const videoRefMobile = useRef<HTMLVideoElement>(null);
  const videoRefDesktop = useRef<HTMLVideoElement>(null);
  const canvasRefMobile = useRef<HTMLCanvasElement>(null);
  const canvasRefDesktop = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const getActiveVideoElement = useCallback(() => {
    if (typeof window === 'undefined') return videoRefMobile.current;
    return window.innerWidth < 768 ? videoRefMobile.current : videoRefDesktop.current;
  }, []);
  
  const getActiveCanvasElement = useCallback(() => {
    if (typeof window === 'undefined') return canvasRefMobile.current;
    return window.innerWidth < 768 ? canvasRefMobile.current : canvasRefDesktop.current;
  }, []);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [hasRequestedCamera, setHasRequestedCamera] = useState(false);

  // Auto-request camera permission on mobile when page loads
  useEffect(() => {
    const requestCameraPermission = async () => {
      // Only auto-request on mobile
      if (window.innerWidth < 768 && !hasRequestedCamera) {
        setHasRequestedCamera(true);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
          });
          
          const videoEl = getActiveVideoElement();
          if (videoEl) {
            videoEl.srcObject = stream;
            // Ensure video plays on mobile
            try {
              await videoEl.play();
            } catch (playError) {
              console.log("Auto-play failed, user interaction needed:", playError);
            }
          }
          streamRef.current = stream;
          setIsCameraOn(true);
          setCameraPermissionDenied(false);
        } catch (error: any) {
          console.error("Camera permission error:", error);
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setCameraPermissionDenied(true);
          }
        }
      }
    };
    
    // Small delay to ensure page is rendered
    setTimeout(requestCameraPermission, 500);
  }, [hasRequestedCamera, getActiveVideoElement]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      
      const videoEl = getActiveVideoElement();
      if (videoEl) {
        videoEl.srcObject = stream;
        // Ensure video plays on mobile
        try {
          await videoEl.play();
        } catch (playError) {
          console.log("Auto-play requires user interaction:", playError);
        }
      }
      streamRef.current = stream;
      setIsCameraOn(true);
      setCameraPermissionDenied(false);
    } catch (error: any) {
      console.error("Camera access error:", error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraPermissionDenied(true);
        toast({
          title: "Camera Permission Needed",
          description: "Please allow camera access in your browser settings to use Voice Tutor.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Camera Error",
          description: "Could not access camera. Please check permissions.",
          variant: "destructive"
        });
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    const videoEl = getActiveVideoElement();
    if (videoEl) {
      videoEl.srcObject = null;
    }
    setIsCameraOn(false);
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      const videoEl = getActiveVideoElement();
      if (videoEl) {
        videoEl.srcObject = stream;
      }
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      setInputSource("screen");
      
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error("Screen share error:", error);
      toast({
        title: "Screen Share Error",
        description: "Could not share screen. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    const videoEl = getActiveVideoElement();
    if (videoEl && !streamRef.current) {
      videoEl.srcObject = null;
    } else if (videoEl && streamRef.current) {
      videoEl.srcObject = streamRef.current;
    }
    setIsScreenSharing(false);
    setInputSource("camera");
  };

  const captureFrame = useCallback(() => {
    const video = getActiveVideoElement();
    const canvas = getActiveCanvasElement();
    
    console.log("captureFrame called", {
      hasVideo: !!video,
      hasCanvas: !!canvas,
      isCameraOn,
      isScreenSharing,
      videoWidth: video?.videoWidth,
      videoHeight: video?.videoHeight,
      videoReadyState: video?.readyState
    });
    
    if (!video || !canvas || (!isCameraOn && !isScreenSharing)) {
      toast({
        title: "Video Required",
        description: "Please turn on camera or share screen first.",
        variant: "destructive"
      });
      return null;
    }

    // Check if video has loaded with valid dimensions
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
      console.error("Video not ready:", {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState
      });
      toast({
        title: "Video Not Ready",
        description: "Please wait for the video to fully load before capturing.",
        variant: "destructive"
      });
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    console.log("Canvas dimensions set:", canvas.width, "x", canvas.height);
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      
      // Validate the captured image
      const isValidImage = imageData && imageData.length > 100 && imageData.startsWith("data:image/jpeg;base64,");
      console.log("Image captured:", {
        length: imageData?.length,
        isValid: isValidImage,
        prefix: imageData?.substring(0, 50)
      });
      
      if (!isValidImage) {
        toast({
          title: "Capture Failed",
          description: "Failed to capture image from video. Please try again.",
          variant: "destructive"
        });
        return null;
      }
      
      setLastCapture(imageData);
      return imageData;
    }
    return null;
  }, [isCameraOn, isScreenSharing, toast, getActiveVideoElement, getActiveCanvasElement]);

  const sendImageToAI = useCallback(() => {
    const imageData = captureFrame();
    if (!imageData || !dcRef.current || dcRef.current.readyState !== "open") {
      console.error("sendImageToAI failed:", {
        hasImageData: !!imageData,
        hasDc: !!dcRef.current,
        dcState: dcRef.current?.readyState
      });
      toast({
        title: "Not Connected",
        description: "Please connect to Tsebo first.",
        variant: "destructive"
      });
      return;
    }

    console.log("Sending image to AI, data length:", imageData.length);

    // Create a unique event ID for tracking
    const eventId = `img_${Date.now()}`;
    
    // Send combined text and image in a single message as per OpenAI Realtime API docs
    // The image_url should be the full data URL including the prefix
    const combinedEvent = {
      type: "conversation.item.create",
      event_id: eventId,
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: "I'm showing you a maths question. Please look at the image carefully and describe exactly what you see, then help me solve the problem step by step."
          },
          {
            type: "input_image",
            image_url: imageData
          }
        ]
      }
    };
    
    console.log("Sending combined text+image event:", eventId, "image size:", imageData.length);
    dcRef.current.send(JSON.stringify(combinedEvent));
    
    // Request a response
    const responseEvent = {
      type: "response.create",
      event_id: `resp_${Date.now()}`
    };
    console.log("Sending response.create event");
    dcRef.current.send(JSON.stringify(responseEvent));
    
    setTranscript(prev => [...prev, "You: [Sent image of question]"]);
    setIsAIProcessing(true);
    
    toast({
      title: "Image Sent",
      description: "Tsebo is analyzing your question..."
    });
  }, [captureFrame, toast]);

  const connectToRealtime = async () => {
    try {
      setConnectionState("connecting");

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      pcRef.current = pc;

      if (audioRef.current) {
        audioRef.current.autoplay = true;
      }
      
      pc.ontrack = (e) => {
        if (audioRef.current) {
          audioRef.current.srcObject = e.streams[0];
        }
      };

      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.getTracks().forEach(track => {
        pc.addTrack(track, audioStream);
      });

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        console.log("Data channel opened");
        setConnectionState("connected");
        toast({
          title: "Connected!",
          description: "You're now connected to Tsebo. Start speaking or show your question."
        });
      };

      dc.onclose = () => {
        console.log("Data channel closed");
        setConnectionState("disconnected");
      };

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleServerEvent(event);
        } catch (error) {
          console.error("Failed to parse event:", error);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const token = authService.getToken();
      if (!token) {
        throw new Error("Not authenticated. Please log in again.");
      }

      const response = await fetch(buildApiUrl("/api/realtime/session"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ sdp: offer.sdp })
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    } catch (error) {
      console.error("Connection error:", error);
      setConnectionState("error");
      toast({
        title: "Connection Failed",
        description: "Could not connect to Tsebo. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleServerEvent = (event: any) => {
    console.log("Server event:", event.type, event);
    
    switch (event.type) {
      case "response.created":
        setIsAIProcessing(true);
        break;
        
      case "response.audio_transcript.delta":
      case "response.output_audio_transcript.delta":
        if (event.delta) {
          setIsAIProcessing(false);
          setTranscript(prev => {
            const newTranscript = [...prev];
            if (newTranscript.length > 0 && newTranscript[newTranscript.length - 1].startsWith("AI: ")) {
              newTranscript[newTranscript.length - 1] += event.delta;
            } else {
              newTranscript.push("AI: " + event.delta);
            }
            return newTranscript;
          });
        }
        break;
      
      case "response.text.delta":
        if (event.delta) {
          setIsAIProcessing(false);
          setTranscript(prev => {
            const newTranscript = [...prev];
            if (newTranscript.length > 0 && newTranscript[newTranscript.length - 1].startsWith("AI: ")) {
              newTranscript[newTranscript.length - 1] += event.delta;
            } else {
              newTranscript.push("AI: " + event.delta);
            }
            return newTranscript;
          });
        }
        break;
      
      case "response.audio_transcript.done":
      case "response.output_audio_transcript.done":
      case "response.text.done":
      case "response.done":
        setIsAIProcessing(false);
        break;
      
      case "input_audio_buffer.speech_started":
        setTranscript(prev => [...prev, "You: (speaking...)"]);
        break;
      
      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          setTranscript(prev => {
            const newTranscript = [...prev];
            const lastSpeakingIndex = newTranscript.lastIndexOf("You: (speaking...)");
            if (lastSpeakingIndex !== -1) {
              newTranscript[lastSpeakingIndex] = "You: " + event.transcript;
            }
            return newTranscript;
          });
        }
        break;
      
      case "error":
        console.error("Server error:", event.error);
        setIsAIProcessing(false);
        toast({
          title: "Error",
          description: event.error?.message || "An error occurred",
          variant: "destructive"
        });
        break;
    }
  };

  const disconnect = () => {
    if (dcRef.current) {
      dcRef.current.close();
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    stopCamera();
    stopScreenShare();
    setConnectionState("disconnected");
    setTranscript([]);
  };

  const toggleMute = () => {
    if (pcRef.current) {
      const senders = pcRef.current.getSenders();
      senders.forEach(sender => {
        if (sender.track?.kind === "audio") {
          sender.track.enabled = isMuted;
        }
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleAudioOutput = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isAudioMuted;
    }
    setIsAudioMuted(!isAudioMuted);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    // Auto-scroll transcript to bottom with a small delay for DOM update
    if (transcriptRef.current) {
      setTimeout(() => {
        if (transcriptRef.current) {
          transcriptRef.current.scrollTo({
            top: transcriptRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [transcript]);

  const getStatusBadge = () => {
    switch (connectionState) {
      case "disconnected":
        return <Badge variant="secondary" data-testid="status-disconnected">Disconnected</Badge>;
      case "connecting":
        return <Badge variant="outline" className="animate-pulse" data-testid="status-connecting">Connecting...</Badge>;
      case "connected":
        return <Badge variant="default" className="bg-green-500" data-testid="status-connected"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case "error":
        return <Badge variant="destructive" data-testid="status-error"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
    }
  };

  const isVideoActive = isCameraOn || isScreenSharing;

  return (
    <>
      {/* Mobile Layout - Full screen video with overlay transcript */}
      <div className="md:hidden fixed inset-0 bg-black flex flex-col">
        {/* Header - Centered Live indicator */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-center bg-gradient-to-b from-black/70 to-transparent">
          {connectionState === "connected" ? (
            <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
              <AudioLines className="w-5 h-5 text-green-400 animate-pulse" />
              <span className="text-white font-semibold text-lg">Live</span>
            </div>
          ) : connectionState === "connecting" ? (
            <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
              <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
              <span className="text-white font-semibold text-lg">Connecting...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
              <Volume2 className="w-5 h-5 text-gray-400" />
              <span className="text-white font-semibold text-lg">Voice Tutor</span>
            </div>
          )}
        </div>
        
        {/* Back button - top left corner */}
        <button 
          className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
          onClick={() => setLocation("/dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Video Area */}
        <div className="flex-1 relative">
          <video
            ref={videoRefMobile}
            autoPlay
            playsInline
            muted
            webkit-playsinline="true"
            className={`w-full h-full object-cover ${isVideoActive ? 'z-10' : 'z-0'}`}
            style={{ WebkitTransform: 'translateZ(0)' }}
            data-testid="video-preview"
          />
          {!isVideoActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-white px-6">
                {cameraPermissionDenied ? (
                  <>
                    <AlertCircle className="w-16 h-16 mx-auto mb-3 text-yellow-500" />
                    <p className="text-base font-semibold mb-2">Camera Permission Required</p>
                    <p className="text-sm opacity-75 mb-4">Please allow camera access in your browser settings to use Voice Tutor.</p>
                    <button
                      onClick={startCamera}
                      className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium"
                    >
                      Try Again
                    </button>
                  </>
                ) : (
                  <>
                    <CameraOff className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p className="text-sm opacity-75">Tap the camera button to start</p>
                  </>
                )}
              </div>
            </div>
          )}
          <canvas ref={canvasRefMobile} className="hidden" />

          {/* Transcript Overlay - Mobile */}
          <div 
            ref={transcriptRef}
            className="absolute bottom-24 left-0 right-0 max-h-48 overflow-y-auto px-4 pb-2 scroll-smooth"
            data-testid="transcript-container"
          >
            {transcript.length > 0 && (
              <div className="space-y-2">
                {transcript.slice(-5).map((msg, i) => (
                  <div 
                    key={i} 
                    className="text-white font-bold text-shadow-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    data-testid={`text-transcript-${i}`}
                  >
                    {msg.startsWith("AI:") ? (
                      <div className="bg-black/50 rounded-lg px-3 py-2">
                        <span className="text-blue-300 font-semibold">AI: </span>
                        <MathText>{msg.substring(4)}</MathText>
                      </div>
                    ) : msg.startsWith("You:") ? (
                      <div className="bg-black/30 rounded-lg px-3 py-2 text-green-300">
                        {msg}
                      </div>
                    ) : (
                      <div className="bg-black/30 rounded-lg px-3 py-2 text-gray-300 text-sm">
                        {msg}
                      </div>
                    )}
                  </div>
                ))}
                {isAIProcessing && (
                  <div className="flex items-center gap-2 text-white font-bold bg-black/50 rounded-lg px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-300" />
                    <span className="text-blue-300">AI is thinking...</span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Bottom Controls - Mobile (4 buttons matching reference) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-8 px-4">
          {connectionState === "connected" ? (
            /* Connected state: Camera, Send, Pause/Play, End */
            <div className="flex items-center justify-center gap-6">
              {/* Camera Toggle */}
              <button
                onClick={isCameraOn ? stopCamera : startCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isCameraOn ? 'bg-white text-black' : 'bg-white/20 text-white border-2 border-white/40'
                }`}
                data-testid="button-camera-toggle"
              >
                {isCameraOn ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
              </button>

              {/* Send/Upload Image */}
              <button
                onClick={sendImageToAI}
                disabled={!isVideoActive}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isVideoActive ? 'bg-white/20 text-white border-2 border-white/40' : 'bg-white/10 text-white/50 border-2 border-white/20'
                }`}
                data-testid="button-send-image"
              >
                <Upload className="w-6 h-6" />
              </button>

              {/* Pause/Play (Mute Toggle) */}
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isMuted ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white border-2 border-white/40'
                }`}
                data-testid="button-mute"
              >
                {isMuted ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
              </button>

              {/* End Call - Red X */}
              <button
                onClick={disconnect}
                className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center"
                data-testid="button-disconnect"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          ) : (
            /* Disconnected state: Camera, Connect, placeholder buttons */
            <div className="flex items-center justify-center gap-6">
              {/* Camera Toggle */}
              <button
                onClick={isCameraOn ? stopCamera : startCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isCameraOn ? 'bg-white text-black' : 'bg-white/20 text-white border-2 border-white/40'
                }`}
                data-testid="button-camera-toggle"
              >
                {isCameraOn ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
              </button>

              {/* Connect Button (Center) */}
              {connectionState === "connecting" ? (
                <button
                  disabled
                  className="w-16 h-16 rounded-full bg-gray-600 text-white flex items-center justify-center"
                  data-testid="button-connecting"
                >
                  <Loader2 className="w-7 h-7 animate-spin" />
                </button>
              ) : (
                <button
                  onClick={connectToRealtime}
                  className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center"
                  data-testid="button-connect"
                >
                  <Phone className="w-7 h-7" />
                </button>
              )}

              {/* Placeholder Upload (disabled) */}
              <button
                disabled
                className="w-14 h-14 rounded-full bg-white/10 text-white/50 border-2 border-white/20 flex items-center justify-center"
                data-testid="button-upload-disabled"
              >
                <Upload className="w-6 h-6" />
              </button>
            </div>
          )}
          
          {/* Rotate/Refresh button at bottom right */}
          <button
            onClick={() => {
              if (lastCapture) setLastCapture(null);
              else if (isCameraOn) {
                stopCamera();
                setTimeout(startCamera, 100);
              }
            }}
            className="absolute bottom-8 right-4 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40"
            data-testid="button-refresh"
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>
        </div>

        <audio ref={audioRef} className="hidden" data-testid="audio-output" />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/dashboard")}
              data-testid="button-back-desktop"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              {connectionState === "connected" && (
                <Badge className="bg-green-500 text-white">
                  <span className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
                  Live
                </Badge>
              )}
              {getStatusBadge()}
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-6 h-6 text-primary" />
                Tsebo Voice Tutor
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Show your question using camera or screen share. Tsebo will see it and explain the solution.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRefDesktop}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                      data-testid="video-preview-desktop"
                    />
                    {!isVideoActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center text-white">
                          <CameraOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm opacity-75">Start camera or share screen</p>
                        </div>
                      </div>
                    )}
                    <canvas ref={canvasRefDesktop} className="hidden" />
                    
                    {/* Source indicator */}
                    {isVideoActive && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="secondary" className="bg-black/50 text-white">
                          {isScreenSharing ? <Monitor className="w-3 h-3 mr-1" /> : <Camera className="w-3 h-3 mr-1" />}
                          {isScreenSharing ? "Screen" : "Camera"}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={isCameraOn ? "destructive" : "default"}
                      onClick={isCameraOn ? stopCamera : startCamera}
                      disabled={isScreenSharing}
                      data-testid="button-camera-toggle-desktop"
                    >
                      {isCameraOn ? <CameraOff className="w-4 h-4 mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                      {isCameraOn ? "Stop Camera" : "Camera"}
                    </Button>

                    <Button
                      variant={isScreenSharing ? "destructive" : "outline"}
                      onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                      disabled={isCameraOn}
                      data-testid="button-screen-share"
                    >
                      {isScreenSharing ? <MonitorOff className="w-4 h-4 mr-2" /> : <Monitor className="w-4 h-4 mr-2" />}
                      {isScreenSharing ? "Stop Share" : "Share Screen"}
                    </Button>

                    {connectionState === "connected" && isVideoActive && (
                      <Button
                        onClick={sendImageToAI}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="button-send-image-desktop"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Ask Tsebo
                      </Button>
                    )}
                  </div>

                  {lastCapture && (
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Last captured:</p>
                      <img 
                        src={lastCapture} 
                        alt="Last capture" 
                        className="w-24 h-auto rounded border"
                        data-testid="img-last-capture-desktop"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {connectionState === "disconnected" || connectionState === "error" ? (
                      <Button
                        onClick={connectToRealtime}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="button-connect-desktop"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Start Session
                      </Button>
                    ) : connectionState === "connecting" ? (
                      <Button disabled data-testid="button-connecting-desktop">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="destructive"
                          onClick={disconnect}
                          data-testid="button-disconnect-desktop"
                        >
                          <PhoneOff className="w-4 h-4 mr-2" />
                          End Session
                        </Button>
                        <Button
                          variant={isMuted ? "destructive" : "outline"}
                          onClick={toggleMute}
                          data-testid="button-mute-desktop"
                        >
                          {isMuted ? <MicOff className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
                          {isMuted ? "Muted" : "Mic On"}
                        </Button>
                        <Button
                          variant={isAudioMuted ? "destructive" : "outline"}
                          onClick={toggleAudioOutput}
                          data-testid="button-audio-toggle-desktop"
                        >
                          {isAudioMuted ? <VolumeX className="w-4 h-4 mr-1" /> : <Volume2 className="w-4 h-4 mr-1" />}
                          {isAudioMuted ? "Audio Off" : "Audio On"}
                        </Button>
                      </>
                    )}
                  </div>

                  <audio ref={audioRef} className="hidden" data-testid="audio-output-desktop" />

                  <div 
                    ref={transcriptRef}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 h-80 overflow-y-auto scroll-smooth"
                    data-testid="transcript-container-desktop"
                  >
                    <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-gray-50 dark:bg-gray-900 pb-2">
                      Conversation Transcript
                    </h3>
                    {transcript.length === 0 && !isAIProcessing ? (
                      <p className="text-sm text-muted-foreground italic">
                        {connectionState === "connected" 
                          ? "Start speaking or show your question..."
                          : "Connect to start a conversation"
                        }
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {transcript.map((msg, i) => (
                          <div 
                            key={i} 
                            className={`text-sm p-2 rounded ${
                              msg.startsWith("AI:") 
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500" 
                                : msg.startsWith("You:") 
                                  ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-l-2 border-green-500"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                            }`}
                            data-testid={`text-transcript-desktop-${i}`}
                          >
                            {msg.startsWith("AI:") ? (
                              <>
                                <span className="font-semibold">AI: </span>
                                <MathText>{msg.substring(4)}</MathText>
                              </>
                            ) : (
                              msg
                            )}
                          </div>
                        ))}
                        {isAIProcessing && (
                          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 p-2 bg-blue-50 dark:bg-blue-900/30 rounded border-l-2 border-blue-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            AI is thinking...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">How to use Tsebo Voice Tutor</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Click "Start Session" to connect to Tsebo</li>
                <li>Use your camera to show a question on paper, or share your screen</li>
                <li>Click "Ask Tsebo" to share what you're showing</li>
                <li>Tsebo will analyze your question and explain the solution</li>
                <li>Ask follow-up questions by speaking naturally</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
