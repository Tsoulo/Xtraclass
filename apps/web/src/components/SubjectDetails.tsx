import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, TrendingUp, Calculator, Atom, Plus, User, TrendingDown, ChevronDown, ChevronUp, BookOpen, Zap } from "lucide-react";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";
import StudentForm from "./StudentForm";

interface Theme {
  id: string;
  name: string;
  understanding: number;
  progress: number;
  comments: string[];
}

interface StudentData {
  id: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  average: number;
  classId: string;
  grade: string;
  topicScores: {
    [key: string]: number;
  };
  topicDetails: {
    [key: string]: {
      strengths: string[];
      weaknesses: string[];
    };
  };
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

interface ClassData {
  id: string;
  subject: string;
  grade: string;
  className: string;
  students: StudentData[];
}

const mathThemes: Theme[] = [
  {
    id: "exponents-surds",
    name: "Exponents & Surds",
    understanding: 85,
    progress: 92,
    comments: ["Great progress with basic exponents", "Need more practice with surds"]
  },
  {
    id: "scientific-notation",
    name: "Scientific Notation",
    understanding: 78,
    progress: 85,
    comments: ["Converting large numbers mastered", "Struggling with very small decimals"]
  },
  {
    id: "algebraic-expressions",
    name: "Algebraic Expressions",
    understanding: 92,
    progress: 88,
    comments: ["Excellent understanding of variables", "Great work on simplification"]
  },
  {
    id: "factorisation",
    name: "Factorisation",
    understanding: 67,
    progress: 74,
    comments: ["Common factors understood", "Quadratic factorisation needs work"]
  },
  {
    id: "equations-inequalities",
    name: "Equations & Inequalities",
    understanding: 73,
    progress: 80,
    comments: ["Linear equations solid", "Graphing inequalities improving"]
  },
  {
    id: "literal-equations",
    name: "Literal Equations",
    understanding: 89,
    progress: 91,
    comments: ["Strong conceptual understanding", "Excellent problem-solving approach"]
  }
];

const scienceThemes: Theme[] = [
  {
    id: "atomic-structure",
    name: "Atomic Structure",
    understanding: 82,
    progress: 87,
    comments: ["Electron configurations mastered", "Isotopes concept clear"]
  },
  {
    id: "chemical-bonding",
    name: "Chemical Bonding",
    understanding: 75,
    progress: 79,
    comments: ["Ionic bonds understood well", "Covalent bonding needs practice"]
  },
  {
    id: "states-matter",
    name: "States of Matter",
    understanding: 90,
    progress: 94,
    comments: ["Phase changes excellent", "Kinetic theory well understood"]
  },
  {
    id: "acids-bases",
    name: "Acids & Bases",
    understanding: 68,
    progress: 72,
    comments: ["pH scale understood", "Neutralization reactions improving"]
  },
  {
    id: "energy-changes",
    name: "Energy Changes",
    understanding: 79,
    progress: 83,
    comments: ["Endothermic vs exothermic clear", "Energy diagrams good"]
  },
  {
    id: "organic-chemistry",
    name: "Organic Chemistry",
    understanding: 71,
    progress: 76,
    comments: ["Functional groups memorized", "Naming conventions improving"]
  }
];

function getUnderstandingColor(score: number): string {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-yellow-500";
  if (score >= 55) return "bg-orange-500";
  return "bg-red-500";
}

function getUnderstandingLevel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Needs Work";
}

