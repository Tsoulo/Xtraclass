export type UserRole = 'parent' | 'teacher' | 'student' | 'tutor' | 'admin';

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  cellNumber?: string;
}

export interface ChildData {
  id?: number;
  parentId?: number;
  firstName: string;
  lastName: string;
  idNumber?: string;
  grade?: string;
  school?: string;
  points?: number;
  profilePhoto?: string;
  studentUserId?: number;
  gradeLevel?: string;
  schoolName?: string;
}

export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  cellNumber?: string;
  role: UserRole;
  avatar?: string; // Avatar selection for students
  
  // Role-specific fields
  registrationNumber?: string;
  subjectSpecialization?: string;
  schoolAffiliation?: string;
  yearsExperience?: number;
  studentId?: string;
  username?: string; // Public display name for students
  gradeLevel?: string;
  schoolName?: string;
  parentContact?: string;
  certificationNumber?: string;
  subjectExpertise?: string;
  availability?: string;
  subjects?: string[]; // For student subject selection
  parentId?: string; // For parent ID number
}
