import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, MessageCircle, Users, X } from "lucide-react";

interface Student {
  studentId: number;
  studentUserId: number;
  firstName: string;
  lastName: string;
  email: string;
  gradeLevel: string;
  schoolName: string;
  studentIdNumber: string;
  parents: Array<{
    parentId: number;
    firstName: string;
    lastName: string;
    email: string;
    cellNumber: string;
  }>;
}

interface StudentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated?: (conversationId: number) => void;
}

export default function StudentSearchModal({ isOpen, onClose, onConversationCreated }: StudentSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [messageType, setMessageType] = useState<"student" | "parent" | null>(null);
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  
  const { toast } = useToast();

  // Search students
  const { data: students = [], isLoading: isSearching } = useQuery<Student[]>({
    queryKey: ['/api/chat/search/students', searchTerm, selectedGrade],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (selectedGrade) params.append('grade', selectedGrade);
      return apiRequest(`/api/chat/search/students?${params.toString()}`);
    },
    enabled: searchTerm.length >= 2 || selectedGrade !== "",
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: {
      subject: string;
      studentContext: string;
      studentId: number;
      participantIds: number[];
      initialMessage: string;
    }) => {
      return await apiRequest('/api/chat/conversations', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Message Sent",
        description: "Your conversation has been started successfully.",
      });
      
      // Reset form
      setSelectedStudent(null);
      setMessageType(null);
      setSelectedParent(null);
      setSubject("");
      setMessage("");
      setSearchTerm("");
      
      onConversationCreated?.(response.id);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Message",
        description: error.message || "There was an error sending your message.",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (!selectedStudent || !messageType || !subject.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    let participantIds: number[] = [];
    
    if (messageType === "student") {
      participantIds = [selectedStudent.studentUserId];
    } else if (messageType === "parent" && selectedParent) {
      participantIds = [selectedParent.parentId];
    } else if (messageType === "parent" && selectedStudent.parents.length === 1) {
      participantIds = [selectedStudent.parents[0].parentId];
    }

    if (participantIds.length === 0) {
      toast({
        title: "No Recipients Selected",
        description: "Please select a recipient for your message.",
        variant: "destructive",
      });
      return;
    }

    const studentContext = `${selectedStudent.firstName} ${selectedStudent.lastName} - Grade ${selectedStudent.gradeLevel}`;

    createConversationMutation.mutate({
      subject,
      studentContext,
      studentId: selectedStudent.studentId,
      participantIds,
      initialMessage: message,
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const resetSelection = () => {
    setSelectedStudent(null);
    setMessageType(null);
    setSelectedParent(null);
    setSubject("");
    setMessage("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {selectedStudent ? "Send Message" : "Find Student"}
          </DialogTitle>
        </DialogHeader>

        {!selectedStudent ? (
          // Student Search View
          <div className="space-y-6">
            {/* Search Filters */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or student ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Grades</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </div>
            </div>

            {/* Search Results */}
            <div className="space-y-4">
              {isSearching && (
                <div className="text-center py-8">
                  <div className="text-gray-500">Searching students...</div>
                </div>
              )}

              {!isSearching && students.length === 0 && (searchTerm.length >= 2 || selectedGrade) && (
                <div className="text-center py-8">
                  <div className="text-gray-500">No students found matching your search.</div>
                </div>
              )}

              {!isSearching && students.length === 0 && searchTerm.length < 2 && !selectedGrade && (
                <div className="text-center py-8">
                  <div className="text-gray-500">Enter at least 2 characters to search for students.</div>
                </div>
              )}

              {students.map((student) => (
                <div
                  key={student.studentId}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-blue-100 text-blue-800">
                        {getInitials(student.firstName, student.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">
                          {student.firstName} {student.lastName}
                        </h3>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Grade {student.gradeLevel}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600">{student.email}</p>
                      <p className="text-sm text-gray-500">ID: {student.studentIdNumber}</p>
                      <p className="text-sm text-gray-500">{student.schoolName}</p>
                      
                      {student.parents.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            Parents: {student.parents.map(p => `${p.firstName} ${p.lastName}`).join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Message Composition View
          <div className="space-y-6">
            {/* Selected Student Header */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-blue-100 text-blue-800">
                      {getInitials(selectedStudent.firstName, selectedStudent.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">Grade {selectedStudent.gradeLevel}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetSelection}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Message Type Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Who would you like to message?
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMessageType("student")}
                  className={`w-full text-left p-3 border rounded-lg transition-colors ${
                    messageType === "student" 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">Student</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Send message directly to {selectedStudent.firstName}
                  </p>
                </button>

                {selectedStudent.parents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMessageType("parent")}
                    className={`w-full text-left p-3 border rounded-lg transition-colors ${
                      messageType === "parent" 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">Parent(s)</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Send message to {selectedStudent.parents.map(p => `${p.firstName} ${p.lastName}`).join(" or ")}
                    </p>
                  </button>
                )}
              </div>
            </div>

            {/* Parent Selection (if multiple parents) */}
            {messageType === "parent" && selectedStudent.parents.length > 1 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Parent
                </label>
                <div className="space-y-2">
                  {selectedStudent.parents.map((parent) => (
                    <button
                      key={parent.parentId}
                      type="button"
                      onClick={() => setSelectedParent(parent)}
                      className={`w-full text-left p-3 border rounded-lg transition-colors ${
                        selectedParent?.parentId === parent.parentId
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium">{parent.firstName} {parent.lastName}</div>
                      <div className="text-sm text-gray-600">{parent.email}</div>
                      {parent.cellNumber && (
                        <div className="text-sm text-gray-600">{parent.cellNumber}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Form */}
            {messageType && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <Input
                    placeholder="What's this about?"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <Textarea
                    placeholder="Type your message..."
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={handleSendMessage}
                disabled={
                  createConversationMutation.isPending ||
                  !messageType ||
                  !subject.trim() ||
                  !message.trim() ||
                  (messageType === "parent" && selectedStudent.parents.length > 1 && !selectedParent)
                }
                className="flex-1"
              >
                {createConversationMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
              <Button variant="outline" onClick={resetSelection}>
                Back to Search
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}