// Sample class data with students
const sampleClasses: ClassData[] = [
  {
    id: "math-10a",
    subject: "Mathematics",
    grade: "10",
    className: "A",
    students: [
      {
        id: "student1",
        firstName: "Sarah",
        lastName: "Johnson",
        average: 67,
        classId: "math-10a",
        grade: "10",
        topicScores: {
          "exponents-surds": 75,
          "laws-of-exponents": 65,
          "scientific-notation": 70,
          "algebraic-expressions": 60,
          "factorisation": 65
        },
        topicDetails: {
          "exponents-surds": {
            strengths: ["Good with basic exponent rules", "Understands index laws"],
            weaknesses: ["Struggles with surd simplification", "Needs practice with mixed operations"]
          },
          "laws-of-exponents": {
            strengths: ["Grasps fundamental concepts"],
            weaknesses: ["Difficulty with negative exponents", "Complex power combinations challenging"]
          },
          "scientific-notation": {
            strengths: ["Converts large numbers well", "Good decimal understanding"],
            weaknesses: ["Struggles with very small numbers", "Calculator dependency"]
          },
          "algebraic-expressions": {
            strengths: ["Basic substitution skills"],
            weaknesses: ["Complex expressions intimidating", "Limited simplification skills"]
          },
          "factorisation": {
            strengths: ["Identifies common factors"],
            weaknesses: ["Quadratic factorisation weak", "Pattern recognition needs work"]
          }
        },
        strengths: ["Basic algebra", "Problem solving approach"],
        weaknesses: ["Complex factorisation", "Word problems"],
        summary: "Sarah shows good fundamental understanding but struggles with more complex applications. Regular practice with factorisation would help."
      },
      {
        id: "student2",
        firstName: "Michael",
        lastName: "Chen",
        average: 85,
        classId: "math-10a",
        grade: "10",
        topicScores: {
          "exponents-surds": 90,
          "laws-of-exponents": 85,
          "scientific-notation": 88,
          "algebraic-expressions": 82,
          "factorisation": 80
        },
        topicDetails: {
          "exponents-surds": {
            strengths: ["Excellent surd manipulation", "Quick with exponent calculations", "Strong conceptual understanding"],
            weaknesses: ["Occasional calculation errors", "Could be more systematic"]
          },
          "laws-of-exponents": {
            strengths: ["Solid understanding of all laws", "Good with complex expressions"],
            weaknesses: ["Sometimes rushes through steps", "Minor notation issues"]
          },
          "scientific-notation": {
            strengths: ["Perfect conversion skills", "Handles both large and small numbers well"],
            weaknesses: ["Could show more working", "Sometimes skips verification"]
          },
          "algebraic-expressions": {
            strengths: ["Good factorization skills", "Strong simplification"],
            weaknesses: ["Needs to double-check work", "Could improve presentation"]
          },
          "factorisation": {
            strengths: ["Recognizes patterns quickly", "Good with common factors"],
            weaknesses: ["Occasionally misses complex factors", "Could practice more challenging problems"]
          }
        },
        strengths: ["Quick learner", "Excellent with exponents", "Strong analytical skills"],
        weaknesses: ["Occasional careless errors", "Needs to show more working"],
        summary: "Michael excels in most areas and demonstrates strong mathematical thinking. Focus on attention to detail would improve performance further."
      },
      {
        id: "student3",
        firstName: "Emma",
        lastName: "Williams",
        average: 92,
        classId: "math-10a",
        grade: "10",
        topicScores: {
          "exponents-surds": 95,
          "laws-of-exponents": 92,
          "scientific-notation": 90,
          "algebraic-expressions": 94,
          "factorisation": 89
        },
        topicDetails: {
          "exponents-surds": {
            strengths: ["Mastery of all surd operations", "Exceptional pattern recognition", "Helps peers understand concepts"],
            weaknesses: ["Could attempt more challenging applications", "Ready for advanced topics"]
          },
          "laws-of-exponents": {
            strengths: ["Complete understanding of all laws", "Elegant solution methods", "Error-free calculations"],
            weaknesses: ["Needs more challenging problems", "Could explore proof techniques"]
          },
          "scientific-notation": {
            strengths: ["Flawless conversions", "Excellent estimation skills", "Strong number sense"],
            weaknesses: ["Ready for engineering applications", "Could explore logarithmic connections"]
          },
          "algebraic-expressions": {
            strengths: ["Advanced simplification techniques", "Creative problem solving", "Clear mathematical communication"],
            weaknesses: ["Needs extension activities", "Could mentor struggling students"]
          },
          "factorisation": {
            strengths: ["Recognizes all standard patterns", "Good with complex expressions", "Systematic approach"],
            weaknesses: ["Ready for polynomial theorems", "Could explore advanced factorization"]
          }
        },
        strengths: ["Exceptional understanding", "Helps other students", "Consistent performance"],
        weaknesses: ["Could challenge herself more", "Advanced problem solving"],
        summary: "Emma demonstrates exceptional mathematical ability and shows consistent excellence across all topics."
      }
    ]
  },
  {
    id: "math-10b",
    subject: "Mathematics",
    grade: "10",
    className: "B",
    students: []
  },
  {
    id: "math-11a",
    subject: "Mathematics",
    grade: "11",
    className: "A",
    students: []
  },
  {
    id: "science-10a",
    subject: "Physical Science",
    grade: "10",
    className: "A",
    students: []
  },
  {
    id: "science-11a",
    subject: "Physical Science",
    grade: "11",
    className: "A", 
    students: []
  }
];

