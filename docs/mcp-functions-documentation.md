# MCP (Model Context Protocol) Functions Documentation

## Overview
This document provides comprehensive documentation for all MCP prompt functions used in the XtraClass.ai Educational AI system. The MCP server exposes AI-powered educational tools through a standardized protocol interface.

## Server Information
- **Service Name**: Educational AI MCP Server
- **Version**: 1.0.0
- **AI Model**: OpenAI GPT-3.5-turbo
- **Protocol**: Model Context Protocol (MCP)
- **Capabilities**: Exercise generation, feedback analysis, adaptive learning, CAPS curriculum alignment

---

## Available MCP Functions

### 1. generate_exercise
**Purpose**: Generate educational exercises based on curriculum context and difficulty level

**Input Schema**:
```json
{
  "context": {
    "grade": "string (required)", // e.g., "8", "9", "10"
    "subject": "string (required)", // e.g., "mathematics", "science"
    "topic": "string (required)", // e.g., "Algebra", "Geometry"
    "theme": "string (optional)", // Specific theme within topic
    "difficulty": "string (required)", // "easy", "medium", "hard"
    "syllabus": "string (required)", // "CAPS", "IEB"
    "term": "string (optional)", // Academic term
    "week": "string (optional)" // Week number
  },
  "numQuestions": "number (1-20, default: 5)",
  "includeAnswers": "boolean (default: true)"
}
```

**Example Usage**:
```javascript
const exerciseRequest = {
  context: {
    grade: "8",
    subject: "mathematics", 
    topic: "Algebra",
    theme: "Linear Equations",
    difficulty: "medium",
    syllabus: "CAPS",
    term: "1",
    week: "3"
  },
  numQuestions: 5,
  includeAnswers: true
};
```

**Output**: Returns a `GeneratedExercise` object with structured questions, answers, and metadata.

---

### 2. generate_feedback
**Purpose**: Generate detailed AI feedback for student exercise submissions with question-by-question analysis

**Input Schema**:
```json
{
  "exercise": {
    "id": "string (required)",
    "title": "string (required)",
    "questions": [
      {
        "id": "string (required)",
        "question": "string (required)",
        "answer": "string (required)",
        "marks": "number (required)"
      }
    ]
  },
  "studentAnswers": ["string array (required)"], // Student answers in order
  "context": {
    "grade": "string (required)",
    "subject": "string (required)", 
    "topic": "string (required)",
    "difficulty": "string (required)", // "easy", "medium", "hard"
    "syllabus": "string (required)" // "CAPS", "IEB"
  }
}
```

**Example Usage**:
```javascript
const feedbackRequest = {
  exercise: {
    id: "48",
    title: "Math 301 Admin",
    questions: [
      {
        id: "230",
        question: "Solve for x: 3x + 5 = 17",
        answer: "4",
        marks: 5
      }
    ]
  },
  studentAnswers: ["17", "3", "6"], // Student responses
  context: {
    grade: "8",
    subject: "mathematics",
    topic: "Algebra", 
    difficulty: "medium",
    syllabus: "CAPS"
  }
};
```

**Output**: Returns an `ExerciseFeedback` object with overall scores, strengths, improvements, and detailed question analysis.

---

### 3. generate_tutorial
**Purpose**: Generate step-by-step tutorial content to help students understand specific topics before attempting exercises

**Input Schema**:
```json
{
  "context": {
    "grade": "string (required)",
    "subject": "string (required)",
    "topic": "string (required)", 
    "syllabus": "string (required)" // "CAPS", "IEB"
  },
  "improvementAreas": ["string array (required)"], // Areas needing focus
  "targetConcepts": ["string array (optional)"] // Key concepts to cover
}
```

**Example Usage**:
```javascript
const tutorialRequest = {
  context: {
    grade: "8",
    subject: "mathematics",
    topic: "Algebra",
    syllabus: "CAPS"
  },
  improvementAreas: [
    "Solving linear equations",
    "Combining like terms",
    "Isolating variables"
  ],
  targetConcepts: [
    "Variables and coefficients",
    "Equation balancing",
    "Step-by-step solving"
  ]
};
```

