import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  BookOpen, 
  Target, 
  Lightbulb, 
  ChevronDown, 
  ChevronRight,
  Edit,
  Plus
} from "lucide-react";
import { useTopicsWithThemes } from "@/hooks/useTopics";
import type { Topic, Theme } from "@shared/schema";

interface TopicListProps {
  grade?: string;
  subject?: string;
  subjectName?: string;
  showAdminActions?: boolean;
  onTopicEdit?: (topic: Topic) => void;
  onTopicAdd?: () => void;
  onThemeEdit?: (theme: Theme) => void;
  onThemeAdd?: (topicId: number) => void;
  className?: string;
}

export default function TopicList({
  grade,
  subject,
  subjectName,
  showAdminActions = false,
  onTopicEdit,
  onTopicAdd,
  onThemeEdit,
  onThemeAdd,
  className = ""
}: TopicListProps) {
  const { topics, isLoading } = useTopicsWithThemes(grade, subject);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (expandedTopics.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  if (!grade || !subject) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Select Grade and Subject</h3>
          <p className="text-slate-600">Please select a grade and subject to view topics.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-slate-600">Loading topics...</p>
        </CardContent>
      </Card>
    );
  }

  if (topics.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No topics have been created yet.
          </h3>
          <p className="text-slate-600 mb-4">
            {subjectName ? `Topics for Grade ${grade} ${subjectName}` : 'Topics for this grade and subject'} 
            {' '}will appear here once they are added.
          </p>
          {showAdminActions && onTopicAdd && (
            <Button onClick={onTopicAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Topic
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {topics.map((topic) => (
        <Card key={topic.id} className="overflow-hidden">
          <Collapsible
            open={expandedTopics.has(topic.id.toString())}
            onOpenChange={() => toggleTopic(topic.id.toString())}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3" onClick={() => toggleTopic(topic.id.toString())}>
                    <Target className="w-5 h-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{topic.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {topic.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {showAdminActions && onTopicEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTopicEdit(topic);
                        }}
                        className="text-xs hover:bg-blue-50"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit Topic
                      </Button>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {topic.themes.length} theme{topic.themes.length !== 1 ? 's' : ''}
                    </Badge>
                    <div onClick={() => toggleTopic(topic.id.toString())}>
                      {expandedTopics.has(topic.id.toString()) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Themes
                  </h4>
                  {showAdminActions && onThemeAdd && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onThemeAdd(topic.id)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Theme
                    </Button>
                  )}
                </div>

                {topic.themes.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No themes created yet.</p>
                    {showAdminActions && onThemeAdd && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onThemeAdd(topic.id)}
                        className="mt-2"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add First Theme
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {topic.themes.map((theme) => (
                      <div
                        key={theme.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <h5 className="font-medium text-sm">{theme.name}</h5>
                          <p className="text-xs text-slate-600">{theme.description}</p>
                        </div>
                        {showAdminActions && onThemeEdit && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onThemeEdit(theme)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}