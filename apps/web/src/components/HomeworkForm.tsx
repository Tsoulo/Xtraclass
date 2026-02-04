import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Plus, X, BookOpen, Clock, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface HomeworkQuestion {
  id: string;
  question: string;
  type: 'equation' | 'system' | 'expression' | 'word-problem';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  correctAnswer: string; // Added for automatic grading
  answerType?: 'exact' | 'numeric' | 'algebraic' | 'multiple-choice';
  acceptableVariations?: string[]; // Alternative acceptable answers
}

interface FormData {
  type: 'homework' | 'quiz';
  title: string;
  description: string;
  grade: string;
  subject: string;
  topic: string;
  theme: string;
  topicId?: number; // Add topic ID
  themeId?: number; // Add theme ID
  classIds: string[]; // Changed from classId to classIds array
  startDate: string;
  dueDate: string;
  duration?: number; // For quizzes only
  questions: HomeworkQuestion[];
}

interface HomeworkFormProps {
  onClose: () => void;
  onSave: (data: FormData) => void;
  classes: any[];
  selectedDate: string;
  type: 'homework' | 'quiz';
  isSubmitting?: boolean;
}

const predefinedQuestions: HomeworkQuestion[] = [
  {
    id: "pq1",
    question: "Solve for x: (2x² - 8) / 4x = 0",
    type: "equation",
    difficulty: "medium",
    points: 10,
    correctAnswer: "x = 2",
    answerType: "algebraic",
    acceptableVariations: ["2", "x=2", "x = 2", "x equals 2"]
  },
  {
    id: "pq2",
    question: "Solve the system of equations: 2x + y = 7 and x - y = 1",
    type: "system", 
    difficulty: "medium",
    points: 15,
    correctAnswer: "x = 8/3, y = 5/3",
    answerType: "exact",
    acceptableVariations: ["x=8/3, y=5/3", "(8/3, 5/3)", "x = 2.67, y = 1.67"]
  },
  {
    id: "pq3",
    question: "Factor completely: x² - 5x + 6",
    type: "expression",
    difficulty: "easy",
    points: 8,
    correctAnswer: "(x - 2)(x - 3)",
    answerType: "algebraic",
    acceptableVariations: ["(x-2)(x-3)", "(x - 3)(x - 2)", "(x-3)(x-2)"]
  },
  {
    id: "pq4",
    question: "Simplify: 3x² + 2x - x² + 5x - 7",
    type: "expression",
    difficulty: "easy",
    points: 6,
    correctAnswer: "2x² + 7x - 7",
    answerType: "algebraic",
    acceptableVariations: ["2x^2 + 7x - 7", "7x + 2x² - 7", "2x² + 7x - 7"]
  },
  {
    id: "pq5",
    question: "Solve for x and y: 3x + 2y = 12 and x - y = 1",
    type: "system",
    difficulty: "medium",
    points: 12,
    correctAnswer: "x = 14/5, y = 9/5",
    answerType: "exact",
    acceptableVariations: ["x=14/5, y=9/5", "(14/5, 9/5)", "x = 2.8, y = 1.8"]
  },
  {
    id: "pq6",
    question: "Find the vertex of the parabola: y = x² - 4x + 3",
    type: "equation",
    difficulty: "hard",
    points: 20,
    correctAnswer: "(2, -1)",
    answerType: "exact",
    acceptableVariations: ["(2,-1)", "x = 2, y = -1", "vertex: (2, -1)"]
  }
];

