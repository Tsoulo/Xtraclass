import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { useLocation } from "wouter";
import ChildForm from "./ChildForm";
import BottomNav from "./BottomNav";
import type { ChildData } from "@/lib/types";
import logoImage from "@assets/xtraclass-logo-td.png";
import { useAuth } from "@/contexts/AuthContext";

export default function AddChildren() {
  const [, setLocation] = useLocation();
  const [showChildForm, setShowChildForm] = useState(false);
  const [children, setChildren] = useState<ChildData[]>([]);
  const { user } = useAuth();

  const handleBack = () => {
    // Check if we came from registration flow
    const fromRegistration = localStorage.getItem('fromRegistration');
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role') || 'parent';
    
    if (fromRegistration === 'true') {
      // Clear the flag and go back to registration form
      localStorage.removeItem('fromRegistration');
      setLocation(`/register/form?role=${role}`);
    } else {
      // Default navigation - go to dashboard or home
      setLocation('/dashboard');
    }
  };

  const handleAddChild = () => {
    setShowChildForm(true);
  };

  const handleChildSaved = (child: ChildData) => {
    // Ensure the child has the parent's ID
    const childWithParentId = {
      ...child,
      parentId: user?.id || 0
    };
    setChildren(prev => [...prev, childWithParentId]);
    setShowChildForm(false);
  };

  const handleChildSelect = (child: ChildData) => {
    // Store the selected child data in localStorage for the dashboard to access
    localStorage.setItem('selectedChild', JSON.stringify(child));
    // Navigate to student dashboard parent view for the selected child
    setLocation(`/dashboard/student/${child.id || child.firstName.toLowerCase()}`);
  };

  const handleContinue = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="gamified-bg relative z-10 px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="w-24 h-12 flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="XtraClass.ai Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="w-6" />
        </div>

        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-1">Add Your Children</h1>
          <p className="text-sm opacity-90">Stay in touch with your child's learning progress</p>
        </div>
      </div>
      {/* Content */}
      <div className="px-4 space-y-4 pb-24 pt-4">
        {/* Added Children */}
        {children.map((child, index) => (
          <button
            key={index}
            onClick={() => handleChildSelect(child)}
            className="group bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 w-full text-left border border-gray-100/50 hover:border-primary/20 hover:-translate-y-1"
          >
            <div className="flex items-center space-x-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg">
                  {child.profilePhoto ? (
                    <img 
                      src={child.profilePhoto} 
                      alt={`${child.firstName} ${child.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary via-primary-dark to-cyan-600 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {child.firstName[0]}{child.lastName[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white"></div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                  {child.firstName} {child.lastName}
                </h3>
                <p className="text-gray-600 font-medium text-sm mb-1 truncate">
                  {child.school || 'School not specified'}
                </p>
                <p className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full inline-block">
                  {child.grade || 'Grade not specified'}
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="text-primary group-hover:text-primary-dark transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="text-xs text-gray-400 font-medium">View</div>
              </div>
            </div>
          </button>
        ))}

        {/* Add First Child Card - Only show when no children exist */}
        {children.length === 0 && (
          <button
            onClick={handleAddChild}
            className="group bg-gradient-to-br from-white via-gray-50 to-gray-100/50 rounded-3xl p-10 text-center hover:shadow-2xl transition-all duration-500 cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary/50 w-full hover:-translate-y-2 hover:scale-[1.02] backdrop-blur-sm"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Plus className="w-12 h-12 text-primary group-hover:text-primary-dark transition-colors" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/20 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-cyan-200 rounded-full animate-pulse delay-300"></div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors">
              Add Your Child
            </h3>
            <p className="text-[#00AACC] font-medium text-lg">Create a profile to get started</p>
            <div className="mt-4 text-xs text-gray-500 font-medium">
              Tap to begin the journey
            </div>
          </button>
        )}

        {/* Add Another Child Button */}
        {children.length > 0 && (
          <div className="fixed bottom-24 left-6 right-6 z-40">
            <Button
              onClick={handleAddChild}
              className="w-full bg-gradient-to-r from-primary via-primary-dark to-cyan-600 hover:from-primary-dark hover:via-cyan-600 hover:to-primary text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 border-2 border-white/20 backdrop-blur-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your Child
            </Button>
          </div>
        )}
      </div>
      {/* Child Form Modal */}
      {showChildForm && (
        <ChildForm
          onClose={() => setShowChildForm(false)}
          onSave={handleChildSaved}
          parentId={user?.id}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
