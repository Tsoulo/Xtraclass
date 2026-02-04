import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Users, TrendingUp, BarChart3, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface HomeworkAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  homework: any;
}

interface StudentSubmission {
  id: number;
  student_id: number;
  score: number;
  total_marks: number;
  answers: any[];
  submitted_at: string;
  studentName: string;
}

interface QuestionAnalysis {
  questionId: string;
  questionText: string;
  totalPoints: number;
  correctAnswers: number;
  totalSubmissions: number;
  passPercentage: number;
  averageScore: number;
}

export default function HomeworkAnalysis({ isOpen, onClose, homework }: HomeworkAnalysisProps) {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [questionAnalysis, setQuestionAnalysis] = useState<QuestionAnalysis[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && homework) {
      loadAnalysisData();
    }
  }, [isOpen, homework]);

  const loadAnalysisData = async () => {
    setLoading(true);
    try {
      // Load actual homework submissions
      const submissionsData = await apiRequest(`/api/homework/${homework.id}/submissions`);
      
      // Load enrolled students for this class
      const studentsData = await apiRequest(`/api/classes/${homework.classId}/students`);
      
      // Process submissions data to include student names
      const processedSubmissions = submissionsData.map((submission: any) => {
        const student = studentsData.find((s: any) => s.id === submission.student_id);
        return {
          ...submission,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student'
        };
      });
      
      setSubmissions(processedSubmissions);
      setEnrolledStudents(studentsData);
      
      // Analyze questions with real data
      analyzeQuestions(processedSubmissions, homework?.questions || []);
      
    } catch (error) {
      console.error('Error loading analysis data:', error);
      // If no real data available, still show the enrolled students but with no submissions
      try {
        const studentsData = await apiRequest(`/api/classes/${homework.classId}/students`);
        setEnrolledStudents(studentsData);
        setSubmissions([]);
        analyzeQuestions([], homework?.questions || []);
      } catch (studentsError) {
        console.error('Error loading students data:', studentsError);
        // Only fall back to demo data if we can't load real student data
        loadHardcodedAnalysis();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHardcodedAnalysis = () => {
    // Only use as absolute fallback when no real data is available
    console.warn('Using hardcoded analysis data - no real student/submission data available');
    
    const hardcodedStudents = [
      { id: 11, firstName: "Demo", lastName: "Student 1" },
      { id: 12, firstName: "Demo", lastName: "Student 2" },
      { id: 13, firstName: "Demo", lastName: "Student 3" }
    ];

    // Show no submissions if we're using fallback data
    setSubmissions([]);
    setEnrolledStudents(hardcodedStudents);
    analyzeQuestions([], homework?.questions || []);
  };

  const analyzeQuestions = (submissionsData: StudentSubmission[], questions: any[]) => {
    if (!questions || !Array.isArray(questions)) {
      console.warn('No questions data available for analysis');
      setQuestionAnalysis([]);
      return;
    }
    
    const analysis: QuestionAnalysis[] = questions.map(question => {
      const questionSubmissions = submissionsData.filter(sub => 
        sub.answers.some(ans => ans.questionId === question.id)
      );
      
      const correctAnswers = questionSubmissions.filter(sub => {
        const answer = sub.answers.find(ans => ans.questionId === question.id);
        return answer?.isCorrect;
      }).length;

      const totalScores = questionSubmissions.map(sub => {
        const answer = sub.answers.find(ans => ans.questionId === question.id);
        return answer?.score || 0;
      });

      const averageScore = totalScores.length > 0 
        ? totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length 
        : 0;

      return {
        questionId: question.id,
        questionText: question.question,
        totalPoints: question.points,
        correctAnswers,
        totalSubmissions: questionSubmissions.length,
        passPercentage: questionSubmissions.length > 0 
          ? Math.round((correctAnswers / questionSubmissions.length) * 100) 
          : 0,
        averageScore: Math.round(averageScore * 10) / 10
      };
    });

    setQuestionAnalysis(analysis);
  };

  const completedStudents = submissions.map(sub => {
    const student = enrolledStudents.find(s => s.id === sub.student_id);
    return {
      ...sub,
      name: sub.studentName || `${student?.firstName} ${student?.lastName}` || 'Unknown Student'
    };
  });

  const incompleteStudents = enrolledStudents.filter(student => 
    !submissions.some(sub => sub.student_id === student.id)
  );

  const overallCompletionRate = enrolledStudents.length > 0 
    ? Math.round((submissions.length / enrolledStudents.length) * 100) 
    : 0;

  const averageScore = submissions.length > 0 
    ? Math.round((submissions.reduce((sum, sub) => sum + sub.score, 0) / submissions.length) * 10) / 10 
    : 0;

  const passingGrade = 15; // 60% of 25 points
  const passCount = submissions.filter(sub => sub.score >= passingGrade).length;
  const passRate = submissions.length > 0 ? Math.round((passCount / submissions.length) * 100) : 0;

  if (!homework) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Homework Analysis: {homework.title}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallCompletionRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {submissions.length} of {enrolledStudents.length} students
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{passRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {passCount} students passed (≥60%)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageScore}/25</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((averageScore / 25) * 100)}% overall
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{homework.questions?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {homework.questions?.reduce((sum: number, q: any) => sum + q.points, 0)} total points
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="questions" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="questions">Question Analysis</TabsTrigger>
                <TabsTrigger value="completed">Completed ({submissions.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({incompleteStudents.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="questions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Per-Question Performance</CardTitle>
                    <CardDescription>
                      Detailed breakdown of how students performed on each question
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {questionAnalysis.map((qa, index) => (
                      <div key={qa.questionId} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium">Question {index + 1}</h4>
                            <p className="text-sm text-gray-600 mt-1">{qa.questionText}</p>
                          </div>
                          <Badge variant="outline">{qa.totalPoints} points</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-sm text-gray-500">Pass Rate</p>
                            <div className="flex items-center gap-2">
                              <Progress value={qa.passPercentage} className="flex-1" />
                              <span className="text-sm font-medium">{qa.passPercentage}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Correct Answers</p>
                            <p className="font-medium">{qa.correctAnswers}/{qa.totalSubmissions}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Average Score</p>
                            <p className="font-medium">{qa.averageScore}/{qa.totalPoints}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Difficulty Level</p>
                            <Badge variant={qa.passPercentage >= 70 ? "default" : qa.passPercentage >= 40 ? "secondary" : "destructive"}>
                              {qa.passPercentage >= 70 ? "Easy" : qa.passPercentage >= 40 ? "Medium" : "Hard"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Students Who Completed</CardTitle>
                    <CardDescription>
                      List of students who have submitted their homework
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {completedStudents.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-sm text-gray-500">
                                Submitted {student.submitted_at ? 
                                  new Date(student.submitted_at).toLocaleDateString() : 'Recently'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{student.score}/{student.total_marks}</div>
                            <Badge variant={student.score >= passingGrade ? "default" : "destructive"}>
                              {Math.round((student.score / student.total_marks) * 100)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pending" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Students Who Haven't Completed</CardTitle>
                    <CardDescription>
                      List of students who still need to submit their homework
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {incompleteStudents.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-gray-500" />
                            <div>
                              <p className="font-medium">{student.firstName} {student.lastName}</p>
                              <p className="text-sm text-red-500">Not submitted</p>
                            </div>
                          </div>
                          <XCircle className="w-5 h-5 text-red-500" />
                        </div>
                      ))}
                      {incompleteStudents.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                          <p>All students have completed this homework!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}