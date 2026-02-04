import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";

interface AssessmentData {
  id: string;
  title: string;
  type: 'homework' | 'quiz' | 'test';
  subject: string;
  dueDate: string;
  submittedAt?: string;
  score?: number;
  maxScore: number;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  questions: {
    id: string;
    question: string;
    userAnswer?: string;
    correctAnswer: string;
    isCorrect?: boolean;
    points: number;
  }[];
}

interface StudentAssessmentsProps {
  studentId: string;
}

export default function StudentAssessments({ studentId }: StudentAssessmentsProps) {
  const [, setLocation] = useLocation();

  // Sample assessment data
  const [assessments] = useState<AssessmentData[]>([
    {
      id: "assessment1",
      title: "Algebraic Expressions Quiz",
      type: "quiz",
      subject: "Mathematics",
      dueDate: "2024-12-20",
      submittedAt: "2024-12-19",
      score: 85,
      maxScore: 100,
      status: "graded",
      questions: [
        {
          id: "q1",
          question: "Simplify: 3x + 2x - x",
          userAnswer: "4x",
          correctAnswer: "4x",
          isCorrect: true,
          points: 20
        },
        {
          id: "q2",
          question: "Factor: x² - 9",
          userAnswer: "(x+3)(x-3)",
          correctAnswer: "(x+3)(x-3)",
          isCorrect: true,
          points: 25
        },
        {
          id: "q3",
          question: "Solve for x: 2x + 5 = 13",
          userAnswer: "x = 3",
          correctAnswer: "x = 4",
          isCorrect: false,
          points: 20
        }
      ]
    },
    {
      id: "assessment2",
      title: "Exponents Practice",
      type: "homework",
      subject: "Mathematics",
      dueDate: "2024-12-22",
      submittedAt: "2024-12-21",
      score: 92,
      maxScore: 100,
      status: "graded",
      questions: [
        {
          id: "q1",
          question: "Calculate: 2³ × 2²",
          userAnswer: "2⁵ = 32",
          correctAnswer: "2⁵ = 32",
          isCorrect: true,
          points: 25
        },
        {
          id: "q2",
          question: "Simplify: (x³)²",
          userAnswer: "x⁶",
          correctAnswer: "x⁶",
          isCorrect: true,
          points: 25
        }
      ]
    },
    {
      id: "assessment3",
      title: "Factorisation Test",
      type: "test",
      subject: "Mathematics",
      dueDate: "2024-12-25",
      status: "pending",
      maxScore: 150,
      questions: []
    }
  ]);

  const handleBack = () => {
    setLocation('/subject-details');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'homework': return 'bg-purple-100 text-purple-800';
      case 'quiz': return 'bg-blue-100 text-blue-800';
      case 'test': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-bold text-white tracking-tight">Student Assessments</h1>
            <div className="w-10"></div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
            <h2 className="text-lg font-semibold text-white mb-2">Assessment Overview</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{assessments.filter(a => a.status === 'graded').length}</div>
                <div className="text-sm text-white/80">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{assessments.filter(a => a.status === 'pending').length}</div>
                <div className="text-sm text-white/80">Pending</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {Math.round(assessments.filter(a => a.score).reduce((acc, a) => acc + (a.score! / a.maxScore * 100), 0) / assessments.filter(a => a.score).length) || 0}%
                </div>
                <div className="text-sm text-white/80">Average</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assessments List */}
      <div className="px-6 py-6 space-y-4">
        {assessments.map((assessment) => (
          <div
            key={assessment.id}
            className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-purple-50/20 to-blue-50/30 pointer-events-none"></div>
            
            <div className="relative z-10">
              {/* Assessment Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-slate-800">{assessment.title}</h3>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    <Badge className={getTypeColor(assessment.type)}>
                      {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)}
                    </Badge>
                    <Badge className={getStatusColor(assessment.status)}>
                      {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-slate-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {formatDate(assessment.dueDate)}</span>
                    </div>
                    {assessment.submittedAt && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Submitted: {formatDate(assessment.submittedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {assessment.score !== undefined && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-800">
                      {assessment.score}/{assessment.maxScore}
                    </div>
                    <div className="text-sm text-slate-600">
                      {Math.round((assessment.score / assessment.maxScore) * 100)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Score Progress */}
              {assessment.score !== undefined && (
                <div className="mb-4">
                  <Progress 
                    value={(assessment.score / assessment.maxScore) * 100} 
                    className="h-3"
                  />
                </div>
              )}

              {/* Questions Summary */}
              {assessment.questions.length > 0 && assessment.status === 'graded' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Question Breakdown:</h4>
                  <div className="space-y-2">
                    {assessment.questions.map((question, index) => (
                      <div key={question.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3 flex-1">
                          {question.isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              Q{index + 1}: {question.question}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-slate-600">
                              <span>Your answer: {question.userAnswer || 'No answer'}</span>
                              {!question.isCorrect && (
                                <span className="text-green-600">Correct: {question.correctAnswer}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-slate-700">
                          {question.isCorrect ? question.points : 0}/{question.points}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button for Pending Assessments */}
              {assessment.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <Button className="w-full">
                    Start Assessment
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}