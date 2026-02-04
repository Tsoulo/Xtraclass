import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Camera, Image, X, User, Search, Link } from "lucide-react";
import type { ChildData } from "@/lib/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChildFormProps {
  onClose: () => void;
  onSave: (child: ChildData) => void;
  parentId?: number;
}



const grades = [
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

interface ExistingStudent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  gradeLevel: string;
}

export default function ChildForm({ onClose, onSave, parentId }: ChildFormProps) {
  const [formData, setFormData] = useState<ChildData>({
    firstName: '',
    lastName: '',
    idNumber: '',
    grade: '',
    school: '',
  });
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [existingStudent, setExistingStudent] = useState<ExistingStudent | null>(null);
  const [showExistingOptions, setShowExistingOptions] = useState(false);
  const [isCheckingStudent, setIsCheckingStudent] = useState(false);
  const [isAlreadyLinked, setIsAlreadyLinked] = useState(false);
  const { toast } = useToast();

  // Fetch schools from the database
  const { data: schools = [], isLoading: schoolsLoading } = useQuery({
    queryKey: ['/api/schools/public'],
    queryFn: () => apiRequest('/api/schools/public')
  });

  const createChildMutation = useMutation({
    mutationFn: async (childData: any) => 
      apiRequest("/api/children", {
        method: "POST",
        body: JSON.stringify(childData)
      }),
    onSuccess: (data) => {
      toast({
        title: "Child added successfully!",
        description: `${data.firstName} has been added to your account.`,
      });
      onSave(data);
    },
    onError: (error: any) => {
      // Handle conflict when student already exists
      if (error.message?.includes("409:") && error.message?.includes("existing_student")) {
        try {
          const errorData = JSON.parse(error.message.split("409: ")[1]);
          setExistingStudent(errorData.studentDetails);
          setShowExistingOptions(true);
          toast({
            title: "Student already exists",
            description: `${errorData.studentDetails.firstName} ${errorData.studentDetails.lastName} is already registered. You can link this existing student instead.`,
            variant: "destructive",
          });
        } catch (parseError) {
          toast({
            title: "Error adding child",
            description: "A student with this ID number already exists. Please check for existing students first.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error adding child",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      }
    },
  });

  const checkStudentMutation = useMutation({
    mutationFn: async (idNumber: string) =>
      apiRequest("/api/children/check", {
        method: "POST",
        body: JSON.stringify({ idNumber })
      }),
    onSuccess: (data) => {
      if (data.exists) {
        setExistingStudent(data.student);
        setShowExistingOptions(true);
        
        // Check if already linked
        setIsAlreadyLinked(data.alreadyLinked || false);
        if (data.alreadyLinked) {
          toast({
            title: "Child already linked",
            description: `${data.student.firstName} ${data.student.lastName} is already linked to your account.`,
            variant: "destructive",
          });
        }
      } else {
        setShowExistingOptions(false);
        setExistingStudent(null);
        toast({
          title: "No existing student found",
          description: "Please continue with new child registration.",
        });
      }
      setIsCheckingStudent(false);
    },
    onError: (error: any) => {
      setIsCheckingStudent(false);
      toast({
        title: "Error checking student",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const linkChildMutation = useMutation({
    mutationFn: async (studentIdNumber: string) =>
      apiRequest("/api/children/link", {
        method: "POST",
        body: JSON.stringify({ studentIdNumber })
      }),
    onSuccess: (data) => {
      toast({
        title: "Child linked successfully!",
        description: `${data.firstName} has been linked to your account.`,
      });
      onSave(data);
    },
    onError: (error: any) => {
      // Handle conflict when child is already linked
      if (error.message?.includes("409:") && error.message?.includes("already_linked")) {
        toast({
          title: "Child already linked",
          description: "This child is already linked to your account. Check your children list.",
          variant: "destructive",
        });
        // Close the form since there's nothing more to do
        onClose();
      } else {
        toast({
          title: "Error linking child",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if this child already exists before creating a new one
    if (formData.idNumber.trim() && !showExistingOptions) {
      setIsCheckingStudent(true);
      checkStudentMutation.mutate(formData.idNumber, {
        onSuccess: (data) => {
          if (data.exists) {
            // Student exists - show options to link or continue as new
            setExistingStudent(data.student);
            setShowExistingOptions(true);
            toast({
              title: "Child Already Exists",
              description: `A student with ID ${formData.idNumber} already exists. You can link them to your account or continue adding as a new child.`,
              variant: "destructive",
            });
          } else {
            // Student doesn't exist - create new child
            createChildMutation.mutate(formData);
          }
          setIsCheckingStudent(false);
        },
        onError: () => {
          // If check fails, still try to create and let server-side validation handle it
          setIsCheckingStudent(false);
          createChildMutation.mutate(formData);
        }
      });
    } else {
      // No ID number provided or already showing existing options
      createChildMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: keyof ChildData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset existing student state when ID number changes
    if (field === 'idNumber') {
      setExistingStudent(null);
      setShowExistingOptions(false);
      setIsAlreadyLinked(false);
    }
  };

  const handleCheckStudent = () => {
    if (!formData.idNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an ID number first",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingStudent(true);
    checkStudentMutation.mutate(formData.idNumber);
  };

  const handleLinkStudent = () => {
    if (existingStudent) {
      linkChildMutation.mutate(formData.idNumber);
    }
  };



  const handlePhotoMenuOpen = () => {
    setShowPhotoMenu(true);
  };

  const handlePhotoMenuClose = () => {
    setShowPhotoMenu(false);
  };

  const handleCameraCapture = () => {
    // In a real implementation, this would open the device camera
    console.log("Opening camera for photo capture");
    setShowPhotoMenu(false);
  };

  const handleGallerySelect = () => {
    // In a real implementation, this would open the photo gallery
    console.log("Opening gallery for photo selection");
    setShowPhotoMenu(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-primary p-6 rounded-t-3xl">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h2 className="text-xl font-bold text-white">Add Child</h2>
            <div className="w-6" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Personal Information Section */}
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 ml-1">First Name</label>
                  <Input
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="rounded-2xl border-2 border-gray-200 focus:border-primary/50 focus:ring-primary/20 bg-gray-50/50 backdrop-blur-sm h-11 px-4 transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 ml-1">Last Name</label>
                  <Input
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="rounded-2xl border-2 border-gray-200 focus:border-primary/50 focus:ring-primary/20 bg-gray-50/50 backdrop-blur-sm h-11 px-4 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 ml-1">ID Number (Optional)</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter 13-digit ID number"
                    value={formData.idNumber || ''}
                    onChange={(e) => handleInputChange('idNumber', e.target.value)}
                    className="rounded-2xl border-2 border-gray-200 focus:border-primary/50 focus:ring-primary/20 bg-gray-50/50 backdrop-blur-sm h-11 px-4 transition-all duration-200 flex-1"
                    maxLength={13}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCheckStudent}
                    disabled={isCheckingStudent || !formData.idNumber?.trim()}
                    className="rounded-2xl h-11 px-4"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isCheckingStudent ? "Checking..." : "Check"}
                  </Button>
                </div>
              </div>

              {/* Existing Student Options */}
              {showExistingOptions && existingStudent && (
                <Alert className="bg-blue-50 border-blue-200">
                  <User className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <div>
                        <strong>Student Found!</strong> We found an existing student with this ID:
                        {isAlreadyLinked && (
                          <div className="mt-2 text-orange-600 font-medium">
                            ⚠️ This student is already linked to your account.
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><strong>Name:</strong> {existingStudent.firstName} {existingStudent.lastName}</p>
                        <p><strong>School:</strong> {existingStudent.schoolName}</p>
                        <p><strong>Grade:</strong> {existingStudent.gradeLevel}</p>
                        <p><strong>Email:</strong> {existingStudent.email}</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleLinkStudent}
                          disabled={linkChildMutation.isPending || isAlreadyLinked}
                          className={isAlreadyLinked ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
                        >
                          <Link className="h-3 w-3 mr-1" />
                          {isAlreadyLinked ? "Already Linked" : linkChildMutation.isPending ? "Linking..." : "Link This Student"}
                        </Button>

                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Academic Information Section */}
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Academic Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 ml-1">Grade Level</label>
                  <Select onValueChange={(value) => handleInputChange('grade', value)}>
                    <SelectTrigger className="rounded-2xl border-2 border-gray-200 focus:border-primary/50 bg-gray-50/50 backdrop-blur-sm h-11 px-4 transition-all duration-200">
                      <SelectValue placeholder="Select grade level" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {grades.map((grade) => (
                        <SelectItem key={grade} value={grade} className="rounded-lg">
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 ml-1">School Name</label>
                  <Select onValueChange={(value) => handleInputChange('school', value)} value={formData.school}>
                    <SelectTrigger className="rounded-2xl border-2 border-gray-200 focus:border-primary/50 bg-gray-50/50 backdrop-blur-sm h-11 px-4 transition-all duration-200">
                      <SelectValue placeholder={schoolsLoading ? "Loading schools..." : "Select school"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      {schoolsLoading ? (
                        <SelectItem value="loading" disabled className="rounded-lg">
                          Loading schools...
                        </SelectItem>
                      ) : schools.length > 0 ? (
                        schools.map((school: any) => (
                          <SelectItem key={school.id} value={school.name} className="rounded-lg">
                            {school.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-schools" disabled className="rounded-lg">
                          No schools available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Profile Photo Section */}
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Photo</h3>
              <div className="text-center">
                <div className="relative group inline-block">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-100 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 ring-4 ring-white">
                    <Camera className="w-12 h-12 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-8 w-6 h-6 bg-primary/20 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-1 -left-8 w-4 h-4 bg-cyan-200 rounded-full animate-pulse delay-300"></div>
                </div>
                
              </div>
            </div>
          </div>

          {/* Fixed Save Button */}
          <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
            <Button
              type="submit"
              disabled={createChildMutation.isPending || isCheckingStudent}
              className="w-full bg-gradient-to-r from-primary via-primary-dark to-cyan-600 hover:from-primary-dark hover:via-cyan-600 hover:to-primary text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 border-2 border-white/20 backdrop-blur-sm h-12 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
              <span className="text-base">
                {isCheckingStudent ? "Checking..." : createChildMutation.isPending ? "Saving..." : "Save Child Profile"}
              </span>
            </Button>
          </div>
        </form>

        {/* Photo Selection Menu */}
        {showPhotoMenu && (
          <div className="absolute inset-0 bg-black/50 flex items-end z-10">
            <div className="bg-white rounded-t-3xl w-full p-6 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800 text-center">Add Photo</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePhotoMenuClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleCameraCapture}
                  className="flex flex-col items-center p-6 bg-gradient-to-br from-primary/10 to-primary/20 hover:from-primary/20 hover:to-primary/30 text-primary hover:text-primary-dark border-2 border-primary/20 hover:border-primary/40 rounded-2xl transition-all duration-200"
                  variant="outline"
                >
                  <Camera className="w-8 h-8 mb-3" />
                  <span className="font-semibold">Take Photo</span>
                </Button>
                
                <Button
                  onClick={handleGallerySelect}
                  className="flex flex-col items-center p-6 bg-gradient-to-br from-cyan-50 to-cyan-100 hover:from-cyan-100 hover:to-cyan-200 text-cyan-700 hover:text-cyan-800 border-2 border-cyan-200 hover:border-cyan-300 rounded-2xl transition-all duration-200"
                  variant="outline"
                >
                  <Image className="w-8 h-8 mb-3" />
                  <span className="font-semibold">Choose Photo</span>
                </Button>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                <Button
                  onClick={handlePhotoMenuClose}
                  variant="ghost"
                  className="w-full text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
