import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  BookOpen,
  Video,
  Plus,
  Edit2,
  Trash2,
  Calculator,
  FileText,
  Atom
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMonthlyLessons, type CalendarLesson } from "@/hooks/useLessons";
import LessonForm from "./LessonForm";

interface AdminCalendarProps {
  grade?: number;
  subject?: string;
  subjectName?: string;
}

const subjectIcons = {
  "mathematics": Calculator,
  "mathematical-literacy": FileText,
  "physical-science": Atom
};

export default function AdminCalendar({ grade, subject, subjectName }: AdminCalendarProps) {
  const { toast } = useToast();
  const [selectedGrade, setSelectedGrade] = useState<string>(grade?.toString() || "");
  const [selectedSubject, setSelectedSubject] = useState<string>(subject || "");
  
  // Sync state with props when they change during navigation
  useEffect(() => {
    if (grade !== undefined) {
      setSelectedGrade(grade.toString());
    }
    if (subject) {
      setSelectedSubject(subject);
    }
  }, [grade, subject]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showLessonForm, setShowLessonForm] = useState(false);

  // Fetch monthly lessons for calendar display
  const { data: lessons = [], isLoading, refetch } = useMonthlyLessons(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    selectedGrade,
    selectedSubject
  );

  // Calendar utility functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    // Convert Sunday (0) to Monday-based week (Monday = 0, Sunday = 6)
    const day = firstDay.getDay();
    return day === 0 ? 6 : day - 1;
  };

  function formatDate(date: Date) {
    // Use local date formatting to avoid timezone conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const isToday = (date: Date) => {
    const today = new Date();
    // Use South African timezone for comparison
    const todaySA = new Date(today.toLocaleString("en-US", {timeZone: "Africa/Johannesburg"}));
    
    return date.getDate() === todaySA.getDate() &&
           date.getMonth() === todaySA.getMonth() &&
           date.getFullYear() === todaySA.getFullYear();
  };

  const hasLesson = (date: Date) => {
    const dateStr = formatDate(date);
    return lessons.some(lesson => lesson.date === dateStr);
  };

  const getLessonsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return lessons.filter(lesson => lesson.date === dateStr);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date);
    setSelectedDate(dateStr);
    setShowLessonForm(true);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const days = [];

    // Week day headers (Monday first)
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weekHeaders = weekDays.map(day => (
      <div key={day} className="p-2 text-center font-medium text-gray-500">
        {day}
      </div>
    ));

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="p-2 h-24"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = formatDate(date);
      const isCurrentDay = isToday(date);
      const dayLessons = getLessonsForDate(date);
      const hasLessonForDay = dayLessons.length > 0;

      days.push(
        <div
          key={day}
          className={`p-2 h-24 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
            isCurrentDay ? 'bg-blue-50 border-blue-300' : ''
          }`}
          onClick={() => handleDateClick(date)}
        >
          <div className={`font-medium mb-1 ${isCurrentDay ? 'text-blue-600' : ''}`}>
            {day}
          </div>
          {hasLessonForDay && (
            <div className="space-y-1">
              {dayLessons.slice(0, 2).map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="text-xs p-1 bg-green-100 text-green-800 rounded truncate"
                  title={lesson.lessonTitle}
                >
                  {lesson.lessonTitle}
                </div>
              ))}
              {dayLessons.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{dayLessons.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0 border-t border-l border-gray-200">
        {weekHeaders}
        {days}
      </div>
    );
  };

  const SubjectIcon = selectedSubject ? subjectIcons[selectedSubject as keyof typeof subjectIcons] : BookOpen;

  if (!selectedGrade || !selectedSubject) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar - Select Grade and Subject
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Grade</label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {[8, 9, 10, 11, 12].map(g => (
                    <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SubjectIcon className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="flex items-center gap-2">
                  Calendar - Grade {selectedGrade} {subjectName || selectedSubject}
                </CardTitle>
                <CardDescription>
                  Manage lesson schedules and curriculum planning
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "monthly" ? "weekly" : "monthly")}
              >
                {viewMode === "monthly" ? "Weekly" : "Monthly"} View
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="outline" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-gray-500">Loading lessons...</div>
            </div>
          ) : (
            renderCalendarGrid()
          )}
        </CardContent>
      </Card>

      {/* Lesson Form Modal */}
      {showLessonForm && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-2xl my-8">
            <LessonForm
              date={selectedDate}
              grade={selectedGrade}
              subject={selectedSubject}
              onClose={() => {
                setShowLessonForm(false);
                setSelectedDate("");
              }}
              onSuccess={() => {
                refetch();
              }}
            />
          </div>
        </div>
      )}

      {/* Today's Lessons */}
      {lessons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Current Lessons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{lesson.lessonTitle}</h4>
                    <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {lesson.date}
                      </span>
                      {lesson.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {lesson.duration} min
                        </span>
                      )}
                      {lesson.videoLink && (
                        <span className="flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          Video
                        </span>
                      )}
                    </div>
                    {lesson.description && (
                      <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}