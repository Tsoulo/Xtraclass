import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Flag, 
  Calendar, 
  User, 
  BookOpen, 
  Target,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  Edit,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";

interface QuestionReport {
  id: number;
  homeworkId?: number;
  exerciseId?: number;
  studentId: number;
  questionId: string;
  reportType: string;
  title: string;
  comments: string;
  status: string;
  questionText?: string;
  questionNumber?: number;
  maxPoints?: number;
  studentAnswer?: string;
  createdAt: string;
  student?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  homework?: {
    id: number;
    title: string;
    subject: string;
  };
}

export default function AdminReportedIssues() {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionReport | null>(null);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [responseText, setResponseText] = useState("");
  const { toast } = useToast();

  const { data: reports = [], isLoading } = useQuery<QuestionReport[]>({
    queryKey: ["/api/question-reports"],
  });

  // Mutation for updating status
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { reportId: number; status: string }) => {
      return apiRequest(`/api/question-reports/${data.reportId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: data.status })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/question-reports"] });
      setStatusModalOpen(false);
      setNewStatus("");
      toast({
        title: "Status Updated",
        description: "The report status has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for adding response
  const addResponseMutation = useMutation({
    mutationFn: async (data: { reportId: number; response: string; currentStatus: string }) => {
      return apiRequest(`/api/question-reports/${data.reportId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: data.currentStatus,
          reviewNotes: data.response 
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/question-reports"] });
      setResponseModalOpen(false);
      setResponseText("");
      toast({
        title: "Response Added",
        description: "Your response has been successfully added to the report.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to add response. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handler functions
  const handleStatusUpdate = () => {
    if (selectedQuestion && newStatus) {
      updateStatusMutation.mutate({
        reportId: selectedQuestion.id,
        status: newStatus
      });
    }
  };

  const handleAddResponse = () => {
    if (selectedQuestion && responseText.trim()) {
      addResponseMutation.mutate({
        reportId: selectedQuestion.id,
        response: responseText.trim(),
        currentStatus: selectedQuestion.status
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'under_review': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'under_review': return <Clock className="w-4 h-4" />;
      case 'rejected': return <X className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'incorrect_grading': return 'bg-red-100 text-red-800';
      case 'wrong_answer': return 'bg-orange-100 text-orange-800';
      case 'unclear_question': return 'bg-blue-100 text-blue-800';
      case 'technical_issue': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReports = selectedStatus === 'all' 
    ? reports 
    : reports.filter((report: QuestionReport) => report.status === selectedStatus);

  const statusCounts = reports.reduce((acc: any, report: QuestionReport) => {
    acc[report.status] = (acc[report.status] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reported issues...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Flag className="w-6 h-6 text-orange-600" />
          Reported Issues
        </h2>
        <p className="text-slate-600">
          Manage and review issues reported by students about questions and assessments.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Reports
            </CardTitle>
            <Flag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{reports.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Pending
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{statusCounts.pending || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Under Review
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{statusCounts["under-review"] || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Resolved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{statusCounts.resolved || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filter Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {["all", "open", "under_review", "resolved", "rejected"].map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(status)}
                className="capitalize"
              >
                {status === "all" ? "All Reports" : status.replace("_", " ")}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Found</h3>
                <p className="text-gray-600">
                  {selectedStatus === 'all' 
                    ? "No issues have been reported yet." 
                    : `No reports with status "${selectedStatus.replace('_', ' ')}" found.`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report: QuestionReport) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getReportTypeColor(report.reportType)}>
                        {report.title}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={getStatusBadgeColor(report.status)}
                      >
                        <div className="flex items-center gap-1">
                          {getStatusIcon(report.status)}
                          <span className="capitalize">{report.status.replace('_', ' ')}</span>
                        </div>
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                  </div>
                  <div className="text-sm text-gray-500">
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(report.createdAt), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {report.student ? `${report.student.firstName} ${report.student.lastName}` : 'Student'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Report Details */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 mb-2">Issue Description:</h4>
                    <p className="text-sm text-gray-700">{report.comments}</p>
                  </div>

                  {/* Question Details */}
                  {report.questionText && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm">Question {report.questionNumber}</span>
                        {report.maxPoints && (
                          <Badge variant="outline" className="text-xs">
                            {report.maxPoints} marks
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{report.questionText}</p>
                      {report.studentAnswer && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <span className="font-medium text-xs text-gray-600">Student's Answer:</span>
                          <p className="text-sm text-gray-700">{report.studentAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Homework/Exercise Context */}
                  {report.homework && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BookOpen className="w-4 h-4" />
                      <span>From: {report.homework.title} ({report.homework.subject})</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedQuestion(report);
                        setQuestionModalOpen(true);
                      }}
                      data-testid={`button-view-question-${report.id}`}
                    >
                      View Question
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedQuestion(report);
                        setStatusModalOpen(true);
                      }}
                      data-testid={`button-update-status-${report.id}`}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Update Status
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedQuestion(report);
                        setResponseModalOpen(true);
                      }}
                      data-testid={`button-add-response-${report.id}`}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Add Response
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Question Details Modal */}
      <Dialog open={questionModalOpen} onOpenChange={setQuestionModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Question Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuestion && (
            <div className="space-y-6 mt-4">
              {/* Question Header */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">Question {selectedQuestion.questionNumber}</h3>
                  <Badge variant="outline" className="text-sm">
                    {selectedQuestion.maxPoints} mark{selectedQuestion.maxPoints !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-blue-900 text-base leading-relaxed">
                  {selectedQuestion.questionText}
                </p>
              </div>

              {/* Report Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Reported Issue:</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getReportTypeColor(selectedQuestion.reportType)}>
                      {selectedQuestion.title}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={getStatusBadgeColor(selectedQuestion.status)}
                    >
                      <div className="flex items-center gap-1">
                        {getStatusIcon(selectedQuestion.status)}
                        <span className="capitalize">{selectedQuestion.status.replace('_', ' ')}</span>
                      </div>
                    </Badge>
                  </div>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedQuestion.comments}
                  </p>
                </div>

                {/* Student Answer */}
                {selectedQuestion.studentAnswer && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Student's Answer:</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedQuestion.studentAnswer}
                    </p>
                  </div>
                )}

                {/* Context Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Student Information:</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{selectedQuestion.student ? `${selectedQuestion.student.firstName} ${selectedQuestion.student.lastName}` : 'Student'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Reported: {format(new Date(selectedQuestion.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>

                  {selectedQuestion.homework && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Assignment Context:</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          <span>{selectedQuestion.homework.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          <span>Subject: {selectedQuestion.homework.subject}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setStatusModalOpen(true);
                    }}
                    data-testid={`button-update-status-modal-${selectedQuestion?.id}`}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Update Status
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setResponseModalOpen(true);
                    }}
                    data-testid={`button-add-response-modal-${selectedQuestion?.id}`}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Add Response
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setQuestionModalOpen(false)}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Update Report Status
            </DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4 mt-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-sm text-gray-900 mb-1">Report #{selectedQuestion.id}</h4>
                <p className="text-sm text-gray-700">{selectedQuestion.title}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Current Status: <span className="capitalize font-medium">{selectedQuestion.status.replace('_', ' ')}</span>
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">New Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setStatusModalOpen(false); setNewStatus(""); }}>Cancel</Button>
                <Button onClick={handleStatusUpdate} disabled={!newStatus || updateStatusMutation.isPending} data-testid="button-confirm-status-update">
                  {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Response Modal */}
      <Dialog open={responseModalOpen} onOpenChange={setResponseModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Add Response to Report
            </DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4 mt-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-sm text-gray-900 mb-1">Report #{selectedQuestion.id}</h4>
                <p className="text-sm text-gray-700">{selectedQuestion.title}</p>
                <p className="text-xs text-gray-600 mt-1">Student: {selectedQuestion.student ? `${selectedQuestion.student.firstName} ${selectedQuestion.student.lastName}` : 'Unknown'}</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Response Message</label>
                <Textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={5} placeholder="Enter your response to this report..." data-testid="textarea-admin-response" />
                <p className="text-xs text-gray-500">Provide helpful feedback or clarification about this reported issue.</p>
              </div>

              {/* Existing Response Display */}
              {selectedQuestion.reviewNotes && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Previous Response</label>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="text-sm text-gray-700">{selectedQuestion.reviewNotes}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setResponseModalOpen(false); setResponseText(""); }}>Cancel</Button>
                <Button onClick={handleAddResponse} disabled={!responseText.trim() || addResponseMutation.isPending} data-testid="button-confirm-add-response">
                  {addResponseMutation.isPending ? "Adding..." : "Add Response"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}