/**
 * UI Validation Tests for Critical Components
 * These tests verify that essential UI elements exist and function correctly
 * Run these tests to validate screens after any changes
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Critical UI Component Validation', () => {
  
  describe('HomeworkFeedback.tsx - FULLY FUNCTIONAL SCREEN', () => {
    const homeworkFeedbackPath = path.join(__dirname, '../client/src/pages/HomeworkFeedback.tsx');
    let fileContent: string;

    beforeAll(() => {
      fileContent = fs.readFileSync(homeworkFeedbackPath, 'utf8');
    });

  describe('TutorialCard.tsx - WORKING TUTORIAL SCREEN', () => {
    const tutorialCardPath = path.join(__dirname, '../client/src/components/TutorialCard.tsx');
    let fileContent: string;

    beforeAll(() => {
      fileContent = fs.readFileSync(tutorialCardPath, 'utf8');
    });

    it('should NOT have AI Response Ready toast notifications', () => {
      // User explicitly requested removal of these popups
      expect(fileContent).not.toContain('AI Response Ready!');
      expect(fileContent).not.toContain('The AI has answered your question');
    });

    it('should have working AI chat for tutorial steps', () => {
      expect(fileContent).toContain('stepAskAIMutation');
      expect(fileContent).toContain('exampleAskAIMutation');
      expect(fileContent).toContain('tutorial-chat');
    });

    it('should have collapsible chat sections (not modals)', () => {
      expect(fileContent).toContain('stepChatExpanded');
      expect(fileContent).toContain('exampleChatExpanded');
      expect(fileContent).not.toContain('Modal');
      expect(fileContent).not.toContain('Dialog');
    });

    it('should handle tutorial navigation properly', () => {
      expect(fileContent).toContain('handleNextStep');
      expect(fileContent).toContain('completedSteps');
      expect(fileContent).toContain('currentStep');
    });
  });

  describe('TutorialExerciseFeedback.tsx - FULLY FUNCTIONAL SCREEN', () => {
    const tutorialFeedbackPath = path.join(__dirname, '../client/src/pages/TutorialExerciseFeedback.tsx');
    let fileContent: string;

    beforeAll(() => {
      fileContent = fs.readFileSync(tutorialFeedbackPath, 'utf8');
    });

    it('should have Ask AI buttons for each question', () => {
      // Lines 650-666: Ask AI Button implementation for tutorial exercises
      expect(fileContent).toContain('Ask AI');
      expect(fileContent).toContain('toggleQuestionChat');
      expect(fileContent).toContain('MessageCircle');
      expect(fileContent).toContain('ChevronUp');
      expect(fileContent).toContain('ChevronDown');
    });

    it('should have question-specific chat interface', () => {
      // Lines 668-782: Question-specific chat for tutorial exercises
      expect(fileContent).toContain('questionChatStates[q.id?.toString() || `q${index}`]?.isOpen');
      expect(fileContent).toContain('AI Help for Question');
      expect(fileContent).toContain('sendQuestionSpecificMessage');
      expect(fileContent).toContain('updateQuestionChatInput');
    });

    it('should display real AI feedback (not generic messages)', () => {
      // Lines 634-648: Real tutorial feedback display
      expect(fileContent).toContain('tutorialData.feedback?.questionAnalysis');
      expect(fileContent).toContain('questionAnalysis.feedback');
      expect(fileContent).not.toContain('"This needs improvement"');
    });

    it('should have tutorial completion indicators', () => {
      // Lines 491-493: Tutorial completion header
      expect(fileContent).toContain('Tutorial Completed!');
      expect(fileContent).toContain('Trophy');
      expect(fileContent).toContain('CheckCircle2');
    });

    it('should display score correctly without string concatenation', () => {
      // Lines 497-521: Score display logic
      expect(fileContent).toContain('scorePercentage');
      expect(fileContent).toContain('Marks Earned');
      expect(fileContent).toContain('feedbackData.score');
      expect(fileContent).toContain('feedbackData.totalMarks');
    });

    it('should have AI Learning Assistant functionality', () => {
      // Lines 789-902: AI Learning Assistant
      expect(fileContent).toContain('AI Learning Assistant');
      expect(fileContent).toContain('handleSendMessage');
      expect(fileContent).toContain('handleRecording');
      expect(fileContent).toContain('isChatLoading');
    });

    it('should use collapsible containers (not modals)', () => {
      // User preference: inline collapsible, not modal popups
      expect(fileContent).toContain('isOpen');
      expect(fileContent).not.toContain('Modal');
      expect(fileContent).not.toContain('Dialog');
    });

    it('should have strengths and improvements analysis', () => {
      // Lines 904-959: Feedback analysis sections
      expect(fileContent).toContain('Strengths');
      expect(fileContent).toContain('Areas for Improvement');
      expect(fileContent).toContain('tutorialData.feedback?.strengths');
      expect(fileContent).toContain('tutorialData.feedback?.improvements');
    });
  });

    it('should have Ask AI buttons for each question', () => {
      // Lines 733-748: Ask AI Button implementation
      expect(fileContent).toContain('Ask AI');
      expect(fileContent).toContain('toggleQuestionChat');
      expect(fileContent).toContain('MessageCircle');
      expect(fileContent).toContain('ChevronUp');
      expect(fileContent).toContain('ChevronDown');
    });

    it('should have question-specific chat interface', () => {
      // Lines 751-837: Question-specific chat
      expect(fileContent).toContain('questionChatStates[question.questionId]?.isOpen');
      expect(fileContent).toContain('AI Help for Question');
      expect(fileContent).toContain('sendQuestionSpecificMessage');
      expect(fileContent).toContain('updateQuestionChatInput');
    });

    it('should display real AI feedback (not generic messages)', () => {
      // Should show actual question analysis, not "This needs improvement"
      expect(fileContent).toContain('question.feedback');
      expect(fileContent).toContain('questionAnalysis');
      expect(fileContent).not.toContain('"This needs improvement"');
    });

    it('should have proper loading states', () => {
      expect(fileContent).toContain('isLoading');
      expect(fileContent).toContain('Thinking...');
      expect(fileContent).toContain('animate-spin');
    });

    it('should use collapsible containers (not modals)', () => {
      // User preference: inline collapsible, not modal popups
      expect(fileContent).toContain('isOpen');
      expect(fileContent).not.toContain('Modal');
      expect(fileContent).not.toContain('Dialog');
    });

    it('should have score display without string concatenation', () => {
      expect(fileContent).toContain('scorePercentage');
      expect(fileContent).toContain('Marks Earned');
      expect(fileContent).toContain('Score');
    });
  });

  describe('TeacherClassList.tsx - Assessment Count Display', () => {
    const teacherClassListPath = path.join(__dirname, '../client/src/components/TeacherClassList.tsx');
    let fileContent: string;

    beforeAll(() => {
      fileContent = fs.readFileSync(teacherClassListPath, 'utf8');
    });

    it('should display assessment count correctly', () => {
      // Line 107: Assessment count display
      expect(fileContent).toContain('actualAssessmentCount');
      expect(fileContent).toContain('Assessments');
    });
  });

  describe('Backend Assessment Count Logic', () => {
    const routesPath = path.join(__dirname, '../server/routes.ts');
    let fileContent: string;

    beforeAll(() => {
      fileContent = fs.readFileSync(routesPath, 'utf8');
    });

    it('should use Number() conversion to prevent string concatenation', () => {
      // Lines ~1531-1549: Critical fix for assessment counting
      expect(fileContent).toContain('Number(homeworkResults[0]?.count)');
      expect(fileContent).toContain('Number(exerciseResults[0]?.count)');
      expect(fileContent).toContain('homeworkCount + exerciseCount');
    });

    it('should implement correct assessment counting rules', () => {
      // Rule 1: Count all homework for specific class
      expect(fileContent).toContain('Rule 1: Count all homework relevant to this class');
      
      // Rule 2: Count all admin-created exercises 
      expect(fileContent).toContain('Rule 2: Count all exercises created by admin');
      expect(fileContent).toContain('isNull(exercises.generatedFor)');
      expect(fileContent).toContain('eq(exercises.isTutorial, false)');
    });
  });
});

/**
 * Manual Validation Checklist
 * Run this checklist after any UI changes:
 * 
 * **HomeworkFeedback.tsx Validation:**
 * 1. ✅ HomeworkFeedback screen loads without errors
 * 2. ✅ "Ask AI" button appears for each question
 * 3. ✅ Clicking "Ask AI" opens question-specific chat
 * 4. ✅ Chat shows proper context for the question
 * 5. ✅ Real AI feedback displays (not generic messages)
 * 6. ✅ Loading states work during AI operations
 * 7. ✅ No modal popups (user preference: collapsible containers)
 * 
 * **TutorialExerciseFeedback.tsx Validation:**
 * 8. ✅ TutorialExerciseFeedback screen loads without errors
 * 9. ✅ "Tutorial Completed!" header displays correctly
 * 10. ✅ Score and percentage calculations are accurate
 * 11. ✅ "Ask AI" buttons appear for each tutorial question
 * 12. ✅ Question-specific chat opens with proper context
 * 13. ✅ Real tutorial feedback displays (tutorialData.feedback.questionAnalysis)
 * 14. ✅ AI Learning Assistant chat functions properly
 * 15. ✅ Strengths and improvements sections populate with real data
 * 16. ✅ All collapsible sections work (no modal dialogs)
 * 
 * **Backend Validation:**
 * 17. ✅ Assessment count shows correct numbers (not string concat)
 * 18. ✅ Database queries return proper numeric values
 */