function getAverageColor(average: number): string {
  if (average >= 80) return "text-green-600";
  if (average >= 70) return "text-yellow-600";
  if (average >= 60) return "text-orange-600";
  return "text-red-600";
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export default function SubjectDetails() {
  const [, setLocation] = useLocation();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<{[studentId: string]: {[topicId: string]: boolean}}>({});
  const [classes] = useState<ClassData[]>(sampleClasses);

  // Toggle topic expansion
  const toggleTopicExpansion = (studentId: string, topicId: string) => {
    setExpandedTopics(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [topicId]: !prev[studentId]?.[topicId]
      }
    }));
  };

  // Check if topic is expanded
  const isTopicExpanded = (studentId: string, topicId: string) => {
    return expandedTopics[studentId]?.[topicId] || false;
  };

  // Get teacher's subjects from localStorage or API
  const getTeacherSubjects = () => {
    // In a real app, this would come from the authenticated user's data
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'teacher') {
      // Simulate different teachers with different subject assignments
      // In production, this would fetch from user authentication data
      const teacherId = localStorage.getItem('teacherId') || 'teacher1';
      
      const teacherProfiles = {
        'teacher1': ['Mathematics', 'Physical Science'],
        'teacher2': ['Physical Science'], 
        'teacher3': ['Mathematics'],
        'teacher4': ['Mathematics', 'Physical Science']
      };
      
      return teacherProfiles[teacherId as keyof typeof teacherProfiles] || ['Mathematics', 'Physical Science'];
    }
    return [];
  };

  const teacherSubjects = getTeacherSubjects();

  const handleBack = () => {
    const previousRoute = localStorage.getItem('previousRoute');
    if (previousRoute) {
      setLocation(previousRoute);
      localStorage.removeItem('previousRoute');
    } else {
      setLocation('/dashboard');
    }
  };

  // Filter classes to only show subjects the teacher teaches
  const teacherClasses = classes.filter(c => teacherSubjects.includes(c.subject));
  
  // Filter by selected subject if one is chosen
  const filteredClasses = selectedSubject && selectedSubject !== "all"
    ? teacherClasses.filter(c => c.subject === selectedSubject)
    : teacherClasses;
  
  // Get available grades from filtered classes
  const gradeSet = new Set(filteredClasses.map(c => c.grade));
  const availableGrades: string[] = [];
  gradeSet.forEach(grade => availableGrades.push(grade));
  
  // Get classes for selected grade from filtered classes
  const availableClasses = filteredClasses.filter(c => c.grade === selectedGrade);
  
  // Get selected class data
  const selectedClassData = classes.find(c => c.grade === selectedGrade && c.className === selectedClass);
  
  // Get students sorted by average (lowest first)
  const sortedStudents = selectedClassData?.students.sort((a, b) => a.average - b.average) || [];

  const handleStudentSaved = (students: any[]) => {
    // Handle saving students to the selected class
    setShowStudentForm(false);
  };

  const toggleStudentExpansion = (studentId: string) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
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
            <h1 className="text-2xl font-bold text-white tracking-tight">Student Analytics</h1>
            <div className="w-10"></div>
          </div>

          {/* Class Selection Filters */}
          <div className="space-y-4">
            {/* Subject Filter - only show if teacher has multiple subjects */}
            {teacherSubjects.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Subject</label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={(value) => {
                    setSelectedSubject(value);
                    setSelectedGrade("");
                    setSelectedClass("");
                  }}
                >
                  <SelectTrigger className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {teacherSubjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Grade</label>
                <Select 
                  value={selectedGrade} 
                  onValueChange={(value) => {
                    setSelectedGrade(value);
                    setSelectedClass("");
                  }}
                >
                  <SelectTrigger className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGrades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Class</label>
                <Select 
                  value={selectedClass} 
                  onValueChange={setSelectedClass}
                  disabled={!selectedGrade}
                >
                  <SelectTrigger className="bg-white/20 backdrop-blur-sm border-white/30 text-white disabled:opacity-50">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((classData) => (
                      <SelectItem key={classData.id} value={classData.className}>
                        Class {classData.className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 py-6 space-y-6">
        {/* Show message if teacher has no assigned subjects */}
        {teacherSubjects.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Subjects Assigned</h3>
            <p className="text-slate-600">Contact your administrator to assign subjects to your account</p>
          </div>
        ) : availableGrades.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 text-center">
            <Calculator className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Classes Available</h3>
            <p className="text-slate-600 mb-4">
              You don't have any classes assigned for {teacherSubjects.join(', ')}
            </p>
            <p className="text-sm text-slate-500">
              Contact your administrator to create classes for your subjects
            </p>
          </div>
        ) : selectedClassData ? (
          <>
            {/* Class Info Header */}
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Grade {selectedGrade} - Class {selectedClass}
                  </h3>
                  <p className="text-slate-600">{selectedClassData.subject}</p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {sortedStudents.length} Students
                </Badge>
              </div>
            </div>

            {/* Students Section */}
            {sortedStudents.length === 0 ? (
              /* No Students - Add Students Option */
              <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 text-center">
                <User className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <h3 className="text-xl font-semibold text-slate-800 mb-2">No Students Added</h3>
                <p className="text-slate-600 mb-6">Add students to this class to view their analytics</p>
                <Button
                  onClick={() => setShowStudentForm(true)}
                  className="bg-primary hover:bg-primary-dark"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Students
                </Button>
              </div>
            ) : (
              /* Student Cards */
              <div className="space-y-4">
                {sortedStudents.map((student) => (
                  <div
                    key={student.id}
                    className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/30 relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-3xl"
                    onClick={() => toggleStudentExpansion(student.id)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-purple-50/20 to-blue-50/30 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                      {/* Student Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <Avatar className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
                            {student.profilePhoto ? (
                              <AvatarImage src={student.profilePhoto} alt={`${student.firstName} ${student.lastName}`} />
                            ) : (
                              <AvatarFallback className="bg-primary text-white text-sm md:text-lg">
                                {getInitials(student.firstName, student.lastName)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          
                          <div className="min-w-0 flex-1">
                            <h4 className="text-base md:text-lg font-bold text-slate-800 truncate">
                              {student.firstName} {student.lastName}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs md:text-sm text-slate-600">Average:</span>
                              <span className={`text-sm md:text-lg font-bold ${getAverageColor(student.average)}`}>
                                {student.average}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {student.average < 70 && (
                            <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                          )}
                          {expandedStudent === student.id ? (
                            <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Student Analysis */}
                      {expandedStudent === student.id && (
                        <div className="space-y-6 border-t border-slate-200 pt-6">
                          {/* Summary */}
                          <div>
                            <h5 className="text-sm font-semibold text-slate-700 mb-2">Analysis Summary</h5>
                            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                              {student.summary}
                            </p>
                          </div>

                          {/* Topic Scores Heat Map */}
                          <div>
                            <h5 className="text-sm font-semibold text-slate-700 mb-3">Topic Understanding</h5>
                            <div className="space-y-4">
                              {Object.entries(student.topicScores).map(([topic, score]) => {
                                const topicName = topic.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                const topicDetail = student.topicDetails?.[topic];
                                const isExpanded = isTopicExpanded(student.id, topic);
                                return (
                                  <div key={topic} className="bg-slate-50 rounded-xl p-4">
                                    <div 
                                      className="cursor-pointer"
                                      onClick={() => toggleTopicExpansion(student.id, topic)}
                                    >
                                      <div className="space-y-2 mb-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs md:text-sm font-medium text-slate-700 truncate pr-2">{topicName}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs md:text-sm font-semibold text-slate-700 flex-shrink-0">
                                              {score}%
                                            </span>
                                            {isExpanded ? (
                                              <ChevronUp className="w-4 h-4 text-slate-500" />
                                            ) : (
                                              <ChevronDown className="w-4 h-4 text-slate-500" />
                                            )}
                                          </div>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                          <div
                                            className={`h-2 rounded-full transition-all duration-500 ${getUnderstandingColor(score)}`}
                                            style={{ width: `${score}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Topic-specific Strengths and Weaknesses - Only show when expanded */}
                                    {isExpanded && topicDetail && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 animate-in slide-in-from-top-2 duration-200">
                                        <div>
                                          <h6 className="text-xs font-semibold text-green-700 mb-1 flex items-center">
                                            <TrendingUp className="w-3 h-3 mr-1" />
                                            Strengths
                                          </h6>
                                          <div className="space-y-1">
                                            {topicDetail.strengths.map((strength, index) => (
                                              <div key={index} className="text-xs text-green-600 bg-green-50 rounded-md p-2">
                                                • {strength}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h6 className="text-xs font-semibold text-orange-700 mb-1 flex items-center">
                                            <TrendingDown className="w-3 h-3 mr-1" />
                                            Areas for Improvement
                                          </h6>
                                          <div className="space-y-1">
                                            {topicDetail.weaknesses.map((weakness, index) => (
                                              <div key={index} className="text-xs text-orange-600 bg-orange-50 rounded-md p-2">
                                                • {weakness}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Strengths and Weaknesses */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                Strengths
                              </h5>
                              <div className="space-y-1">
                                {student.strengths.map((strength, index) => (
                                  <div key={index} className="text-sm text-green-600 bg-green-50 rounded-lg p-2">
                                    • {strength}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="text-sm font-semibold text-orange-700 mb-2 flex items-center">
                                <TrendingDown className="w-4 h-4 mr-1" />
                                Areas for Improvement
                              </h5>
                              <div className="space-y-1">
                                {student.weaknesses.map((weakness, index) => (
                                  <div key={index} className="text-sm text-orange-600 bg-orange-50 rounded-lg p-2">
                                    • {weakness}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                            <Button
                              variant="outline"
                              className="flex-1 text-xs sm:text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                console.log('Navigating to assessments for student:', student.id);
                                setLocation(`/student-assessments/${student.id}`);
                              }}
                            >
                              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              <span className="truncate">View Assessments</span>
                            </Button>
                            <Button
                              className="flex-1 text-xs sm:text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                console.log('Navigating to lesson generation for student:', student.id);
                                setLocation(`/generate-lesson/${student.id}`);
                              }}
                            >
                              <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              <span className="truncate">Generate Lesson</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* No Class Selected */
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 text-center">
            <Calculator className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a Class</h3>
            <p className="text-slate-600">Choose a grade and class to view student analytics</p>
          </div>
        )}
      </div>

      {/* Student Form Modal */}
      {showStudentForm && selectedClassData && (
        <StudentForm
          onClose={() => setShowStudentForm(false)}
          onSave={handleStudentSaved}
          classInfo={{
            subject: selectedClassData.subject,
            grade: selectedClassData.grade,
            className: selectedClassData.className
          }}
        />
      )}



      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}