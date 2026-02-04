import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Bot, User, CheckCircle, Star, BookOpen, Trophy, Target, Sparkles, GraduationCap } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface HomeworkFeedbackProps {
  homework: {
    id: string;
    title: string;
    description: string;
    questions: Array<{
      id: number;
      question: string;
      answer: string;
      marks: number;
    }>;
  };
  submittedAnswers: Array<{
    questionId: number;
    answer: string;
  }>;
  onClose: () => void;
}

export default function HomeworkFeedback({ homework, submittedAnswers, onClose }: HomeworkFeedbackProps) {
  const [isGeneratingExercise, setIsGeneratingExercise] = useState(false);
  const [submissionData, setSubmissionData] = useState<any>(null);
  
  // Load actual submission data from localStorage or API
  useEffect(() => {
    const loadSubmissionData = () => {
      try {
        const storedSubmission = localStorage.getItem(`homework_submission_${homework.id}`);
        if (storedSubmission) {
          const submission = JSON.parse(storedSubmission);
          setSubmissionData(submission);
        }
      } catch (error) {
        console.error('Error loading submission data:', error);
      }
    };
    
    loadSubmissionData();
  }, [homework.id]);

  // Use real data if available, otherwise fallback to static data
  const score = submissionData?.score ? Math.round((submissionData.score / submissionData.totalMarks) * 100) : 85;
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const totalMarks = submissionData?.totalMarks || homework.questions.reduce((sum, q) => sum + q.marks, 0);
  const earnedMarks = submissionData?.score || Math.floor((score / 100) * totalMarks);
  
  const handleGenerateExercise = async () => {
    if (!submissionData?.feedback?.improvements) {
      alert('No improvement areas found in your feedback. Cannot generate tutorial exercise.');
      return;
    }
    
    setIsGeneratingExercise(true);
    
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const weaknessAreas = submissionData.feedback.improvements;
      
      const response = await apiRequest('/api/generate-tutorial-exercise', {
        method: 'POST',
        body: JSON.stringify({
          homeworkId: homework.id,
          weaknessAreas: weaknessAreas,
          subject: 'mathematics',
          grade: currentUser.gradeLevel || '8'
        }),
      });
      
      if (response.ok) {
        const tutorialExercise = await response.json();
        
        // CRITICAL: Invalidate generation count cache so UI updates immediately
        queryClient.invalidateQueries({ queryKey: ['/api/student/daily-exercise-generations'] });
        
        // Show success message
        alert(`Tutorial exercise "${tutorialExercise.title}" has been created! Check your calendar to access it.`);
        
        // Close the feedback modal
        onClose();
      } else {
        const error = await response.json();
        alert(`Failed to generate tutorial exercise: ${error.message}`);
      }
    } catch (error) {
      console.error('Error generating tutorial exercise:', error);
      alert('Failed to generate tutorial exercise. Please try again.');
    } finally {
      setIsGeneratingExercise(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Homework Completed!</h2>
              <p className="text-lg text-gray-600">{homework.title}</p>
              <p className="text-sm text-gray-500">Great job! Your submission has been processed.</p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex-1 flex">
          {/* Results Panel */}
          <div className="w-1/3 p-6 border-r border-gray-200 bg-gray-50">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Target className="w-6 h-6 mr-2 text-blue-600" />
              Your Results
            </h3>
            
            {/* Score Display */}
            <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-3xl p-6 mb-6 shadow-lg">
              <div className="text-center">
                <div className="text-5xl font-bold text-green-600 mb-3">{score}%</div>
                <div className="text-xl font-bold text-gray-700 mb-3">Grade: {grade}</div>
                <div className="text-sm text-gray-600 mb-4">{earnedMarks}/{totalMarks} points earned</div>
                <div className="flex justify-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-6 h-6 ${
                        i < Math.floor(score / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Questions and Answers */}
            <div className="space-y-4 mb-6">
              <h4 className="font-bold text-gray-700 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                Questions & Answers
              </h4>
              {homework.questions.map((q, index) => {
                const userAnswer = submittedAnswers.find(a => a.questionId === q.id);
                const isCorrect = submissionData?.feedback?.questionAnalysis?.[index]?.isCorrect;
                const feedback = submissionData?.feedback?.questionAnalysis?.[index]?.feedback;
                
                return (
                  <div key={q.id} className="p-4 bg-white rounded-xl shadow-sm border">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 mb-2">Question {index + 1}</div>
                        <div className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{q.question}</div>
                        
                        {/* User's Answer */}
                        <div className="mb-2">
                          <div className="text-xs font-medium text-gray-600 mb-1">Your Answer:</div>
                          <div className={`text-sm p-2 rounded-lg ${
                            isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 
                            'bg-red-50 text-red-800 border border-red-200'
                          }`}>
                            {userAnswer?.answer || 'Not answered'}
                          </div>
                        </div>
                        
                        {/* Correct Answer */}
                        <div className="mb-2">
                          <div className="text-xs font-medium text-gray-600 mb-1">Correct Answer:</div>
                          <div className="text-sm p-2 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
                            {q.answer}
                          </div>
                        </div>
                        
                        {/* Question Feedback */}
                        {feedback && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-gray-600 mb-1">Feedback:</div>
                            <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded-lg border border-gray-200">
                              {feedback}
                            </div>
                          </div>
                        )}
                        
                        {/* Points */}
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                            {q.marks} marks
                          </span>
                          <div className="flex items-center space-x-1">
                            {isCorrect ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <X className="w-4 h-4 text-red-500" />
                            )}
                            <span className={`text-xs font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Performance Insights */}
            <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
              <h4 className="font-bold text-gray-700 mb-3">Performance Insights</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy</span>
                  <span className="font-medium text-green-600">{score}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time Taken</span>
                  <span className="font-medium text-blue-600">12 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Difficulty</span>
                  <span className="font-medium text-amber-600">Medium</span>
                </div>
              </div>
            </div>

            {/* AI-Powered Learning Section */}
            {submissionData?.feedback?.improvements && submissionData.feedback.improvements.length > 0 && (
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl p-6 shadow-sm border">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">AI-Powered Learning</h4>
                    <p className="text-xs text-gray-600">Personalized tutorial based on your performance</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">Areas for improvement identified:</p>
                  <ul className="text-xs space-y-1">
                    {submissionData.feedback.improvements.slice(0, 2).map((improvement: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                        <span className="text-gray-600">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={handleGenerateExercise}
                  disabled={isGeneratingExercise}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 shadow-lg"
                >
                  {isGeneratingExercise ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Generating Tutorial...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Generate Tutorial Exercise
                    </div>
                  )}
                </Button>
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Creates a personalized practice exercise to help you master these concepts
                </p>
              </div>
            )}
          </div>

          {/* Chat Panel - Static UI Design */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">AI Learning Assistant</h3>
                    <p className="text-sm text-gray-600">Your personal homework tutor & learning companion</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500 font-medium">Online</span>
                </div>
              </div>
            </div>

            {/* Static Chat Messages for UI Design */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {/* AI Welcome Message */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-5 shadow-sm border">
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed text-gray-800 mb-2">
                          🎉 Outstanding work on completing "{homework.title}"! You achieved {score}% - that's a solid {grade} grade!
                        </p>
                        <p className="text-sm leading-relaxed text-gray-800 mb-3">
                          I'm your AI learning assistant, and I'm here to help you understand the concepts better and improve your skills. What would you like to explore?
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full">Math Expert</span>
                          <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full">Available 24/7</span>
                          <span className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full">Personalized Help</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sample User Message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start space-x-3">
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed text-white">
                          Can you explain question 2? I want to make sure I understand the concept properly.
                        </p>
                        <p className="text-xs text-blue-100 mt-2">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="w-7 h-7 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sample AI Response */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-5 shadow-sm border">
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <BookOpen className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed text-gray-800 mb-3">
                          Excellent question! Let me break down Question 2 about factoring polynomials:
                        </p>
                        <div className="bg-blue-50 rounded-xl p-4 mb-3 border border-blue-100">
                          <p className="text-sm text-gray-700 font-medium mb-2">Step-by-Step Solution:</p>
                          <div className="space-y-1 text-sm text-gray-700">
                            <p><strong>Step 1:</strong> Look for common factors first</p>
                            <p><strong>Step 2:</strong> Apply factoring techniques (grouping, difference of squares, etc.)</p>
                            <p><strong>Step 3:</strong> Verify by expanding your answer</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Your approach was actually very good! The key insight is recognizing the pattern. Would you like me to show you some similar practice problems to reinforce this concept?
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs">
                            📚 More Examples
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs">
                            🎯 Practice Problems
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Typing Indicator (Static Animation) */}
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Chat Input - Static UI Design */}
            <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex space-x-4 mb-4">
                <Input
                  placeholder="Ask me anything about your homework... (e.g., 'Explain question 1' or 'How can I improve?')"
                  className="flex-1 border-2 border-gray-200 focus:border-blue-400 rounded-xl h-12 text-sm"
                />
                <Button className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl h-12">
                  <Send className="w-5 h-5 mr-2" />
                  Send
                </Button>
              </div>
              
              <div className="flex items-center justify-center space-x-3">
                <Button variant="outline" size="sm" className="text-xs px-4 py-2 rounded-full">
                  💡 Explain concepts
                </Button>
                <Button variant="outline" size="sm" className="text-xs px-4 py-2 rounded-full">
                  📈 Study tips
                </Button>
                <Button variant="outline" size="sm" className="text-xs px-4 py-2 rounded-full">
                  🎯 Practice problems
                </Button>
                <Button variant="outline" size="sm" className="text-xs px-4 py-2 rounded-full">
                  🔍 Review mistakes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}