**Output**: Returns a `TutorialContent` object with explanations, examples, and practice questions.

---

### 4. generate_adaptive_exercise
**Purpose**: Generate adaptive exercises that target specific student weaknesses and improvement areas

**Input Schema**:
```json
{
  "context": {
    "grade": "string (required)",
    "subject": "string (required)",
    "topic": "string (required)",
    "difficulty": "string (required)", // "easy", "medium", "hard"  
    "syllabus": "string (required)" // "CAPS", "IEB"
  },
  "feedbackContext": {
    "previousPerformance": "number (0-100, required)", // Previous score %
    "weakAreas": ["string array (required)"], // Identified weak areas
    "specificMistakes": ["string array (required)"], // Common mistakes made
    "improvementAreas": ["string array (required)"] // Areas needing work
  },
  "numQuestions": "number (1-20, default: 5)"
}
```

**Example Usage**:
```javascript
const adaptiveRequest = {
  context: {
    grade: "8", 
    subject: "mathematics",
    topic: "Algebra",
    difficulty: "medium",
    syllabus: "CAPS"
  },
  feedbackContext: {
    previousPerformance: 45, // 45% score
    weakAreas: ["Linear equations", "Variable isolation"],
    specificMistakes: ["Not combining like terms", "Forgetting to balance equations"],
    improvementAreas: ["Step-by-step equation solving", "Order of operations"]
  },
  numQuestions: 5
};
```

**Output**: Returns a personalized `GeneratedExercise` targeting the student's specific weaknesses.

---

### 5. assessment_chat
**Purpose**: Interactive chat interface for students to ask questions about assessment feedback and understand mistakes

**Input Schema**:
```json
{
  "studentQuestion": "string (required)", // Student's question
  "assessmentContext": {
    "assessmentType": "string (required)", // "homework" or "exercise"
    "title": "string (required)", // Assessment title
    "subject": "string (required)", // Subject area
    "topic": "string (required)", // Topic covered
    "grade": "string (required)" // Student grade level
  },
  "questions": [
    {
      "id": "string (required)",
      "question": "string (required)",
      "correctAnswer": "string (required)",
      "studentAnswer": "string (required)",
      "marks": "number (required)",
      "earnedMarks": "number (required)",
      "isCorrect": "boolean (required)"
    }
  ],
  "feedback": {
    "strengths": ["string array (required)"],
    "improvements": ["string array (required)"],
    "overallScore": "number (required)",
    "totalMarks": "number (required)", 
    "percentage": "number (required)"
  }
}
```

**Example Usage**:
```javascript
const chatRequest = {
  studentQuestion: "Why did I get question 1 wrong, what should I have done better?",
  assessmentContext: {
    assessmentType: "exercise",
    title: "Math 301 Admin", 
    subject: "mathematics",
    topic: "Algebra",
    grade: "8"
  },
  questions: [
    {
      id: "230",
      question: "Solve for x: 3x + 5 = 17",
      correctAnswer: "4",
      studentAnswer: "17",
      marks: 5,
      earnedMarks: 0,
      isCorrect: false
    }
  ],
  feedback: {
    strengths: ["Attempting to solve the questions"],
    improvements: ["Paying attention to question details", "Practicing equation solving"],
    overallScore: 25,
    totalMarks: 50,
    percentage: 50
  }
};
```

**Output**: Returns a conversational AI response explaining the student's mistakes and providing improvement guidance.

---

### 6. video_lesson_chat
**Purpose**: Interactive AI chat to help students understand video lesson content with full curriculum context

**Input Schema**:
```json
{
  "studentQuestion": "string (required)", // Question about video content
  "lessonContext": {
    "lessonTitle": "string (required)", // Title of the lesson
    "subject": "string (required)", // Subject area
    "topic": "string (required)", // Topic covered
    "theme": "string (required)", // Theme within the topic
    "grade": "string (required)", // Student grade level
    "videoLink": "string (optional)", // YouTube video link
    "description": "string (optional)" // Lesson description
  }
}
```

