# Screen Testing Guide

## Overview
This document provides comprehensive testing instructions for all working screens to prevent regression when context is lost or changes are made.

## Working Screens Documentation

### 1. HomeworkFeedback.tsx
**Location**: `client/src/pages/HomeworkFeedback.tsx`
**Status**: ✅ FULLY FUNCTIONAL - User confirmed all features work

#### Critical Elements to Test:
- **"Ask AI" buttons** (lines 733-748): Must appear for each question
- **Question-specific chat** (lines 751-837): Collapsible interface per question
- **Real AI feedback** (lines 621-729): Shows tutorialData.feedback.questionAnalysis
- **Score display** (lines 587-601): Accurate without string concatenation
- **Loading states**: Proper "Thinking..." indicators

#### Test Steps:
1. Complete homework and navigate to feedback screen
2. Verify "Ask AI" button appears for each question
3. Click "Ask AI" - should open collapsible chat (NOT modal)
4. Type question and send - should get real AI response
5. Verify feedback shows actual AI analysis (not generic messages)
6. Check score calculation displays correctly

### 2. TutorialExerciseFeedback.tsx  
**Location**: `client/src/pages/TutorialExerciseFeedback.tsx`
**Status**: ✅ FULLY FUNCTIONAL - User confirmed all features work

#### Critical Elements to Test:
- **Tutorial completion header** (lines 491-493): "Tutorial Completed!" with trophy
- **"Ask AI" buttons** (lines 650-666): Must appear for each tutorial question
- **Question-specific chat** (lines 668-782): Collapsible interface per question
- **Real tutorial feedback** (lines 634-648): tutorialData.feedback.questionAnalysis
- **AI Learning Assistant** (lines 789-902): General tutorial chat
- **Score display** (lines 497-521): Accurate percentage and marks
- **Strengths/Improvements** (lines 904-959): Real feedback data

#### Test Steps:
1. Complete tutorial exercise and navigate to feedback screen
2. Verify "Tutorial Completed!" header with trophy icon
3. Check score and percentage display accurately
4. Verify "Ask AI" button appears for each question
5. Click "Ask AI" - should open collapsible chat (NOT modal)
6. Test question-specific chat functionality
7. Test AI Learning Assistant general chat
8. Verify strengths and improvements show real data

### 3. TutorialCard.tsx
**Location**: `client/src/components/TutorialCard.tsx`
**Status**: ✅ WORKING - AI responses without toast notifications

#### Critical Elements to Test:
- **Step navigation** (lines 67-84): Next/Previous functionality
- **AI chat for steps** (lines 87-127): No "AI Response Ready!" toasts
- **AI chat for examples** (lines 130-170): No popup notifications
- **Tutorial completion**: Proper flow handling

#### Test Steps:
1. Navigate through tutorial steps
2. Use AI chat for step explanations
3. Use AI chat for example questions
4. Verify NO toast notifications appear after AI responses
5. Complete tutorial and verify proper completion flow

## User Interface Preferences

### Critical User Requirements:
- **NO modal dialogs**: All chat interfaces must be collapsible containers
- **NO toast notifications**: AI responses should integrate cleanly without popups
- **Real data only**: Display actual AI feedback, not placeholder messages
- **Collapsible sections**: User prefers inline expandable areas over popup dialogs

## Testing Commands

### Automated Tests:
```bash
npm test ui-validation.test.ts
```

### Manual Validation:
Run through the manual checklist in `tests/ui-validation.test.ts` after any changes.

## Common Issues to Prevent

### 1. String Concatenation Bug
- **Issue**: Assessment counts showing "354" instead of 39
- **Fix**: Use Number() conversion before addition
- **Test**: Verify assessment count increments by exactly 1 per homework

### 2. Modal vs Collapsible
- **Issue**: Using modal dialogs instead of collapsible sections
- **Fix**: Use inline expandable containers with isOpen state
- **Test**: Verify chat opens inline, not as popup

### 3. Generic vs Real Feedback
- **Issue**: Showing "This needs improvement" instead of AI analysis
- **Fix**: Use tutorialData.feedback.questionAnalysis
- **Test**: Verify feedback shows specific AI-generated content

### 4. Toast Notifications
- **Issue**: "AI Response Ready!" popups after responses
- **Fix**: Remove toast calls from AI response handlers
- **Test**: Verify no popup notifications after AI responses

## Recovery Protocol

If functionality breaks:

1. **Check documentation**: Review this guide and `docs/WORKING_FEATURES.md`
2. **Run tests**: Execute automated validation tests
3. **Compare implementation**: Check current code against documented working patterns
4. **Follow user preferences**: Ensure collapsible containers, no modals, real data
5. **Test manually**: Validate all critical elements work as documented

## Memory Reset Protocol

When starting fresh:
1. **Read replit.md first** for user preferences and context
2. **Review this testing guide** for screen functionality
3. **Run tests before changes** to establish baseline
4. **Document any new findings** to prevent future regression
5. **Ask user permission** before modifying working screens

## Validation Frequency

- **After each change**: Run relevant automated tests
- **Before release**: Complete full manual checklist  
- **After memory reset**: Validate critical screens still work
- **When user reports issues**: Cross-reference with documented functionality