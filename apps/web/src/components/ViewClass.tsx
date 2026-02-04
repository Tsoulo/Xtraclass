import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Users, BookOpen, GraduationCap } from "lucide-react";
import { useLocation } from "wouter";
import ClassForm from "@/components/ClassForm";

interface ClassData {
  id?: number;
  teacherId?: number;
  subject: string;
  grade: string;
  className: string;
}

export default function ViewClass() {
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [classes, setClasses] = useState<ClassData[]>([]);

  useEffect(() => {
    // Load saved classes from localStorage
    const savedClasses = localStorage.getItem('teacherClasses');
    if (savedClasses) {
      setClasses(JSON.parse(savedClasses));
    }
  }, []);

  const handleBack = () => {
    const fromRegistration = localStorage.getItem('fromRegistration');
    if (fromRegistration) {
      localStorage.removeItem('fromRegistration');
      setLocation('/dashboard');
    } else {
      setLocation('/dashboard');
    }
  };

  const handleClassSaved = (classData: ClassData) => {
    const newClass = {
      ...classData,
      id: Date.now(), // Simple ID generation
      teacherId: 1 // Mock teacher ID
    };
    
    const updatedClasses = [...classes, newClass];
    setClasses(updatedClasses);
    localStorage.setItem('teacherClasses', JSON.stringify(updatedClasses));
    setShowForm(false);
  };

  if (showForm) {
    return (
      <ClassForm
        onClose={() => setShowForm(false)}
        onSave={handleClassSaved}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 pb-20 md:pb-0 md:pt-16">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_50%)]"></div>
        
        <div className="relative z-10 p-6 pb-12">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-white hover:bg-white/20 backdrop-blur-sm rounded-2xl"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-bold text-white tracking-tight">My Classes</h1>
            <div className="w-10"></div>
          </div>

          <div className="text-white text-center">
            <p className="text-blue-100 text-lg opacity-90">
              Manage your teaching classes and subjects
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-6 space-y-6">
        {/* Add Class Card */}
        <div className={`transition-all duration-500 ${classes.length > 0 ? 'order-last' : ''}`}>
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-white/90 backdrop-blur-2xl hover:bg-white border border-white/30 shadow-2xl rounded-3xl p-8 text-left transition-all duration-300 hover:shadow-3xl group h-auto"
            variant="ghost"
          >
            <div className="flex items-center justify-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Add Your Class</h3>
                <p className="text-slate-600">Add a new class to start teaching</p>
              </div>
            </div>
          </Button>
        </div>

        {/* Classes List */}
        {classes.map((classData) => (
          <div
            key={classData.id}
            className="bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/30 relative overflow-hidden hover:shadow-3xl transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-purple-50/20 to-blue-50/30 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    {classData.subject === 'Mathematics' ? (
                      <GraduationCap className="w-7 h-7 text-white" />
                    ) : (
                      <BookOpen className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{classData.subject}</h3>
                    <p className="text-sm text-slate-600">{classData.grade} • {classData.className}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">25 students</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-3">
                  <div className="text-lg font-bold text-blue-600">87%</div>
                  <div className="text-xs text-blue-600 font-medium">Avg Progress</div>
                </div>
                <div className="text-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-3">
                  <div className="text-lg font-bold text-green-600">23</div>
                  <div className="text-xs text-green-600 font-medium">Assignments</div>
                </div>
                <div className="text-center bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-3">
                  <div className="text-lg font-bold text-purple-600">4.2</div>
                  <div className="text-xs text-purple-600 font-medium">Avg Rating</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {classes.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No Classes Yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Start by adding your first class to begin managing your students and curriculum.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}