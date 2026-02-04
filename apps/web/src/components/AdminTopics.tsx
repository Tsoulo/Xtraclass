import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen, 
  Lightbulb,
  Target,
  Calculator,
  FileText,
  Atom,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTopicMutations, useThemeMutations, useTopicsWithThemes } from "@/hooks/useTopics";
import type { Topic, Theme } from "@shared/schema";

interface AdminTopicsProps {
  grade?: number;
  subject?: string;
  subjectName?: string;
}

const subjectIcons = {
  "mathematics": Calculator,
  "mathematical-literacy": FileText,
  "physical-science": Atom
};

export default function AdminTopics({ grade, subject, subjectName }: AdminTopicsProps) {
  const { toast } = useToast();
  const [selectedGrade, setSelectedGrade] = useState<string>(grade?.toString() || "");
  const [selectedSubject, setSelectedSubject] = useState<string>(subject || "");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [showAddThemeDialog, setShowAddThemeDialog] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [selectedTopicForTheme, setSelectedTopicForTheme] = useState<number>(0);
  const [showAddTopicDialog, setShowAddTopicDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  // Sync state with props when they change during navigation
  useEffect(() => {
    if (grade !== undefined) {
      setSelectedGrade(grade.toString());
    }
    if (subject) {
      setSelectedSubject(subject);
    }
  }, [grade, subject]);

  // Use shared hooks for data and mutations
  const { topics, isLoading } = useTopicsWithThemes(selectedGrade, selectedSubject);
  const { createTopic, updateTopic } = useTopicMutations(selectedGrade, selectedSubject);
  const { createTheme, updateTheme } = useThemeMutations(topics);

  const subjects = [
    { value: "mathematics", name: "Mathematics" },
    { value: "mathematical-literacy", name: "Mathematical Literacy" },
    { value: "physical-science", name: "Physical Science" }
  ];

  const grades = ["8", "9", "10", "11", "12"];

  const handleAddTopic = () => {
    setEditingTopic(null);
    setShowAddTopicDialog(true);
  };

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setShowAddTopicDialog(true);
  };

  const handleAddTheme = (topicId: number) => {
    setSelectedTopicForTheme(topicId);
    setEditingTheme(null);
    setShowAddThemeDialog(true);
  };

  const handleEditTheme = (theme: Theme) => {
    setSelectedTopicForTheme(theme.topicId);
    setEditingTheme(theme);
    setShowAddThemeDialog(true);
  };

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (expandedTopics.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const handleSaveTopic = (topicData: { name: string; description: string }) => {
    if (editingTopic) {
      updateTopic.mutate({ id: editingTopic.id, ...topicData }, {
        onSuccess: () => {
          toast({
            title: "Topic Updated",
            description: "The topic has been successfully updated.",
          });
          setShowAddTopicDialog(false);
          setEditingTopic(null);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: "Failed to update topic. Please try again.",
            variant: "destructive",
          });
        }
      });
    } else {
      createTopic.mutate(topicData, {
        onSuccess: () => {
          toast({
            title: "Topic Created",
            description: "New topic has been successfully created.",
          });
          setShowAddTopicDialog(false);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: "Failed to create topic. Please try again.",
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleSaveTheme = (themeData: { name: string; description: string }) => {
    if (editingTheme) {
      updateTheme.mutate({ id: editingTheme.id, ...themeData }, {
        onSuccess: () => {
          toast({
            title: "Theme Updated",
            description: "The theme has been successfully updated.",
          });
          setShowAddThemeDialog(false);
          setEditingTheme(null);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: "Failed to update theme. Please try again.",
            variant: "destructive",
          });
        }
      });
    } else {
      createTheme.mutate({ ...themeData, topicId: selectedTopicForTheme }, {
        onSuccess: () => {
          toast({
            title: "Theme Created",
            description: "New theme has been successfully created.",
          });
          setShowAddThemeDialog(false);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: "Failed to create theme. Please try again.",
            variant: "destructive",
          });
        }
      });
    }
  };

  if (!selectedGrade || !selectedSubject) {
    return (
      <div className="flex-1 p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Topics & Themes Management
          </h2>
          <p className="text-slate-600">
            Select a grade and subject to manage topics and their themes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="grade">Grade</Label>
            <Select value={selectedGrade} onValueChange={(value) => {
              setSelectedGrade(value);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select Grade" />
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

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Select value={selectedSubject} onValueChange={(value) => {
              setSelectedSubject(value);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select Subject" />
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
      </div>
    );
  }

  const selectedSubjectName = subjects.find(s => s.value === selectedSubject)?.name || selectedSubject;
  const SubjectIcon = subjectIcons[selectedSubject as keyof typeof subjectIcons] || BookOpen;

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <SubjectIcon className="w-6 h-6 text-blue-600" />
            Topics & Themes Management
          </h2>
          <p className="text-slate-600">
            Grade {selectedGrade} - {selectedSubjectName}
          </p>
        </div>
        
        <Button onClick={handleAddTopic} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Topic
        </Button>
      </div>

      {/* Topics List */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-slate-500">Loading topics...</p>
          </CardContent>
        </Card>
      ) : topics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No Topics Found</h3>
            <p className="text-slate-500 text-center mb-4">
              No topics have been created for Grade {selectedGrade} {selectedSubjectName} yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <Card key={topic.id}>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTopic(topic);
                          }}
                          className="text-xs hover:bg-blue-50"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit Topic
                        </Button>
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
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          Themes
                        </h4>
                        <Button 
                          size="sm" 
                          onClick={() => handleAddTheme(topic.id)}
                          className="text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Theme
                        </Button>
                      </div>

                      {topic.themes.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 rounded-lg">
                          <Lightbulb className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500 mb-3">No themes in this topic yet</p>
                          <Button
                            size="sm"
                            onClick={() => handleAddTheme(topic.id)}
                            className="text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add First Theme
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {topic.themes.map((theme) => (
                            <div 
                              key={theme.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <h5 className="font-medium text-slate-800">{theme.name}</h5>
                                <p className="text-sm text-slate-600">{theme.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTheme(theme)}
                                  className="text-xs hover:bg-slate-200"
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Topic Dialog */}
      <Dialog open={showAddTopicDialog} onOpenChange={setShowAddTopicDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTopic ? 'Edit Topic' : 'Add New Topic'}
            </DialogTitle>
            <DialogDescription>
              {editingTopic 
                ? 'Update the topic details below.'
                : `Create a new topic for Grade ${selectedGrade} ${selectedSubjectName}.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <TopicForm
            topic={editingTopic}
            onSave={handleSaveTopic}
            onCancel={() => {
              setShowAddTopicDialog(false);
              setEditingTopic(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add/Edit Theme Dialog */}
      <Dialog open={showAddThemeDialog} onOpenChange={setShowAddThemeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTheme ? 'Edit Theme' : 'Add New Theme'}
            </DialogTitle>
            <DialogDescription>
              {editingTheme 
                ? 'Update the theme details below.'
                : `Create a new theme under "${topics.find(t => t.id === selectedTopicForTheme)?.name}".`
              }
            </DialogDescription>
          </DialogHeader>
          
          <ThemeForm
            theme={editingTheme}
            onSave={handleSaveTheme}
            onCancel={() => {
              setShowAddThemeDialog(false);
              setEditingTheme(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inline Topic Form Component
interface TopicFormProps {
  topic?: Topic | null;
  onSave: (data: { name: string; description: string }) => void;
  onCancel: () => void;
}

function TopicForm({ topic, onSave, onCancel }: TopicFormProps) {
  const [formData, setFormData] = useState({
    name: topic?.name || '',
    description: topic?.description || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="topicName">Topic Name</Label>
        <Input
          id="topicName"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter topic name"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="topicDescription">Description</Label>
        <Textarea
          id="topicDescription"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter topic description"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {topic ? 'Update Topic' : 'Create Topic'}
        </Button>
      </div>
    </form>
  );
}

// Inline Theme Form Component
interface ThemeFormProps {
  theme?: Theme | null;
  onSave: (data: { name: string; description: string }) => void;
  onCancel: () => void;
}

function ThemeForm({ theme, onSave, onCancel }: ThemeFormProps) {
  const [formData, setFormData] = useState({
    name: theme?.name || '',
    description: theme?.description || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="themeName">Theme Name</Label>
        <Input
          id="themeName"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter theme name"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="themeDescription">Description</Label>
        <Textarea
          id="themeDescription"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter theme description"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {theme ? 'Update Theme' : 'Create Theme'}
        </Button>
      </div>
    </form>
  );
}