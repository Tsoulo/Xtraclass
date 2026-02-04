import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Eye, 
  EyeOff,
  Code,
  Loader2,
  BookOpen,
  Settings,
  Zap,
  Users,
  X,
  Upload,
  RotateCcw,
  RefreshCw
} from "lucide-react";

// Types
interface AiPrompt {
  id: number;
  name: string;
  category: string;
  description: string;
  promptText: string;
  variables: string[];
  exampleUsage?: string;
  isActive: boolean;
  isPublished: boolean;
  // Versioning fields
  version: string;
  parentId?: number;
  status: string; // 'draft', 'tested', 'awaiting_dev', 'implemented', 'published', 'deprecated'
  variablesSchema?: {[key: string]: {type: string, description: string, required: boolean}};
  schemaHash?: string;
  testCases?: {variables: Record<string, string>, expectedShape?: string}[];
  implementedAt?: string;
  publishedAt?: string;
  isCurrentVersion: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// Form schemas
const promptSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["grading", "feedback", "question_generation", "tutorial", "general"]),
  description: z.string().min(1, "Description is required"),
  promptText: z.string().min(1, "Prompt text is required"),
  variables: z.array(z.string()).default([]),
  exampleUsage: z.string().optional(),
  isActive: z.boolean().default(true)
});


// Category configurations
const categoryConfig = {
  grading: { label: "Grading", icon: BookOpen, color: "bg-blue-100 text-blue-800" },
  feedback: { label: "Feedback", icon: MessageSquare, color: "bg-green-100 text-green-800" },
  question_generation: { label: "Question Generation", icon: Zap, color: "bg-purple-100 text-purple-800" },
  tutorial: { label: "Tutorial", icon: Users, color: "bg-orange-100 text-orange-800" },
  general: { label: "General", icon: Settings, color: "bg-gray-100 text-gray-800" }
};

// Workflow status configurations
const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800", description: "In development" },
  tested: { label: "Tested", color: "bg-blue-100 text-blue-800", description: "Ready for implementation" },
  awaiting_dev: { label: "Awaiting Dev", color: "bg-yellow-100 text-yellow-800", description: "Waiting for developer" },
  implemented: { label: "Implemented", color: "bg-purple-100 text-purple-800", description: "Code ready" },
  published: { label: "Published", color: "bg-green-100 text-green-800", description: "Live in system" },
  deprecated: { label: "Deprecated", color: "bg-red-100 text-red-800", description: "No longer used" }
};

