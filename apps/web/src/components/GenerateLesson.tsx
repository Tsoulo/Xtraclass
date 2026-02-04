import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, Clock, Plus, X, Zap, User } from "lucide-react";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";

interface HomeworkQuestion {
  id: string;
  question: string;
  type: 'equation' | 'system' | 'expression' | 'word-problem';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

interface FormData {
  type: 'homework' | 'quiz';
  title: string;
  description: string;
  grade: string;
  classId: string;
  startDate: string;
  dueDate: string;
  duration?: number;
  questions: HomeworkQuestion[];
}

interface GenerateLessonProps {
  studentId: string;
}

export default function GenerateLesson({ studentId }: GenerateLessonProps) {
  const [, setLocation] = useLocation();
  
  // Sample student data
  const student = {
    id: studentId,
    firstName: "Sarah",
    lastName: "Johnson",
    weaknesses: ["Complex factorisation", "Word problems"],
    grade: "10",
    classId: "math-10a"
  };

  const [formData, setFormData] = useState<FormData>({
    type: 'homework',
    title: `Personalized Practice for ${student.firstName}`,
    description: `Custom exercises targeting ${student.weaknesses.join(' and ')}`,
    grade: student.grade,
    classId: student.classId,
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    questions: []
  });

  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [customQuestion, setCustomQuestion] = useState<HomeworkQuestion>({
    id: '',
    question: '',
    type: 'equation',
    difficulty: 'medium',
    points: 10
  });

  // Predefined questions targeted at student's weaknesses
  const predefinedQuestions: HomeworkQuestion[] = [
    {
      id: "factorisation_1",
      question: "Factor completely: x² - 6x + 9",
      type: "expression",
      difficulty: "easy",
      points: 15
    },
    {
      id: "factorisation_2", 
      question: "Factor: 2x² + 8x + 6",
      type: "expression",
      difficulty: "medium",
      points: 20
    },
    {
      id: "word_problem_1",
      question: "A rectangular garden has a length that is 3 meters more than twice its width. If the perimeter is 24 meters, find the dimensions.",
      type: "word-problem",
      difficulty: "medium",
      points: 25
    },
    {
      id: "factorisation_3",
      question: "Factor: x² - 16",
      type: "expression", 
      difficulty: "easy",
      points: 10
    },
    {
      id: "word_problem_2",
      question: "The sum of two consecutive integers is 47. Find the integers.",
      type: "word-problem",
      difficulty: "easy",
      points: 15
    }
  ];

  const totalPoints = formData.questions.reduce((sum, q) => sum + q.points, 0);

  const handleBack = () => {
    setLocation('/subject-details');
  };

  const addPredefinedQuestion = (question: HomeworkQuestion) => {
    const newQuestion: HomeworkQuestion = {
      ...question,
      id: `${question.id}_${Date.now()}`
    };
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const addCustomQuestion = () => {
    if (!customQuestion.question.trim()) return;
    
    const newQuestion: HomeworkQuestion = {
      ...customQuestion,
      id: `custom_${Date.now()}`
    };
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
    
    setCustomQuestion({
      id: '',
      question: '',
      type: 'equation',
      difficulty: 'medium',
      points: 10
    });
    setShowAddQuestion(false);
  };

  const removeQuestion = (questionId: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating personalized lesson:', formData);
    // Handle form submission
    setLocation('/subject-details');
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
            <h1 className="text-2xl font-bold text-white tracking-tight">Generate Custom Lesson</h1>
            <div className="w-10"></div>
          </div>

          {/* Student Info */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{student.firstName} {student.lastName}</h2>
                <p className="text-sm text-white/80">Grade {student.grade} • Focus Areas: {student.weaknesses.join(', ')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Assignment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="rounded-2xl h-12"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="rounded-2xl resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'homework' | 'quiz') => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="rounded-2xl h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homework">Homework</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date</label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="rounded-2xl h-12"
                    required
                  />
                </div>
              </div>

              {formData.type === 'quiz' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Duration (minutes)</label>
                  <Input
                    type="number"
                    min="5"
                    max="180"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="rounded-2xl h-12"
                    placeholder="30"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Questions Section */}
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Questions ({formData.questions.length})</h3>
              <div className="text-sm text-slate-600">
                Total Points: <span className="font-bold">{totalPoints}</span>
              </div>
            </div>

            {/* Added Questions */}
            {formData.questions.length > 0 && (
              <div className="space-y-3 mb-6">
                {formData.questions.map((question, index) => (
                  <div key={question.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-slate-600">Question {index + 1}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {question.points} pts
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeQuestion(question.id)}
                          className="w-6 h-6 text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-slate-700 mb-2">{question.question}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {question.difficulty}
                      </span>
                      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                        {question.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommended Questions */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-slate-700 mb-3">
                <Zap className="w-4 h-4 inline mr-2 text-yellow-500" />
                Recommended Questions (Based on weaknesses)
              </h4>
              <div className="grid gap-3">
                {predefinedQuestions.map((question) => (
                  <div key={question.id} className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200 hover:border-yellow-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-slate-700 text-sm flex-1 mr-3">{question.question}</p>
                      <Button
                        type="button"
                        onClick={() => addPredefinedQuestion(question)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1 rounded-full"
                        disabled={formData.questions.some(q => q.id.startsWith(question.id))}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {question.difficulty}
                      </span>
                      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                        {question.type}
                      </span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {question.points} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Question Form */}
            <div className="border-t pt-4">
              {!showAddQuestion ? (
                <Button
                  type="button"
                  onClick={() => setShowAddQuestion(true)}
                  variant="outline"
                  className="w-full rounded-2xl py-3 border-dashed border-2 border-slate-300 hover:border-indigo-400"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Custom Question
                </Button>
              ) : (
                <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200">
                  <h4 className="text-md font-semibold text-slate-700 mb-3">Create Custom Question</h4>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Enter your question..."
                      value={customQuestion.question}
                      onChange={(e) => setCustomQuestion(prev => ({ ...prev, question: e.target.value }))}
                      className="rounded-xl resize-none"
                      rows={3}
                    />
                    
                    <div className="grid grid-cols-3 gap-3">
                      <Select 
                        value={customQuestion.type} 
                        onValueChange={(value: any) => setCustomQuestion(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equation">Equation</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="expression">Expression</SelectItem>
                          <SelectItem value="word-problem">Word Problem</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select 
                        value={customQuestion.difficulty} 
                        onValueChange={(value: any) => setCustomQuestion(prev => ({ ...prev, difficulty: value }))}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={customQuestion.points}
                        onChange={(e) => setCustomQuestion(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                        className="rounded-xl"
                        placeholder="Points"
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        onClick={addCustomQuestion}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                        disabled={!customQuestion.question.trim()}
                      >
                        Add Question
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowAddQuestion(false)}
                        variant="outline"
                        className="rounded-xl"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl"
              disabled={!formData.title || formData.questions.length === 0}
            >
              {formData.type === 'homework' ? <BookOpen className="w-5 h-5 mr-2" /> : <Clock className="w-5 h-5 mr-2" />}
              Create Personalized {formData.type === 'homework' ? 'Homework' : 'Quiz'}
            </Button>
          </div>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}