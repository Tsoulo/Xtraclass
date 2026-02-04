import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Eye, EyeOff, User, Search, Check, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { buildApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { RegistrationData, UserRole } from "@/lib/types";
import type { School } from "@shared/schema";
import logoImage from "@assets/xtraclass-logo-td.png";
import { useAuth } from "@/contexts/AuthContext";
import StudentPasswordSetup from "@/components/StudentPasswordSetup";

export default function RegistrationForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  
  const params = new URLSearchParams(window.location.search);
  const role = (params.get('role') || 'parent') as UserRole;

  const [formData, setFormData] = useState<RegistrationData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    cellNumber: '',
    role,
    avatar: '', // Add avatar field
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [existingStudent, setExistingStudent] = useState<any>(null);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [isCheckingStudent, setIsCheckingStudent] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  
  // Validation states
  const [studentIdError, setStudentIdError] = useState<string>('');
  const [usernameError, setUsernameError] = useState<string>('');
  const [usernameValid, setUsernameValid] = useState<boolean>(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [persalIdError, setPersalIdError] = useState<string>('');
  const [persalIdValid, setPersalIdValid] = useState<boolean>(false);
  const [isCheckingPersalId, setIsCheckingPersalId] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    message: string;
    color: string;
  }>({ score: 0, message: '', color: '' });

  // Clear any existing auth state when registration form loads
  useEffect(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }, []);

  // Fetch schools for student and teacher registration (public endpoint)
  const { data: schools = [], isLoading: schoolsLoading, error: schoolsError } = useQuery({
    queryKey: ['schools-public'],
    queryFn: async () => {
      // Use public schools endpoint that doesn't require authentication
      const response = await fetch(buildApiUrl('/api/schools/public'));
      if (!response.ok) {
        throw new Error('Failed to fetch schools');
      }
      return response.json();
    },
    enabled: role === 'student' || role === 'teacher', // Fetch for both students and teachers
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });




  const checkStudentMutation = useMutation({
    mutationFn: async (idNumber: string) =>
      apiRequest("/api/students/check", {
        method: "POST",
        body: JSON.stringify({ idNumber })
      }),
    onSuccess: (data) => {
      if (data.exists) {
        setExistingStudent(data.student);
        setShowPasswordSetup(true);
      } else {
        // No existing student found, proceed with new registration
        setExistingStudent(null);
        toast({
          title: "No existing account found",
          description: "Creating new account...",
        });
        
        // Clear any existing auth state before creating new account
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        // Proceed with new registration
        const { confirmPassword, ...submitData } = formData;
        // Add subjects for student registration
        if (role === 'student') {
          submitData.subjects = selectedSubjects;
          console.log("🔍 Frontend Registration Debug (from student check):", {
            selectedSubjects,
            submitDataSubjects: submitData.subjects,
            fullSubmitData: submitData
          });
        }
        registerMutation.mutate(submitData);
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

  const registerMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: async (data) => {
      try {
        // Clear any existing auth state before logging in with new credentials
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        // Small delay to ensure localStorage is cleared
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Automatically log in the user after successful registration
        await login(formData.email, formData.password);
        
        toast({
          title: "Registration successful!",
          description: "Welcome! You've been automatically logged in.",
        });
        
        // Redirect based on role
        if (role === 'parent') {
          setLocation('/register/add-children');
        } else {
          setLocation('/dashboard');
        }
      } catch (loginError) {
        // If auto-login fails, show success but redirect to signin
        toast({
          title: "Registration successful!",
          description: "Please sign in with your new account.",
        });
        setLocation('/signin');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({
        title: "Terms agreement required",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    // For students, validate that at least one subject is selected
    if (role === 'student' && selectedSubjects.length === 0) {
      toast({
        title: "Subject selection required",
        description: "Please select at least one subject",
        variant: "destructive",
      });
      return;
    }

    // For students, check if they already exist before creating new account
    if (role === 'student' && formData.studentId?.trim()) {
      setIsCheckingStudent(true);
      checkStudentMutation.mutate(formData.studentId);
      return;
    }

    const { confirmPassword, ...submitData } = formData;
    // Add subjects for student registration
    if (role === 'student') {
      submitData.subjects = selectedSubjects;
      console.log("🔍 Frontend Registration Debug:", {
        selectedSubjects,
        submitDataSubjects: submitData.subjects,
        fullSubmitData: submitData
      });
    }
    registerMutation.mutate(submitData);
  };

  const handleBack = () => {
    // Navigate back to role selection page
    setLocation('/register');
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.cellNumber) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      
      // Role-specific validation for step 1
      if (role === 'parent' && formData.parentId && formData.parentId.length !== 13) {
        toast({
          title: "Invalid ID",
          description: "Parent ID must be exactly 13 digits",
          variant: "destructive",
        });
        return;
      }
      
      if (role === 'teacher' && (!formData.registrationNumber || formData.registrationNumber.length !== 9 || !persalIdValid)) {
        toast({
          title: "Invalid Persal ID",
          description: "Please enter a valid 9-digit Persal ID",
          variant: "destructive",
        });
        return;
      }
      
      if (role === 'student' && (!formData.studentId || formData.studentId.length !== 13)) {
        toast({
          title: "Invalid Student ID",
          description: "Student ID must be exactly 13 digits",
          variant: "destructive",
        });
        return;
      }
      
      // Parents skip step 2 and go directly to step 3
      if (role === 'parent') {
        setCurrentStep(3);
        return;
      }
    }
    
    if (currentStep === 2) {
      // Validate step 2 based on role
      if (role === 'student') {
        if (!formData.gradeLevel || !formData.schoolName || selectedSubjects.length === 0 || !formData.parentContact) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields",
            variant: "destructive",
          });
          return;
        }
      }
      
      if (role === 'teacher') {
        if (!formData.schoolAffiliation || !formData.schoolName) {
          toast({
            title: "Missing Information",
            description: "Please select your province and school",
            variant: "destructive",
          });
          return;
        }
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const previousStep = () => {
    // Parents skip step 2, so go back from step 3 to step 1
    if (currentStep === 3 && role === 'parent') {
      setCurrentStep(1);
      return;
    }
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleInputChange = (field: keyof RegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset existing student state when student ID changes
    if (field === 'studentId') {
      setExistingStudent(null);
      setShowPasswordSetup(false);
    }
    
    // Clear invalid subjects when grade level changes
    if (field === 'gradeLevel') {
      const isGrade8or9 = value === '8' || value === '9';
      if (isGrade8or9) {
        // Remove math literacy and physical science for grades 8-9
        setSelectedSubjects(prev => prev.filter(subject => 
          subject !== 'mathematical-literacy' && subject !== 'physical-science'
        ));
      }
    }
  };

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subject)) {
        // Deselect the subject
        return prev.filter(s => s !== subject);
      } else {
        // Select the subject
        let newSubjects = [...prev, subject];
        
        // Enforce mutual exclusivity: Mathematics and Mathematical Literacy cannot both be selected
        if (subject === 'mathematics') {
          // Remove Mathematical Literacy if Mathematics is selected
          newSubjects = newSubjects.filter(s => s !== 'mathematical-literacy');
        } else if (subject === 'mathematical-literacy') {
          // Remove Mathematics if Mathematical Literacy is selected
          newSubjects = newSubjects.filter(s => s !== 'mathematics');
        }
        
        return newSubjects;
      }
    });
  };

  // Password strength validation
  const validatePasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength({ score: 0, message: '', color: '' });
      return;
    }

    let score = 0;
    let feedback: string[] = [];

    // Length check
    if (password.length >= 8) score++;
    else feedback.push('at least 8 characters');

    // Uppercase check
    if (/[A-Z]/.test(password)) score++;
    else feedback.push('uppercase letter');

    // Lowercase check
    if (/[a-z]/.test(password)) score++;
    else feedback.push('lowercase letter');

    // Number check
    if (/[0-9]/.test(password)) score++;
    else feedback.push('number');

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    else feedback.push('special character');

    let message = '';
    let color = '';

    if (score === 5) {
      message = 'Strong password!';
      color = 'text-green-600';
    } else if (score >= 3) {
      message = 'Good password. Add: ' + feedback.join(', ');
      color = 'text-yellow-600';
    } else {
      message = 'Weak. Needs: ' + feedback.join(', ');
      color = 'text-red-600';
    }

    setPasswordStrength({ score, message, color });
  };

  // Student ID validation
  const validateStudentId = (id: string) => {
    if (!id) {
      setStudentIdError('');
      return;
    }

    if (!/^\d+$/.test(id)) {
      setStudentIdError('Student ID must contain only numbers');
      return;
    }

    if (id.length !== 13) {
      setStudentIdError(`Student ID must be exactly 13 digits (${id.length}/13)`);
      return;
    }

    setStudentIdError('');
  };

  // Username validation with debounce
  useEffect(() => {
    const checkUsername = async () => {
      const username = formData.username?.trim();
      
      if (!username) {
        setUsernameError('');
        setUsernameValid(false);
        return;
      }

      if (username.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        setUsernameValid(false);
        return;
      }

      if (username.length > 20) {
        setUsernameError('Username must be 20 characters or less');
        setUsernameValid(false);
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameError('Username can only contain letters, numbers, and underscores');
        setUsernameValid(false);
        return;
      }

      // Check if username exists
      setIsCheckingUsername(true);
      try {
        const response = await fetch(buildApiUrl(`/api/users/check-username?username=${encodeURIComponent(username)}`));
        const data = await response.json();
        
        if (data.exists) {
          setUsernameError('This username is already taken');
          setUsernameValid(false);
        } else {
          setUsernameError('');
          setUsernameValid(true);
        }
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timer = setTimeout(checkUsername, 500); // Debounce for 500ms
    return () => clearTimeout(timer);
  }, [formData.username]);

  // Validate password strength when password changes
  useEffect(() => {
    validatePasswordStrength(formData.password);
  }, [formData.password]);

  // Validate student ID when it changes
  useEffect(() => {
    if (role === 'student') {
      validateStudentId(formData.studentId || '');
    }
  }, [formData.studentId, role]);

  // Persal ID validation with debounce
  useEffect(() => {
    const checkPersalId = async () => {
      const persalId = formData.registrationNumber?.trim();
      
      if (!persalId) {
        setPersalIdError('');
        setPersalIdValid(false);
        return;
      }

      if (!/^\d+$/.test(persalId)) {
        setPersalIdError('Persal ID must contain only numbers');
        setPersalIdValid(false);
        return;
      }

      if (persalId.length !== 9) {
        setPersalIdError(`Persal ID must be exactly 9 digits (${persalId.length}/9)`);
        setPersalIdValid(false);
        return;
      }

      // Check if Persal ID exists
      setIsCheckingPersalId(true);
      try {
        const response = await fetch(buildApiUrl(`/api/teachers/check-persal?persalId=${encodeURIComponent(persalId)}`));
        const data = await response.json();
        
        if (data.exists) {
          setPersalIdError('This Persal ID is already registered');
          setPersalIdValid(false);
        } else {
          setPersalIdError('');
          setPersalIdValid(true);
        }
      } catch (error) {
        console.error('Error checking Persal ID:', error);
      } finally {
        setIsCheckingPersalId(false);
      }
    };

    const timer = setTimeout(checkPersalId, 500); // Debounce for 500ms
    return () => clearTimeout(timer);
  }, [formData.registrationNumber, role]);

  const handlePasswordSetupSuccess = () => {
    setShowPasswordSetup(false);
    setLocation('/signin');
    toast({
      title: "Password set successfully!",
      description: "Please sign in with your student ID and new password.",
    });
  };

  const handlePasswordSetupBack = () => {
    setShowPasswordSetup(false);
    setExistingStudent(null);
  };

  // Show password setup for existing students
  if (showPasswordSetup && existingStudent) {
    return (
      <StudentPasswordSetup
        student={existingStudent}
        idNumber={formData.studentId || ''}
        onSuccess={handlePasswordSetupSuccess}
        onBack={handlePasswordSetupBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="gamified-bg relative z-10 px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-white hover:bg-white/20 z-10 relative"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="w-20 h-10 flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="XtraClass.ai Logo" 
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>
          <div className="w-6" />
        </div>

        <div className="text-center text-white">
          <h1 className="text-xl font-bold mb-0">Register</h1>
          <p className="text-xs opacity-90">Create your new account</p>
        </div>
      </div>

      {/* Form Container */}
      <div className="flex-1 px-4 pt-4 pb-4">
        <div className="bg-white rounded-2xl p-4 shadow-lg max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Progress Indicator */}
            <div className="flex justify-center mb-4">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-500'
                }`}>
                  1
                </div>
                <div className={`w-8 h-0.5 transition-all ${
                  currentStep >= 2 ? 'bg-primary' : 'bg-gray-300'
                }`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-500'
                }`}>
                  2
                </div>
                <div className={`w-8 h-0.5 transition-all ${
                  currentStep >= 3 ? 'bg-primary' : 'bg-gray-300'
                }`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep >= 3 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-500'
                }`}>
                  3
                </div>
              </div>
            </div>

            {/* Step Title */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentStep === 1 && 'Basic Information'}
                {currentStep === 2 && (role === 'student' ? 'Student Details' : role === 'teacher' ? 'Teacher Details' : 'Additional Details')}
                {currentStep === 3 && 'Create Password'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Step {currentStep} of 3
              </p>
            </div>

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="rounded-xl h-10"
                  required
                />
                <Input
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="rounded-xl h-10"
                  required
                />
              </div>

              <Input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="rounded-xl h-10"
                required
              />

              <div className="space-y-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">
                    +27
                  </span>
                  <Input
                    type="tel"
                    placeholder="Cell Number"
                    value={formData.cellNumber}
                    onChange={(e) => {
                      // Remove any non-digit characters and limit to 9 digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                      handleInputChange('cellNumber', value);
                    }}
                    className="rounded-xl h-10 pl-12"
                    maxLength={9}
                  />
                </div>
                {formData.cellNumber && (
                  <p className="text-xs text-gray-500">
                    Full number: +27{formData.cellNumber}
                  </p>
                )}
              </div>

              {/* Parent-specific fields */}
              {role === 'parent' && (
                <Input
                  type="text"
                  placeholder="Parent ID Number (13 digits)"
                  value={formData.parentId || ''}
                  onChange={(e) => handleInputChange('parentId', e.target.value)}
                  className="rounded-xl h-10"
                  maxLength={13}
                />
              )}

              {/* Teacher-specific fields - Persal ID */}
              {role === 'teacher' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Persal ID (9 digits)"
                      value={formData.registrationNumber || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                        handleInputChange('registrationNumber', value);
                      }}
                      className={`rounded-xl h-10 pr-10 ${
                        persalIdError ? 'border-red-500' : 
                        persalIdValid ? 'border-green-500' : ''
                      }`}
                      maxLength={9}
                    />
                    {isCheckingPersalId && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {!isCheckingPersalId && persalIdValid && (
                      <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                    {!isCheckingPersalId && persalIdError && formData.registrationNumber && (
                      <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500" />
                    )}
                  </div>
                  {persalIdError && formData.registrationNumber ? (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {persalIdError}
                    </p>
                  ) : persalIdValid ? (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Valid Persal ID for South African teachers
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Enter your 9-digit Persal ID number
                    </p>
                  )}
                </div>
              )}

              {/* Student-specific fields - Student ID */}
              {role === 'student' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Student ID Number (13 digits)"
                      value={formData.studentId || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                        handleInputChange('studentId', value);
                      }}
                      className={`rounded-xl h-10 pr-10 ${
                        studentIdError ? 'border-red-500' : 
                        formData.studentId && formData.studentId.length === 13 ? 'border-green-500' : ''
                      }`}
                      maxLength={13}
                    />
                    {formData.studentId && formData.studentId.length === 13 && !studentIdError && (
                      <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                    {studentIdError && (
                      <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500" />
                    )}
                  </div>
                  {studentIdError ? (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {studentIdError}
                    </p>
                  ) : formData.studentId && formData.studentId.length === 13 ? (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Valid student ID
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      We'll check if you already have an account when you sign up
                    </p>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Step 2: Role-specific Details */}
            {currentStep === 2 && (
            <div className="space-y-3">
              {/* Teacher Details */}
              {role === 'teacher' && (
                <div className="space-y-3">
                  <select
                    value={formData.schoolAffiliation || ''}
                    onChange={(e) => handleInputChange('schoolAffiliation', e.target.value)}
                    className="rounded-xl h-10 px-3 border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer w-full"
                    required
                  >
                    <option value="">Select Province</option>
                    <option value="Eastern Cape">Eastern Cape</option>
                    <option value="Free State">Free State</option>
                    <option value="Gauteng">Gauteng</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                    <option value="Limpopo">Limpopo</option>
                    <option value="Mpumalanga">Mpumalanga</option>
                    <option value="Northern Cape">Northern Cape</option>
                    <option value="North West">North West</option>
                    <option value="Western Cape">Western Cape</option>
                  </select>

                  <select
                    value={formData.schoolName || ''}
                    onChange={(e) => handleInputChange('schoolName', e.target.value)}
                    className="rounded-xl h-10 px-3 border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer w-full"
                    required
                  >
                    <option value="">
                      {schoolsLoading ? 'Loading schools...' : 'Select School'}
                    </option>
                    {schools && schools.length > 0 ? (
                      schools
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                        .map((school: any) => (
                          <option key={school.id} value={school.name}>
                            {school.name}
                          </option>
                        ))
                    ) : (
                      !schoolsLoading && (
                        <option value="" disabled>
                          No schools available
                        </option>
                      )
                    )}
                  </select>

                  <Input
                    type="text"
                    placeholder="Town"
                    value={formData.subjectSpecialization || ''}
                    onChange={(e) => handleInputChange('subjectSpecialization', e.target.value)}
                    className="rounded-xl h-10"
                  />
                </div>
              )}

              {/* Student Details */}
              {role === 'student' && (
                <div className="space-y-3">
                  {/* Username */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Username (min 3 characters)"
                        value={formData.username || ''}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className={`rounded-xl h-10 pr-10 ${
                          usernameError ? 'border-red-500' : 
                          usernameValid ? 'border-green-500' : ''
                        }`}
                        maxLength={20}
                        data-testid="input-username"
                      />
                      {isCheckingUsername && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {!isCheckingUsername && usernameValid && (
                        <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                      )}
                      {!isCheckingUsername && usernameError && formData.username && (
                        <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500" />
                      )}
                    </div>
                    {usernameError && formData.username ? (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {usernameError}
                      </p>
                    ) : usernameValid ? (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Username is available!
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        This will be shown on public leaderboards to protect your privacy
                      </p>
                    )}
                  </div>

                  {/* Avatar Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Choose Your Avatar
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { name: 'Teen1', seed: 'teen-alex' },
                        { name: 'Teen2', seed: 'teen-bailey' },
                        { name: 'Teen3', seed: 'teen-casey' },
                        { name: 'Teen4', seed: 'teen-drew' },
                        { name: 'Teen5', seed: 'teen-river' },
                        { name: 'Teen6', seed: 'teen-sage' },
                        { name: 'Teen7', seed: 'teen-phoenix' },
                        { name: 'Teen8', seed: 'teen-quinn' },
                        { name: 'Student1', seed: 'student-blake' },
                        { name: 'Student2', seed: 'student-cam' },
                        { name: 'Student3', seed: 'student-jay' },
                        { name: 'Student4', seed: 'student-lee' }
                      ].map((avatar) => {
                        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatar.seed}`;
                        return (
                          <button
                            key={avatar.seed}
                            type="button"
                            onClick={() => handleInputChange('avatar', avatarUrl)}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                              formData.avatar === avatarUrl
                                ? 'border-primary bg-primary/10 shadow-md'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <img 
                              src={avatarUrl} 
                              alt={avatar.name}
                              className="w-10 h-10 rounded-lg"
                            />
                          </button>
                        );
                      })}
                    </div>
                    {!formData.avatar && (
                      <p className="text-xs text-gray-500 mt-1">
                        Please select an avatar to represent your profile
                      </p>
                    )}
                  </div>

                  <select
                    value={formData.gradeLevel || ''}
                    onChange={(e) => handleInputChange('gradeLevel', e.target.value)}
                    className="rounded-xl h-10 px-3 border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer w-full"
                    required
                  >
                    <option value="">Select Grade</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>

                  <select
                    value={formData.schoolName || ''}
                    onChange={(e) => handleInputChange('schoolName', e.target.value)}
                    className="rounded-xl h-10 px-3 border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer w-full"
                    required
                  >
                    <option value="">
                      {schoolsLoading ? 'Loading schools...' : 'Select School'}
                    </option>
                    {schools && schools.length > 0 ? (
                      schools
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                        .map((school: any) => (
                          <option key={school.id} value={school.name}>
                            {school.name}
                          </option>
                        ))
                    ) : (
                      !schoolsLoading && (
                        <option value="" disabled>
                          No schools available
                        </option>
                      )
                    )}
                  </select>

                  {/* Subject Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Subjects <span className="text-red-500">*</span>
                    </label>
                    {(() => {
                      const isGrade8or9 = formData.gradeLevel === '8' || formData.gradeLevel === '9';
                      
                      return (
                        <>
                          <div className="space-y-2">
                            {[
                              { value: 'mathematics', label: 'Mathematics' },
                              { value: 'mathematical-literacy', label: 'Mathematical Literacy' },
                              { value: 'physical-science', label: 'Physical Science' }
                            ].map((subject) => {
                              const isDisabled = isGrade8or9 && (subject.value === 'mathematical-literacy' || subject.value === 'physical-science');
                              
                              return (
                                <button
                                  key={subject.value}
                                  type="button"
                                  onClick={() => !isDisabled && handleSubjectToggle(subject.value)}
                                  disabled={isDisabled}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                    isDisabled
                                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : selectedSubjects.includes(subject.value)
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <span className="font-medium">{subject.label}</span>
                                  {isDisabled ? (
                                    <X className="w-5 h-5 text-gray-400" />
                                  ) : selectedSubjects.includes(subject.value) ? (
                                    <Check className="w-5 h-5 text-primary" />
                                  ) : (
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {isGrade8or9 && (
                            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                              Note: Mathematical Literacy and Physical Science are only available for grades 10-12
                            </p>
                          )}
                          {!isGrade8or9 && (
                            <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
                              Note: You can select either Mathematics OR Mathematical Literacy, not both
                            </p>
                          )}
                          {selectedSubjects.length === 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Please select at least one subject
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="space-y-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">
                        +27
                      </span>
                      <Input
                        type="tel"
                        placeholder="Parent/Guardian Contact Number"
                        value={formData.parentContact || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                          handleInputChange('parentContact', value);
                        }}
                        className="rounded-xl h-10 pl-12"
                        maxLength={9}
                        required
                      />
                    </div>
                    {formData.parentContact && (
                      <p className="text-xs text-gray-500">
                        Full number: +27{formData.parentContact}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Parents skip step 2 - show message */}
              {role === 'parent' && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No additional information needed for this step.</p>
                </div>
              )}
            </div>
            )}

            {/* Step 3: Create Password */}
            {currentStep === 3 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="rounded-xl pr-10 h-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {formData.password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            level <= passwordStrength.score
                              ? passwordStrength.score === 5
                                ? 'bg-green-500'
                                : passwordStrength.score >= 3
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${passwordStrength.color}`}>
                      {passwordStrength.message}
                    </p>
                  </div>
                )}
              </div>

              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="rounded-xl pr-10 h-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-xs text-gray-600">
                  By signing you agree to our{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#00AACC] underline">
                    Terms of use
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#00AACC] underline">
                    privacy policy
                  </a>
                  .
                </span>
              </div>
            </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={previousStep}
                  className="flex-1 rounded-xl h-11"
                >
                  Back
                </Button>
              )}
              
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className={`bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl h-11 ${
                    currentStep === 1 ? 'w-full' : 'flex-1'
                  }`}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={registerMutation.isPending || isCheckingStudent}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl h-11"
                >
                  {isCheckingStudent ? (
                    <div className="flex items-center justify-center">
                      <div className="loader scale-[0.3]"></div>
                    </div>
                  ) : registerMutation.isPending ? (
                    <div className="flex items-center justify-center">
                      <div className="loader scale-[0.3]"></div>
                    </div>
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              )}
            </div>

            {/* Login Link */}
            <div className="text-center pt-1">
              <span className="text-gray-600 text-sm">Already have an account? </span>
              <Button
                type="button"
                variant="link"
                onClick={() => setLocation("/signin")}
                className="text-[#00AACC] font-semibold p-0 h-auto text-sm"
              >
                Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
