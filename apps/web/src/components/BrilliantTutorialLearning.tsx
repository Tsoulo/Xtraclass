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

const BrilliantTutorialLearning = ({ exercise, onClose }: TutorialLearningProps) => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<'concepts' | 'chat' | 'practice'>('concepts');
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Practice step states
  const [practiceCurrentQuestion, setPracticeCurrentQuestion] = useState(0);
  const [practiceSelectedAnswers, setPracticeSelectedAnswers] = useState<Record<number, string>>({});
  const [showCorrectFeedback, setShowCorrectFeedback] = useState<Record<number, boolean>>({});
  
  // Parse tutorial content from JSON string if needed
  const tutorialContent = useMemo(() => {
    console.log('Tutorial exercise data:', exercise);
    
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
        return { explanation: contentField };
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
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await apiRequest(`/api/tutorial-chat/${exercise.id}`, {
        method: 'POST',
        body: JSON.stringify({ message: inputMessage })
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.reply,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCompleteTutorial = async () => {
    setIsCompleting(true);
    try {
      await apiRequest(`/api/complete-exercise/${exercise.id}`, {
        method: 'POST'
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/exercises'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      
      console.log('Exercise completed successfully');
      onClose();
      setLocation('/');
    } catch (error) {
      console.error('Failed to complete exercise:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const formatMathExpression = (text: string) => {
    if (!text) return text;
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/x\^(\d+)/g, 'x<sup>$1</sup>')
      .replace(/(\d+)\^(\d+)/g, '$1<sup>$2</sup>');
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

        {/* Interactive Learning Content - Brilliant Style */}
        <div className="space-y-8">
          {/* Main concept card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">{exercise.title}</h3>
              {tutorialContent?.explanation && (
                <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                  {tutorialContent.explanation}
                </p>
              )}
            </div>
          </div>

          {/* Interactive Examples - Brilliant style cards */}
          {tutorialContent?.examples && tutorialContent.examples.length > 0 && (
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-800 text-center">Let's explore with examples</h4>
              
              {tutorialContent.examples.map((example: string, index: number) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden">
                  <div className="bg-green-50 px-6 py-4 border-b border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-semibold text-green-800">Example {index + 1}</span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-300">
                      <p className="text-gray-700 text-lg font-mono">{example}</p>
                    </div>
                    
                    {/* Brilliant-style interaction hint */}
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
                        <Calculator className="w-4 h-4" />
                        Try to understand the pattern
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Brilliant-style Continue Button */}
        <div className="text-center mt-12">
          <Button 
            onClick={() => setCurrentStep('chat')} 
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
        {/* Header with progress */}
        <div className="flex items-center justify-between mb-8">
          <Button onClick={() => setCurrentStep('concepts')} variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 mx-8">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: '67%' }}></div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 font-medium">2 of 3</div>
        </div>

        {/* AI Chat Interface */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Chat with Tsebo</h1>
              <p className="text-slate-600">Ask questions about the lesson</p>
            </div>
          </div>

          <ScrollArea className="h-80 mb-6 border rounded-lg p-4">
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-2 max-w-xs lg:max-w-md ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' ? 'bg-blue-500' : 'bg-gray-500'
                    }`}>
                      {message.type === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                    </div>
                    <div className={`p-3 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question about the lesson..."
              disabled={isTyping}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700" disabled={isTyping}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center mt-8">
          <Button 
            onClick={() => setCurrentStep('practice')}
            className="bg-black hover:bg-gray-800 text-white px-12 py-4 rounded-full font-semibold text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Continue
          </Button>
          <div className="mt-4 text-sm text-gray-500">
            Next: Interactive practice questions
          </div>
        </div>
      </div>
    </div>
  );

  const renderPracticeStep = () => {
    const sampleQuestions = [
      {
        question: "Are you more likely to draw a square or a 2 from this deck?",
        options: ["Square", "2", "Equally likely"],
        answer: "Square"
      }
    ];
    
    const questions = tutorialContent?.questions || sampleQuestions;
    const currentQ = questions[practiceCurrentQuestion];
    
    const handleAnswerSelect = (answer: string) => {
      setPracticeSelectedAnswers(prev => ({ ...prev, [practiceCurrentQuestion]: answer }));
      
      // Show correct feedback like Brilliant
      if (answer === currentQ?.answer || answer === "Square") {
        setShowCorrectFeedback(prev => ({ ...prev, [practiceCurrentQuestion]: true }));
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

          {/* Interactive Practice Question - Brilliant Style */}
          {questions.length > 0 && currentQ && (
            <div className="text-center">
              <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
                {/* Question */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">
                    {currentQ.question}
                  </h3>
                  
                  {/* Visual question area - like Brilliant's card system */}
                  <div className="mb-8">
                    <div className="inline-block bg-green-600 rounded-2xl p-6 relative">
                      {/* Question cards */}
                      <div className="flex gap-4 items-center">
                        <div className="bg-white rounded-lg p-4 shadow-lg">
                          <div className="w-12 h-12 bg-gray-100 rounded border-2 border-dashed border-gray-400 flex items-center justify-center">
                            <span className="text-lg font-bold text-gray-600">1</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-2">Draw 1</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-lg">
                          <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center">
                            <span className="text-lg font-bold text-white">2</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-2">Draw 2</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-lg">
                          <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center">
                            <span className="text-lg font-bold text-white">3</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-2">Draw 3</div>
                        </div>
                      </div>
                      
                      {/* Visual deck */}
                      <div className="mt-4 flex justify-center">
                        <div className="bg-green-800 rounded-lg p-3">
                          <div className="w-16 h-16 bg-gray-800 rounded flex items-center justify-center">
                            <span className="text-white font-bold">■</span>
                          </div>
                        </div>
                        
                        <div className="ml-8 bg-white rounded-lg p-3 border-2 border-gray-300">
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-2xl font-bold text-gray-400">2</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Answer selection */}
                  {!practiceSelectedAnswers[practiceCurrentQuestion] && (
                    <div className="space-y-4">
                      <p className="text-lg text-gray-700 mb-6">
                        Are you more likely to draw a square or a 2 from this deck?
                      </p>
                      
                      <div className="space-y-3">
                        {['Square', '2', 'Equally likely'].map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAnswerSelect(option)}
                            className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-green-300 bg-white hover:bg-green-50 transition-all duration-200 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-600">
                                  {String.fromCharCode(65 + idx)}
                                </span>
                              </div>
                              <span className="text-lg text-gray-800">{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Brilliant-style feedback */}
                  {showCorrectFeedback[practiceCurrentQuestion] && (
                    <div className="mt-8">
                      {/* Success feedback bar - like Brilliant */}
                      <div className="bg-green-100 border-2 border-green-300 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                            <span className="text-xl font-bold text-green-800">Correct!</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-700">
                            <Sparkles className="w-5 h-5" />
                            <span className="font-bold">+15 XP</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-4">
                          <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-medium transition-colors">
                            Why?
                          </button>
                          <button 
                            onClick={() => {
                              if (practiceCurrentQuestion < questions.length - 1) {
                                setPracticeCurrentQuestion(practiceCurrentQuestion + 1);
                                setShowCorrectFeedback(prev => ({ ...prev, [practiceCurrentQuestion]: false }));
                              } else {
                                handleCompleteTutorial();
                              }
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-medium transition-colors"
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Question progress */}
              <div className="mt-8 text-sm text-gray-500">
                Question {practiceCurrentQuestion + 1} of {questions.length}
              </div>
            </div>
          )}

          {/* Completion Section */}
          {practiceCurrentQuestion >= questions.length - 1 && showCorrectFeedback[practiceCurrentQuestion] && (
            <div className="mt-12 text-center">
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-8 rounded-2xl border-2 border-green-200">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Tutorial Complete!</h3>
                <p className="text-gray-600 mb-6">
                  Great job! You've mastered the concepts and practiced your skills.
                </p>
                <Button 
                  onClick={handleCompleteTutorial}
                  disabled={isCompleting}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg rounded-xl disabled:opacity-50"
                >
                  {isCompleting ? 'Completing...' : 'Finish & Earn Points'}
                  <Award className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (currentStep === 'concepts') return renderConceptsStep();
  if (currentStep === 'chat') return renderChatStep();
  return renderPracticeStep();
};

export default BrilliantTutorialLearning;