export default function HomeworkForm({ onClose, onSave, classes, selectedDate, type, isSubmitting = false }: HomeworkFormProps) {
  const [formData, setFormData] = useState<FormData>({
    type,
    title: '',
    description: '',
    grade: '',
    subject: '',
    topic: '',
    theme: '',
    classIds: [], // Initialize as empty array
    startDate: selectedDate,
    dueDate: selectedDate,
    duration: type === 'quiz' ? 30 : undefined,
    questions: []
  });

  const [customQuestion, setCustomQuestion] = useState({
    question: '',
    type: 'equation' as const,  
    difficulty: 'medium' as const,
    points: 10,
    correctAnswer: '',
    answerType: 'exact' as const,
    acceptableVariations: [] as string[]
  });

  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionsCount, setQuestionsCount] = useState(5);
  
  // Data from database
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<Array<{id: number, name: string, description: string, grade: string, subject: string}>>([]);
  const [themes, setThemes] = useState<Array<{id: number, topicId: number, name: string, description: string}>>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subjectsData = await apiRequest('/api/curriculum/subjects');
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch topics when subject or grade changes
  useEffect(() => {
    const fetchTopics = async () => {
      if (!formData.subject || !formData.grade) {
        setTopics([]);
        return;
      }
      
      try {
        const topicsData = await apiRequest(`/api/curriculum/topics?subject=${formData.subject}&grade=${formData.grade}`);
        setTopics(topicsData);
      } catch (error) {
        console.error('Error fetching topics:', error);
      }
    };
    fetchTopics();
  }, [formData.subject, formData.grade]);

  // Fetch themes when topic changes
  useEffect(() => {
    const fetchThemes = async () => {
      if (!selectedTopicId) {
        setThemes([]);
        return;
      }
      
      try {
        const themesData = await apiRequest(`/api/curriculum/themes?topicId=${selectedTopicId}`);
        setThemes(themesData);
      } catch (error) {
        console.error('Error fetching themes:', error);
      }
    };
    fetchThemes();
  }, [selectedTopicId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 FORM SUBMISSION - Form submission attempt:', { 
      formData, 
      selectedTopicId,
      selectedThemeId,
      validation: {
        hasTitle: !!formData.title,
        hasGrade: !!formData.grade,
        hasClasses: formData.classIds.length > 0,
        hasQuestions: formData.questions.length > 0,
        hasTopicId: !!selectedTopicId,
        hasThemeId: !!selectedThemeId
      }
    });
    
    if (!formData.title || !formData.grade || !formData.subject || formData.classIds.length === 0 || formData.questions.length === 0) {
      console.log('Form validation failed, stopping submission');
      return;
    }
    
    // Validate topic and theme selection for homework
    if (formData.type === 'homework' && (!selectedTopicId || !selectedThemeId)) {
      console.log('Homework requires topic and theme selection');
      alert('Please select both a topic and theme before creating homework. This helps track student progress and generate proper AI feedback.');
      return;
    }
    
    // Include the topic and theme IDs in the form data
    const completeFormData = {
      ...formData,
      topicId: selectedTopicId || undefined,
      themeId: selectedThemeId || undefined
    };
    
    console.log('🚀 FORM SUBMISSION - Final data being sent:', {
      topicName: formData.topic,
      themeName: formData.theme,
      topicId: selectedTopicId,
      themeId: selectedThemeId,
      completeFormData
    });
    onSave(completeFormData);
  };

  const addPredefinedQuestion = (question: HomeworkQuestion) => {
    const newQuestion = { ...question, id: `${question.id}_${Date.now()}` };
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
      question: '',
      type: 'equation',
      difficulty: 'medium', 
      points: 10,
      correctAnswer: '',
      answerType: 'exact',
      acceptableVariations: []
    });
    setShowAddQuestion(false);
  };

  const removeQuestion = (id: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  // Generate questions using MCP exercise generation
  const generateQuestions = async () => {
    if (!formData.grade || !formData.subject || !formData.topic) {
      alert('Please select grade, subject, and topic first');
      return;
    }

    setIsGeneratingQuestions(true);
    
    try {
      const result = await apiRequest('/api/mcp/test-basic-exercise', {
        method: 'POST',
        body: JSON.stringify({
          context: {
            grade: formData.grade,
            subject: formData.subject,
            topic: formData.topic,
            difficulty: 'medium',
            syllabus: 'CAPS'
          },
          numQuestions: questionsCount
        })
      });
      
      if (result.status === 'success' && result.exercise?.questions) {
        // Convert MCP questions to homework questions format
        const generatedQuestions: HomeworkQuestion[] = result.exercise.questions.map((q: any, index: number) => ({
          id: `generated_${Date.now()}_${index}`,
          question: q.question,
          type: 'equation' as const,
          difficulty: (q.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
          points: q.marks || 10,
          correctAnswer: q.solution || '',
          answerType: 'algebraic' as const,
          acceptableVariations: []
        }));

        // Add generated questions to form
        setFormData(prev => ({
          ...prev,
          questions: [...prev.questions, ...generatedQuestions]
        }));

        // Remove predefined questions since we now have AI-generated ones
        // This replaces the hardcoded question bank approach
        
      } else {
        throw new Error('Failed to generate questions');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Failed to generate questions. Please try again.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const totalPoints = formData.questions.reduce((sum, q) => sum + q.points, 0);

  // Debug form state
  const isFormValid = !(!formData.title || !formData.grade || !formData.subject || formData.classIds.length === 0 || formData.questions.length === 0);
  console.log('Form validation debug:', {
    title: formData.title,
    grade: formData.grade,
    subject: formData.subject,
    topic: formData.topic,
    theme: formData.theme,
    classIds: formData.classIds,
    questionsCount: formData.questions.length,
    isFormValid,
    classesAvailable: classes.length,
    classes: classes.map(c => ({ id: c.id, name: c.name }))
  });

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Create {type === 'homework' ? 'Homework' : 'Quiz'}
            </h1>
            <div className="w-8 sm:w-10"></div>
          </div>

          <div className="text-white text-center">
            <p className="text-blue-100 text-xs sm:text-sm opacity-90">
              {type === 'homework' ? 'Create homework assignment' : 'Create timed quiz'} for your students
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Title
              </label>
              <Input
                type="text"
                placeholder={`${type === 'homework' ? 'Homework' : 'Quiz'} title`}
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="rounded-2xl h-12"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Description
              </label>
              <Textarea
                placeholder="Brief description of the assignment"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="rounded-2xl resize-none"
                rows={3}
              />
            </div>

            {/* Grade and Class Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Grade
                </label>
                <Select 
                  value={formData.grade} 
                  onValueChange={(value) => {
                    console.log('Grade selected:', value);
                    setFormData(prev => ({ ...prev, grade: value }));
                  }}
                  required
                >
                  <SelectTrigger className="rounded-2xl h-12 relative z-10">
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="8">Grade 8</SelectItem>
                    <SelectItem value="9">Grade 9</SelectItem>
                    <SelectItem value="10">Grade 10</SelectItem>
                    <SelectItem value="11">Grade 11</SelectItem>
                    <SelectItem value="12">Grade 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Classes ({formData.classIds.length} selected)
                </label>
                <div className="space-y-2">
                  {/* Selected Classes Display */}
                  {formData.classIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border">
                      {formData.classIds.map((classId) => {
                        const selectedClass = classes.find(cls => cls.id.toString() === classId);
                        return selectedClass ? (
                          <div key={classId} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                            <span>{selectedClass.name} (Grade {selectedClass.grade})</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                classIds: prev.classIds.filter(id => id !== classId)
                              }))}
                              className="ml-1 text-indigo-500 hover:text-indigo-700 text-lg leading-none"
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  
                  {/* Class Selection Dropdown */}
                  <Select 
                    value=""
                    onValueChange={(value) => {
                      console.log('Class selection attempt:', { value, currentIds: formData.classIds, available: classes.length });
                      if (value && !formData.classIds.includes(value)) {
                        console.log('Class added:', value);
                        setFormData(prev => ({ 
                          ...prev, 
                          classIds: [...prev.classIds, value] 
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-2xl h-12 relative z-10">
                      <SelectValue placeholder={formData.classIds.length > 0 ? "Add another class..." : "Select Classes"} />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {classes.length === 0 ? (
                        <SelectItem value="no-classes" disabled>
                          No classes available
                        </SelectItem>
                      ) : (
                        classes
                          .filter(cls => !formData.classIds.includes(cls.id.toString()))
                          .map((cls) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name} (Grade {cls.grade})
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Subject, Topic, Theme Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Subject
                </label>
                <Select 
                  value={formData.subject} 
                  onValueChange={(value) => {
                    console.log('Subject selected:', value);
                    setFormData(prev => ({ ...prev, subject: value, topic: '', theme: '' }));
                  }}
                >
                  <SelectTrigger 
                    className="rounded-2xl h-12 bg-white border-slate-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    onClick={() => console.log('Subject dropdown clicked')}
                  >
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent className="z-[99999] bg-white border border-slate-200 shadow-lg"
                    position="popper"
                    sideOffset={4}
                  >
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject === 'mathematics' ? 'Mathematics' :
                         subject === 'mathematical-literacy' ? 'Mathematical Literacy' :
                         subject === 'physics' ? 'Physics' : subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Topic <span className="text-red-500">*</span>
                  {formData.type === 'homework' && (
                    <span className="text-xs text-blue-600 ml-1 sm:ml-2 hidden sm:inline">(Required for AI feedback)</span>
                  )}
                </label>
                <Select 
                  value={formData.topic} 
                  onValueChange={(value) => {
                    console.log('🔍 TOPIC SELECTION - Topic selected:', value);
                    const selectedTopic = topics.find(t => t.name === value);
                    const newTopicId = selectedTopic?.id || null;
                    console.log('🔍 TOPIC SELECTION - Found topic object:', selectedTopic);
                    console.log('🔍 TOPIC SELECTION - Setting topicId to:', newTopicId);
                    console.log('🔍 TOPIC SELECTION - Available topics:', topics.map(t => `${t.name}(${t.id})`));
                    setSelectedTopicId(newTopicId);
                    setSelectedThemeId(null); // Reset theme selection when topic changes
                    setFormData(prev => ({ ...prev, topic: value, theme: '' }));
                  }}
                  disabled={!formData.subject || topics.length === 0}
                >
                  <SelectTrigger 
                    className="rounded-2xl h-12 bg-white border-slate-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    onClick={() => console.log('Topic dropdown clicked, subject:', formData.subject)}
                  >
                    <SelectValue placeholder="Select Topic" />
                  </SelectTrigger>
                  <SelectContent className="z-[99999] bg-white border border-slate-200 shadow-lg"
                    position="popper"
                    sideOffset={4}
                  >
                    {topics.length === 0 && formData.subject && (
                      <SelectItem value="no-topics" disabled>
                        No topics available for this grade/subject
                      </SelectItem>
                    )}
                    {topics.filter(topic => topic.name && topic.name.trim()).map((topic) => (
                      <SelectItem key={topic.id} value={topic.name}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Theme <span className="text-red-500">*</span>
                  {formData.type === 'homework' && (
                    <span className="text-xs text-blue-600 ml-1 sm:ml-2 hidden sm:inline">(Required for AI feedback)</span>
                  )}
                </label>
                <Select 
                  value={formData.theme} 
                  onValueChange={(value) => {
                    console.log('🔍 THEME SELECTION - Theme selected:', value);
                    const selectedTheme = themes.find(t => t.name === value);
                    const newThemeId = selectedTheme?.id || null;
                    console.log('🔍 THEME SELECTION - Found theme object:', selectedTheme);
                    console.log('🔍 THEME SELECTION - Setting themeId to:', newThemeId);
                    console.log('🔍 THEME SELECTION - Available themes:', themes.map(t => `${t.name}(${t.id})`));
                    console.log('🔍 THEME SELECTION - Current selectedTopicId:', selectedTopicId);
                    setSelectedThemeId(newThemeId);
                    setFormData(prev => ({ ...prev, theme: value }));
                  }}
                  disabled={!formData.topic}
                >
                  <SelectTrigger 
                    className="rounded-2xl h-12 bg-white border-slate-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    onClick={() => console.log('Theme dropdown clicked, topic:', formData.topic)}
                  >
                    <SelectValue placeholder="Select Theme" />
                  </SelectTrigger>
                  <SelectContent className="z-[99999] bg-white border border-slate-200 shadow-lg"
                    position="popper"
                    sideOffset={4}
                  >
                    {themes.length === 0 && selectedTopicId && (
                      <SelectItem value="no-themes" disabled>
                        No themes available for this topic
                      </SelectItem>
                    )}
                    {themes.filter(theme => theme.name && theme.name.trim()).map((theme) => (
                      <SelectItem key={theme.id} value={theme.name}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start Date and Due Date Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="rounded-2xl h-12"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {type === 'homework' ? 'Due Date' : 'Quiz Date'}
                </label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="rounded-2xl h-12"
                  required
                />
              </div>
            </div>

            {type === 'quiz' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Duration (minutes)
                </label>
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

          {/* Questions Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                Questions ({formData.questions.length})
              </h3>
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
                    {question.correctAnswer && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-2">
                        <p className="text-xs text-green-700 font-medium">
                          ✓ Correct Answer: {question.correctAnswer}
                        </p>
                        {question.answerType && (
                          <p className="text-xs text-green-600 mt-1">
                            Type: {question.answerType} • Auto-grading enabled
                          </p>
                        )}
                      </div>
                    )}
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
                      {question.correctAnswer && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          ⚡ Auto-Grade
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Question Generation */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h4 className="text-md font-semibold text-slate-700">AI-Generated Questions</h4>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label htmlFor="questionsCount" className="text-sm text-slate-600 whitespace-nowrap">
                      Questions:
                    </label>
                    <Input
                      id="questionsCount"
                      type="number"
                      min="1"
                      max="20"
                      value={questionsCount}
                      onChange={(e) => setQuestionsCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                      className="w-16 h-8 text-center rounded-lg"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={generateQuestions}
                    disabled={!formData.grade || !formData.subject || !formData.topic || isGeneratingQuestions}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl px-4 py-2 text-sm whitespace-nowrap"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating {questionsCount}...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate {questionsCount}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-200">
                <p className="text-sm text-slate-600 mb-2">
                  <strong>🤖 AI-Powered:</strong> Generate personalized questions based on your selected grade, subject, and topic.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-wrap items-center text-xs text-slate-500 gap-x-4 gap-y-1">
                    <span>✨ Mixed difficulty levels</span>
                    <span>📚 CAPS aligned</span>
                    <span>⚡ Auto-grading ready</span>
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    Generate 1-20 questions at once
                  </div>
                </div>
                {(!formData.grade || !formData.subject || !formData.topic) && (
                  <p className="text-xs text-amber-600 mt-2">
                    Please select grade, subject, and topic first to generate questions.
                  </p>
                )}
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
                    
                    {/* Correct Answer Fields */}
                    <div className="border-t pt-3 mt-3">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Correct Answer (for automatic grading)
                      </label>
                      <Input
                        placeholder="Enter the correct answer..."
                        value={customQuestion.correctAnswer}
                        onChange={(e) => setCustomQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                        className="rounded-xl mb-3"
                      />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Answer Type
                          </label>
                          <Select 
                            value={customQuestion.answerType} 
                            onValueChange={(value: any) => setCustomQuestion(prev => ({ ...prev, answerType: value }))}
                          >
                            <SelectTrigger className="rounded-xl h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="exact">Exact Match</SelectItem>
                              <SelectItem value="numeric">Numeric (with tolerance)</SelectItem>
                              <SelectItem value="algebraic">Algebraic Expression</SelectItem>
                              <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Alternative Answers (optional)
                          </label>
                          <Input
                            placeholder="e.g., x=2, 2, x equals 2"
                            value={customQuestion.acceptableVariations?.join(', ') || ''}
                            onChange={(e) => setCustomQuestion(prev => ({ 
                              ...prev, 
                              acceptableVariations: e.target.value.split(',').map(v => v.trim()).filter(v => v) 
                            }))}
                            className="rounded-xl h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                    <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 sm:gap-0">
                      <Button
                        type="button"
                        onClick={addCustomQuestion}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl w-full sm:w-auto"
                        disabled={!customQuestion.question.trim()}
                      >
                        Add Question
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowAddQuestion(false)}
                        variant="outline"
                        className="rounded-xl w-full sm:w-auto"
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
          <div className="pt-6 border-t">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!formData.title || !formData.grade || !formData.subject || formData.classIds.length === 0 || formData.questions.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Creating...
                </>
              ) : (
                <>
                  {type === 'homework' ? <BookOpen className="w-5 h-5 mr-2" /> : <Clock className="w-5 h-5 mr-2" />}
                  Create {type === 'homework' ? 'Homework' : 'Quiz'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}