import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  BookOpen,
  Video,
  Edit,
  Plus,
  Save,
  X,
  Calculator,
  FileText,
  Atom,
  Trash2,
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTopicsWithThemes } from "@/hooks/useTopics";
import { useLessons, useMonthlyLessons, useCreateLesson, useDeleteLesson } from "@/hooks/useLessons";
import { useMonthlyExercises, useExercisesForDate } from "@/hooks/useExercises";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import { buildApiUrl } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import AddExerciseDialog from "@/components/AddExerciseDialog";
import EditExerciseDialog from "@/components/EditExerciseDialog";
import { TranscriptViewer } from "@/components/TranscriptViewer";

interface AdminCalendarProps {
  grade?: number;
  subject?: string;
  subjectName?: string;
}

interface QuestionForm {
  id?: number;
  topicId: number;
  themeId: number;
  question: string;
  answer: string;
  marks: number;
}

interface CalendarLesson {
  id: number;
  date: string;
  grade: string;
  subject: string;
  topicId: number;
  themeId: number;
  lessonTitle: string;
  description: string;
  videoLink?: string;
  videoTranscript?: string;
  objectives?: string[];
  activities?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Theme {
  id: number;
  name: string;
  description: string;
  topicId: number;
}

interface Topic {
  id: number;
  name: string;
  description: string;
  grade: string;
  subject: string;
  themes: Theme[];
}

// These helper functions are no longer needed since we're using React Query hooks

const subjectIcons = {
  "mathematics": Calculator,
  "mathematical-literacy": FileText,
  "physical-science": Atom
};

export default function AdminCalendar({ grade, subject, subjectName }: AdminCalendarProps) {
  const { toast } = useToast();
  
  // Initialize with proper defaults and handle prop updates
  const [selectedGrade, setSelectedGrade] = useState<string>(() => {
    return grade !== undefined ? grade.toString() : "8";
  });
  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    return subject || "mathematics";
  });

  // Sync state with props when they change during navigation - prevent infinite loop
  useEffect(() => {
    if (grade !== undefined && grade.toString() !== selectedGrade) {
      setSelectedGrade(grade.toString());
    }
  }, [grade]); // Remove selectedGrade from deps to prevent infinite loop

  useEffect(() => {
    if (subject && subject !== selectedSubject) {
      setSelectedSubject(subject);
    }
  }, [subject]); // Remove selectedSubject from deps to prevent infinite loop

  // Show fallback when navigating from sidebar without grade/subject context
  if (grade === undefined && subject === undefined) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Calendar</CardTitle>
            <CardDescription>
              Please select a grade and subject from the sidebar to manage the curriculum calendar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fallback-grade">Select Grade</Label>
                <Select 
                  value={selectedGrade} 
                  onValueChange={setSelectedGrade}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">Grade 8</SelectItem>
                    <SelectItem value="9">Grade 9</SelectItem>
                    <SelectItem value="10">Grade 10</SelectItem>
                    <SelectItem value="11">Grade 11</SelectItem>
                    <SelectItem value="12">Grade 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fallback-subject">Select Subject</Label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="mathematical-literacy">Mathematical Literacy</SelectItem>
                    <SelectItem value="physical-science">Physical Science</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Once you've selected grade and subject, the calendar will load with the curriculum data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Debug logging - removed to prevent infinite console spam

  // Use database-driven topics and themes
  const { topics, isLoading: topicsLoading } = useTopicsWithThemes(selectedGrade, selectedSubject);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [selectedDate, setSelectedDate] = useState<string>("");
  // Use React Query for lessons and exercises data management
  const { data: monthlyLessons = [], isLoading: lessonsLoading, refetch: refetchLessons } = useMonthlyLessons(
    currentDate.getFullYear(), 
    currentDate.getMonth(), 
    selectedGrade, 
    selectedSubject
  );
  const { data: monthlyExercises = [], isLoading: exercisesLoading } = useMonthlyExercises(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    selectedGrade,
    selectedSubject
  );
  
  // Combined loading state
  const isCalendarLoading = lessonsLoading || exercisesLoading;
  
  const createLessonMutation = useCreateLesson();
  const deleteLessonMutation = useDeleteLesson();
  const [selectedTopic, setSelectedTopic] = useState<number>(0);
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
  // Removed exercise form state - using AddExerciseDialog component instead
  const [isEditing, setIsEditing] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [selectedLessons, setSelectedLessons] = useState<CalendarLesson[]>([]);
  
  // Form data for lesson
  const [lessonForm, setLessonForm] = useState({
    topicId: 0,
    themeId: 0,
    lessonTitle: "",
    description: "",
    videoLink: "",
    objectives: [] as string[]
  });

  // CSV upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExerciseUploadModal, setShowExerciseUploadModal] = useState(false);
  const [uploadingExercises, setUploadingExercises] = useState(false);
  const [exerciseUploadProgress, setExerciseUploadProgress] = useState({ processed: 0, total: 0, errors: [] as string[] });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [schoolHolidays, setSchoolHolidays] = useState<any[]>([]);
  const [showHolidayInput, setShowHolidayInput] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAllExercises, setDeletingAllExercises] = useState(false);
  const [showDeleteAllLessonsDialog, setShowDeleteAllLessonsDialog] = useState(false);
  const [deletingAllLessons, setDeletingAllLessons] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    year: new Date().getFullYear(),
    type: "holiday",
    description: ""
  });

  // Exercise relevance verification state
  const [verifyingExerciseId, setVerifyingExerciseId] = useState<number | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<number, any>>({});
  
  // Transcript fetching state
  const [fetchingTranscriptLessonId, setFetchingTranscriptLessonId] = useState<number | null>(null);

  const subjects = [
    { value: "mathematics", name: "Mathematics" },
    { value: "mathematical-literacy", name: "Mathematical Literacy" },
    { value: "physical-science", name: "Physical Science" }
  ];

  const grades = ["8", "9", "10", "11", "12"];

  // Load school holidays on component mount
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const holidays = await apiRequest('/api/school-holidays');
        setSchoolHolidays(holidays);
      } catch (error) {
        console.error("Error loading school holidays:", error);
      }
    };
    
    loadHolidays();
  }, []);

  // Update available themes when topic is selected
  useEffect(() => {
    if (selectedTopic > 0 && topics.length > 0) {
      const topic = topics.find(t => t.id === selectedTopic);
      if (topic && topic.themes) {
        setAvailableThemes(topic.themes.filter((theme: any) => theme.topicId !== null));
        setLessonForm(prev => ({ ...prev, themeId: 0 }));
      } else {
        setAvailableThemes([]);
      }
    } else {
      setAvailableThemes([]);
      setLessonForm(prev => ({ ...prev, themeId: 0 }));
    }
  }, [selectedTopic, topics.length]);

  // Removed exercise theme useEffect - using AddExerciseDialog component instead

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    // Convert Sunday (0) to Monday-based week (Monday = 0, Sunday = 6)
    const day = firstDay.getDay();
    return day === 0 ? 6 : day - 1;
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  };

  const formatDate = (date: Date) => {
    // Use local date formatting to avoid timezone conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // CSV upload helper functions
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const isHoliday = (date: Date) => {
    const dateStr = formatDate(date);
    return schoolHolidays.includes(dateStr);
  };

  const isSchoolDay = (date: Date) => {
    return !isWeekend(date) && !isHoliday(date);
  };

  // Convert YouTube URLs to embed format (handles youtu.be and youtube.com)
  // Returns empty string if not a valid YouTube URL
  const getYouTubeEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    // Handle youtu.be short links
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
    }
    
    // Handle youtube.com/watch?v= links
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
    }
    
    // Handle youtube.com/embed/ links (already in correct format)
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    // Not a valid YouTube URL - return empty string
    return '';
  };

  // Check if a URL is a valid YouTube link
  const isValidYouTubeUrl = (url: string): boolean => {
    if (!url) return false;
    return url.includes('youtu.be/') || 
           url.includes('youtube.com/watch?v=') || 
           url.includes('youtube.com/embed/');
  };

  // Parse a CSV line respecting quoted fields (handles commas inside quotes)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote inside quoted field
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Don't forget the last field
    result.push(current.trim());
    
    return result;
  };

  const parseCSVFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').map(line => line.trim()).filter(line => line);
          
          if (lines.length === 0) {
            reject(new Error('CSV file is empty'));
            return;
          }

          const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
          const requiredColumns = ['date', 'topic', 'theme', 'lesson title'];
          
          const missingColumns = requiredColumns.filter(col => !headers.includes(col));
          if (missingColumns.length > 0) {
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
            return;
          }

          const data = lines.slice(1).map((line, index) => {
            const values = parseCSVLine(line);
            const row: any = {};
            
            headers.forEach((header, i) => {
              row[header] = values[i] || '';
            });
            
            row.lineNumber = index + 2; // +2 because we skip header and start from 1
            return row;
          });

          resolve(data);
        } catch (error: any) {
          reject(new Error(`Error parsing CSV: ${error?.message || 'Unknown error'}`));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  };

  const filterAndValidateCSVData = (data: any[]) => {
    const errors: string[] = [];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    let skippedCount = 0;

    // Filter out rows with missing Topic, Theme, or Lesson Title (likely weekends/holidays)
    const validRows = data.filter(row => {
      const hasTopic = row.topic?.trim();
      const hasTheme = row.theme?.trim();
      const hasLessonTitle = row['lesson title']?.trim();
      
      // Skip rows missing any of the core content fields
      if (!hasTopic || !hasTheme || !hasLessonTitle) {
        skippedCount++;
        return false;
      }
      return true;
    });

    // Validate remaining rows - only check date format
    validRows.forEach((row) => {
      const dateValue = row.date?.trim();
      if (!dateValue) {
        errors.push(`Line ${row.lineNumber}: Date is required (format: YYYY-MM-DD)`);
      } else if (!dateRegex.test(dateValue)) {
        // Also accept formats like DD/MM/YYYY or MM/DD/YYYY
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime())) {
          errors.push(`Line ${row.lineNumber}: Invalid date format "${dateValue}" (use YYYY-MM-DD)`);
        }
      }
    });

    return { validRows, errors, skippedCount };
  };

  const generateLessonSchedule = (csvData: any[]) => {
    // Use the Date column directly - no auto-scheduling needed
    const schedule: any[] = [];

    csvData.forEach(row => {
      let dateValue = row.date?.trim();
      
      // Normalize date to YYYY-MM-DD format
      if (dateValue) {
        // Try to parse various date formats
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateValue)) {
          // Try parsing as a Date object and format it
          const parsed = new Date(dateValue);
          if (!isNaN(parsed.getTime())) {
            dateValue = formatDate(parsed);
          }
        }
        
        schedule.push({
          ...row,
          calculatedDate: dateValue,
          originalWeek: row.week || ''
        });
      }
    });

    return schedule;
  };

  const handleCSVUpload = async () => {
    if (!csvFile || !selectedGrade || !selectedSubject) {
      toast({
        title: "Missing Information",
        description: "Please select grade, subject, and upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadErrors([]);

    try {
      // Parse CSV file
      setUploadProgress(20);
      const csvData = await parseCSVFile(csvFile);
      
      // Filter out incomplete rows (weekends/holidays) and validate remaining
      setUploadProgress(40);
      const { validRows, errors: validationErrors, skippedCount } = filterAndValidateCSVData(csvData);
      
      if (validationErrors.length > 0) {
        setUploadErrors(validationErrors);
        setUploadStatus('error');
        return;
      }

      if (validRows.length === 0) {
        setUploadErrors(['No valid lessons found in CSV. Make sure rows have Topic, Theme, and Lesson Title.']);
        setUploadStatus('error');
        return;
      }

      // Generate schedule using the Date column directly
      setUploadProgress(60);
      const schedule = generateLessonSchedule(validRows);

      // Create lessons via API
      setUploadProgress(80);
      const response = await apiRequest('/api/syllabus-calendar/bulk', {
        method: 'POST',
        body: JSON.stringify({
          lessons: schedule.map(item => {
            // Parse skills - handle JSON array format or comma-separated values
            let skills: string[] = [];
            const skillsRaw = item.skills || '';
            if (skillsRaw) {
              try {
                // Try to parse as JSON array first
                if (skillsRaw.startsWith('[')) {
                  skills = JSON.parse(skillsRaw);
                } else {
                  // Fallback to comma-separated
                  skills = skillsRaw.split(',').map((s: string) => s.trim()).filter((s: string) => s);
                }
              } catch {
                // If JSON parse fails, try comma-separated
                skills = skillsRaw.split(',').map((s: string) => s.trim()).filter((s: string) => s);
              }
            }
            
            return {
              date: item.calculatedDate,
              grade: selectedGrade,
              subject: selectedSubject,
              lessonTitle: item['lesson title'],
              description: item.description || '',
              videoLink: item['video link'] || '',
              topicName: item.topic,
              themeName: item.theme,
              skills: skills,
              transcript: item.transcript || ''
            };
          })
        })
      });

      setUploadProgress(100);
      setUploadStatus('success');
      
      const skippedMsg = skippedCount > 0 ? ` (${skippedCount} empty rows skipped)` : '';
      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${schedule.length} lessons${skippedMsg}.`,
      });

      // Refresh calendar data
      refetchLessons();
      
      // Invalidate topics cache since CSV upload may have created new topics
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] && 
                 typeof query.queryKey[0] === 'string' && 
                 query.queryKey[0].includes('/api/topics');
        }
      });
      
      // Reset upload state
      setTimeout(() => {
        setShowUploadModal(false);
        setCsvFile(null);
        setUploadStatus('idle');
        setUploadProgress(0);
      }, 2000);

    } catch (error: any) {
      console.error('CSV upload error:', error);
      setUploadStatus('error');
      setUploadErrors([error?.message || 'An error occurred during upload']);
      
      toast({
        title: "Upload Failed",
        description: error?.message || "An error occurred during upload.",
        variant: "destructive",
      });
    }
  };

  const downloadCSVTemplate = () => {
    const template = [
      ['Week', 'Date', 'Topic', 'Theme', 'Lesson Title', 'Description', 'Video Link', 'Transcript'],
      ['Week 1', '2025-01-20', 'Algebra', 'Algebraic expressions', 'Introduction to Variables', 'Basic concepts of variables and constants', 'https://example.com/video1', 'Optional video transcript text here...'],
      ['Week 1', '2025-01-21', 'Algebra', 'Algebraic expressions', 'Simplifying Expressions', 'Rules for simplifying algebraic expressions', '', ''],
      ['Week 1', '2025-01-22', 'Algebra', 'Linear equations', 'Solving Linear Equations', 'Methods for solving simple linear equations', 'https://example.com/video2', ''],
      ['Week 1', '2025-01-23', 'Algebra', 'Linear equations', 'Word Problems', 'Applying linear equations to real-world problems', '', ''],
      ['Week 1', '2025-01-24', 'Algebra', 'Linear equations', 'Review and Practice', 'Consolidation of week\'s learning', '', '']
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `lessons_template_grade_${selectedGrade}_${selectedSubject}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    // Use South African timezone for comparison
    const todaySA = new Date(today.toLocaleString("en-US", {timeZone: "Africa/Johannesburg"}));
    const dateSA = new Date(date.toLocaleString("en-US", {timeZone: "Africa/Johannesburg"}));
    return todaySA.toDateString() === dateSA.toDateString();
  };

  const hasLesson = (date: Date) => {
    const dateStr = formatDate(date);
    return monthlyLessons.some(lesson => lesson.date === dateStr);
  };

  const getLessonsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return monthlyLessons.filter(lesson => lesson.date === dateStr);
  };

  const getLessonForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return monthlyLessons.find(lesson => lesson.date === dateStr);
  };

  const contentRef = useRef<HTMLDivElement>(null);
  const verificationResultsRef = useRef<{ [key: number]: HTMLDivElement | null }>({});
  
  const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date);
    setSelectedDate(dateStr);
    const dayLessons = getLessonsForDate(date);
    setSelectedLessons(dayLessons);
    
    // Smooth scroll to content section on mobile
    if (window.innerWidth < 1024 && contentRef.current) {
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };



  const handleSelectLesson = (lesson: CalendarLesson) => {
    setEditingLessonId(lesson.id);
    setIsEditing(true);
    setLessonForm({
      topicId: lesson.topicId,
      themeId: lesson.themeId,
      lessonTitle: lesson.lessonTitle,
      description: lesson.description || "",
      videoLink: lesson.videoLink || "",
      objectives: lesson.objectives || []
    });
    setSelectedTopic(lesson.topicId);
  };

  const handleSaveLesson = async () => {
    console.log("Save lesson clicked", { selectedDate, selectedGrade, selectedSubject, lessonForm });
    
    if (!selectedDate || !selectedGrade || !selectedSubject) {
      console.log("Missing basic info");
      toast({
        title: "Missing Information",
        description: "Please select a date, grade, and subject.",
        variant: "destructive",
      });
      return;
    }

    if (!lessonForm.topicId || !lessonForm.themeId) {
      console.log("Missing topic/theme", { topicId: lessonForm.topicId, themeId: lessonForm.themeId });
      toast({
        title: "Missing Topic/Theme",
        description: "Please select both a topic and theme.",
        variant: "destructive",
      });
      return;
    }

    if (!lessonForm.lessonTitle.trim()) {
      console.log("Missing title");
      toast({
        title: "Missing Title",
        description: "Please enter a lesson title.",
        variant: "destructive",
      });
      return;
    }

    const lessonData = {
      date: selectedDate,
      grade: selectedGrade,
      subject: selectedSubject,
      topicId: lessonForm.topicId,
      themeId: lessonForm.themeId,
      lessonTitle: lessonForm.lessonTitle,
      description: lessonForm.description,
      videoLink: lessonForm.videoLink,
      objectives: lessonForm.objectives,
      activities: null
    };

    console.log("Creating lesson with data:", lessonData);

    try {
      const result = await createLessonMutation.mutateAsync(lessonData);
      console.log("Lesson created successfully:", result);
      
      toast({
        title: "Success",
        description: "Lesson created successfully!",
      });
      
      // Reset form and UI state
      setLessonForm({
        topicId: 0,
        themeId: 0,
        lessonTitle: "",
        description: "",
        videoLink: "",
        objectives: []
      });
      setSelectedTopic(0);
      setAvailableThemes([]);
      setIsEditing(false);
      setEditingLessonId(null);
      setSelectedDate("");
      
    } catch (error) {
      console.error("Error creating lesson - full error:", error);
      console.error("Error message:", (error as any)?.message);
      console.error("Error stack:", (error as any)?.stack);
      toast({
        title: "Error",
        description: `Failed to create lesson: ${(error as any)?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    try {
      await deleteLessonMutation.mutateAsync(lessonId);
      
      toast({
        title: "Success",
        description: "Lesson deleted successfully!",
      });
      
      // Clear selected lessons if the deleted lesson was selected
      setSelectedLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
      
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast({
        title: "Error",
        description: "Failed to delete lesson. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch and store transcript for a lesson (run in dev, stored in DB for prod)
  const handleFetchTranscript = async (lessonId: number) => {
    setFetchingTranscriptLessonId(lessonId);
    
    try {
      const response = await apiRequest(`/api/syllabus-calendar/${lessonId}/fetch-transcript`, {
        method: 'POST'
      });
      
      if (response.success) {
        toast({
          title: "Transcript Saved",
          description: `Transcript stored successfully (${response.transcriptLength} characters). This will be available in production.`,
        });
        
        // Refresh lessons to show the updated transcript status
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] && 
                   typeof query.queryKey[0] === 'string' && 
                   query.queryKey[0].includes('/api/syllabus-calendar');
          }
        });
      } else {
        toast({
          title: "Fetch Failed",
          description: response.error || response.message || "Could not fetch transcript",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching transcript:", error);
      toast({
        title: "Fetch Failed",
        description: error.message || "Could not fetch and store transcript. This may only work in development.",
        variant: "destructive",
      });
    } finally {
      setFetchingTranscriptLessonId(null);
    }
  };

  // Exercise handlers - Edit is now handled by EditExerciseDialog component

  const handleDeleteExercise = async (exerciseId: number) => {
    try {
      await apiRequest(`/api/exercises/${exerciseId}`, {
        method: 'DELETE'
      });
      
      toast({
        title: "Success",
        description: "Exercise deleted successfully!",
      });

      // Invalidate React Query cache - use predicate to match all exercise queries
      console.log('Invalidating exercise queries after deletion...');
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const matches = query.queryKey[0] && 
                         typeof query.queryKey[0] === 'string' && 
                         query.queryKey[0].includes('/api/exercises');
          if (matches) {
            console.log('Invalidating query:', query.queryKey[0]);
          }
          return matches;
        },
        refetchType: 'all'
      });
      
    } catch (error) {
      console.error("Error deleting exercise:", error);
      toast({
        title: "Error",
        description: "Failed to delete exercise. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Verify exercise relevance against video transcript
  const handleVerifyExerciseRelevance = async (exercise: any) => {
    // Find ALL lessons with videos for this date
    const lessonsWithVideos = selectedLessons.filter(l => l.videoLink);
    
    if (lessonsWithVideos.length === 0) {
      toast({
        title: "No Video Available",
        description: "No video lesson found for this day to verify against. Please add a video lesson first.",
        variant: "destructive",
      });
      return;
    }

    setVerifyingExerciseId(exercise.id);

    try {
      // Fetch transcripts from ALL video lessons
      // First check for stored transcripts, then fallback to live fetch
      const transcriptParts: string[] = [];
      const lessonTitles: string[] = [];
      let failedCount = 0;
      let usedStoredCount = 0;
      
      for (const lesson of lessonsWithVideos) {
        try {
          // First check if lesson has a stored transcript
          if (lesson.videoTranscript) {
            transcriptParts.push(`\n\n--- LESSON: ${lesson.lessonTitle} ---\n${lesson.videoTranscript}`);
            lessonTitles.push(lesson.lessonTitle);
            usedStoredCount++;
            console.log(`Using stored transcript for: ${lesson.lessonTitle}`);
          } else {
            // Try to fetch live transcript
            console.log(`Fetching live transcript for: ${lesson.lessonTitle}`);
            const transcriptResponse = await apiRequest(`/api/youtube/transcript?videoUrl=${encodeURIComponent(lesson.videoLink)}`);
            const transcriptText = transcriptResponse?.transcript?.full_text || transcriptResponse?.full_text || transcriptResponse?.text;
            
            if (transcriptText) {
              transcriptParts.push(`\n\n--- LESSON: ${lesson.lessonTitle} ---\n${transcriptText}`);
              lessonTitles.push(lesson.lessonTitle);
            } else {
              failedCount++;
            }
          }
        } catch (transcriptError) {
          console.error(`Failed to fetch transcript for ${lesson.lessonTitle}:`, transcriptError);
          failedCount++;
        }
      }
      
      if (transcriptParts.length === 0) {
        toast({
          title: "Transcript Fetch Failed",
          description: failedCount > 0 
            ? `Could not fetch transcripts from any of the ${lessonsWithVideos.length} video(s). Try fetching transcripts in development first, or the videos may not have captions enabled.`
            : "Could not connect to the transcript service. Please try again.",
          variant: "destructive",
        });
        setVerifyingExerciseId(null);
        return;
      }
      
      // Combine all transcripts
      const combinedTranscript = transcriptParts.join('\n');
      const combinedLessonTitle = lessonTitles.join(' + ');
      
      // Show warning if some transcripts failed
      if (failedCount > 0) {
        toast({
          title: "Partial Transcript Fetch",
          description: `Successfully fetched ${transcriptParts.length} of ${lessonsWithVideos.length} video transcripts. Proceeding with available content.`,
          variant: "default",
        });
      }

      // Prepare questions for verification
      const questions = exercise.questions?.map((q: any, index: number) => ({
        id: q.id || index + 1,
        question: q.question,
        answer: q.answer,
        marks: q.marks
      })) || [];

      if (questions.length === 0) {
        toast({
          title: "No Questions",
          description: "This exercise has no questions to verify.",
          variant: "destructive",
        });
        setVerifyingExerciseId(null);
        return;
      }

      // Use the first lesson for context but mention all lessons
      const primaryLesson = lessonsWithVideos[0];

      // Call verification API with combined transcripts
      const verifyResponse = await apiRequest('/api/verify-exercise-relevance', {
        method: 'POST',
        body: JSON.stringify({
          transcript: combinedTranscript,
          questions,
          lessonContext: {
            lessonTitle: combinedLessonTitle,
            subject: primaryLesson.subject,
            topic: exercise.topic || '',
            theme: exercise.theme || '',
            grade: primaryLesson.grade
          }
        })
      });

      // Store the verification results
      setVerificationResults(prev => ({
        ...prev,
        [exercise.id]: verifyResponse.analysis
      }));

      // Smooth scroll to verification results after they render
      setTimeout(() => {
        const resultElement = verificationResultsRef.current[exercise.id];
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);

      toast({
        title: "Verification Complete",
        description: `Analyzed ${questions.length} question(s) against the video content.`,
      });

    } catch (error) {
      console.error("Error verifying exercise relevance:", error);
      toast({
        title: "Verification Failed",
        description: "Could not verify exercise relevance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingExerciseId(null);
    }
  };

  const handleDeleteAllExercises = async () => {
    setDeletingAllExercises(true);
    try {
      const response = await apiRequest(`/api/exercises/delete-all?grade=${selectedGrade}&subject=${selectedSubject}`, {
        method: 'DELETE'
      });
      
      toast({
        title: "Success",
        description: `Successfully deleted ${response.deletedCount || 'all'} exercises for Grade ${selectedGrade} ${selectedSubject}`,
      });

      // Close dialog
      setShowDeleteAllDialog(false);

      // Invalidate React Query cache
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] && 
                 typeof query.queryKey[0] === 'string' && 
                 query.queryKey[0].includes('/api/exercises');
        },
        refetchType: 'all'
      });
      
    } catch (error) {
      console.error("Error deleting all exercises:", error);
      toast({
        title: "Error",
        description: `Failed to delete exercises: ${(error as any)?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setDeletingAllExercises(false);
    }
  };

  // Removed handleCreateExercise - using AddExerciseDialog component instead

  const handleDeleteAllLessons = async () => {
    setDeletingAllLessons(true);
    try {
      const response = await apiRequest(`/api/lessons/delete-all?grade=${selectedGrade}&subject=${selectedSubject}`, {
        method: 'DELETE'
      });
      
      toast({
        title: "Success",
        description: `Successfully deleted ${response.deletedCount || 'all'} lessons for Grade ${selectedGrade} ${selectedSubjectName}`,
      });

      // Close dialog
      setShowDeleteAllLessonsDialog(false);

      // Invalidate React Query cache for lessons
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] && 
                 typeof query.queryKey[0] === 'string' && 
                 query.queryKey[0].includes('/api/lessons');
        },
        refetchType: 'all'
      });
      
    } catch (error) {
      console.error("Error deleting all lessons:", error);
      toast({
        title: "Error",
        description: `Failed to delete lessons: ${(error as any)?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setDeletingAllLessons(false);
    }
  };

  // Handle CSV Exercise Upload
  const handleExerciseCSVUpload = async () => {
    if (!csvFile) return;

    setUploadingExercises(true);
    setExerciseUploadProgress({ processed: 0, total: 0, errors: [] });

    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      formData.append('grade', selectedGrade);
      formData.append('subject', selectedSubject);

      // Get auth token for authenticated request
      const token = authService.getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(buildApiUrl('/api/exercises/upload-csv'), {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      setExerciseUploadProgress({
        processed: result.processed || 0,
        total: result.total || 0,
        errors: result.errors || []
      });

      toast({
        title: "Success",
        description: `Uploaded ${result.processed} exercises successfully!`,
      });

      // Refresh exercises data
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
      
      if (selectedGrade && selectedSubject) {
        // Invalidate React Query cache - use predicate to match all exercise queries
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            return query.queryKey[0] && 
                   typeof query.queryKey[0] === 'string' && 
                   query.queryKey[0].includes('/api/exercises');
          }
        });
        
        // Invalidate topics cache since CSV upload may have created new topics
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            return query.queryKey[0] && 
                   typeof query.queryKey[0] === 'string' && 
                   query.queryKey[0].includes('/api/topics');
          }
        });
      }

      // Close modal and reset
      setShowExerciseUploadModal(false);
      setCsvFile(null);

    } catch (error) {
      console.error("Error uploading exercises:", error);
      toast({
        title: "Error",
        description: `Failed to upload exercises: ${(error as any)?.message}`,
        variant: "destructive",
      });
    } finally {
      setUploadingExercises(false);
    }
  };

  const getExercisesForDate = (date: Date) => {
    const dateStr = formatDate(date);
    if (!monthlyExercises || !Array.isArray(monthlyExercises)) {
      return [];
    }
    return monthlyExercises.filter((exercise: any) => exercise.date === dateStr);
  };

  // Compute selectedExercises reactively based on selectedDate and monthlyExercises
  const selectedExercises = selectedDate ? getExercisesForDate(new Date(selectedDate + 'T00:00:00')) : [];

  if (!selectedGrade || !selectedSubject) {
    return (
      <div className="flex-1 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>Please select a grade and subject to view the calendar and manage content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gradeSelect" className="text-sm font-medium">Grade</Label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger id="gradeSelect">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">Grade 8</SelectItem>
                    <SelectItem value="9">Grade 9</SelectItem>
                    <SelectItem value="10">Grade 10</SelectItem>
                    <SelectItem value="11">Grade 11</SelectItem>
                    <SelectItem value="12">Grade 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subjectSelect" className="text-sm font-medium">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger id="subjectSelect">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="mathematical-literacy">Mathematical Literacy</SelectItem>
                    <SelectItem value="physical-science">Physical Science</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedGrade && selectedSubject && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  ✓ Grade {selectedGrade} {selectedSubject === 'mathematics' ? 'Mathematics' : selectedSubject === 'mathematical-literacy' ? 'Mathematical Literacy' : 'Physical Science'} selected. The calendar will load automatically.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (topicsLoading) {
    return (
      <div className="flex-1 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Calendar...</CardTitle>
            <CardDescription>Please wait while we load the calendar data.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show upload options even when no topics exist since CSV upload auto-creates topics
  const hasTopics = topics.length > 0;

  const selectedSubjectName = subjects.find(s => s.value === selectedSubject)?.name || selectedSubject;
  const SubjectIcon = subjectIcons[selectedSubject as keyof typeof subjectIcons] || BookOpen;

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <SubjectIcon className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Calendar - Grade {selectedGrade} {selectedSubjectName}</h1>
        </div>
        <p className="text-gray-600">Manage lesson schedules and content planning</p>
      </div>

      {/* CSV Upload Section */}
      <Card className="mb-6">
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
            Lessons Upload
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Upload lessons via CSV file. Required columns: Week, Date, Topic, Theme, Lesson Title, Description, Video Link</span>
            <span className="sm:hidden">Upload lessons and exercises via CSV</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={downloadCSVTemplate}
              size="sm"
              className="flex items-center justify-center gap-1.5 text-xs sm:text-sm h-9 sm:h-10"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Template</span>
            </Button>
            <Button 
              onClick={() => setShowUploadModal(true)}
              size="sm"
              className="flex items-center justify-center gap-1.5 text-xs sm:text-sm h-9 sm:h-10"
            >
              <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Lessons</span>
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowHolidayInput(true)}
              size="sm"
              className="flex items-center justify-center gap-1.5 text-xs sm:text-sm h-9 sm:h-10"
            >
              <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Holidays ({schoolHolidays.length})</span>
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowExerciseUploadModal(true)}
              size="sm"
              className="flex items-center justify-center gap-1.5 text-xs sm:text-sm h-9 sm:h-10"
            >
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Exercises</span>
            </Button>
            <Button 
              variant="destructive"
              onClick={() => setShowDeleteAllDialog(true)}
              size="sm"
              className="flex items-center justify-center gap-1.5 text-xs sm:text-sm h-9 sm:h-10"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Delete Exercises</span>
              <span className="sm:hidden truncate">Del Exercises</span>
            </Button>
            <Button 
              variant="destructive"
              onClick={() => setShowDeleteAllLessonsDialog(true)}
              size="sm"
              className="flex items-center justify-center gap-1.5 text-xs sm:text-sm h-9 sm:h-10"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Delete Lessons</span>
              <span className="sm:hidden truncate">Del Lessons</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* No Topics Warning */}
      {!hasTopics && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-amber-800 mb-1">No Topics Available</h4>
                <p className="text-sm text-amber-700 mb-2">
                  No topics have been created for Grade {selectedGrade} {selectedSubjectName} yet. 
                </p>
                <p className="text-sm text-amber-700">
                  💡 <strong>Tip:</strong> Upload a CSV file using the buttons above to automatically create topics, themes, and schedule lessons or exercises.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Loading State */}
              {isCalendarLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                  <p className="text-sm text-gray-600">Loading calendar data...</p>
                </div>
              )}

              {/* Calendar Grid */}
              {!isCalendarLoading && (
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                
                {/* Empty cells for days before month starts */}
                {Array.from({ length: getFirstDayOfMonth(currentDate) }, (_, i) => (
                  <div key={`empty-${i}`} className="p-2 min-h-[60px] border border-gray-100"></div>
                ))}
                
                {/* Days of the month */}
                {Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                  const dateStr = formatDate(date);
                  const dayLessons = getLessonsForDate(date);
                  const dayExercises = getExercisesForDate(date);
                  
                  return (
                    <div
                      key={i}
                      className={`
                        p-2 min-h-[60px] border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors
                        ${isToday(date) ? 'bg-blue-50 border-blue-200' : ''}
                        ${selectedDate === dateStr ? 'bg-blue-100 border-blue-300' : ''}
                      `}
                      onClick={() => handleDateClick(date)}
                    >
                      <div className="text-sm font-medium">{i + 1}</div>
                      {dayLessons.map((lesson, idx) => (
                        <div
                          key={`lesson-${idx}`}
                          className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded mt-1 truncate"
                        >
                          {lesson.lessonTitle}
                        </div>
                      ))}
                      {dayExercises.map((exercise: any, idx: number) => (
                        <div
                          key={`exercise-${idx}`}
                          className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded mt-1 truncate"
                        >
                          📝 {exercise.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lesson Management Section */}
        <div ref={contentRef} className="space-y-4">
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString() : 'Select a Date'}
                </CardTitle>
                <CardDescription>
                  {selectedLessons.length === 0 && selectedExercises.length === 0 
                    ? 'No lessons or exercises scheduled' 
                    : `${selectedLessons.length} lesson(s), ${selectedExercises.length} exercise(s) scheduled`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedLessons.map((lesson) => (
                  <div key={lesson.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{lesson.lessonTitle}</h4>
                        <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {lesson.videoLink && isValidYouTubeUrl(lesson.videoLink) && (
                            <Badge variant="outline" className="text-xs">
                              <Video className="h-3 w-3 mr-1" />
                              Video
                            </Badge>
                          )}
                          {lesson.videoLink && lesson.videoTranscript && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Transcript Stored
                            </Badge>
                          )}
                          {lesson.videoLink && !lesson.videoTranscript && (
                            <Badge variant="secondary" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              No Transcript
                            </Badge>
                          )}
                        </div>
                        {lesson.videoLink && isValidYouTubeUrl(lesson.videoLink) && (
                          <div className="mt-3">
                            <div className="w-full max-w-xs">
                              <iframe
                                src={getYouTubeEmbedUrl(lesson.videoLink)}
                                className="w-full h-32 rounded border"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={lesson.lessonTitle}
                              ></iframe>
                            </div>
                            <div className="mt-2">
                              <TranscriptViewer 
                                videoUrl={lesson.videoLink} 
                                lessonTitle={lesson.lessonTitle}
                                lessonId={lesson.id}
                                subject={lesson.subject}
                                grade={lesson.grade}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectLesson(lesson)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {lesson.videoLink && !lesson.videoTranscript && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFetchTranscript(lesson.id)}
                            disabled={fetchingTranscriptLessonId === lesson.id}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Fetch and store video transcript for production use"
                          >
                            {fetchingTranscriptLessonId === lesson.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Exercises for Selected Date */}
                {selectedExercises.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 text-green-800">Exercises for This Day</h4>
                    {selectedExercises.map((exercise: any, index: number) => (
                      <div key={exercise.id || index} className="p-3 border rounded-lg bg-green-50 mb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-green-800">📝 {exercise.title}</h4>
                              <Badge 
                                variant={exercise.difficulty === 'hard' ? 'destructive' : exercise.difficulty === 'medium' ? 'secondary' : 'default'}
                                className="text-xs"
                              >
                                {exercise.difficulty}
                              </Badge>
                            </div>
                            {exercise.description && (
                              <p className="text-sm text-gray-600 mt-1">{exercise.description}</p>
                            )}
                            {exercise.questions && exercise.questions.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {exercise.questions.map((question: any, qIndex: number) => (
                                  <div key={question.id || qIndex} className="p-2 bg-white rounded border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="font-medium text-xs text-gray-500">
                                        Question {question.questionNumber || qIndex + 1}:
                                      </div>
                                      <span className="text-xs text-green-600 font-medium">
                                        {question.marks} mark{question.marks !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    {question.question && (
                                      <div className="whitespace-pre-wrap text-xs mb-2">
                                        {question.question.replace(/\n*\[Image:\s*[^\]]+\]/g, '').trim()}
                                      </div>
                                    )}
                                    {(() => {
                                      const imageUrl = question.imageUrl || 
                                        (question.question?.match(/\[Image:\s*([^\]]+)\]/)?.[1]);
                                      return imageUrl ? (
                                        <div className="my-2">
                                          <img 
                                            src={imageUrl} 
                                            alt={`Question ${question.questionNumber || qIndex + 1}`}
                                            className="max-w-full h-auto max-h-64 rounded border"
                                          />
                                        </div>
                                      ) : null;
                                    })()}
                                    {question.answer && (
                                      <div className="mt-1 p-1 bg-green-50 rounded border border-green-100">
                                        <div className="font-medium text-xs text-green-700 mb-1">Answer:</div>
                                        <div className="whitespace-pre-wrap text-xs">{question.answer}</div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 ml-2">
                            <EditExerciseDialog
                              exercise={exercise}
                              selectedGrade={selectedGrade}
                              selectedSubject={selectedSubject}
                              onSuccess={() => {
                                // Invalidate React Query cache - use predicate to match all exercise queries
                                queryClient.invalidateQueries({ 
                                  predicate: (query) => {
                                    return query.queryKey[0] && 
                                           typeof query.queryKey[0] === 'string' && 
                                           query.queryKey[0].includes('/api/exercises');
                                  }
                                });
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVerifyExerciseRelevance(exercise)}
                              disabled={verifyingExerciseId === exercise.id || !selectedLessons.some(l => l.videoLink)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title={!selectedLessons.some(l => l.videoLink) ? "No video lesson to verify against" : "Verify questions against video content"}
                            >
                              {verifyingExerciseId === exercise.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExercise(exercise.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Verification Results */}
                        {verificationResults[exercise.id] && (
                          <div 
                            ref={(el) => { verificationResultsRef.current[exercise.id] = el; }}
                            className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h5 className="font-medium text-blue-800 text-sm flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4" />
                                  Tsebo Verification Results
                                </h5>
                                {verificationResults[exercise.id].context?.lessonTitle && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Verified against: "{verificationResults[exercise.id].context.lessonTitle}"
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setVerificationResults(prev => {
                                  const newResults = { ...prev };
                                  delete newResults[exercise.id];
                                  return newResults;
                                })}
                                className="text-blue-600 hover:text-blue-700 h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* Overall Assessment */}
                            {verificationResults[exercise.id].overallAssessment && (
                              <div className="mb-3 p-2 bg-white rounded border">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge 
                                    variant={
                                      verificationResults[exercise.id].overallAssessment.averageRelevance === 'HIGH' 
                                        ? 'default' 
                                        : verificationResults[exercise.id].overallAssessment.averageRelevance === 'PARTIAL' 
                                          ? 'secondary' 
                                          : 'destructive'
                                    }
                                    className="text-xs"
                                  >
                                    {verificationResults[exercise.id].overallAssessment.averageRelevance} Relevance
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {verificationResults[exercise.id].overallAssessment.highRelevance || 0} High, {' '}
                                    {verificationResults[exercise.id].overallAssessment.partialRelevance || 0} Partial, {' '}
                                    {verificationResults[exercise.id].overallAssessment.lowRelevance || 0} Low
                                  </span>
                                </div>
                                <p className="text-xs text-gray-700">{verificationResults[exercise.id].overallAssessment.summary}</p>
                              </div>
                            )}

                            {/* Question-by-Question Feedback */}
                            {verificationResults[exercise.id].questionFeedback?.map((feedback: any, feedbackIndex: number) => (
                              <div key={feedbackIndex} className="mb-2 p-2 bg-white rounded border text-xs">
                                <div className="flex items-start justify-between mb-1">
                                  <span className="font-medium text-gray-700">Q{feedbackIndex + 1}</span>
                                  <Badge 
                                    variant={
                                      feedback.relevance === 'HIGH' ? 'default' 
                                        : feedback.relevance === 'PARTIAL' ? 'secondary' 
                                        : 'destructive'
                                    }
                                    className="text-xs"
                                  >
                                    {feedback.relevance}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 mb-1">{feedback.coverageAnalysis}</p>
                                
                                {feedback.videoReferences?.length > 0 && (
                                  <div className="mb-1">
                                    <span className="font-medium text-green-700">Video References: </span>
                                    <span className="text-gray-600">{feedback.videoReferences.join('; ')}</span>
                                  </div>
                                )}
                                
                                {feedback.missingTopics?.length > 0 && (
                                  <div className="mb-1">
                                    <span className="font-medium text-orange-700">Missing Topics: </span>
                                    <span className="text-gray-600">{feedback.missingTopics.join(', ')}</span>
                                  </div>
                                )}
                                
                                {feedback.suggestions?.length > 0 && (
                                  <div>
                                    <span className="font-medium text-blue-700">Suggestions: </span>
                                    <span className="text-gray-600">{feedback.suggestions.join('; ')}</span>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Overall Recommendations */}
                            {verificationResults[exercise.id].recommendations?.length > 0 && (
                              <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                                <span className="font-medium text-yellow-800 text-xs">Recommendations:</span>
                                <ul className="list-disc list-inside text-xs text-gray-700 mt-1">
                                  {verificationResults[exercise.id].recommendations.map((rec: string, recIndex: number) => (
                                    <li key={recIndex}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Exercise Creation */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Quick Actions</h4>
                    <div className="flex gap-2">
                      <AddExerciseDialog
                        selectedGrade={selectedGrade}
                        selectedSubject={selectedSubject}
                        selectedDate={selectedDate}
                        onSuccess={() => {
                          // Invalidate React Query cache - use predicate to match all exercise queries
                          queryClient.invalidateQueries({ 
                            predicate: (query) => {
                              return query.queryKey[0] && 
                                     typeof query.queryKey[0] === 'string' && 
                                     query.queryKey[0].includes('/api/exercises');
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Add New Lesson Form */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Add New Lesson</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="topic">Topic</Label>
                      <Select 
                        value={selectedTopic > 0 ? selectedTopic.toString() : ""} 
                        onValueChange={(value) => {
                          const topicId = parseInt(value);
                          setSelectedTopic(topicId);
                          setLessonForm(prev => ({ ...prev, topicId, themeId: 0 }));
                          
                          // Update themes immediately
                          const topic = topics.find(t => t.id === topicId);
                          setAvailableThemes(topic?.themes || []);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {topics.map((topic) => (
                            <SelectItem key={topic.id} value={topic.id.toString()}>
                              {topic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="theme">Theme</Label>
                      <Select 
                        value={lessonForm.themeId > 0 ? lessonForm.themeId.toString() : ""} 
                        onValueChange={(value) => setLessonForm(prev => ({ ...prev, themeId: parseInt(value) }))}
                        disabled={availableThemes.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={availableThemes.length === 0 ? "Select topic first" : "Select theme"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableThemes.map((theme) => (
                            <SelectItem key={theme.id} value={theme.id.toString()}>
                              {theme.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableThemes.length === 0 && selectedTopic > 0 && (
                        <p className="text-sm text-gray-500 mt-1">No themes available for this topic</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="title">Lesson Title</Label>
                      <Input
                        id="title"
                        value={lessonForm.lessonTitle}
                        onChange={(e) => setLessonForm(prev => ({ ...prev, lessonTitle: e.target.value }))}
                        placeholder="Enter lesson title"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={lessonForm.description}
                        onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter lesson description"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="videoLink">Video Link (Optional)</Label>
                      <Input
                        id="videoLink"
                        value={lessonForm.videoLink}
                        onChange={(e) => setLessonForm(prev => ({ ...prev, videoLink: e.target.value }))}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>


                    <div className="flex gap-2">
                      <Button 
                        onClick={() => {
                          console.log("Button clicked!");
                          handleSaveLesson();
                        }} 
                        className="flex-1"
                        type="button"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Lesson
                      </Button>
                      {isEditing && (
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsEditing(false);
                            setEditingLessonId(null);
                            setLessonForm({
                              topicId: 0,
                              themeId: 0,
                              lessonTitle: "",
                              description: "",
                              videoLink: "",
                              objectives: []
                            });
                            setSelectedTopic(0);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Lessons Upload
              </CardTitle>
              <CardDescription>
                Upload a CSV file with your lessons. Required columns: Week, Date, Topic, Theme, Lesson Title, Description, Video Link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csvFile">CSV File</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {csvFile && (
                  <p className="text-sm text-green-600 mt-1">
                    Selected: {csvFile.name}
                  </p>
                )}
              </div>

              {uploadStatus === 'uploading' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Uploading lessons...</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {uploadStatus === 'success' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Lessons uploaded successfully! The calendar will refresh automatically.
                  </AlertDescription>
                </Alert>
              )}

              {uploadStatus === 'error' && uploadErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Upload failed:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {uploadErrors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {uploadErrors.length > 5 && (
                        <li>... and {uploadErrors.length - 5} more errors</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleCSVUpload}
                  disabled={!csvFile || uploadStatus === 'uploading'}
                  className="flex-1"
                >
                  {uploadStatus === 'uploading' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowUploadModal(false);
                    setCsvFile(null);
                    setUploadStatus('idle');
                    setUploadProgress(0);
                    setUploadErrors([]);
                  }}
                  disabled={uploadStatus === 'uploading'}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Holiday Management Modal */}
      {showHolidayInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                School Holidays
              </CardTitle>
              <CardDescription>
                Add school holidays and public holidays. Lessons will not be scheduled on these dates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="holidayDate">Holiday Date</Label>
                <Input
                  id="holidayDate"
                  type="date"
                  onChange={(e) => {
                    if (e.target.value && !schoolHolidays.includes(e.target.value)) {
                      setSchoolHolidays(prev => [...prev, e.target.value].sort());
                    }
                  }}
                  className="mt-1"
                />
              </div>

              {schoolHolidays.length > 0 && (
                <div>
                  <Label>Current Holidays ({schoolHolidays.length})</Label>
                  <div className="mt-2 max-h-32 overflow-y-auto border rounded p-2">
                    {schoolHolidays.map((holiday, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-sm">
                          {new Date(holiday + 'T00:00:00').toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSchoolHolidays(prev => prev.filter(h => h !== holiday));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowHolidayInput(false)}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Holidays
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowHolidayInput(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exercise Management - Now using AddExerciseDialog component */}

      {/* School Holidays Management Modal */}
      {showHolidayInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                School Holidays Management
              </CardTitle>
              <CardDescription>
                Manage school holiday periods and term breaks. Add date ranges for holidays that will be excluded from lesson scheduling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pre-defined Terms Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">Quick Add: Standard Term Breaks 2025</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setHolidayForm({
                        name: "Term 1 Break",
                        startDate: "2025-03-29",
                        endDate: "2025-04-07", 
                        year: 2025,
                        type: "term_break",
                        description: "Break between Term 1 and Term 2"
                      });
                    }}
                    className="text-left justify-start"
                  >
                    <div>
                      <div className="font-medium">Term 1 Break</div>
                      <div className="text-xs text-gray-500">March 29 - April 7</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setHolidayForm({
                        name: "Term 2 Break", 
                        startDate: "2025-06-28",
                        endDate: "2025-07-21",
                        year: 2025,
                        type: "term_break",
                        description: "Break between Term 2 and Term 3"
                      });
                    }}
                    className="text-left justify-start"
                  >
                    <div>
                      <div className="font-medium">Term 2 Break</div>
                      <div className="text-xs text-gray-500">June 28 - July 21</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setHolidayForm({
                        name: "Term 3 Break",
                        startDate: "2025-10-04", 
                        endDate: "2025-10-12",
                        year: 2025,
                        type: "term_break",
                        description: "Break between Term 3 and Term 4"
                      });
                    }}
                    className="text-left justify-start"
                  >
                    <div>
                      <div className="font-medium">Term 3 Break</div>
                      <div className="text-xs text-gray-500">October 4 - 12</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setHolidayForm({
                        name: "December Holidays",
                        startDate: "2025-12-11",
                        endDate: "2026-01-14", 
                        year: 2025,
                        type: "holiday",
                        description: "December school holidays"
                      });
                    }}
                    className="text-left justify-start"
                  >
                    <div>
                      <div className="font-medium">December Holidays</div>
                      <div className="text-xs text-gray-500">Dec 11 - Jan 14</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Add Holiday Form */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Add New Holiday Period</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="holidayName">Holiday Name</Label>
                    <Input
                      id="holidayName"
                      placeholder="e.g., Easter Break, Public Holiday"
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="holidayType">Type</Label>
                    <Select 
                      value={holidayForm.type} 
                      onValueChange={(value) => setHolidayForm(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="holiday">Holiday</SelectItem>
                        <SelectItem value="term_break">Term Break</SelectItem>
                        <SelectItem value="public_holiday">Public Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={holidayForm.startDate}
                      onChange={(e) => setHolidayForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={holidayForm.endDate}
                      onChange={(e) => setHolidayForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="Additional notes about this holiday period"
                      value={holidayForm.description}
                      onChange={(e) => setHolidayForm(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={async () => {
                    if (!holidayForm.name || !holidayForm.startDate || !holidayForm.endDate) {
                      toast({
                        title: "Missing Information",
                        description: "Please fill in holiday name, start date, and end date.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    try {
                      const newHoliday = await apiRequest('/api/school-holidays', {
                        method: 'POST',
                        body: JSON.stringify(holidayForm)
                      });
                      
                      setSchoolHolidays(prev => [...prev, newHoliday]);
                      setHolidayForm({
                        name: "",
                        startDate: "",
                        endDate: "",
                        year: new Date().getFullYear(),
                        type: "holiday",
                        description: ""
                      });
                      toast({
                        title: "Success",
                        description: "Holiday period added successfully!",
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to add holiday period. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full"
                  disabled={!holidayForm.name || !holidayForm.startDate || !holidayForm.endDate}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Holiday Period
                </Button>
              </div>

              {/* Current Holidays List */}
              {schoolHolidays.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Current Holiday Periods</h4>
                  <div className="space-y-2">
                    {schoolHolidays.map((holiday, index) => (
                      <div key={holiday.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{holiday.name}</div>
                          <div className="text-sm text-gray-600">
                            {holiday.startDate} to {holiday.endDate}
                            {holiday.description && ` • ${holiday.description}`}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await apiRequest(`/api/school-holidays/${holiday.id}`, {
                                method: 'DELETE'
                              });
                              setSchoolHolidays(prev => prev.filter(h => h.id !== holiday.id));
                              toast({
                                title: "Success",
                                description: "Holiday period removed successfully!",
                              });
                            } catch (error) {
                              toast({
                                title: "Error", 
                                description: "Failed to remove holiday period.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowHolidayInput(false);
                    setHolidayForm({
                      name: "",
                      startDate: "",
                      endDate: "",
                      year: new Date().getFullYear(),
                      type: "holiday",
                      description: ""
                    });
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exercise CSV Upload Modal */}
      {showExerciseUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Exercises CSV
              </CardTitle>
              <CardDescription>
                Upload exercises via CSV file. Simply map exercises using their date (YYYY-MM-DD format). Required fields: topic, theme, question, answer, date, difficulty, marks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CSV Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Required columns:</strong> topic, theme, question, answer, date, difficulty, marks</p>
                  <p><strong>Optional columns:</strong> diagram_type, diagram_template, diagram_params (for auto-generated math images)</p>
                  <p><strong>Date format:</strong> YYYY-MM-DD (e.g., 2025-07-24)</p>
                  <p><strong>Example row:</strong> "Algebra", "Algebraic expressions", "Solve: 2x + 5 = 15", "x = 5", "2025-07-24", "medium", "5"</p>
                  <p className="mt-2 text-xs"><em>Note: The system will automatically skip weekends and holidays when scheduling exercises.</em></p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    // Create and download CSV template with correct column names
                    const template = "topic,theme,question,answer,date,difficulty,marks,diagram_type,diagram_template\nAlgebra,Algebraic expressions,Solve: 2x + 5 = 15,x = 5,2025-07-24,medium,5,,\nGeometry,Triangles,Calculate the length of side AB in the right triangle shown,5,2025-07-25,easy,4,triangle,right";
                    const blob = new Blob([template], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'exercises_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              {/* File Upload */}
              <div>
                <Label htmlFor="exerciseCsvFile">Select CSV File</Label>
                <Input
                  id="exerciseCsvFile"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {csvFile && (
                  <p className="text-sm text-green-600 mt-1">
                    Selected: {csvFile.name}
                  </p>
                )}
              </div>

              {/* Upload Progress */}
              {uploadingExercises && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing exercises...</span>
                  </div>
                  {exerciseUploadProgress.total > 0 && (
                    <div className="text-sm text-gray-600">
                      Processed: {exerciseUploadProgress.processed} / {exerciseUploadProgress.total}
                    </div>
                  )}
                </div>
              )}

              {/* Upload Errors */}
              {exerciseUploadProgress.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Upload completed with errors:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm max-h-32 overflow-y-auto">
                      {exerciseUploadProgress.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {exerciseUploadProgress.errors.length > 10 && (
                        <li>... and {exerciseUploadProgress.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleExerciseCSVUpload}
                  disabled={!csvFile || uploadingExercises}
                  className="flex-1"
                >
                  {uploadingExercises ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Exercises
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowExerciseUploadModal(false);
                    setCsvFile(null);
                    setExerciseUploadProgress({ processed: 0, total: 0, errors: [] });
                  }}
                  disabled={uploadingExercises}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete All Lessons Confirmation Dialog */}
      {showDeleteAllLessonsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Delete All Lessons?
              </CardTitle>
              <CardDescription>
                This action cannot be undone. This will permanently delete all lessons for Grade {selectedGrade} {selectedSubjectName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> All lesson data including video links and descriptions will be permanently deleted.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  variant="destructive"
                  onClick={handleDeleteAllLessons}
                  disabled={deletingAllLessons}
                  className="flex-1"
                >
                  {deletingAllLessons ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Yes, Delete All
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowDeleteAllLessonsDialog(false)}
                  disabled={deletingAllLessons}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete All Exercises Confirmation Dialog */}
      {showDeleteAllDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Delete All Exercises?
              </CardTitle>
              <CardDescription>
                This action cannot be undone. This will permanently delete all exercises for Grade {selectedGrade} {selectedSubject === 'mathematics' ? 'Mathematics' : selectedSubject === 'mathematical-literacy' ? 'Mathematical Literacy' : 'Physical Science'}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> All exercise data, questions, and student submissions associated with these exercises will remain, but the exercises themselves will be deleted.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  variant="destructive"
                  onClick={handleDeleteAllExercises}
                  disabled={deletingAllExercises}
                  className="flex-1"
                >
                  {deletingAllExercises ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Yes, Delete All
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowDeleteAllDialog(false)}
                  disabled={deletingAllExercises}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}