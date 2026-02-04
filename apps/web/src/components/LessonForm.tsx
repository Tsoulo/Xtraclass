import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTopicsWithThemes } from "@/hooks/useTopics";
import { useCreateLesson, type CreateLessonData } from "@/hooks/useLessons";
import { Loader2, X } from "lucide-react";

interface LessonFormProps {
  date: string;
  grade: string;
  subject: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LessonForm({ date, grade, subject, onClose, onSuccess }: LessonFormProps) {
  const { toast } = useToast();
  const { topics, isLoading: topicsLoading } = useTopicsWithThemes(grade, subject);
  const createLessonMutation = useCreateLesson();

  const [formData, setFormData] = useState({
    topicId: 0,
    themeId: 0,
    lessonTitle: "",
    description: "",
    videoLink: "",
    objectives: [] as string[]
  });

  const [selectedTopic, setSelectedTopic] = useState<number>(0);
  const [availableThemes, setAvailableThemes] = useState<any[]>([]);

  // Update available themes when topic changes
  useEffect(() => {
    console.log("Topic changed:", selectedTopic, "Topics:", topics);
    if (selectedTopic > 0 && topics.length > 0) {
      const topic = topics.find(t => t.id === selectedTopic);
      console.log("Found topic:", topic);
      if (topic?.themes && topic.themes.length > 0) {
        setAvailableThemes(topic.themes);
        console.log("Set themes:", topic.themes);
      } else {
        setAvailableThemes([]);
        console.log("No themes found for topic");
      }
    } else {
      setAvailableThemes([]);
    }
  }, [selectedTopic, topics]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submission - Current form data:", formData);
    console.log("Selected topic:", selectedTopic);
    console.log("Available themes:", availableThemes);
    
    if (!formData.topicId || !formData.themeId || !formData.lessonTitle.trim()) {
      console.log("Validation failed:", {
        topicId: formData.topicId,
        themeId: formData.themeId,
        lessonTitle: formData.lessonTitle.trim(),
        lessonTitleLength: formData.lessonTitle.length
      });
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (topic, theme, and lesson title).",
        variant: "destructive",
      });
      return;
    }

    const lessonData: CreateLessonData = {
      date,
      grade,
      subject,
      topicId: formData.topicId,
      themeId: formData.themeId,
      lessonTitle: formData.lessonTitle,
      description: formData.description,
      videoLink: formData.videoLink || undefined,
      objectives: [],
    };

    try {
      await createLessonMutation.mutateAsync(lessonData);
      
      toast({
        title: "Success",
        description: "Lesson created successfully!",
      });

      // Reset form
      setFormData({
        topicId: 0,
        themeId: 0,
        lessonTitle: "",
        description: "",
        videoLink: "",
        objectives: []
      });
      setSelectedTopic(0);
      setAvailableThemes([]);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast({
        title: "Error",
        description: "Failed to create lesson. Please try again.",
        variant: "destructive",
      });
    }
  };



  if (topicsLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading topics and themes...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Create New Lesson - {date}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Topic Selection */}
          <div className="space-y-2">
            <Label htmlFor="topic">Topic *</Label>
            <Select 
              value={selectedTopic > 0 ? selectedTopic.toString() : undefined} 
              onValueChange={(value) => {
                console.log("Topic selected:", value);
                const topicId = parseInt(value);
                setSelectedTopic(topicId);
                // Also update formData immediately
                setFormData(prev => ({ ...prev, topicId, themeId: 0 }));
                console.log("Topic ID set to:", topicId);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id.toString()}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {topics.length === 0 && (
              <p className="text-sm text-gray-500">No topics available for Grade {grade} {subject}</p>
            )}
          </div>

          {/* Theme Selection */}
          <div className="space-y-2">
            <Label htmlFor="theme">Theme *</Label>
            <Select 
              value={formData.themeId > 0 ? formData.themeId.toString() : undefined} 
              onValueChange={(value) => {
                console.log("Theme selected:", value);
                const themeId = parseInt(value);
                setFormData(prev => {
                  const updated = { ...prev, themeId };
                  console.log("Theme ID set to:", themeId, "Updated formData:", updated);
                  return updated;
                });
              }}
              disabled={availableThemes.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={availableThemes.length === 0 ? "Select a topic first" : "Select a theme"} />
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
              <p className="text-sm text-gray-500">No themes available for selected topic</p>
            )}
          </div>

          {/* Lesson Title */}
          <div className="space-y-2">
            <Label htmlFor="lessonTitle">Lesson Title *</Label>
            <Input
              id="lessonTitle"
              value={formData.lessonTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, lessonTitle: e.target.value }))}
              placeholder="Enter lesson title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter lesson description"
            />
          </div>

          {/* Video Link */}
          <div className="space-y-2">
            <Label htmlFor="videoLink">Video Link</Label>
            <Input
              id="videoLink"
              value={formData.videoLink}
              onChange={(e) => setFormData(prev => ({ ...prev, videoLink: e.target.value }))}
              placeholder="Enter video URL"
            />
          </div>


          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" disabled={createLessonMutation.isPending}>
              {createLessonMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Lesson"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>


        </form>
      </CardContent>
    </Card>
  );
}