import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";

// Temporary schema definition until package imports work
const insertClassSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().optional(),
});
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCreateClass, useUpdateClass } from "@/hooks/useClasses";
import type { Class } from "@shared/schema";

const classFormSchema = insertClassSchema.omit({
  teacherId: true,
  classCode: true,
});

type ClassFormData = z.infer<typeof classFormSchema>;

interface ClassFormProps {
  existingClass?: Class;
  onSuccess?: () => void;
  onCancel?: () => void;
  hideHeader?: boolean; // Add option to hide header when used in dialogs
}

const grades = [
  { value: "8", label: "Grade 8" },
  { value: "9", label: "Grade 9" },
  { value: "10", label: "Grade 10" },
  { value: "11", label: "Grade 11" },
  { value: "12", label: "Grade 12" },
];

const subjects = [
  { value: "mathematics", label: "Mathematics" },
  { value: "mathematical-literacy", label: "Mathematical Literacy" },
  { value: "physical-science", label: "Physical Science" },
];

export default function ClassForm({ existingClass, onSuccess, onCancel, hideHeader }: ClassFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: existingClass?.name || "",
      description: existingClass?.description || "",
      grade: existingClass?.grade || "",
      subject: existingClass?.subject || "",
      maxStudents: existingClass?.maxStudents || 30,
      isActive: existingClass?.isActive ?? true,
    },
  });

  const onSubmit = async (data: ClassFormData) => {
    setIsSubmitting(true);
    try {
      if (existingClass) {
        await updateClass.mutateAsync({ id: existingClass.id, updates: data });
      } else {
        await createClass.mutateAsync(data);
      }
      form.reset(); // Reset form after successful submission
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting class form:", error);
      // The error toast will be shown by the mutation hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div>
          <h3 className="text-lg font-medium">
            {existingClass ? "Edit Class" : "Create New Class"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {existingClass 
              ? "Update the class details below." 
              : "Fill in the details to create a new class for your students."
            }
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Advanced Mathematics 11A" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Brief description of the class content and objectives..."
                    rows={3}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.value} value={grade.value}>
                          {grade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.value} value={subject.value}>
                          {subject.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="maxStudents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Students</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    max="100"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-3 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isSubmitting || createClass.isPending || updateClass.isPending}
            >
              {isSubmitting ? "Saving..." : existingClass ? "Update Class" : "Create Class"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}