**Example Usage**:
```javascript
const videoChat = {
  studentQuestion: "Can you explain how to solve linear equations step by step?",
  lessonContext: {
    lessonTitle: "Algebraic Expressions and Equations",
    subject: "mathematics",
    topic: "Algebra", 
    theme: "Linear Equations",
    grade: "8",
    videoLink: "https://www.youtube.com/watch?v=vNwAmxshN8Y",
    description: "Learn fundamental concepts of algebraic expressions and equation solving"
  }
};
```

**Output**: Returns contextually-aware explanations based on the video lesson content and curriculum.

---

### 7. get_service_status
**Purpose**: Get current status and configuration of the Educational AI service

**Input Schema**:
```json
{} // No parameters required
```

**Output**: Returns service status, version info, API configuration, and available capabilities.

---

## Common Response Formats

### GeneratedExercise
```typescript
interface GeneratedExercise {
  id: string;
  title: string;
  description: string;
  questions: Array<{
    id: string;
    question: string;
    answer: string;
    marks: number;
    type: 'multiple-choice' | 'short-answer' | 'calculation' | 'essay';
    answerType?: string;
    acceptableVariations?: string[];
  }>;
  totalMarks: number;
  estimatedDuration: number;
}
```

### ExerciseFeedback
```typescript
interface ExerciseFeedback {
  overall: {
    score: number;
    percentage: number;
    grade: string;
    strengths: string[];
    improvements: string[];
  };
  questionFeedback: Array<{
    questionId: string;
    isCorrect: boolean;
    score: number;
    maxScore: number;
    feedback: string;
    suggestions?: string[];
  }>;
}
```

### TutorialContent
```typescript
interface TutorialContent {
  title: string;
  description: string;
  explanation: string;
  examples: string[];
  practiceQuestions: string[];
}
```

---

## Integration Examples

### Basic Exercise Generation
```javascript
// Using MCP Client Service
const exercise = await mcpClientService.generateBasicExercise({
  grade: "8",
  subject: "mathematics",
  topic: "Algebra",
  difficulty: "medium",
  syllabus: "CAPS"
});
```

### Student Assessment and Feedback
```javascript
// Submit exercise and get AI feedback
const submission = await mcpClientService.generateFeedback(
  exercise,
  studentAnswers,
  context
);

// Use feedback for personalized learning
const adaptiveExercise = await mcpClientService.generateAdaptiveExercise(
  context,
  submission.feedback
);
```

### Interactive Learning Support
```javascript
// Video lesson support
const videoResponse = await mcpClientService.videoLessonChat(
  studentQuestion,
  lessonContext
);

// Assessment discussion
const assessmentResponse = await mcpClientService.assessmentChat(
  studentQuestion,
  assessmentContext
);
```

---

## Error Handling

All MCP functions return structured responses with error handling:

```json
{
  "status": "success" | "error",
  "data": "...response data...",
  "error": "error message (if applicable)",
  "timestamp": "ISO timestamp"
}
```

Common error conditions:
- Missing OpenAI API key
- Invalid input parameters
- Network connectivity issues
- Rate limiting from OpenAI API

---

## Best Practices

1. **Context Specificity**: Always provide complete educational context (grade, subject, topic, syllabus)

2. **Adaptive Learning**: Use feedback from previous assessments to generate targeted exercises

3. **Curriculum Alignment**: Specify CAPS or IEB syllabus for South African curriculum compliance

4. **Progressive Difficulty**: Start with easier exercises and increase difficulty based on performance

5. **Interactive Support**: Leverage chat functions to provide real-time learning assistance

6. **Comprehensive Feedback**: Use detailed question analysis to identify specific improvement areas

---

## System Integration

The MCP server integrates with:
- **Frontend**: React components for student interaction
- **Backend**: Express.js API endpoints
- **Database**: PostgreSQL for storing exercises and feedback
- **Authentication**: Multi-role user system (students, teachers, parents, admin)
- **AI Services**: OpenAI GPT-3.5-turbo for content generation

This documentation covers all available MCP functions for the XtraClass.ai educational platform.