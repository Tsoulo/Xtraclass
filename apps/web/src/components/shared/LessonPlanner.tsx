import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Target, Lightbulb, Calendar, Clock } from "lucide-react";
import TopicSelector from "./TopicSelector";
import { useTopicsWithThemes } from "@/hooks/useTopics";
import type { Topic, Theme } from "@shared/schema";

interface LessonPlannerProps {
  userRole?: "teacher" | "student" | "tutor";
  onLessonSave?: (lessonData: any) => void;
  className?: string;
}

export default function LessonPlanner({ 
  userRole = "teacher", 
  onLessonSave,
  className = ""
}: LessonPlannerProps) {
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  
  const [lessonData, setLessonData] = useState({
    title: "",
    description: "",
    objectives: "",
    materials: ""
  });

  const subjects = [
    { value: "mathematics", name: "Mathematics" },
    { value: "mathematical-literacy", name: "Mathematical Literacy" },
    { value: "physical-science", name: "Physical Science" }
  ];

  const grades = ["8", "9", "10", "11", "12"];

  const handleSaveLesson = () => {
    const fullLessonData = {
      ...lessonData,
      grade: selectedGrade,
      subject: selectedSubject,
      topicId: selectedTopic?.id,
      topicName: selectedTopic?.name,
      themeId: selectedTheme?.id,
      themeName: selectedTheme?.name,
      createdBy: userRole,
      createdAt: new Date().toISOString()
    };
    
    onLessonSave?.(fullLessonData);
    
    // Reset form
    setLessonData({
      title: "",
      description: "",
      objectives: "",
      materials: ""
    });
  };

  const isFormValid = selectedGrade && selectedSubject && selectedTopic && 
                     lessonData.title && lessonData.description;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Lesson Planner
            <Badge variant="outline" className="ml-2 text-xs">
              {userRole}
            </Badge>
          </CardTitle>
          <CardDescription>
            Create structured lessons using the curriculum topics and themes.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Grade and Subject Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Curriculum Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="grade">Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.value} value={subject.value}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topic and Theme Selection */}
      {selectedGrade && selectedSubject && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Topic & Theme Selection</CardTitle>
            <CardDescription>
              Select the curriculum topic and specific theme for this lesson.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopicSelector
              grade={selectedGrade}
              subject={selectedSubject}
              onTopicChange={setSelectedTopic}
              onThemeChange={setSelectedTheme}
              placeholder={{
                topic: "Choose a topic for your lesson",
                theme: "Choose a specific theme"
              }}
            />
            
            {selectedTopic && selectedTheme && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-800">Selected:</span>
                </div>
                <p className="text-sm text-green-700">
                  <strong>{selectedTopic.name}</strong> → {selectedTheme.name}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {selectedTheme.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lesson Details */}
      {selectedTopic && selectedTheme && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lesson Details</CardTitle>
            <CardDescription>
              Plan your lesson content and structure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Lesson Title</Label>
              <Input
                id="title"
                value={lessonData.title}
                onChange={(e) => setLessonData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter a descriptive lesson title"
              />
            </div>

            <div>
              <Label htmlFor="description">Lesson Description</Label>
              <Textarea
                id="description"
                value={lessonData.description}
                onChange={(e) => setLessonData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what students will learn in this lesson"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="materials">Materials Needed</Label>
              <Input
                id="materials"
                value={lessonData.materials}
                onChange={(e) => setLessonData(prev => ({ ...prev, materials: e.target.value }))}
                placeholder="Textbook, calculator, worksheets"
              />
            </div>

            <div>
              <Label htmlFor="objectives">Learning Objectives</Label>
              <Textarea
                id="objectives"
                value={lessonData.objectives}
                onChange={(e) => setLessonData(prev => ({ ...prev, objectives: e.target.value }))}
                placeholder="By the end of this lesson, students will be able to..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>Ready to create lesson plan</span>
              </div>
              <Button 
                onClick={handleSaveLesson}
                disabled={!isFormValid}
                className="flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Save Lesson Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}