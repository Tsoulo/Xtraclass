import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Upload, UserPlus, X, Download, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StudentData {
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string;
  cellphone: string;
  parentEmail: string;
  parentPhone: string;
  school: string;
  grade: string;
}

interface ClassInfo {
  id: number;
  subject: string;
  grade: string;
  className: string;
  schoolName: string;
}

interface StudentFormProps {
  onClose: () => void;
  onSave: () => void;
  classInfo: ClassInfo;
}

export default function StudentForm({ onClose, onSave, classInfo }: StudentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("individual");
  const [students, setStudents] = useState<StudentData[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    studentInfo: any;
    pendingStudent: StudentData;
  }>({
    open: false,
    studentInfo: null,
    pendingStudent: {} as StudentData
  });
  const [currentStudent, setCurrentStudent] = useState<StudentData>({
    firstName: "",
    lastName: "",
    idNumber: "",
    email: "",
    cellphone: "",
    parentEmail: "",
    parentPhone: "",
    school: classInfo.schoolName,
    grade: classInfo.grade,
  });

  // Individual student submission mutation
  const addStudentMutation = useMutation({
    mutationFn: (studentData: StudentData[]) => {
      console.log("Sending students data to API:", { students: studentData });
      return apiRequest(`/api/classes/${classInfo.id}/students`, {
        method: 'POST',
        body: JSON.stringify({ students: studentData })
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classInfo.id.toString(), 'students'] });
      
      const successCount = result.students?.length || 0;
      const errorCount = result.errors?.length || 0;
      
      // Count new vs existing students
      const newStudents = result.students?.filter((s: any) => s.action === 'created_new') || [];
      const existingStudents = result.students?.filter((s: any) => s.action === 'added_existing') || [];
      
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: "Students added successfully",
          description: `Added ${newStudents.length} new student${newStudents.length !== 1 ? 's' : ''}${existingStudents.length > 0 ? ` and linked ${existingStudents.length} existing student${existingStudents.length !== 1 ? 's' : ''}` : ''} to the class.`
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: "Students processed with conflicts",
          description: `Added ${successCount} student${successCount !== 1 ? 's' : ''} to the class. ${errorCount} student${errorCount !== 1 ? 's were' : ' was'} skipped due to enrollment conflicts.`
        });
        // Show detailed error information
        setTimeout(() => {
          toast({
            title: "Skipped students",
            description: result.errors.slice(0, 2).join('. ') + (result.errors.length > 2 ? '...' : ''),
            variant: "destructive"
          });
        }, 500);
      } else if (errorCount > 0) {
        toast({
          title: "No students added",
          description: `All ${errorCount} student${errorCount !== 1 ? 's' : ''} could not be added due to enrollment conflicts.`,
          variant: "destructive"
        });
        // Show detailed error information
        setTimeout(() => {
          toast({
            title: "Enrollment conflicts",
            description: result.errors.slice(0, 2).join('. ') + (result.errors.length > 2 ? '...' : ''),
            variant: "destructive"
          });
        }, 500);
      }
      
      onSave();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding students",
        description: error.message || "Failed to add students to class",
        variant: "destructive"
      });
    }
  });

  // Validation mutation for immediate enrollment conflict checking
  const validateStudentMutation = useMutation({
    mutationFn: async (studentData: StudentData) => {
      return apiRequest('/api/students/validate-enrollment', {
        method: 'POST',
        body: JSON.stringify({
          idNumber: studentData.idNumber,
          subject: classInfo.subject,
          grade: classInfo.grade
        })
      });
    }
  });

  const handleAddStudent = async () => {
    if (!currentStudent.firstName || !currentStudent.lastName || !currentStudent.idNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill in the student's name and ID number.",
        variant: "destructive",
      });
      return;
    }

    // Check if student is already in the current list
    const isInCurrentList = students.some(s => s.idNumber === currentStudent.idNumber);
    if (isInCurrentList) {
      toast({
        title: "Duplicate Student",
        description: `Student with ID ${currentStudent.idNumber} is already in the list.`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Validate enrollment conflicts immediately
      const validationResult = await validateStudentMutation.mutateAsync(currentStudent);
      
      if (validationResult.hasConflict) {
        toast({
          title: "Enrollment Conflict",
          description: `Student ${currentStudent.firstName} ${currentStudent.lastName} (${currentStudent.idNumber}) is already enrolled in ${classInfo.subject} Grade ${classInfo.grade} (Class: ${validationResult.className}, Teacher: ${validationResult.teacherName})`,
          variant: "destructive",
        });
        return;
      }

      // If student exists, ask for confirmation
      if (validationResult.existingStudent) {
        setConfirmDialog({
          open: true,
          studentInfo: validationResult,
          pendingStudent: currentStudent
        });
        return;
      }

      // Generate email if not provided
      if (!currentStudent.email) {
        const email = `${currentStudent.firstName.toLowerCase()}.${currentStudent.lastName.toLowerCase()}@student.com`;
        currentStudent.email = email;
      }

      setStudents(prev => [...prev, { ...currentStudent }]);
      setCurrentStudent({
        firstName: "",
        lastName: "",
        idNumber: "",
        email: "",
        cellphone: "",
        parentEmail: "",
        parentPhone: "",
        school: classInfo.schoolName,
        grade: classInfo.grade,
      });

      toast({
        title: "Student Added",
        description: `${currentStudent.firstName} ${currentStudent.lastName} added to the list.`,
      });
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.message || "Failed to validate student enrollment",
        variant: "destructive",
      });
    }
  };

  const handleConfirmAddExisting = () => {
    const { studentInfo, pendingStudent } = confirmDialog;
    
    // Update form data with existing student info for better UX
    const nameParts = studentInfo.studentName.split(' ');
    const updatedStudent = {
      ...pendingStudent,
      firstName: nameParts[0] || pendingStudent.firstName,
      lastName: nameParts.slice(1).join(' ') || pendingStudent.lastName
    };

    // Generate email if not provided
    if (!updatedStudent.email) {
      const email = `${updatedStudent.firstName.toLowerCase()}.${updatedStudent.lastName.toLowerCase()}@student.com`;
      updatedStudent.email = email;
    }

    setStudents(prev => [...prev, updatedStudent]);
    setCurrentStudent({
      firstName: "",
      lastName: "",
      idNumber: "",
      email: "",
      cellphone: "",
      parentEmail: "",
      parentPhone: "",
      school: classInfo.schoolName,
      grade: classInfo.grade,
    });

    toast({
      title: "Existing Student Added",
      description: `${studentInfo.studentName} added to the list for enrollment.`,
    });

    setConfirmDialog({ open: false, studentInfo: null, pendingStudent: {} as StudentData });
  };

  const handleCancelAddExisting = () => {
    setConfirmDialog({ open: false, studentInfo: null, pendingStudent: {} as StudentData });
  };

  const handleRemoveStudent = (index: number) => {
    setStudents(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitStudents = () => {
    if (students.length === 0) {
      toast({
        title: "No students to add",
        description: "Please add at least one student before submitting.",
        variant: "destructive",
      });
      return;
    }

    addStudentMutation.mutate(students);
  };

  const handleCSVUpload = async () => {
    console.log("CSV upload started, file:", csvFile);
    if (!csvFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("Reading CSV file...");
      const text = await csvFile.text();
      console.log("CSV file content:", text);
      const lines = text.split('\n').filter(line => line.trim());
      console.log("CSV lines:", lines);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      console.log("CSV headers:", headers);
      
      const csvStudents = lines.slice(1).map((line, index) => {
        console.log(`Processing line ${index + 1}:`, line);
        const values = line.split(',').map(v => v.trim());
        console.log(`Values for line ${index + 1}:`, values);
        const student: any = {
          school: classInfo.schoolName,
          grade: classInfo.grade
        };
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          console.log(`Mapping header "${header}" to value "${value}"`);
          
          if (header.includes('first') || header === 'firstname') {
            student.firstName = value;
          } else if (header.includes('last') || header.includes('surname') || header === 'lastname') {
            student.lastName = value;
          } else if (header.includes('id') || header.includes('number') || header === 'idnumber') {
            student.idNumber = value;
          } else if (header.includes('parentemail') || header === 'parent_email') {
            student.parentEmail = value;
          } else if (header.includes('parentphone') || header === 'parent_phone') {
            student.parentPhone = value;
          } else if (header.includes('cell') || (header.includes('phone') && !header.includes('parent'))) {
            student.cellphone = value;
          } else if (header.includes('email') && !header.includes('parent')) {
            student.email = value;
          } else if (header.includes('parent')) {
            student.parentEmail = value;
          }
        });

        console.log(`Student object for line ${index + 1}:`, student);

        // Generate email if not provided
        if (!student.email && student.firstName && student.lastName) {
          student.email = `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}@student.com`;
        }
        
        return student;
      }).filter(s => {
        const isValid = s.firstName && s.lastName && s.idNumber;
        console.log(`Student validation - firstName: "${s.firstName}", lastName: "${s.lastName}", idNumber: "${s.idNumber}", valid: ${isValid}`);
        return isValid;
      });

      console.log("Final parsed CSV students:", csvStudents);

      if (csvStudents.length === 0) {
        toast({
          title: "Invalid CSV file",
          description: "No valid student records found. Please check your CSV format.",
          variant: "destructive",
        });
        return;
      }

      console.log("CSV students to upload:", csvStudents);
      addStudentMutation.mutate(csvStudents);
    } catch (error) {
      toast({
        title: "Error processing CSV",
        description: "Failed to process the CSV file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "firstName,lastName,idNumber,email,cellphone,parentEmail,parentPhone\nJohn,Doe,1234567890123,john.doe@student.com,+27123456789,jane.doe@parent.com,+27987654321\n";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'student_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Add Students
            </h1>
            <div className="w-10"></div>
          </div>

          <div className="text-white text-center">
            <h2 className="text-2xl font-bold text-white mb-1">{classInfo.subject}</h2>
            <p className="text-blue-100 text-sm opacity-90">
              {classInfo.grade} • {classInfo.className}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Add Students to Class</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual">Individual Entry</TabsTrigger>
                <TabsTrigger value="csv">CSV Upload</TabsTrigger>
              </TabsList>

              <TabsContent value="individual" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={currentStudent.firstName}
                      onChange={(e) => setCurrentStudent(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={currentStudent.lastName}
                      onChange={(e) => setCurrentStudent(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="idNumber">ID Number *</Label>
                    <Input
                      id="idNumber"
                      value={currentStudent.idNumber}
                      onChange={(e) => setCurrentStudent(prev => ({ ...prev, idNumber: e.target.value }))}
                      placeholder="Enter ID number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={currentStudent.email}
                      onChange={(e) => setCurrentStudent(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cellphone">Cell Phone</Label>
                    <Input
                      id="cellphone"
                      value={currentStudent.cellphone}
                      onChange={(e) => setCurrentStudent(prev => ({ ...prev, cellphone: e.target.value }))}
                      placeholder="Enter cell phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="parentEmail">Parent Email</Label>
                    <Input
                      id="parentEmail"
                      type="email"
                      value={currentStudent.parentEmail}
                      onChange={(e) => setCurrentStudent(prev => ({ ...prev, parentEmail: e.target.value }))}
                      placeholder="Enter parent email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="parentPhone">Parent Phone</Label>
                    <Input
                      id="parentPhone"
                      value={currentStudent.parentPhone}
                      onChange={(e) => setCurrentStudent(prev => ({ ...prev, parentPhone: e.target.value }))}
                      placeholder="Enter parent phone"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleAddStudent}
                  className="w-full"
                  disabled={validateStudentMutation.isPending || addStudentMutation.isPending}
                >
                  {validateStudentMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Validating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add to List
                    </>
                  )}
                </Button>

                {/* Students List */}
                {students.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Students to Add ({students.length})</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {students.map((student, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                            <p className="text-sm text-gray-600">ID: {student.idNumber} | Email: {student.email}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStudent(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button 
                      onClick={handleSubmitStudents}
                      className="w-full"
                      disabled={addStudentMutation.isPending}
                    >
                      {addStudentMutation.isPending ? "Adding Students..." : `Add ${students.length} Students to Class`}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="csv" className="space-y-6">
                <div className="text-center space-y-4">
                  <div>
                    <Button
                      variant="outline"
                      onClick={downloadTemplate}
                      className="mb-4"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV Template
                    </Button>
                  </div>
                  
                  <div>
                    <Label htmlFor="csvFile">Upload CSV File</Label>
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="mt-2"
                    />
                  </div>

                  <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
                    <ul className="text-left space-y-1">
                      <li>• Required columns: firstName, lastName, idNumber</li>
                      <li>• Optional columns: email, cellphone, parentEmail, parentPhone</li>
                      <li>• Email will be auto-generated if not provided</li>
                      <li>• School and grade will be set automatically</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={() => {
                      console.log("CSV Upload button clicked!");
                      handleCSVUpload();
                    }}
                    disabled={!csvFile || isSubmitting || addStudentMutation.isPending}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isSubmitting || addStudentMutation.isPending ? "Processing..." : "Upload Students"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog for Existing Student */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && handleCancelAddExisting()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Student Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              Student ID {confirmDialog.pendingStudent.idNumber} already exists as{' '}
              <strong>{confirmDialog.studentInfo?.studentName}</strong> 
              {confirmDialog.studentInfo && (
                <>
                  {' '}({confirmDialog.studentInfo.studentGrade}, {confirmDialog.studentInfo.studentSchool})
                </>
              )}
              .
              <br /><br />
              Do you want to add this existing student to your class instead of creating a new student account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAddExisting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAddExisting}>
              Add Existing Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}