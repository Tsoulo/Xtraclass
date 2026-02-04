import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Bot, User, BookOpen, MessageCircle, PenTool, CheckCircle, Trophy, Target, Calculator, ArrowDown, Lightbulb, Sparkles, Award, Zap, Star, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface TutorialLearningProps {
  exercise: any;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const TutorialLearning = ({ exercise, onClose }: TutorialLearningProps) => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<'concepts' | 'chat' | 'practice'>('concepts');
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Parse tutorial content from JSON string if needed
  const tutorialContent = useMemo(() => {
    console.log('Tutorial exercise data:', exercise);
    
    // Check both possible field names (snake_case and camelCase)
    const contentField = exercise.tutorial_content || exercise.tutorialContent;
    console.log('Tutorial content raw:', contentField);
    
    if (!contentField) {
      console.log('No tutorial content found');
      return null;
    }
    
    if (typeof contentField === 'string') {
      try {
        const parsed = JSON.parse(contentField);
        console.log('Parsed tutorial content:', parsed);
        return parsed;
      } catch (error) {
        console.error('Failed to parse tutorial content:', error);
        return { explanation: contentField }; // Fallback for old format
      }
    }
    
    console.log('Tutorial content already object:', contentField);
    return contentField;
  }, [exercise.tutorial_content, exercise.tutorialContent]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: `Hi ${user?.firstName || 'there'}! I'm Tsebo, your maths tutor. I'm here to help you understand ${exercise.subject} concepts. Feel free to ask me any questions about the lesson!`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response (in real implementation, this would call OpenAI API)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(inputMessage, exercise),
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (question: string, exercise: any): string => {
    // Simple response generator - in real implementation would use OpenAI API
    const responses = {
      binomial: [
        "Great question! When expanding binomials like (a + b)², we use the formula: (a + b)² = a² + 2ab + b². This comes from multiplying (a + b) × (a + b).",
        "The key to binomial expansion is remembering the pattern. For (a + b)², you get: first term squared + 2 times first times second + second term squared.",
        "Let me break down (x + 3)²: First, x² (first term squared), then 2(x)(3) = 6x (twice the product), then 3² = 9. So (x + 3)² = x² + 6x + 9."
      ],
      general: [
        "That's a thoughtful question! Let me explain this concept step by step.",
        "I can help you understand this better. Think of it this way...",
        "This is a common area where students get confused. Let me clarify..."
      ]
    };

    const questionLower = question.toLowerCase();
    if (questionLower.includes('binomial') || questionLower.includes('expand') || questionLower.includes('(a + b)')) {
      return responses.binomial[Math.floor(Math.random() * responses.binomial.length)];
    }
    return responses.general[Math.floor(Math.random() * responses.general.length)];
  };

  const formatMathExpression = (text: string) => {
    return text.replace(/\^(\d+)/g, '⁽$1⁾').replace(/\^2/g, '²').replace(/\^3/g, '³');
  };

  const handleCompleteTutorial = async () => {
    setIsCompleting(true);
    try {
      // Submit tutorial completion to the API
      const totalMarks = tutorialContent?.totalMarks || 30;
      const response = await apiRequest(`/api/exercises/${exercise.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: [], // Tutorial exercises don't require specific answers
          score: totalMarks, // Give full marks for tutorial completion
          isCompleted: true
        })
      });
      
      console.log('Tutorial completed successfully');
      
      // Store tutorial completion data in localStorage for feedback page
      const tutorialFeedbackData = {
        id: response.id,
        exerciseId: exercise.id,
        exercise: exercise,
        score: totalMarks,
        totalMarks: totalMarks,
        isCompleted: true,
        completedAt: new Date().toISOString()
      };
      
      localStorage.setItem('tutorialFeedback', JSON.stringify(tutorialFeedbackData));
      
      // Invalidate the exercise submission cache to update the UI
      await queryClient.invalidateQueries({
        queryKey: ['/api/exercises', exercise.id, 'submission']
      });
      
      // Also invalidate the exercises list cache
      await queryClient.invalidateQueries({
        queryKey: ['/api/exercises']
      });
      
      // Navigate to tutorial feedback page instead of just closing
      setLocation('/tutorial-feedback');
    } catch (error) {
      console.error('Error completing tutorial:', error);
      // Still close on error, but don't refresh
      onClose();
    } finally {
      setIsCompleting(false);
    }
  };

  const renderConceptsStep = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Brilliant-style progress */}
        <div className="flex items-center justify-between mb-8">
          <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          {/* Brilliant-style progress bar */}
          <div className="flex-1 mx-8">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: '33%' }}></div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 font-medium">1 of 3</div>
        </div>

        {/* Brilliant-style welcome card */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-2xl mb-6 relative">
            <BookOpen className="w-8 h-8 text-white" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-yellow-800" />
            </div>
          </div>
          
          <div className="bg-yellow-100 border-2 border-yellow-300 rounded-2xl p-6 max-w-md mx-auto mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Let's start learning!</h2>
            <p className="text-gray-600">
              You'll get a little smarter every day—starting now.
            </p>
          </div>
        </div>

        {/* Concept Content */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                {tutorialContent?.title || 'Tutorial Content'}
              </h2>
              <p className="text-slate-600">
                {tutorialContent?.description || "Let's master the fundamentals before practicing"}
              </p>
            </div>

            {/* Tutorial Explanation */}
            {tutorialContent?.explanation ? (
              <div className="prose max-w-none mb-8">
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-lg">
                  {tutorialContent.explanation}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 text-lg">Loading tutorial content...</p>
              </div>
            )}

            {/* Key Learning Points */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Key Learning Objectives</h3>
              </div>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Master step-by-step problem solving techniques</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Learn to avoid common mathematical mistakes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Practice with guided solutions and immediate feedback</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Build confidence through personalized examples</span>
                </li>
              </ul>
            </div>

            {/* Tutorial Examples */}
            {tutorialContent?.examples && tutorialContent.examples.length > 0 && (
              <div className="space-y-6 mt-8">
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Calculator className="w-4 h-4 text-white" />
                  </div>
                  Step-by-Step Examples
                </h3>
                <div className="grid gap-6">
                  {tutorialContent.examples.map((example: string, index: number) => (
                    <div key={index} className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <h4 className="font-bold text-blue-800 text-lg">Worked Example {index + 1}</h4>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-100">
                        <div className="text-blue-700 whitespace-pre-wrap leading-relaxed text-base">
                          {formatMathExpression(example)}
                        </div>
                      </div>
                      {index < tutorialContent.examples.length - 1 && (
                        <div className="mt-4 text-center">
                          <div className="inline-flex items-center gap-2 text-blue-600 text-sm font-medium">
                            <ArrowDown className="w-4 h-4" />
                            Next Example
                            <ArrowDown className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Study Tips */}
                <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 mt-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Lightbulb className="w-6 h-6 text-amber-600" />
                    <h4 className="font-bold text-amber-800 text-lg">Study Tips</h4>
                  </div>
                  <ul className="space-y-2 text-amber-700">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>Work through each example step by step</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>Write down your own notes for each solution method</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>Ask questions in the AI chat if anything is unclear</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>Practice the methods on your own before moving to the next section</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Concepts Completed</h3>
                <p className="text-slate-600 text-sm">Ready for interactive learning</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">1/3</div>
              <div className="text-sm text-slate-500">Steps Complete</div>
            </div>
          </div>
        </div>

        {/* Brilliant-style Continue Button */}
        <div className="text-center">
          <Button 
            onClick={() => {
              console.log('Moving to chat step');
              setCurrentStep('chat');
            }}
            className="bg-black hover:bg-gray-800 text-white px-12 py-4 rounded-full font-semibold text-lg shadow-lg transform hover:scale-105 transition-all duration-200 min-w-48"
            disabled={!tutorialContent}
          >
            {tutorialContent ? "Continue" : "Loading..."}
          </Button>
          
          <div className="mt-4 text-sm text-gray-500">
            Next: Get AI help with questions
          </div>
        </div>
      </div>
    </div>
  );

  const renderChatStep = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={() => setCurrentStep('concepts')} variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Chat with Tsebo</h1>
              <p className="text-slate-600">Ask questions about the lesson</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-green-600 font-medium">Concepts</span>
            </div>
            <div className="w-8 h-0.5 bg-blue-500"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
              <span className="text-blue-600 font-medium">Tsebo Chat</span>
            </div>
            <div className="w-8 h-0.5 bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-slate-500 text-sm font-bold">3</div>
              <span className="text-slate-500">Practice</span>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[600px] flex flex-col">
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-purple-500' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className={`p-4 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-purple-500 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{formatMathExpression(message.content)}</p>
                      <p className={`text-xs mt-2 ${message.type === 'user' ? 'text-purple-100' : 'text-slate-500'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-slate-100 p-4 rounded-2xl rounded-bl-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="border-t p-4 bg-slate-50">
            <div className="flex gap-3">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask a question about the lesson..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center mt-6">
          <Button 
            onClick={() => setCurrentStep('practice')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg rounded-xl"
          >
            Start Practice
            <PenTool className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Practice step with interactive question cards
  const [practiceCurrentQuestion, setPracticeCurrentQuestion] = useState(0);
  const [practiceSelectedAnswers, setPracticeSelectedAnswers] = useState<Record<number, string>>({});
  const [showCorrectFeedback, setShowCorrectFeedback] = useState<Record<number, boolean>>({});
  
  const renderPracticeStep = () => {
    const questions = tutorialContent?.questions || [];
    const currentQ = questions[practiceCurrentQuestion];
    
    const handleAnswerSelect = (answer: string) => {
      setPracticeSelectedAnswers(prev => ({ ...prev, [practiceCurrentQuestion]: answer }));
      
      // Show correct feedback like Brilliant
      if (answer === currentQ?.answer) {
        setShowCorrectFeedback(prev => ({ ...prev, [practiceCurrentQuestion]: true }));
        
        // Auto advance after showing feedback
        setTimeout(() => {
          if (practiceCurrentQuestion < questions.length - 1) {
            setPracticeCurrentQuestion(practiceCurrentQuestion + 1);
          }
        }, 2000);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Brilliant-style header with progress */}
          <div className="flex items-center justify-between mb-8">
            <Button onClick={() => setCurrentStep('chat')} variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            {/* Progress bar */}
            <div className="flex-1 mx-8">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 font-medium">3 of 3</div>
          </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-green-600 font-medium">Concepts</span>
            </div>
            <div className="w-8 h-0.5 bg-green-500"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-green-600 font-medium">AI Chat</span>
            </div>
            <div className="w-8 h-0.5 bg-green-500"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
              <span className="text-green-600 font-medium">Practice</span>
            </div>
          </div>
        </div>

        {/* Practice Instructions */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Practice Instructions</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">Work through each question step by step</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">Use the solution guides to check your work</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">Take your time to understand each solution</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">Complete all questions to finish the tutorial</span>
            </div>
          </div>
        </div>

        {/* Practice Questions */}
        <div className="space-y-8">
          {tutorialContent?.questions && tutorialContent.questions.map((question: any, index: number) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Question {index + 1}</h3>
                    <p className="text-slate-500 text-sm">Practice Problem</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {question.marks} mark{question.marks !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              {/* Question Content */}
              <div className="bg-slate-50 p-6 rounded-xl mb-6">
                <p className="text-slate-800 text-lg leading-relaxed whitespace-pre-wrap">
                  {formatMathExpression(question.question)}
                </p>
              </div>

              {/* Answer Section */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Answer:
                  </label>
                  <Input 
                    placeholder="Enter your detailed solution here..."
                    className="text-lg p-4 border-2 border-slate-200 focus:border-green-500 transition-colors"
                  />
                </div>
                
                {/* Solution Guide */}
                {question.answer && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-green-600" />
                      <h4 className="font-bold text-green-800 text-lg">Complete Solution Guide</h4>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-green-100">
                      <p className="text-green-700 leading-relaxed whitespace-pre-wrap">
                        {formatMathExpression(question.answer)}
                      </p>
                    </div>
                    <div className="mt-3 text-sm text-green-600">
                      💡 Compare your solution with this step-by-step guide
                    </div>
                  </div>
                )}
              </div>

              {/* Progress indicator */}
              {index < tutorialContent.questions.length - 1 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                    <ArrowDown className="w-4 h-4" />
                    <span>Continue to Question {index + 2}</span>
                    <ArrowDown className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Completion Summary */}
        <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-6 rounded-xl border border-green-200 mt-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to Complete?</h3>
            <p className="text-slate-600 mb-4">
              You've worked through all the practice questions! Complete the tutorial to earn your progress points.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Concepts Learned
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                AI Chat Used
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Practice Completed
              </span>
            </div>
          </div>
        </div>

        {/* Complete Button */}
        <div className="text-center mt-8">
          <Button 
            onClick={handleCompleteTutorial}
            disabled={isCompleting}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompleting ? 'Completing...' : 'Complete Tutorial'}
            <CheckCircle className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (currentStep === 'concepts') return renderConceptsStep();
  if (currentStep === 'chat') return renderChatStep();
  return renderPracticeStep();
};

export default TutorialLearning;