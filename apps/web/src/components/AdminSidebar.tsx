import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronRight, 
  BookOpen, 
  Plus, 
  FileText,
  GraduationCap,
  Calculator,
  Atom,
  Calendar,
  Target,
  Building2,
  FolderOpen,
  Settings,
  Flag,
  MessageSquare,
  CreditCard,
  Mail,
  X,
  ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  onPageChange: (page: string, data?: any) => void;
  currentPage: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const grades = [
  { id: 8, name: "Grade 8" },
  { id: 9, name: "Grade 9" },
  { id: 10, name: "Grade 10" },
  { id: 11, name: "Grade 11" },
  { id: 12, name: "Grade 12" }
];

const subjects = [
  { id: "mathematics", name: "Mathematics", icon: Calculator },
  { id: "mathematical-literacy", name: "Mathematical Literacy", icon: FileText },
  { id: "physical-science", name: "Physical Science", icon: Atom }
];

export default function AdminSidebar({ onPageChange, currentPage, isOpen = true, onClose }: AdminSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isOpen && isMobile && onClose) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handlePageClick = (page: string, data?: any) => {
    onPageChange(page, data);
    if (onClose) onClose();
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
      // Also collapse any expanded grades in this section
      const gradesToCollapse = Array.from(expandedGrades).filter(grade => 
        grade.startsWith(`${section}-`)
      );
      gradesToCollapse.forEach(grade => {
        const newExpandedGrades = new Set(expandedGrades);
        newExpandedGrades.delete(grade);
        setExpandedGrades(newExpandedGrades);
      });
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleGrade = (section: string, gradeId: number) => {
    const gradeKey = `${section}-${gradeId}`;
    const newExpandedGrades = new Set(expandedGrades);
    if (newExpandedGrades.has(gradeKey)) {
      newExpandedGrades.delete(gradeKey);
    } else {
      newExpandedGrades.add(gradeKey);
    }
    setExpandedGrades(newExpandedGrades);
  };

  const handleSubjectClick = (section: string, grade: number, subject: any) => {
    const pageMap = {
      'syllabus': 'syllabus',
      'topics': 'topics',
      'add-lesson': 'add-lesson'
    };
    
    handlePageClick(pageMap[section as keyof typeof pageMap], {
      grade,
      subject: subject.id,
      subjectName: subject.name
    });
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={cn(
        "bg-white border-r border-slate-200 flex flex-col h-full",
        "fixed lg:static inset-y-0 left-0 z-50",
        "w-72 lg:w-64",
        "transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Navigation</h2>
          {onClose && (
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Dashboard */}
          <Button
            variant={currentPage === "dashboard" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => handlePageClick("dashboard")}
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Dashboard
          </Button>

        {/* Syllabus */}
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => toggleSection("syllabus")}
          >
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Syllabus
            </div>
            {expandedSections.has("syllabus") ? 
              <ChevronDown className="w-4 h-4" /> : 
              <ChevronRight className="w-4 h-4" />
            }
          </Button>
          
          {expandedSections.has("syllabus") && (
            <div className="ml-4 mt-2 space-y-1">
              {grades.map((grade) => (
                <div key={grade.id}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-sm"
                    onClick={() => toggleGrade("syllabus", grade.id)}
                  >
                    <span>{grade.name}</span>
                    {expandedGrades.has(`syllabus-${grade.id}`) ? 
                      <ChevronDown className="w-3 h-3" /> : 
                      <ChevronRight className="w-3 h-3" />
                    }
                  </Button>
                  
                  {expandedGrades.has(`syllabus-${grade.id}`) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {subjects.map((subject) => {
                        const SubjectIcon = subject.icon;
                        return (
                          <Button
                            key={subject.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-slate-600"
                            onClick={() => handleSubjectClick("syllabus", grade.id, subject)}
                          >
                            <SubjectIcon className="w-3 h-3 mr-2" />
                            {subject.name}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Topics */}
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => toggleSection("topics")}
          >
            <div className="flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Topics
            </div>
            {expandedSections.has("topics") ? 
              <ChevronDown className="w-4 h-4" /> : 
              <ChevronRight className="w-4 h-4" />
            }
          </Button>
          
          {expandedSections.has("topics") && (
            <div className="ml-4 mt-2 space-y-1">
              {grades.map((grade) => (
                <div key={grade.id}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-sm"
                    onClick={() => toggleGrade("topics", grade.id)}
                  >
                    <span>{grade.name}</span>
                    {expandedGrades.has(`topics-${grade.id}`) ? 
                      <ChevronDown className="w-3 h-3" /> : 
                      <ChevronRight className="w-3 h-3" />
                    }
                  </Button>
                  
                  {expandedGrades.has(`topics-${grade.id}`) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {subjects.map((subject) => {
                        const SubjectIcon = subject.icon;
                        return (
                          <Button
                            key={subject.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-slate-600"
                            onClick={() => handleSubjectClick("topics", grade.id, subject)}
                          >
                            <SubjectIcon className="w-3 h-3 mr-2" />
                            {subject.name}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Lesson */}
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => toggleSection("add-lesson")}
          >
            <div className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Lesson
            </div>
            {expandedSections.has("add-lesson") ? 
              <ChevronDown className="w-4 h-4" /> : 
              <ChevronRight className="w-4 h-4" />
            }
          </Button>
          
          {expandedSections.has("add-lesson") && (
            <div className="ml-4 mt-2 space-y-1">
              {grades.map((grade) => (
                <div key={grade.id}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-sm"
                    onClick={() => toggleGrade("add-lesson", grade.id)}
                  >
                    <span>{grade.name}</span>
                    {expandedGrades.has(`add-lesson-${grade.id}`) ? 
                      <ChevronDown className="w-3 h-3" /> : 
                      <ChevronRight className="w-3 h-3" />
                    }
                  </Button>
                  
                  {expandedGrades.has(`add-lesson-${grade.id}`) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {subjects.map((subject) => {
                        const SubjectIcon = subject.icon;
                        return (
                          <Button
                            key={subject.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-slate-600"
                            onClick={() => handleSubjectClick("add-lesson", grade.id, subject)}
                          >
                            <SubjectIcon className="w-3 h-3 mr-2" />
                            {subject.name}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schools */}
        <Button
          variant={currentPage === "schools" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => handlePageClick("schools")}
        >
          <Building2 className="w-4 h-4 mr-2" />
          Schools
        </Button>

        {/* Organizations */}
        <Button
          variant={currentPage === "organizations" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => handlePageClick("organizations")}
        >
          <Building2 className="w-4 h-4 mr-2" />
          Organizations
        </Button>

        {/* Content */}
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => toggleSection("content")}
          >
            <div className="flex items-center">
              <FolderOpen className="w-4 h-4 mr-2" />
              Content
            </div>
            {expandedSections.has("content") ? 
              <ChevronDown className="w-4 h-4" /> : 
              <ChevronRight className="w-4 h-4" />
            }
          </Button>
          
          {expandedSections.has("content") && (
            <div className="ml-4 mt-2 space-y-1">
              <Button
                variant={currentPage === "past-papers" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handlePageClick("past-papers")}
              >
                <FileText className="w-3 h-3 mr-2" />
                Past Papers
              </Button>
              <Button
                variant={currentPage === "email-templates" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handlePageClick("email-templates")}
              >
                <Mail className="w-3 h-3 mr-2" />
                Email Templates
              </Button>
            </div>
          )}
        </div>

        {/* Manage */}
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => toggleSection("manage")}
          >
            <div className="flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Manage
            </div>
            {expandedSections.has("manage") ? 
              <ChevronDown className="w-4 h-4" /> : 
              <ChevronRight className="w-4 h-4" />
            }
          </Button>
          
          {expandedSections.has("manage") && (
            <div className="ml-4 mt-2 space-y-1">
              <Button
                variant={currentPage === "reported-issues" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handlePageClick("reported-issues")}
                data-testid="nav-reported-issues"
              >
                <Flag className="w-3 h-3 mr-2" />
                Reported Issues
              </Button>
              <Button
                variant={currentPage === "prompt-builder" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handlePageClick("prompt-builder")}
                data-testid="nav-prompt-builder"
              >
                <MessageSquare className="w-3 h-3 mr-2" />
                Prompt Builder
              </Button>
              <Button
                variant={currentPage === "subscription-settings" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handlePageClick("subscription-settings")}
                data-testid="nav-subscription-settings"
              >
                <CreditCard className="w-3 h-3 mr-2" />
                Subscriptions
              </Button>
              <Button
                variant={currentPage === "image-compare" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handlePageClick("image-compare")}
                data-testid="nav-image-compare"
              >
                <ImageIcon className="w-3 h-3 mr-2" />
                Image Compare
              </Button>
            </div>
          )}
        </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Admin Panel v2.0
          </p>
        </div>
      </div>
    </>
  );
}