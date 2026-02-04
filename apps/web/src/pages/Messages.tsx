import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Send, Phone, Video, MoreVertical, ArrowLeft, Paperclip, Smile, Edit3 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import StudentSearchModal from "@/components/StudentSearchModal";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'parent' | 'tutor' | 'student';
  content: string;
  timestamp: Date;
  read: boolean;
  attachments?: string[];
}

interface Conversation {
  id: string;
  participants: {
    id: string;
    name: string;
    role: 'teacher' | 'parent' | 'tutor' | 'student';
    avatar?: string;
  }[];
  lastMessage: Message;
  unreadCount: number;
  subject?: string;
  studentContext?: string;
}

export default function Messages() {
  const [userRole, setUserRole] = useState<string>('teacher');
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [showQuickMessage, setShowQuickMessage] = useState(false);
  const [quickMessageText, setQuickMessageText] = useState("");
  
  const { toast } = useToast();

  // Fetch conversations from API
  const { data: conversations = [], isLoading: isLoadingConversations, refetch: refetchConversations } = useQuery({
    queryKey: ['/api/chat/conversations'],
    queryFn: () => apiRequest('/api/chat/conversations'),
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/chat/conversations', selectedConversation, 'messages'],
    queryFn: async () => {
      const result = await apiRequest(`/api/chat/conversations/${selectedConversation}/messages`);
      // After fetching messages (which marks them as read), refresh conversations to update unread counts
      setTimeout(() => {
        refetchConversations();
        queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      }, 100);
      return result;
    },
    enabled: !!selectedConversation,
  });

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; attachments?: string[] }) => {
      return await apiRequest(`/api/chat/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        body: data
      });
    },
    onMutate: async (data) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['/api/chat/conversations', selectedConversation, 'messages'] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['/api/chat/conversations', selectedConversation, 'messages']) || [];

      // Get current user info for the optimistic message
      const userStr = localStorage.getItem('auth_user');
      const currentUser = userStr ? JSON.parse(userStr) : null;

      // Optimistically update the messages cache
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content: data.content,
        senderId: currentUser?.id,
        senderName: `${currentUser?.firstName} ${currentUser?.lastName}`,
        sentAt: new Date().toISOString(),
        attachments: data.attachments || [],
        isOptimistic: true // Flag to identify optimistic messages
      };

      queryClient.setQueryData(
        ['/api/chat/conversations', selectedConversation, 'messages'], 
        (old: any[]) => [...(old || []), optimisticMessage]
      );

      return { previousMessages, optimisticMessage };
    },
    onSuccess: (result, variables, context) => {
      // Clear the input and force refresh to get the real message with proper ID
      setNewMessage("");
      
      // Invalidate and refetch to get the real message from server
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations', selectedConversation, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      
      // Force refetch to ensure we get the latest data
      setTimeout(() => {
        refetchMessages();
        refetchConversations();
      }, 100);
    },
    onError: (error: any, variables, context) => {
      // Rollback to the previous state
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['/api/chat/conversations', selectedConversation, 'messages'],
          context.previousMessages
        );
      }
      
      toast({
        title: "Failed to Send Message",
        description: error.message || "There was an error sending your message.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'teacher';
    setUserRole(role);
  }, []);

  // When a conversation is selected, invalidate conversations to update unread counts
  useEffect(() => {
    if (selectedConversation) {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      }, 500); // Small delay to ensure messages are marked as read first
    }
  }, [selectedConversation]);

  const getAvailableRoles = () => {
    const allRoles = ['teacher', 'parent', 'tutor', 'student'];
    return allRoles.filter(role => role !== userRole);
  };


  const formatTime = (date: Date | string) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    const now = new Date();
    const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'teacher': return 'bg-blue-100 text-blue-800';
      case 'parent': return 'bg-green-100 text-green-800';
      case 'tutor': return 'bg-purple-100 text-purple-800';
      case 'student': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      content: newMessage.trim(),
      attachments: []
    });
  };

  const saveQuickMessage = () => {
    if (!quickMessageText.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      content: quickMessageText.trim(),
      attachments: []
    });
    setQuickMessageText("");
    setShowQuickMessage(false);
  };


  const filteredConversations = conversations.filter((conv: any) =>
    searchTerm === '' || (
      conv.participants?.some((p: any) => 
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      conv.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.studentContext?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (selectedConversation) {
    const conversation = conversations.find((c: any) => c.id === selectedConversation);
    const conversationMessages = messages || [];
    const currentUserId = localStorage.getItem('userId');
    const otherParticipant = conversation?.participants?.find((p: any) => p.id !== currentUserId);

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pt-0 md:pt-16">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-3 md:p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversation(null)}
                className="rounded-full w-8 h-8 md:w-10 md:h-10"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <Avatar className="w-8 h-8 md:w-10 md:h-10">
                <AvatarFallback className="bg-primary text-white text-sm">
                  {otherParticipant?.avatar || getInitials(otherParticipant?.name || '')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-800 text-sm md:text-base truncate">{otherParticipant?.firstName} {otherParticipant?.lastName}</h3>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className={`text-xs ${getRoleColor(otherParticipant?.role || '')}`}>
                    {otherParticipant?.role}
                  </Badge>
                  {conversation?.studentContext && (
                    <span className="text-xs text-gray-500 truncate">{conversation.studentContext}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          {conversation?.subject && (
            <div className="mt-2 text-sm text-gray-600 font-medium">
              Subject: {conversation.subject}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 pb-32 md:pb-4 relative">
          {conversationMessages.map((message: any) => {
            const userStr = localStorage.getItem('auth_user');
            const currentUserId = userStr ? JSON.parse(userStr).id : null;
            const isCurrentUser = currentUserId && message.senderId === currentUserId;
            return (
              <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
                <div className={`max-w-[85%] md:max-w-xs lg:max-w-md px-3 md:px-4 py-2 md:py-3 rounded-2xl shadow-sm ${
                  isCurrentUser 
                    ? 'bg-blue-500 text-white rounded-br-md ml-4 md:ml-12' 
                    : 'bg-white border border-gray-200 rounded-bl-md mr-4 md:mr-12'
                }`}>
                  {!isCurrentUser && (
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-semibold text-blue-600">
                        {message.senderFirstName} {message.senderLastName}
                      </span>
                      <Badge variant="secondary" className={`text-xs ${getRoleColor(message.senderRole || 'user')}`}>
                        {message.senderRole || 'user'}
                      </Badge>
                    </div>
                  )}
                  <p className={`text-sm leading-relaxed ${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
                    {message.content}
                  </p>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachments.map((attachment: string, index: number) => (
                        <div key={index} className={`flex items-center space-x-2 p-2 rounded-lg ${
                          isCurrentUser ? 'bg-white/20' : 'bg-gray-50'
                        }`}>
                          <Paperclip className="w-4 h-4" />
                          <span className="text-xs">{attachment}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={`text-xs mt-2 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'} ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                    {formatTime(message.sentAt || message.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-3 md:p-4 fixed bottom-14 md:bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 md:w-10 md:h-10">
              <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
            <div className="flex-1 relative">
              <Input
                id="message-input"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="rounded-full pr-12 md:pr-20"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button variant="ghost" size="icon" className="absolute right-12 top-1/2 transform -translate-y-1/2 rounded-full hidden md:inline-flex">
                <Smile className="w-4 h-4" />
              </Button>
            </div>
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="rounded-full w-8 h-8 md:w-10 md:h-10 p-0 shrink-0"
            >
              <Send className="w-3 h-3 md:w-4 md:h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Message Dialog */}
        {showQuickMessage && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Quick Message</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQuickMessage(false)}
                  className="rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <Textarea
                    placeholder="Type your message here..."
                    rows={6}
                    value={quickMessageText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuickMessageText(e.target.value)}
                    className="resize-none"
                    autoFocus
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    className="flex-1"
                    onClick={saveQuickMessage}
                    disabled={!quickMessageText.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Save Message
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowQuickMessage(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-0 md:pt-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 md:p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Messages</h1>
          <div className="flex space-x-2">
            {userRole === 'teacher' && (
              <Button
                onClick={() => setShowStudentSearch(true)}
                variant="outline"
                className="rounded-full px-2 md:px-4"
              >
                <Search className="w-4 h-4 md:mr-2" />
                <span className="hidden sm:inline">Search Students or Parents</span>
                <span className="sm:hidden">Search</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations..."
            className="pl-10 rounded-full"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="p-3 md:p-4 space-y-2">
        {isLoadingConversations ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading conversations...</p>
            </div>
          </div>
        ) : (
          <>
        {filteredConversations.map((conversation: any) => {
          const userStr = localStorage.getItem('auth_user');
          const currentUserId = userStr ? JSON.parse(userStr).id : null;
          const otherParticipant = conversation.participants?.find((p: any) => p.id !== currentUserId);
          
          return (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className="bg-white rounded-xl p-4 border border-gray-200 hover:border-primary/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary text-white">
                      {otherParticipant?.avatar || getInitials(`${otherParticipant?.firstName || ''} ${otherParticipant?.lastName || ''}`.trim() || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{conversation.unreadCount}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-800 truncate">{otherParticipant?.firstName} {otherParticipant?.lastName}</h3>
                      <Badge variant="secondary" className={`text-xs ${getRoleColor(otherParticipant?.role || '')}`}>
                        {otherParticipant?.role}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">{formatTime(conversation.lastMessage?.sentAt || conversation.lastMessage?.timestamp)}</span>
                  </div>
                  
                  {conversation.subject && (
                    <p className="text-sm font-medium text-primary mb-1">{conversation.subject}</p>
                  )}
                  
                  {conversation.studentContext && (
                    <p className="text-xs text-gray-500 mb-1">{conversation.studentContext}</p>
                  )}
                  
                  <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                    {conversation.lastMessage.senderName}: {conversation.lastMessage.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {filteredConversations.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No conversations found matching "{searchTerm}"</p>
            </div>
          </div>
        )}

        {conversations.length === 0 && !searchTerm && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
              <p>Start a conversation with parents, teachers, or tutors</p>
            </div>
          </div>
        )}
        </>
        )}
      </div>


      <BottomNav />
      
      {/* Student Search Modal */}
      <StudentSearchModal
        isOpen={showStudentSearch}
        onClose={() => setShowStudentSearch(false)}
        onConversationCreated={(conversationId) => {
          setSelectedConversation(conversationId);
          refetchConversations();
        }}
      />
    </div>
  );
}