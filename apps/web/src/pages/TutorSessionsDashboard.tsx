import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Video, Clock, BookOpen, User, GraduationCap, Check, X, ArrowLeft, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TutoringSession } from "@shared/schema";

type EnrichedSession = TutoringSession & { 
  studentName: string; 
  tutorName: string | null;
  studentGrade?: string;
};

function getStatusBadge(status: string) {
  switch (status) {
    case "requested":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
    case "accepted":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Check className="w-3 h-3 mr-1" />Accepted</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Video className="w-3 h-3 mr-1" />In Progress</Badge>;
    case "completed":
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Completed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function TutorSessionsDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");

  const { data: pendingSessions = [], isLoading: loadingPending } = useQuery<EnrichedSession[]>({
    queryKey: ["/api/tutoring-sessions/pending"],
  });

  const { data: mySessions = [], isLoading: loadingMy } = useQuery<EnrichedSession[]>({
    queryKey: ["/api/tutoring-sessions"],
  });

  const acceptMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return await apiRequest(`/api/tutoring-sessions/${sessionId}/accept`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutoring-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tutoring-sessions/pending"] });
      toast({
        title: "Session Accepted",
        description: "You have accepted the tutoring session. The student will be notified.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept session",
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return await apiRequest(`/api/tutoring-sessions/${sessionId}/decline`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutoring-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tutoring-sessions/pending"] });
      toast({
        title: "Session Declined",
        description: "You have declined the tutoring session.",
      });
    },
  });

  const canJoinSession = (session: EnrichedSession) => {
    if (session.status !== "accepted" && session.status !== "in_progress") return false;
    const now = new Date();
    const scheduledStart = new Date(session.scheduledStart);
    const scheduledEnd = new Date(session.scheduledEnd);
    const fifteenMinutesBefore = new Date(scheduledStart.getTime() - 15 * 60000);
    return now >= fifteenMinutesBefore && now <= scheduledEnd;
  };

  const upcomingAccepted = mySessions.filter(s => 
    ["accepted", "in_progress"].includes(s.status) && 
    new Date(s.scheduledEnd) > new Date()
  );

  const pastSessions = mySessions.filter(s => 
    ["completed"].includes(s.status) || 
    (s.status === "accepted" && new Date(s.scheduledEnd) <= new Date())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/tutor")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">
            Tutoring Sessions
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage student tutoring requests and conduct video sessions
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="relative" data-testid="tab-pending">
              Pending Requests
              {pendingSessions.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingSessions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">My Sessions</TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">Past Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {loadingPending ? (
              <div className="flex justify-center py-12">
                <div className="loader"></div>
              </div>
            ) : pendingSessions.length === 0 ? (
              <Card className="bg-gray-50 dark:bg-gray-800 border-dashed">
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400" data-testid="text-no-pending">
                    No pending session requests
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingSessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-md transition-shadow" data-testid={`card-pending-${session.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white" data-testid={`text-student-${session.id}`}>
                                {session.studentName}
                              </p>
                              {session.studentGrade && (
                                <p className="text-sm text-gray-500">
                                  <GraduationCap className="w-3 h-3 inline mr-1" />
                                  Grade {session.studentGrade}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {session.subject}
                            </span>
                          </div>
                          
                          {session.topic && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              Topic: {session.topic}
                            </p>
                          )}
                          
                          {session.notes && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                              "{session.notes}"
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(session.scheduledStart), "EEE, MMM d, yyyy")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(session.scheduledStart), "h:mm a")} - {format(new Date(session.scheduledEnd), "h:mm a")}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => acceptMutation.mutate(session.id)}
                            disabled={acceptMutation.isPending}
                            data-testid={`button-accept-${session.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => declineMutation.mutate(session.id)}
                            disabled={declineMutation.isPending}
                            data-testid={`button-decline-${session.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {loadingMy ? (
              <div className="flex justify-center py-12">
                <div className="loader"></div>
              </div>
            ) : upcomingAccepted.length === 0 ? (
              <Card className="bg-gray-50 dark:bg-gray-800 border-dashed">
                <CardContent className="py-12 text-center">
                  <Video className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400" data-testid="text-no-upcoming">
                    No upcoming sessions
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Accept pending requests to see them here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingAccepted.map((session) => (
                  <Card key={session.id} className="hover:shadow-md transition-shadow" data-testid={`card-upcoming-${session.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {session.subject}
                            </span>
                            {getStatusBadge(session.status)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Student: {session.studentName}
                          </p>
                          {session.topic && (
                            <p className="text-sm text-gray-500 mb-2">Topic: {session.topic}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(session.scheduledStart), "EEE, MMM d")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(session.scheduledStart), "h:mm a")}
                            </div>
                          </div>
                        </div>
                        {canJoinSession(session) && (
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => setLocation(`/tutor-call/${session.id}`)}
                            data-testid={`button-join-${session.id}`}
                          >
                            <Video className="w-4 h-4 mr-1" />
                            Join Call
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastSessions.length === 0 ? (
              <Card className="bg-gray-50 dark:bg-gray-800 border-dashed">
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400" data-testid="text-no-past">
                    No past sessions yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pastSessions.map((session) => (
                  <Card key={session.id} className="opacity-80" data-testid={`card-past-${session.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {session.subject}
                            </span>
                            {getStatusBadge(session.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{session.studentName}</span>
                            <span>{format(new Date(session.scheduledStart), "MMM d, yyyy")}</span>
                            {session.callDuration && <span>{session.callDuration} min</span>}
                          </div>
                        </div>
                        {session.rating && (
                          <div className="text-yellow-500 text-sm">
                            {"★".repeat(session.rating)}{"☆".repeat(5 - session.rating)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
