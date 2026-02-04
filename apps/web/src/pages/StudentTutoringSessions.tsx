import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Video, Clock, BookOpen, User, Plus, ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TutoringSession } from "@shared/schema";

const scheduleSessionSchema = z.object({
  subject: z.string().min(1, "Please select a subject"),
  topic: z.string().optional(),
  notes: z.string().optional(),
  scheduledDate: z.string().min(1, "Please select a date"),
  scheduledTime: z.string().min(1, "Please select a time"),
  duration: z.string().min(1, "Please select duration"),
});

type ScheduleSessionForm = z.infer<typeof scheduleSessionSchema>;

const SUBJECTS = [
  "Mathematics",
  "Physical Sciences",
  "Life Sciences",
  "Accounting",
  "Economics",
  "Business Studies",
  "Geography",
  "History",
  "English",
  "Afrikaans",
];

const DURATION_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "requested":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200" data-testid="badge-status-requested"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
    case "accepted":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200" data-testid="badge-status-accepted"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
    case "declined":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200" data-testid="badge-status-declined"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200" data-testid="badge-status-in-progress"><Video className="w-3 h-3 mr-1" />In Progress</Badge>;
    case "completed":
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200" data-testid="badge-status-completed"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200" data-testid="badge-status-cancelled">Cancelled</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-status-unknown">{status}</Badge>;
  }
}

export default function StudentTutoringSessions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<ScheduleSessionForm>({
    resolver: zodResolver(scheduleSessionSchema),
    defaultValues: {
      subject: "",
      topic: "",
      notes: "",
      scheduledDate: "",
      scheduledTime: "",
      duration: "60",
    },
  });

  const { data: sessions = [], isLoading } = useQuery<(TutoringSession & { studentName: string; tutorName: string | null })[]>({
    queryKey: ["/api/tutoring-sessions"],
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: ScheduleSessionForm) => {
      const scheduledStart = new Date(`${data.scheduledDate}T${data.scheduledTime}`);
      const scheduledEnd = new Date(scheduledStart.getTime() + parseInt(data.duration) * 60000);
      
      return await apiRequest("/api/tutoring-sessions", {
        method: "POST",
        body: JSON.stringify({
          subject: data.subject,
          topic: data.topic || null,
          notes: data.notes || null,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutoring-sessions"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Session Requested",
        description: "Your tutoring session request has been submitted. A tutor will review it soon.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create session request",
        variant: "destructive",
      });
    },
  });

  const cancelSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return await apiRequest(`/api/tutoring-sessions/${sessionId}/cancel`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutoring-sessions"] });
      toast({
        title: "Session Cancelled",
        description: "Your tutoring session has been cancelled.",
      });
    },
  });

  const onSubmit = (data: ScheduleSessionForm) => {
    createSessionMutation.mutate(data);
  };

  const canJoinSession = (session: TutoringSession) => {
    if (session.status !== "accepted" && session.status !== "in_progress") return false;
    const now = new Date();
    const scheduledStart = new Date(session.scheduledStart);
    const scheduledEnd = new Date(session.scheduledEnd);
    const fifteenMinutesBefore = new Date(scheduledStart.getTime() - 15 * 60000);
    return now >= fifteenMinutesBefore && now <= scheduledEnd;
  };

  const upcomingSessions = sessions.filter(s => 
    ["requested", "accepted", "in_progress"].includes(s.status) && 
    new Date(s.scheduledEnd) > new Date()
  );
  
  const pastSessions = sessions.filter(s => 
    ["completed", "cancelled", "declined"].includes(s.status) || 
    new Date(s.scheduledEnd) <= new Date()
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/student")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">
              Tutor Sessions
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Schedule one-on-one video calls with tutors for help
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-schedule-session">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Schedule Tutoring Session</DialogTitle>
                <DialogDescription>
                  Request a one-on-one video call with a tutor for personalized help.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-subject">
                              <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUBJECTS.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="topic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Topic (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Quadratic equations, Chemical bonding"
                            {...field}
                            data-testid="input-topic"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              min={format(new Date(), "yyyy-MM-dd")}
                              {...field}
                              data-testid="input-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scheduledTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              data-testid="input-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-duration">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DURATION_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what you need help with..."
                            className="resize-none"
                            rows={3}
                            {...field}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-dialog"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createSessionMutation.isPending}
                      data-testid="button-submit-request"
                    >
                      {createSessionMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="loader"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white" data-testid="text-upcoming-title">
                Upcoming Sessions ({upcomingSessions.length})
              </h2>
              {upcomingSessions.length === 0 ? (
                <Card className="bg-gray-50 dark:bg-gray-800 border-dashed">
                  <CardContent className="py-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400" data-testid="text-no-upcoming">
                      No upcoming sessions scheduled
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Click "Schedule Session" to request tutoring help
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <Card key={session.id} className="hover:shadow-md transition-shadow" data-testid={`card-session-${session.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="w-4 h-4 text-blue-600" />
                              <span className="font-semibold text-gray-900 dark:text-white" data-testid={`text-subject-${session.id}`}>
                                {session.subject}
                              </span>
                              {getStatusBadge(session.status)}
                            </div>
                            {session.topic && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2" data-testid={`text-topic-${session.id}`}>
                                Topic: {session.topic}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(session.scheduledStart), "MMM d, yyyy")}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {format(new Date(session.scheduledStart), "h:mm a")}
                              </div>
                              {session.tutorName && (
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  {session.tutorName}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {canJoinSession(session) && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => setLocation(`/tutor-call/${session.id}`)}
                                data-testid={`button-join-${session.id}`}
                              >
                                <Video className="w-4 h-4 mr-1" />
                                Join Call
                              </Button>
                            )}
                            {session.status === "requested" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelSessionMutation.mutate(session.id)}
                                disabled={cancelSessionMutation.isPending}
                                data-testid={`button-cancel-${session.id}`}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {pastSessions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white" data-testid="text-past-title">
                  Past Sessions ({pastSessions.length})
                </h2>
                <div className="space-y-4">
                  {pastSessions.slice(0, 5).map((session) => (
                    <Card key={session.id} className="opacity-75" data-testid={`card-past-session-${session.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {session.subject}
                              </span>
                              {getStatusBadge(session.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{format(new Date(session.scheduledStart), "MMM d, yyyy")}</span>
                              {session.tutorName && <span>with {session.tutorName}</span>}
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
