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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/api";
import type { Topic, Theme } from "@shared/schema";

interface TopicWithThemes extends Topic {
  themes: Theme[];
}

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
  const queryClient = useQueryClient();
  const [selectedGrade, setSelectedGrade] = useState<string>(grade?.toString() || "");
  const [selectedSubject, setSelectedSubject] = useState<string>(subject || "");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [showAddThemeDialog, setShowAddThemeDialog] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [selectedTopicForTheme, setSelectedTopicForTheme] = useState<number>(0);
  const [showAddTopicDialog, setShowAddTopicDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  // Fetch topics from database
  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ['/api/topics', selectedGrade, selectedSubject],
    queryFn: async () => {
      const response = await fetch(buildApiUrl(`/api/topics?grade=${selectedGrade}&subject=${selectedSubject}`));
      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }
      return response.json() as Promise<Topic[]>;
    },
    enabled: !!(selectedGrade && selectedSubject),
  });

  // Fetch themes for all topics
  const { data: allThemes = [] } = useQuery({
    queryKey: ['/api/themes', topics],
    queryFn: async () => {
      if (!topics.length) return [];
      
      const themesPromises = topics.map(async (topic) => {
        const response = await fetch(buildApiUrl(`/api/themes?topicId=${topic.id}`));
        if (!response.ok) {
          throw new Error(`Failed to fetch themes for topic ${topic.id}`);
        }
        const themes = await response.json() as Theme[];
        return { topicId: topic.id, themes };
      });
      
      const results = await Promise.all(themesPromises);
      return results.flatMap(result => result.themes);
    },
    enabled: topics.length > 0,
  });

  // Combine topics with their themes
  const topicsWithThemes: TopicWithThemes[] = topics.map(topic => ({
    ...topic,
    themes: allThemes.filter(theme => theme.topicId === topic.id)
  }));

  // Mutation for creating topics
  const createTopicMutation = useMutation({
    mutationFn: async (topicData: { name: string; description: string }) => {
      const response = await fetch(buildApiUrl('/api/topics'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...topicData,
          grade: selectedGrade,
          subject: selectedSubject
        }),
      });
      if (!response.ok) throw new Error('Failed to create topic');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/topics', selectedGrade, selectedSubject] });
      toast({ title: "Topic Added", description: "New topic has been successfully added." });
      setShowAddTopicDialog(false);
      setEditingTopic(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create topic.", variant: "destructive" });
    }
  });

  // Mutation for updating topics
  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; name: string; description: string }) => {
      const response = await fetch(buildApiUrl(`/api/topics/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update topic');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/topics', selectedGrade, selectedSubject] });
      toast({ title: "Topic Updated", description: "The topic has been successfully updated." });
      setShowAddTopicDialog(false);
      setEditingTopic(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update topic.", variant: "destructive" });
    }
  });

  // Mutation for creating themes
  const createThemeMutation = useMutation({
    mutationFn: async (themeData: { name: string; description: string; topicId: number }) => {
      const response = await fetch(buildApiUrl('/api/themes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(themeData),
      });
      if (!response.ok) throw new Error('Failed to create theme');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes', topics] });
      toast({ title: "Theme Added", description: "New theme has been successfully added." });
      setShowAddThemeDialog(false);
      setEditingTheme(null);
      setSelectedTopicForTheme(0);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create theme.", variant: "destructive" });
    }
  });

  // Mutation for updating themes  
  const updateThemeMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; name: string; description: string }) => {
      const response = await fetch(buildApiUrl(`/api/themes/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update theme');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/themes', topics] });
      toast({ title: "Theme Updated", description: "The theme has been successfully updated." });
      setShowAddThemeDialog(false);
      setEditingTheme(null);
      setSelectedTopicForTheme(0);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update theme.", variant: "destructive" });
    }
  });

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
      updateTopicMutation.mutate({ id: editingTopic.id, ...topicData });
    } else {
      createTopicMutation.mutate(topicData);
    }
  };

  const handleSaveTheme = (themeData: { name: string; description: string }) => {
    if (editingTheme) {
      updateThemeMutation.mutate({ id: editingTheme.id, ...themeData });
    } else {
      createThemeMutation.mutate({ ...themeData, topicId: selectedTopicForTheme });
    }
  };
      }
    ],
    "physical-science": [
      {
        id: "3",
        name: "Matter and Materials",
        description: "Understanding the properties and classification of matter",
        themes: [
          {
            id: "5",
            name: "States of Matter",
            description: "Solid, liquid, gas, and plasma states",
            topicId: "3"
          },
          {
            id: "6",
            name: "Properties of Materials",
            description: "Physical and chemical properties of different materials",
            topicId: "3"
          }
        ]
      }
    ]
  },
  "9": {
    "mathematics": [
      {
        id: "4",
        name: "Functions",
        description: "Introduction to functions and their representations",
        themes: [
          {
            id: "7",
            name: "Linear Functions",
            description: "Understanding linear relationships and graphing",
            topicId: "4"
          },
          {
            id: "8",
            name: "Quadratic Functions",
            description: "Introduction to quadratic equations and their graphs",
            topicId: "4"
          }
        ]
      }
    ]
  }
};

