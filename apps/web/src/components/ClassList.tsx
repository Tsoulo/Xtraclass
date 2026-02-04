import { useState } from "react";
import { useLocation } from "wouter";
import { useClasses, useDeleteClass } from "@/hooks/useClasses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, Trash2, Users, BookOpen, Calendar, Copy } from "lucide-react";
import ClassForm from "./ClassForm";
import type { Class } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const subjectDisplayNames: Record<string, string> = {
  mathematics: "Mathematics",
  english: "English",
  physical_sciences: "Physical Sciences",
  life_sciences: "Life Sciences",
  history: "History",
  geography: "Geography",
  accounting: "Accounting",
  business_studies: "Business Studies",
};

export default function ClassList() {
  const { data: classes, isLoading, error } = useClasses();
  const deleteClass = useDeleteClass();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleDeleteClass = async (classId: number) => {
    try {
      await deleteClass.mutateAsync(classId);
    } catch (error) {
      console.error("Error deleting class:", error);
    }
  };

  const copyClassCode = (classCode: string) => {
    navigator.clipboard.writeText(classCode);
    toast({
      title: "Class code copied",
      description: "Students can use this code to join your class",
    });
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingClass(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
          <p className="text-muted-foreground text-center">
            {errorMessage.includes('Teacher profile not found') 
              ? 'No teacher profile found. Please contact an administrator to set up your teacher account.'
              : errorMessage.includes('Only teachers can access classes')
              ? 'Class management is only available for teacher accounts.'
              : `Failed to load classes: ${errorMessage}`
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-8 w-8 text-white/70" />
        </div>
        <h3 className="text-lg font-medium mb-2 text-white">No classes yet</h3>
        <p className="text-white/70">Create your first class to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((classItem) => (
          <Card key={classItem.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{classItem.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {classItem.description || "No description provided"}
                  </CardDescription>
                </div>
                <Badge variant={classItem.isActive ? "default" : "secondary"}>
                  {classItem.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Grade {classItem.grade}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{subjectDisplayNames[classItem.subject] || classItem.subject}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Max: {classItem.maxStudents}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyClassCode(classItem.classCode)}
                  className="flex items-center space-x-1"
                >
                  <Copy className="h-3 w-3" />
                  <span className="font-mono text-xs">{classItem.classCode}</span>
                </Button>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/student-management/${classItem.id}`)}
                  className="flex items-center space-x-1"
                >
                  <Users className="h-3 w-3" />
                  <span>Students</span>
                </Button>

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingClass(classItem)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Class</DialogTitle>
                      <DialogDescription>
                        Update the class details below.
                      </DialogDescription>
                    </DialogHeader>
                    {editingClass && (
                      <ClassForm
                        existingClass={editingClass}
                        onSuccess={handleEditSuccess}
                        onCancel={() => setIsEditDialogOpen(false)}
                        hideHeader={true}
                      />
                    )}
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Class</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{classItem.name}"? This action cannot be undone
                        and will remove all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteClass(classItem.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Class
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}