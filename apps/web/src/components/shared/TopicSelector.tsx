import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Lightbulb } from "lucide-react";
import { useTopicsWithThemes } from "@/hooks/useTopics";
import type { Topic, Theme } from "@shared/schema";

interface TopicSelectorProps {
  grade?: string;
  subject?: string;
  selectedTopicId?: number;
  selectedThemeId?: number;
  onTopicChange?: (topic: Topic | null) => void;
  onThemeChange?: (theme: Theme | null) => void;
  showThemes?: boolean;
  placeholder?: {
    topic?: string;
    theme?: string;
  };
  className?: string;
}

export default function TopicSelector({
  grade,
  subject,
  selectedTopicId,
  selectedThemeId,
  onTopicChange,
  onThemeChange,
  showThemes = true,
  placeholder = {},
  className = ""
}: TopicSelectorProps) {
  const { topics, isLoading } = useTopicsWithThemes(grade, subject);
  const [internalTopicId, setInternalTopicId] = useState<number>();

  const currentTopicId = selectedTopicId ?? internalTopicId;
  const selectedTopic = topics.find(t => t.id === currentTopicId);
  const availableThemes = selectedTopic?.themes || [];

  const handleTopicChange = (topicId: string) => {
    const numericId = parseInt(topicId);
    const topic = topics.find(t => t.id === numericId) || null;
    
    setInternalTopicId(numericId);
    onTopicChange?.(topic);
    
    // Reset theme selection when topic changes
    if (onThemeChange) {
      onThemeChange(null);
    }
  };

  const handleThemeChange = (themeId: string) => {
    const numericId = parseInt(themeId);
    const theme = availableThemes.find(t => t.id === numericId) || null;
    onThemeChange?.(theme);
  };

  if (!grade || !subject) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Please select a grade and subject first</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-slate-600">Loading topics...</p>
        </CardContent>
      </Card>
    );
  }

  if (topics.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <Target className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">No topics available for this grade and subject</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Topic Selection */}
      <div className="space-y-2">
        <Label htmlFor="topic">Topic</Label>
        <Select value={currentTopicId?.toString() || ""} onValueChange={handleTopicChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder.topic || "Select a topic"} />
          </SelectTrigger>
          <SelectContent>
            {topics.map((topic) => (
              <SelectItem key={topic.id} value={topic.id.toString()}>
                <div className="flex items-center justify-between w-full">
                  <span>{topic.name}</span>
                  {topic.themes.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {topic.themes.length} theme{topic.themes.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTopic && (
          <p className="text-xs text-slate-600">{selectedTopic.description}</p>
        )}
      </div>

      {/* Theme Selection */}
      {showThemes && selectedTopic && (
        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          {availableThemes.length === 0 ? (
            <Card>
              <CardContent className="p-3 text-center">
                <Lightbulb className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-600">No themes available for this topic</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Select value={selectedThemeId?.toString() || ""} onValueChange={handleThemeChange}>
                <SelectTrigger>
                  <SelectValue placeholder={placeholder.theme || "Select a theme"} />
                </SelectTrigger>
                <SelectContent>
                  {availableThemes.map((theme) => (
                    <SelectItem key={theme.id} value={theme.id.toString()}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedThemeId && (
                <p className="text-xs text-slate-600">
                  {availableThemes.find(t => t.id === selectedThemeId)?.description}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}