export default function PromptBuilder() {
  const [selectedPrompt, setSelectedPrompt] = useState<AiPrompt | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [promptToReset, setPromptToReset] = useState<AiPrompt | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [, setLocation] = useLocation();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all AI prompts
  const { data: prompts = [], isLoading } = useQuery<AiPrompt[]>({
    queryKey: ["/api/ai-prompts"],
  });

  // Fetch MCP prompts for sync comparison
  const { data: mcpPrompts = [], isLoading: mcpLoading } = useQuery({
    queryKey: ["/api/mcp/prompts"],
    staleTime: 30 * 1000, // Cache for 30 seconds (shorter for real-time sync)
    retry: 1, // Only retry once on failure
  });

  // Helper function to normalize prompt text for comparison
  const normalizePromptText = (text: string): string => {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/\n\s*\n/g, '\n') // Remove extra newlines
      .toLowerCase();
  };

  // Helper function to normalize variable arrays for comparison
  const normalizeVariables = (variables: string[]): string[] => {
    return [...variables].sort().map(v => v.toLowerCase().trim());
  };

  // Helper function to get MCP version of a prompt for resetting
  const getMCPPrompt = (prompt: AiPrompt) => {
    if (!mcpPrompts || !Array.isArray(mcpPrompts)) return null;
    
    return mcpPrompts.find((mcp: any) => 
      mcp.name.toLowerCase().trim() === prompt.name.toLowerCase().trim() &&
      mcp.category === prompt.category
    );
  };

  // Auto-implement detection for all grading prompts
  const [promptsWithSyncStatus, setPromptsWithSyncStatus] = useState<Record<number, any>>({});

  // Load sync status for all grading prompts
  useEffect(() => {
    if (prompts && prompts.length > 0) {
      const gradingPrompts = prompts.filter(p => p.category === 'grading');
      
      gradingPrompts.forEach(async (prompt) => {
        try {
          const syncStatus = await apiRequest(`/api/prompt-builder/sync-status/${prompt.id}`);
          setPromptsWithSyncStatus(prev => ({ ...prev, [prompt.id]: syncStatus }));
        } catch (error) {
          console.log(`Failed to get sync status for prompt ${prompt.id}:`, error);
        }
      });
    }
  }, [prompts]);

  // Function to determine sync status for a prompt
  const getSyncStatus = (prompt: AiPrompt): { 
    status: string; 
    color: string; 
    label: string; 
    canAutoImplement?: boolean; 
    autoImplementReason?: string 
  } => {
    // For grading prompts with API data, use enhanced sync status
    if (prompt.category === 'grading' && promptsWithSyncStatus[prompt.id]) {
      const syncData = promptsWithSyncStatus[prompt.id];
      const status = syncData.syncStatus;
      
      if (status === 'in_sync') {
        return { 
          status: 'in_sync', 
          color: 'bg-green-100 text-green-800', 
          label: 'In Sync with MCP',
          canAutoImplement: false 
        };
      } else if (status === 'awaiting_dev') {
        return { 
          status: 'awaiting_dev', 
          color: syncData.canAutoImplement ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800',
          label: syncData.canAutoImplement ? '🚀 Auto-implement ready' : 'Awaiting Development',
          canAutoImplement: syncData.canAutoImplement,
          autoImplementReason: syncData.autoImplementReason
        };
      } else if (status === 'mcp_ahead') {
        return { 
          status: 'mcp_ahead', 
          color: 'bg-purple-100 text-purple-800', 
          label: 'MCP Ahead - Sync needed',
          canAutoImplement: false 
        };
      } else if (status === 'status_reset') {
        return { 
          status: 'status_reset', 
          color: 'bg-yellow-100 text-yellow-800', 
          label: 'Status reset needed',
          canAutoImplement: false 
        };
      }
    }

    // Fallback logic for non-grading prompts or when API data not available
    if (mcpLoading) {
      return { status: 'loading', color: 'bg-gray-100 text-gray-800', label: 'Checking sync...' };
    }

    // Check if mcpPrompts is actually an array and contains data
    if (!mcpPrompts || !Array.isArray(mcpPrompts) || mcpPrompts.length === 0) {
      // If mcpPrompts is an error object, show that
      if (mcpPrompts && typeof mcpPrompts === 'object' && 'error' in mcpPrompts) {
        return { status: 'error', color: 'bg-yellow-100 text-yellow-800', label: 'MCP Error' };
      }
      return { status: 'unknown', color: 'bg-gray-100 text-gray-800', label: 'MCP unavailable' };
    }

    // Match MCP prompt by name and category
    const mcpPrompt = mcpPrompts.find((mcp: any) => 
      mcp.name.toLowerCase().trim() === prompt.name.toLowerCase().trim() &&
      mcp.category === prompt.category
    );

    if (!mcpPrompt) {
      return { 
        status: 'missing', 
        color: 'bg-red-100 text-red-800', 
        label: prompt.category === 'grading' ? 'Missing in MCP - Check variables' : 'Missing in MCP' 
      };
    }

    // Compare normalized prompt text and variables
    const dbPromptText = normalizePromptText(prompt.promptText);
    const mcpPromptText = normalizePromptText(mcpPrompt.promptText);
    const dbVariables = normalizeVariables(prompt.variables || []);
    const mcpVariables = normalizeVariables(mcpPrompt.variables || []);

    const textMatches = dbPromptText === mcpPromptText;
    const variablesMatch = JSON.stringify(dbVariables) === JSON.stringify(mcpVariables);

    if (textMatches && variablesMatch) {
      return { status: 'in_sync', color: 'bg-green-100 text-green-800', label: 'In Sync with MCP' };
    } else {
      return { status: 'out_of_sync', color: 'bg-red-100 text-red-800', label: 'Out of Sync' };
    }
  };

  // Create prompt mutation
  const createPromptMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/ai-prompts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Success", description: "AI prompt created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create AI prompt",
        variant: "destructive"
      });
    }
  });

  // Update prompt mutation
  const updatePromptMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/ai-prompts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      setIsEditDialogOpen(false);
      setSelectedPrompt(null);
      toast({ title: "Success", description: "AI prompt updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update AI prompt",
        variant: "destructive"
      });
    }
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/ai-prompts/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      toast({ title: "Success", description: "AI prompt deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete AI prompt",
        variant: "destructive"
      });
    }
  });

  // Auto-implement prompt mutation
  const autoImplementMutation = useMutation({
    mutationFn: (promptId: number) => 
      apiRequest('/api/prompt-builder/auto-implement', {
        method: 'POST',
        body: JSON.stringify({ promptId }),
      }),
    onSuccess: (response, promptId) => {
      // Invalidate all prompt-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts", promptId] });
      queryClient.invalidateQueries({ queryKey: ["/api/mcp/prompts"] });
      
      // Invalidate ALL sync status queries to ensure refresh
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/prompt-builder/sync-status"
      });
      
      toast({ 
        title: "🚀 Auto-Implemented!", 
        description: response.message || "Prompt is now in sync with MCP server" 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Auto-Implementation Failed",
        description: error.message || "Failed to auto-implement prompt",
        variant: "destructive"
      });
    }
  });

  // Reset prompt to MCP version mutation
  const resetPromptMutation = useMutation({
    mutationFn: ({ promptId, mcpData }: { promptId: number; mcpData: any }) => 
      apiRequest(`/api/ai-prompts/${promptId}`, {
        method: "PUT",
        body: JSON.stringify({
          promptText: mcpData.promptText,
          variables: mcpData.variables || []
        }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts", variables.promptId] });
      queryClient.invalidateQueries({ queryKey: ["/api/mcp/prompts"] });
      setIsResetDialogOpen(false);
      setPromptToReset(null);
      toast({ 
        title: "Success", 
        description: "Prompt reset to MCP version successfully" 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset prompt to MCP version",
        variant: "destructive"
      });
    }
  });

  // Import prompts from MCP mutation
  const importMCPMutation = useMutation({
    mutationFn: () => apiRequest('/api/mcp/import-prompts', {
      method: 'POST',
    }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mcp/prompts"] });
      toast({ 
        title: "Import Complete", 
        description: response.message || `Imported ${response.imported?.length || 0} prompts from MCP` 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import prompts from MCP",
        variant: "destructive"
      });
    }
  });

  // Test prompt mutation
  const testPromptMutation = useMutation({
    mutationFn: (data: { promptText: string; variables: Record<string, string> }) => 
      apiRequest("/api/ai-prompts/test", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (result) => {
      toast({ 
        title: "Test Complete", 
        description: result.success ? "Prompt tested successfully" : "Test failed",
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Error",
        description: error.message || "Failed to test prompt",
        variant: "destructive"
      });
    }
  });

  // Mark as tested mutation
  const markTestedMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/ai-prompts/${id}/mark-tested`, {
      method: "POST",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      toast({ title: "Success", description: "Prompt marked as tested" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as tested",
        variant: "destructive"
      });
    }
  });

  // Request implementation mutation
  const requestImplementationMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/ai-prompts/${id}/request-implementation`, {
      method: "POST",
    }),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      toast({ 
        title: "Implementation Requested", 
        description: result.message || "Developer has been notified"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to request implementation",
        variant: "destructive"
      });
    }
  });

  // Publish prompt mutation
  const publishPromptMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/ai-prompts/${id}/publish`, {
      method: "POST",
    }),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-prompts"] });
      toast({ 
        title: "Published!", 
        description: result.message || "Prompt is now live in the system"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to publish prompt",
        variant: "destructive"
      });
    }
  });

  // Helper function to get workflow actions based on status
  const getWorkflowActions = (prompt: AiPrompt) => {
    const actions = [];
    
    switch (prompt.status) {
      case 'draft':
        actions.push({
          label: 'Mark as Tested',
          action: () => markTestedMutation.mutate(prompt.id),
          variant: 'outline' as const,
          disabled: markTestedMutation.isPending
        });
        break;
      case 'tested':
        actions.push({
          label: 'Request Implementation',
          action: () => requestImplementationMutation.mutate(prompt.id),
          variant: 'default' as const,
          disabled: requestImplementationMutation.isPending
        });
        break;
      case 'implemented':
        actions.push({
          label: 'Publish',
          action: () => publishPromptMutation.mutate(prompt.id),
          variant: 'default' as const,
          disabled: publishPromptMutation.isPending
        });
        break;
    }
    
    return actions;
  };


  // Form for create/edit
  const form = useForm({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      name: "",
      category: "general" as const,
      description: "",
      promptText: "",
      variables: [],
      exampleUsage: "",
      isActive: true
    }
  });


  // Filter prompts by category
  const filteredPrompts = categoryFilter === "all" 
    ? prompts 
    : prompts.filter((prompt: AiPrompt) => prompt.category === categoryFilter);

  // Handle edit prompt
  const handleEditPrompt = (prompt: AiPrompt) => {
    setSelectedPrompt(prompt);
    form.reset({
      name: prompt.name,
      category: prompt.category as any,
      description: prompt.description,
      promptText: prompt.promptText,
      variables: prompt.variables || [],
      exampleUsage: prompt.exampleUsage || "",
      isActive: prompt.isActive
    });
    setIsEditDialogOpen(true);
  };

  // Handle test prompt
  const handleTestPrompt = (prompt: AiPrompt) => {
    // Navigate to the test screen with prompt ID
    setLocation(`/admin/prompt-tester/${prompt.id}`);
  };

  // Handle view prompt
  const handleViewPrompt = (prompt: AiPrompt) => {
    setSelectedPrompt(prompt);
    setIsViewDialogOpen(true);
  };

  // Submit handlers
  const onCreateSubmit = (data: any) => {
    createPromptMutation.mutate(data);
  };

  const onEditSubmit = (data: any) => {
    if (selectedPrompt) {
      updatePromptMutation.mutate({ id: selectedPrompt.id, data });
    }
  };

  const onTestSubmit = (data: any) => {
    testPromptMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading AI prompts...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prompt Builder</h1>
          <p className="text-gray-600 mt-1">Manage all AI prompts used throughout the system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => importMCPMutation.mutate()}
            disabled={mcpLoading || importMCPMutation.isPending}
            data-testid="button-sync-mcp"
            title="Import new prompts from MCP server"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(mcpLoading || importMCPMutation.isPending) ? 'animate-spin' : ''}`} />
            {importMCPMutation.isPending ? 'Importing...' : 'Sync with MCP'}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => form.reset()} data-testid="button-create-prompt">
                <Plus className="w-4 h-4 mr-2" />
                Create Prompt
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New AI Prompt</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter prompt name" {...field} data-testid="input-prompt-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-prompt-category">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="grading">Grading</SelectItem>
                            <SelectItem value="feedback">Feedback</SelectItem>
                            <SelectItem value="question_generation">Question Generation</SelectItem>
                            <SelectItem value="tutorial">Tutorial</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this prompt does" 
                          {...field} 
                          rows={3}
                          data-testid="textarea-prompt-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="promptText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prompt Text</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter the AI prompt text. Use {{variable}} for dynamic values" 
                          {...field} 
                          rows={6}
                          data-testid="textarea-prompt-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Variables Management */}
                <div className="space-y-3">
                  <FormLabel>Variables</FormLabel>
                  <div className="space-y-2">
                    {form.watch("variables").map((variable, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1" data-testid={`badge-variable-${index}`}>
                          {`{{${variable}}}`}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
                            onClick={() => {
                              const currentVariables = form.getValues("variables");
                              form.setValue("variables", currentVariables.filter((_, i) => i !== index));
                            }}
                            data-testid={`button-remove-variable-${index}`}
                          >
                            <X className="h-3 w-3 text-red-500" />
                          </Button>
                        </Badge>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter variable name (e.g., 'question', 'answer')"
                        id="new-variable-input"
                        data-testid="input-variable-name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            const value = input.value.trim();
                            if (value && !form.getValues("variables").includes(value)) {
                              form.setValue("variables", [...form.getValues("variables"), value]);
                              input.value = "";
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById("new-variable-input") as HTMLInputElement;
                          const value = input?.value.trim();
                          if (value && !form.getValues("variables").includes(value)) {
                            form.setValue("variables", [...form.getValues("variables"), value]);
                            input.value = "";
                          }
                        }}
                        data-testid="button-add-variable"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Variables can be used in your prompt text as {`{{variableName}}`}. Press Enter or click Add to create a new variable.
                    </p>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="exampleUsage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Example Usage (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide an example of how this prompt is used" 
                          {...field} 
                          rows={3}
                          data-testid="textarea-prompt-example"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          data-testid="switch-prompt-active"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPromptMutation.isPending} data-testid="button-submit-create">
                    {createPromptMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Prompt"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={categoryFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setCategoryFilter("all")}
          data-testid="filter-all"
        >
          All ({prompts.length})
        </Button>
        {Object.entries(categoryConfig).map(([key, config]) => {
          const count = prompts.filter((p: AiPrompt) => p.category === key).length;
          return (
            <Button
              key={key}
              variant={categoryFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(key)}
              data-testid={`filter-${key}`}
            >
              <config.icon className="w-4 h-4 mr-1" />
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Prompts Grid */}
      <div className="grid gap-4">
        {filteredPrompts.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {categoryFilter === "all" ? "No AI prompts found" : `No prompts in ${categoryConfig[categoryFilter as keyof typeof categoryConfig]?.label} category`}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPrompts.map((prompt: AiPrompt) => {
            const config = categoryConfig[prompt.category as keyof typeof categoryConfig] || categoryConfig.general;
            return (
              <Card key={prompt.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <config.icon className="w-5 h-5 text-gray-600" />
                      <div>
                        <CardTitle className="text-lg">{prompt.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={config.color} data-testid={`badge-category-${prompt.id}`}>
                            {config.label}
                          </Badge>
                          {/* Workflow Status Badge */}
                          <Badge 
                            className={statusConfig[(prompt.status || 'draft') as keyof typeof statusConfig]?.color || statusConfig.draft.color}
                            data-testid={`badge-status-${prompt.id}`}
                          >
                            {statusConfig[(prompt.status || 'draft') as keyof typeof statusConfig]?.label || 'Draft'}
                          </Badge>
                          {/* Version Badge */}
                          <Badge variant="outline" data-testid={`badge-version-${prompt.id}`}>
                            v{prompt.version || '1.0.0'}
                          </Badge>
                          {!prompt.isActive && (
                            <Badge variant="secondary" data-testid={`badge-inactive-${prompt.id}`}>
                              <EyeOff className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPrompt(prompt)}
                        data-testid={`button-view-${prompt.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestPrompt(prompt)}
                        data-testid={`button-test-${prompt.id}`}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      {/* Dynamic Workflow Action Buttons */}
                      {getWorkflowActions(prompt).map((action, index) => {
                        // Create specific test IDs based on action labels
                        const testIdMap = {
                          'Mark as Tested': `button-mark-tested-${prompt.id}`,
                          'Request Implementation': `button-request-implementation-${prompt.id}`,
                          'Publish': `button-publish-${prompt.id}`
                        };
                        const testId = testIdMap[action.label as keyof typeof testIdMap] || `button-workflow-${prompt.id}-${index}`;
                        
                        return (
                          <Button
                            key={index}
                            variant={action.variant}
                            size="sm"
                            onClick={action.action}
                            disabled={action.disabled}
                            data-testid={testId}
                          >
                            {action.label}
                          </Button>
                        );
                      })}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPrompt(prompt)}
                        data-testid={`button-edit-${prompt.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-delete-${prompt.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete AI Prompt</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{prompt.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deletePromptMutation.mutate(prompt.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid={`button-confirm-delete-${prompt.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-3">{prompt.description}</p>
                  
                  {/* MCP Sync Status Indicator */}
                  <div className="mb-3 flex items-center gap-2">
                    {(() => {
                      const syncStatus = getSyncStatus(prompt);
                      return (
                        <>
                          <Badge className={syncStatus.color} data-testid={`sync-status-${prompt.id}`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              syncStatus.status === 'in_sync' ? 'bg-green-500' :
                              syncStatus.status === 'loading' ? 'bg-gray-500 animate-pulse' :
                              syncStatus.status === 'unknown' ? 'bg-gray-500' :
                              'bg-red-500'
                            }`}></div>
                            {syncStatus.label}
                          </Badge>
                          
                          {/* Sync with MCP Button - Always visible */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                // First, fetch the latest MCP prompt
                                await queryClient.invalidateQueries({ queryKey: ["/api/mcp/prompts"] });
                                const mcpPromptsData = await queryClient.fetchQuery({ queryKey: ["/api/mcp/prompts"] });
                                
                                // Find the MCP prompt for this database prompt
                                const mcpPrompt = getMCPPrompt(prompt);
                                
                                if (!mcpPrompt) {
                                  toast({
                                    title: "MCP version not found",
                                    description: `No MCP version available for "${prompt.name}"`,
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                // Update the database prompt to match MCP
                                await resetPromptMutation.mutateAsync({
                                  promptId: prompt.id,
                                  mcpData: mcpPrompt
                                });
                                
                                // Refresh sync status
                                const syncStatus = await apiRequest(`/api/prompt-builder/sync-status/${prompt.id}`);
                                setPromptsWithSyncStatus(prev => ({ ...prev, [prompt.id]: syncStatus }));
                                
                                toast({
                                  title: "✅ Synced with MCP",
                                  description: `"${prompt.name}" updated to match MCP version`,
                                });
                              } catch (error) {
                                console.error('Error syncing with MCP:', error);
                                toast({
                                  title: "Sync failed",
                                  description: error instanceof Error ? error.message : "Failed to sync with MCP",
                                  variant: "destructive"
                                });
                              }
                            }}
                            disabled={mcpLoading || resetPromptMutation.isPending}
                            data-testid={`button-sync-mcp-${prompt.id}`}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Sync with MCP - Update database to match MCP version"
                          >
                            <RefreshCw className={`w-3 h-3 mr-1 ${(mcpLoading || resetPromptMutation.isPending) ? 'animate-spin' : ''}`} />
                            {resetPromptMutation.isPending ? 'Syncing...' : 'Sync with MCP'}
                          </Button>
                          
                          {syncStatus.status === 'out_of_sync' && (() => {
                            const mcpPrompt = getMCPPrompt(prompt);
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPromptToReset(prompt);
                                  setIsResetDialogOpen(true);
                                }}
                                disabled={!mcpPrompt}
                                data-testid={`button-reset-mcp-${prompt.id}`}
                                className="text-orange-600 border-orange-200 hover:bg-orange-50 disabled:opacity-50"
                                title={!mcpPrompt ? "MCP version not available" : "Reset to canonical MCP version"}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reset to MCP
                              </Button>
                            );
                          })()}
                          
                          {/* Auto-Implement Button for Grading Prompts */}
                          {syncStatus.canAutoImplement && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => autoImplementMutation.mutate(prompt.id)}
                              disabled={autoImplementMutation.isPending}
                              data-testid={`button-auto-implement-${prompt.id}`}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              title={syncStatus.autoImplementReason || "Auto-implement this prompt to MCP server"}
                            >
                              {autoImplementMutation.isPending ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Auto-implementing...
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3 h-3 mr-1" />
                                  Auto-Implement
                                </>
                              )}
                            </Button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Prompt Preview</span>
                    </div>
                    <p className="text-sm text-gray-800 font-mono whitespace-pre-wrap line-clamp-3">
                      {prompt.promptText.substring(0, 200)}{prompt.promptText.length > 200 ? "..." : ""}
                    </p>
                  </div>
                  {prompt.variables && prompt.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-sm text-gray-500">Variables:</span>
                      {prompt.variables.map((variable, index) => (
                        <Badge key={index} variant="outline" className="text-xs" data-testid={`badge-variable-${prompt.id}-${index}`}>
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit AI Prompt</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              {/* Same form fields as create, but with edit functionality */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter prompt name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="grading">Grading</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                          <SelectItem value="question_generation">Question Generation</SelectItem>
                          <SelectItem value="tutorial">Tutorial</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe what this prompt does" {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="promptText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt Text</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter the AI prompt text. Use {{variable}} for dynamic values" 
                        {...field} 
                        rows={6}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="exampleUsage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Example Usage (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Provide an example of how this prompt is used" {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Variables Management - Same as Create Form */}
              <div className="space-y-3">
                <FormLabel>Variables</FormLabel>
                <div className="space-y-2">
                  {form.watch("variables").map((variable, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        {`{{${variable}}}`}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
                          onClick={() => {
                            const currentVariables = form.getValues("variables");
                            form.setValue("variables", currentVariables.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-3 w-3 text-red-500" />
                        </Button>
                      </Badge>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter variable name (e.g., 'question', 'answer')"
                      id="edit-variable-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.target as HTMLInputElement;
                          const value = input.value.trim();
                          if (value && !form.getValues("variables").includes(value)) {
                            form.setValue("variables", [...form.getValues("variables"), value]);
                            input.value = "";
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("edit-variable-input") as HTMLInputElement;
                        const value = input?.value.trim();
                        if (value && !form.getValues("variables").includes(value)) {
                          form.setValue("variables", [...form.getValues("variables"), value]);
                          input.value = "";
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Variables can be used in your prompt text as {`{{variableName}}`}. Press Enter or click Add to create a new variable.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePromptMutation.isPending}>
                  {updatePromptMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Prompt"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View AI Prompt</DialogTitle>
          </DialogHeader>
          {selectedPrompt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700">Name</h4>
                  <p className="text-gray-900">{selectedPrompt.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Category</h4>
                  <Badge className={categoryConfig[selectedPrompt.category as keyof typeof categoryConfig]?.color || categoryConfig.general.color}>
                    {categoryConfig[selectedPrompt.category as keyof typeof categoryConfig]?.label || "General"}
                  </Badge>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700">Description</h4>
                <p className="text-gray-900">{selectedPrompt.description}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-700">Prompt Text</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{selectedPrompt.promptText}</pre>
                </div>
              </div>
              {selectedPrompt.variables && selectedPrompt.variables.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700">Variables</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedPrompt.variables.map((variable, index) => (
                      <Badge key={index} variant="outline">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedPrompt.exampleUsage && (
                <div>
                  <h4 className="font-medium text-gray-700">Example Usage</h4>
                  <p className="text-gray-900">{selectedPrompt.exampleUsage}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <h4 className="font-medium text-gray-700">Status</h4>
                  <Badge variant={selectedPrompt.isActive ? "default" : "secondary"}>
                    {selectedPrompt.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Last Updated</h4>
                  <p className="text-gray-600 text-sm">
                    {new Date(selectedPrompt.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset to MCP Warning Dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Prompt to MCP Version</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to reset "{promptToReset?.name}" to match the canonical MCP version. 
                This will <strong>permanently overwrite</strong> the current prompt text and variables.
              </p>
              {promptToReset && (() => {
                const mcpPrompt = getMCPPrompt(promptToReset);
                return mcpPrompt ? (
                  <div className="bg-gray-50 p-3 rounded border">
                    <h4 className="font-medium text-sm mb-2">MCP Version Preview:</h4>
                    <p className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
                      {mcpPrompt.promptText.substring(0, 200)}
                      {mcpPrompt.promptText.length > 200 ? "..." : ""}
                    </p>
                    <div className="mt-2">
                      <span className="text-xs text-gray-600">Variables: </span>
                      {mcpPrompt.variables?.map((variable: string, index: number) => (
                        <span key={index} className="text-xs bg-gray-200 px-1 rounded mr-1">
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
              <p className="text-red-600 font-medium">
                ⚠️ This action cannot be undone. Make sure you want to proceed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (promptToReset) {
                  const mcpPrompt = getMCPPrompt(promptToReset);
                  if (mcpPrompt) {
                    resetPromptMutation.mutate({
                      promptId: promptToReset.id,
                      mcpData: mcpPrompt
                    });
                  }
                }
              }}
              disabled={resetPromptMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="button-confirm-reset-mcp"
            >
              {resetPromptMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset to MCP Version"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}