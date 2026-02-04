import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, CheckCircle, Clock, FileText, Users, TrendingUp, ChevronLeft, ChevronRight, BarChart3, Target } from "lucide-react";
import { useLocation } from "wouter";
import HomeworkForm from "@/components/HomeworkForm";
import HomeworkAnalysis from "@/components/HomeworkAnalysis";

interface ClassAssignmentsProps {
  classId: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  type: "homework" | "quiz";
  status: "active" | "draft";
  totalPoints: number;
  submittedCount: number;
  totalStudents: number;
  averageScore: number;
}

export default function ClassAssignments({ classId }: ClassAssignmentsProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState<"all" | "active" | "draft" | "homework" | "quiz">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedAssignmentForAnalysis, setSelectedAssignmentForAnalysis] = useState<Assignment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Fetch class info
  const { data: classInfo } = useQuery<{id: number, name: string, description: string}>({
    queryKey: [`/api/classes/${classId}`],
  });

  // Fetch assignments
  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: [`/api/classes/${classId}/assignments`],
  });

  const filteredAssignments = assignments.filter((assignment: Assignment) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "homework") return assignment.type === "homework";
    if (selectedFilter === "quiz") return assignment.type === "quiz";
    return assignment.status === selectedFilter;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssignments = filteredAssignments.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  const handleFilterChange = (filter: "all" | "active" | "draft" | "homework" | "quiz") => {
    setSelectedFilter(filter);
    setCurrentPage(1);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'homework': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'quiz': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getCompletionPercentage = (submitted: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((submitted / total) * 100);
  };

  // Calculate summary stats
  const totalAssignments = filteredAssignments.length;
  const activeCount = filteredAssignments.filter((a: Assignment) => a.status === 'active').length;
  const avgScore = filteredAssignments.length > 0 
    ? Math.round(filteredAssignments.reduce((sum: number, a: Assignment) => sum + a.averageScore, 0) / filteredAssignments.length) 
    : 0;
  const completionRate = filteredAssignments.length > 0 
    ? Math.round((filteredAssignments.reduce((sum: number, a: Assignment) => sum + (a.submittedCount / (a.totalStudents || 1)) * 100, 0) / filteredAssignments.length))
    : 0;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-6">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_50%)]"></div>
          
          <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
              className="text-white hover:bg-white/20 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {classInfo && (
              <div className="text-white mb-6">
                <h1 className="text-2xl md:text-3xl font-bold mb-1">{classInfo.name || 'Class'}</h1>
                <p className="text-sm md:text-base text-white/80">Manage homework and track student progress</p>
              </div>
            )}

            {/* Quick Stats - Compact for Mobile */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-white/80" />
                  <span className="text-xs text-white/80">Total</span>
                </div>
                <div className="text-2xl font-bold text-white">{totalAssignments}</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-white/80" />
                  <span className="text-xs text-white/80">Active</span>
                </div>
                <div className="text-2xl font-bold text-white">{activeCount}</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-white/80" />
                  <span className="text-xs text-white/80">Avg Score</span>
                </div>
                <div className="text-2xl font-bold text-white">{avgScore}%</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-white/80" />
                  <span className="text-xs text-white/80">Complete</span>
                </div>
                <div className="text-2xl font-bold text-white">{completionRate}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="loader mx-auto mb-4"></div>
                <p className="text-gray-600">Loading assignments...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filters & Create Button */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Assignments</h2>
                  <Button 
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Homework
                  </Button>
                </div>
                
                {/* Filter Pills */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "All", count: assignments.length },
                    { value: "active", label: "Active", count: assignments.filter(a => a.status === "active").length },
                    { value: "draft", label: "Draft", count: assignments.filter(a => a.status === "draft").length },
                    { value: "homework", label: "Homework", count: assignments.filter(a => a.type === "homework").length },
                    { value: "quiz", label: "Exercises", count: assignments.filter(a => a.type === "quiz").length }
                  ].map(filter => (
                    <Button
                      key={filter.value}
                      variant={selectedFilter === filter.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange(filter.value as any)}
                      className={`rounded-full text-sm ${
                        selectedFilter === filter.value 
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" 
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {filter.label}
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                        selectedFilter === filter.value 
                          ? "bg-white/20" 
                          : "bg-gray-100"
                      }`}>
                        {filter.count}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Assignments List */}
              <div className="space-y-4">
                {filteredAssignments.length === 0 ? (
                  <Card className="border-2 border-dashed border-gray-300">
                    <CardContent className="p-12 text-center">
                      <div className="text-gray-400 mb-4">
                        <FileText className="h-16 w-16 mx-auto mb-3 opacity-50" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No assignments found</h3>
                      <p className="text-gray-500 mb-4">
                        {selectedFilter === "all" 
                          ? "Get started by creating your first homework assignment."
                          : `No ${selectedFilter} assignments found.`
                        }
                      </p>
                      {selectedFilter === "all" && (
                        <Button 
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                          onClick={() => setShowCreateForm(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Assignment
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  currentAssignments.map((assignment: Assignment) => (
                    <Card key={assignment.id} className="hover:shadow-lg transition-all duration-200 border border-gray-200">
                      <CardContent className="p-5">
                        {/* Assignment Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-lg md:text-xl font-bold text-gray-900">{assignment.title}</h3>
                              <Badge className={getTypeColor(assignment.type)}>
                                {assignment.type === 'homework' ? 'Homework' : 'Exercise'}
                              </Badge>
                              <Badge className={getStatusColor(assignment.status)}>
                                {assignment.status}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">{assignment.description}</p>
                            {assignment.dueDate && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="h-4 w-4" />
                                <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Progress & Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                          {/* Submission Progress */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Submissions</span>
                              <span className="text-sm font-bold text-gray-900">
                                {assignment.submittedCount}/{assignment.totalStudents}
                              </span>
                            </div>
                            <Progress 
                              value={getCompletionPercentage(assignment.submittedCount, assignment.totalStudents)} 
                              className="h-2.5 mb-1"
                            />
                            <span className="text-xs text-gray-500">
                              {getCompletionPercentage(assignment.submittedCount, assignment.totalStudents)}% submitted
                            </span>
                          </div>

                          {/* Average Score */}
                          <div className="text-center bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Avg Score</div>
                            <div className="text-3xl font-bold text-indigo-600">
                              {assignment.averageScore > 0 ? `${assignment.averageScore}%` : '-'}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <Button 
                              variant="outline" 
                              className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                              onClick={() => {
                                setSelectedAssignmentForAnalysis(assignment);
                                setShowAnalysis(true);
                              }}
                            >
                              <BarChart3 className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              className={`text-xs font-semibold rounded-full transition-all ${
                                assignment.status === 'active' 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              }`}
                              variant="ghost"
                              disabled={publishingId === assignment.id}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPublishingId(assignment.id);
                                try {
                                  await apiRequest(`/api/homework/${assignment.id}`, {
                                    method: 'PUT',
                                    body: JSON.stringify({
                                      published: assignment.status === 'draft'
                                    })
                                  });
                                  
                                  await queryClient.refetchQueries({ queryKey: [`/api/classes/${classId}/assignments`] });
                                  
                                  toast({
                                    title: assignment.status === 'draft' ? "Published!" : "Unpublished",
                                    description: assignment.status === 'draft' 
                                      ? "Students can now see and complete this homework." 
                                      : "Homework is now hidden from students.",
                                  });
                                } catch (error) {
                                  console.error('Error toggling publish status:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to update homework status.",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setPublishingId(null);
                                }
                              }}
                              data-testid={`button-toggle-publish-${assignment.id}`}
                            >
                              {publishingId === assignment.id ? (
                                <>
                                  <span className="inline-block w-3 h-3 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                  Publishing...
                                </>
                              ) : (
                                assignment.status === 'active' ? '✓ Published' : '📝 Click to Publish'
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-700">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredAssignments.length)} of{" "}
                      {filteredAssignments.length} assignments
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="rounded-lg"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                className={`w-9 h-9 p-0 rounded-lg ${currentPage === page ? 'bg-indigo-600' : ''}`}
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span key={page} className="text-gray-500 px-1">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="rounded-lg"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Homework Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm">
          <div className="absolute inset-y-0 right-0 w-full sm:max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out overflow-hidden">
            <HomeworkForm
              onClose={() => {
                setShowCreateForm(false);
                setIsSubmitting(false);
              }}
              onSave={async (data) => {
                if (isSubmitting) {
                  return;
                }
                
                setIsSubmitting(true);
                try {
                  if (data.type === 'homework') {
                    const classIdToUse = data.classIds[0];
                    const homeworkData = {
                      classId: parseInt(classIdToUse),
                      title: data.title,
                      description: data.description,
                      questions: data.questions,
                      dueDate: data.dueDate,
                      published: false,
                      topicId: data.topicId,
                      themeId: data.themeId
                    };

                    console.log('Creating homework for class:', classIdToUse, homeworkData);
                    
                    await apiRequest('/api/homework', {
                      method: 'POST',
                      body: JSON.stringify(homeworkData),
                    });
                    
                    console.log('Homework created successfully');
                    
                    await queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/assignments`] });
                    
                    toast({
                      title: "Success",
                      description: "Homework created as draft. Click 'Draft' to publish it.",
                    });
                    
                    setShowCreateForm(false);
                  }
                } catch (error) {
                  console.error('Failed to create homework:', error);
                  toast({
                    title: "Error",
                    description: "Failed to create homework. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              classes={classInfo ? [classInfo] : []}
              selectedDate={new Date().toISOString().split('T')[0]}
              type="homework"
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Homework Analysis Modal */}
      <HomeworkAnalysis
        isOpen={showAnalysis}
        onClose={() => {
          setShowAnalysis(false);
          setSelectedAssignmentForAnalysis(null);
        }}
        homework={selectedAssignmentForAnalysis ? {
          ...selectedAssignmentForAnalysis,
          classId: parseInt(classId)
        } : null}
      />
    </>
  );
}
