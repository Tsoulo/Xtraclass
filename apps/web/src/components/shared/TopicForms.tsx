import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Topic, Theme } from "@shared/schema";

interface TopicFormProps {
  topic?: Topic | null;
  onSave: (data: { name: string; description: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TopicForm({ topic, onSave, onCancel, isLoading = false }: TopicFormProps) {
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
          disabled={isLoading}
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
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : topic ? 'Update' : 'Add'} Topic
        </Button>
      </div>
    </form>
  );
}

interface ThemeFormProps {
  theme?: Theme | null;
  onSave: (data: { name: string; description: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ThemeForm({ theme, onSave, onCancel, isLoading = false }: ThemeFormProps) {
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
        <Label htmlFor="themeName">Theme Name</Label>
        <Input
          id="themeName"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter theme name"
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="themeDescription">Description</Label>
        <Textarea
          id="themeDescription"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter theme description"
          rows={3}
          required
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : theme ? 'Update' : 'Add'} Theme
        </Button>
      </div>
    </form>
  );
}