export default function AdminTopics({ grade, subject, subjectName }: AdminTopicsProps) {
  const { toast } = useToast();
  const [selectedGrade, setSelectedGrade] = useState<string>(grade?.toString() || "");
  const [selectedSubject, setSelectedSubject] = useState<string>(subject || "");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [showAddThemeDialog, setShowAddThemeDialog] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [selectedTopicForTheme, setSelectedTopicForTheme] = useState<string>("");
  const [showAddTopicDialog, setShowAddTopicDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  const subjects = [
    { value: "mathematics", name: "Mathematics" },
    { value: "mathematical-literacy", name: "Mathematical Literacy" },
    { value: "physical-science", name: "Physical Science" }
  ];

  const grades = ["8", "9", "10", "11", "12"];

  // Load topics when grade and subject are selected
  const loadTopics = () => {
    if (selectedGrade && selectedSubject) {
      const gradeTopics = mockTopicData[selectedGrade]?.[selectedSubject] || [];
      setTopics(gradeTopics);
      // Expand all topics by default
      setExpandedTopics(new Set(gradeTopics.map(topic => topic.id)));
    }
  };

  useEffect(() => {
    loadTopics();
  }, [selectedGrade, selectedSubject]);

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const handleAddTopic = () => {
    setEditingTopic(null);
    setShowAddTopicDialog(true);
  };

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setShowAddTopicDialog(true);
  };

  const handleAddTheme = (topicId: string) => {
    setSelectedTopicForTheme(topicId);
    setEditingTheme(null);
    setShowAddThemeDialog(true);
  };

  const handleEditTheme = (theme: Theme) => {
    setSelectedTopicForTheme(theme.topicId);
    setEditingTheme(theme);
    setShowAddThemeDialog(true);
  };

  const handleDeleteTheme = (themeId: string, topicId: string) => {
    setTopics(prev => prev.map(topic => 
      topic.id === topicId 
        ? { ...topic, themes: topic.themes.filter(theme => theme.id !== themeId) }
        : topic
    ));
    toast({
      title: "Theme Deleted",
      description: "The theme has been successfully deleted.",
    });
  };

  const handleSaveTopic = (topicData: Omit<Topic, 'id' | 'themes'>) => {
    if (editingTopic) {
      // Update existing topic
      setTopics(prev => prev.map(topic => 
        topic.id === editingTopic.id
          ? { ...topic, ...topicData }
          : topic
      ));
      toast({
        title: "Topic Updated",
        description: "The topic has been successfully updated.",
      });
    } else {
      // Add new topic
      const newTopic: Topic = {
        ...topicData,
        id: Date.now().toString(),
        themes: []
      };
      setTopics(prev => [...prev, newTopic]);
      toast({
        title: "Topic Added",
        description: "New topic has been successfully added.",
      });
    }
    setShowAddTopicDialog(false);
    setEditingTopic(null);
  };

  const handleSaveTheme = (themeData: Omit<Theme, 'id' | 'topicId'>) => {
    if (editingTheme) {
      // Update existing theme
      setTopics(prev => prev.map(topic => 
        topic.id === selectedTopicForTheme
          ? {
              ...topic,
              themes: topic.themes.map(theme =>
                theme.id === editingTheme.id
                  ? { ...themeData, id: editingTheme.id, topicId: selectedTopicForTheme }
                  : theme
              )
            }
          : topic
      ));
      toast({
        title: "Theme Updated",
        description: "The theme has been successfully updated.",
      });
    } else {
      // Add new theme
      const newTheme: Theme = {
        ...themeData,
        id: Date.now().toString(),
        topicId: selectedTopicForTheme
      };
      setTopics(prev => prev.map(topic => 
        topic.id === selectedTopicForTheme
          ? { ...topic, themes: [...topic.themes, newTheme] }
          : topic
      ));
      toast({
        title: "Theme Added",
        description: "New theme has been successfully added.",
      });
    }
    setShowAddThemeDialog(false);
    setEditingTheme(null);
    setSelectedTopicForTheme("");
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
      {topics.length === 0 ? (
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
                open={expandedTopics.has(topic.id)}
                onOpenChange={() => toggleTopic(topic.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3" onClick={() => toggleTopic(topic.id)}>
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
                        <div onClick={() => toggleTopic(topic.id)}>
                          {expandedTopics.has(topic.id) ? (
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
                            variant="outline"
                            onClick={() => handleAddTheme(topic.id)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add First Theme
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {topic.themes.map((theme) => (
                            <Card key={theme.id} className="border border-slate-200">
                              <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <CardTitle className="text-sm font-medium">
                                      {theme.name}
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-1 line-clamp-2">
                                      {theme.description}
                                    </CardDescription>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="flex gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleEditTheme(theme)}
                                    className="flex-1 text-xs"
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDeleteTheme(theme.id, topic.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
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
              setSelectedTopicForTheme("");
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TopicFormProps {
  topic?: Topic | null;
  onSave: (data: Omit<Topic, 'id' | 'themes'>) => void;
  onCancel: () => void;
}

function TopicForm({ topic, onSave, onCancel }: TopicFormProps) {
  const [formData, setFormData] = useState({
    name: topic?.name || "",
    description: topic?.description || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="topicName">Topic Name</Label>
        <Input
          id="topicName"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter topic name (e.g., Algebra, Geometry)"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="topicDescription">Description</Label>
        <Textarea
          id="topicDescription"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter topic description"
          rows={3}
          required
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {topic ? 'Update' : 'Add'} Topic
        </Button>
      </div>
    </form>
  );
}

interface ThemeFormProps {
  theme?: Theme | null;
  onSave: (data: Omit<Theme, 'id' | 'topicId'>) => void;
  onCancel: () => void;
}

function ThemeForm({ theme, onSave, onCancel }: ThemeFormProps) {
  const [formData, setFormData] = useState({
    name: theme?.name || "",
    description: theme?.description || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Theme Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter theme name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter theme description"
          rows={3}
          required
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {theme ? 'Update' : 'Add'} Theme
        </Button>
      </div>
    </form>
  );
}