import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  Plus, 
  X, 
  FileText,
  Clock,
  Target,
  BookOpen,
  Calculator,
  Atom
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminAddLessonProps {
  grade: number;
  subject: string;
  subjectName: string;
}

interface LessonObjective {
  id: string;
  text: string;
}

interface LessonActivity {
  id: string;
  title: string;
  description: string;
  duration: number;
  type: "introduction" | "explanation" | "practice" | "assessment";
}

const subjectIcons = {
  "mathematics": Calculator,
  "mathematical-literacy": FileText,
  "physical-science": Atom
};

const activityTypes = [
  { value: "introduction", label: "Introduction", color: "bg-blue-100 text-blue-800" },
  { value: "explanation", label: "Explanation", color: "bg-green-100 text-green-800" },
  { value: "practice", label: "Practice", color: "bg-yellow-100 text-yellow-800" },
  { value: "assessment", label: "Assessment", color: "bg-purple-100 text-purple-800" }
];

export default function AdminAddLesson({ grade, subject, subjectName }: AdminAddLessonProps) {
  const { toast } = useToast();
  const [lessonData, setLessonData] = useState({
    title: "",
    topic: "",
    duration: 60,
    description: "",
    prerequisites: "",
    associatedTheme: "",
    videoLink: ""
  });

  const [objectives, setObjectives] = useState<LessonObjective[]>([
    { id: "1", text: "" }
  ]);

  const [activities, setActivities] = useState<LessonActivity[]>([
    { 
      id: "1", 
      title: "", 
      description: "", 
      duration: 15, 
      type: "introduction" 
    }
  ]);

  const SubjectIcon = subjectIcons[subject as keyof typeof subjectIcons] || BookOpen;

  const addObjective = () => {
    const newObjective: LessonObjective = {
      id: Date.now().toString(),
      text: ""
    };
    setObjectives([...objectives, newObjective]);
  };

  const updateObjective = (id: string, text: string) => {
    setObjectives(objectives.map(obj => 
      obj.id === id ? { ...obj, text } : obj
    ));
  };

  const removeObjective = (id: string) => {
    if (objectives.length > 1) {
      setObjectives(objectives.filter(obj => obj.id !== id));
    }
  };

  const addActivity = () => {
    const newActivity: LessonActivity = {
      id: Date.now().toString(),
      title: "",
      description: "",
      duration: 15,
      type: "practice"
    };
    setActivities([...activities, newActivity]);
  };

  const updateActivity = (id: string, updates: Partial<LessonActivity>) => {
    setActivities(activities.map(activity => 
      activity.id === id ? { ...activity, ...updates } : activity
    ));
  };

  const removeActivity = (id: string) => {
    if (activities.length > 1) {
      setActivities(activities.filter(activity => activity.id !== id));
    }
  };

  const getTotalDuration = () => {
    return activities.reduce((total, activity) => total + activity.duration, 0);
  };

  const getActivityTypeColor = (type: string) => {
    const activityType = activityTypes.find(t => t.value === type);
    return activityType?.color || "bg-gray-100 text-gray-800";
  };

  const handleSaveLesson = () => {
    // Validation
    if (!lessonData.title.trim()) {
      toast({
        title: "Error",
        description: "Lesson title is required",
        variant: "destructive"
      });
      return;
    }

    if (!lessonData.topic.trim()) {
      toast({
        title: "Error", 
        description: "Topic is required",
        variant: "destructive"
      });
      return;
    }

    const validObjectives = objectives.filter(obj => obj.text.trim() !== "");
    if (validObjectives.length === 0) {
      toast({
        title: "Error",
        description: "At least one learning objective is required",
        variant: "destructive"
      });
      return;
    }

    const validActivities = activities.filter(activity => 
      activity.title.trim() !== "" && activity.description.trim() !== ""
    );
    if (validActivities.length === 0) {
      toast({
        title: "Error",
        description: "At least one complete activity is required",
        variant: "destructive"
      });
      return;
    }

    // In real app, this would be sent to the backend
    console.log("Saving lesson:", {
      ...lessonData,
      grade,
      subject,
      objectives: validObjectives,
      activities: validActivities,
      totalDuration: getTotalDuration()
    });

    toast({
      title: "Success",
      description: `Lesson "${lessonData.title}" saved successfully`
    });

    // Reset form
    setLessonData({
      title: "",
      topic: "",
      duration: 60,
      description: "",
      prerequisites: "",
      associatedTheme: "",
      videoLink: ""
    });
    setObjectives([{ id: "1", text: "" }]);
    setActivities([{ id: "1", title: "", description: "", duration: 15, type: "introduction" }]);
  };

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <SubjectIcon className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Add New Lesson</h1>
        </div>
        <p className="text-gray-600">
          Creating lesson for <span className="font-medium">{subjectName}</span> - 
          <span className="font-medium"> Grade {grade}</span>
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lessonTitle">Lesson Title</Label>
                <Input
                  id="lessonTitle"
                  value={lessonData.title}
                  onChange={(e) => setLessonData({...lessonData, title: e.target.value})}
                  placeholder="e.g., Introduction to Linear Equations"
                />
              </div>
              <div>
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  value={lessonData.topic}
                  onChange={(e) => setLessonData({...lessonData, topic: e.target.value})}
                  placeholder="e.g., Algebra"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="associatedTheme">Associated Theme</Label>
                <Input
                  id="associatedTheme"
                  value={lessonData.associatedTheme}
                  onChange={(e) => setLessonData({...lessonData, associatedTheme: e.target.value})}
                  placeholder="e.g., Algebraic Expressions"
                />
              </div>
              <div>
                <Label htmlFor="videoLink">Video Link</Label>
                <Input
                  id="videoLink"
                  type="url"
                  value={lessonData.videoLink}
                  onChange={(e) => setLessonData({...lessonData, videoLink: e.target.value})}
                  placeholder="https://example.com/video"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Lesson Description</Label>
              <Textarea
                id="description"
                value={lessonData.description}
                onChange={(e) => setLessonData({...lessonData, description: e.target.value})}
                placeholder="Brief overview of what students will learn in this lesson..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="prerequisites">Prerequisites</Label>
              <Textarea
                id="prerequisites"
                value={lessonData.prerequisites}
                onChange={(e) => setLessonData({...lessonData, prerequisites: e.target.value})}
                placeholder="What should students know before taking this lesson..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Learning Objectives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Learning Objectives
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {objectives.map((objective, index) => (
              <div key={objective.id} className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor={`objective-${objective.id}`}>
                    Objective {index + 1}
                  </Label>
                  <Input
                    id={`objective-${objective.id}`}
                    value={objective.text}
                    onChange={(e) => updateObjective(objective.id, e.target.value)}
                    placeholder="Students will be able to..."
                  />
                </div>
                {objectives.length > 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeObjective(objective.id)}
                    className="mt-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addObjective}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Objective
            </Button>
          </CardContent>
        </Card>

        {/* Lesson Activities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Lesson Activities
              </CardTitle>
              <Badge variant="outline" className="font-mono">
                Total: {getTotalDuration()} minutes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {activities.map((activity, index) => (
              <div key={activity.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Activity {index + 1}</h4>
                  <div className="flex items-center gap-2">
                    <Badge className={getActivityTypeColor(activity.type)}>
                      {activityTypes.find(t => t.value === activity.type)?.label}
                    </Badge>
                    {activities.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeActivity(activity.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`activity-title-${activity.id}`}>Title</Label>
                    <Input
                      id={`activity-title-${activity.id}`}
                      value={activity.title}
                      onChange={(e) => updateActivity(activity.id, { title: e.target.value })}
                      placeholder="Activity title"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`activity-type-${activity.id}`}>Type</Label>
                    <select
                      id={`activity-type-${activity.id}`}
                      value={activity.type}
                      onChange={(e) => updateActivity(activity.id, { type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {activityTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor={`activity-duration-${activity.id}`}>Duration (min)</Label>
                    <Input
                      id={`activity-duration-${activity.id}`}
                      type="number"
                      value={activity.duration}
                      onChange={(e) => updateActivity(activity.id, { duration: parseInt(e.target.value) || 0 })}
                      min="1"
                      max="120"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`activity-description-${activity.id}`}>Description</Label>
                  <Textarea
                    id={`activity-description-${activity.id}`}
                    value={activity.description}
                    onChange={(e) => updateActivity(activity.id, { description: e.target.value })}
                    placeholder="Detailed description of the activity..."
                    rows={3}
                  />
                </div>
              </div>
            ))}
            
            <Button
              variant="outline"
              onClick={addActivity}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSaveLesson}
            className="bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Lesson
          </Button>
        </div>
      </div>
    </div>
  );
}