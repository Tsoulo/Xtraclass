# XtraClass.ai API Documentation

## 🌐 **Base URL & Authentication**

**Base URL**: `http://localhost:5000/api` (development)  
**Authentication**: JWT-based session management via cookies  
**Content-Type**: `application/json` for all POST requests

## 📝 **Core API Endpoints**

### **Tutorial Generation**

#### `POST /api/generate-tutorial-exercise`
Generates personalized educational tutorials based on student feedback.

**Request Body**:
```typescript
{
  homeworkId: number;           // ID of completed homework
  topicName: string;           // Educational topic (e.g., "Algebra")
  weaknessAreas: string[];     // Areas needing improvement
  targetConcepts?: string[];   // Optional specific concepts to focus on
}
```

**Response**:
```typescript
{
  success: boolean;
  tutorialData: {
    id: string;
    title: string;
    description: string;
    totalSteps: 3;
    steps: Array<{
      stepNumber: number;
      title: string;
      explanation: string;
      keyFormula?: string;
      example: {
        problem: string;
        solution: string;
        keyPoint: string;
      };
      tips: string[];
    }>;
    targetedWeaknesses: string[];
    estimatedDuration: number;
  };
}
```

**Example Request**:
```bash
curl -X POST localhost:5000/api/generate-tutorial-exercise \
  -H "Content-Type: application/json" \
  -d '{
    "homeworkId": 99,
    "topicName": "Linear Equations",
    "weaknessAreas": ["Review Required: equations need attention"],
    "targetConcepts": ["variable isolation", "equation solving"]
  }'
```

**Error Responses**:
- `400 Bad Request`: Missing required fields or invalid data
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: MCP server or OpenAI API failure

### **AI Chat System**

#### `POST /api/tutorial-chat`
Provides AI assistance for specific tutorial steps and questions.

**Request Body**:
```typescript
{
  message: string;                    // Student's question
  context: {
    tutorialId: string;              // Current tutorial ID
    stepNumber?: number;             // Optional step context
    questionType: 'step' | 'example' | 'general';
  };
  chatHistory?: Array<{             // Optional conversation history
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

**Response**:
```typescript
{
  success: boolean;
  response: string;                  // AI-generated response
  suggestions?: string[];            // Optional follow-up questions
}
```

#### `POST /api/homework-chat`
AI assistance for homework questions with specific question context.

**Request Body**:
```typescript
{
  homeworkId: number;
  questionIndex: number;           // Which homework question
  message: string;                 // Student's question about this question
  context?: {
    questionText: string;          // The actual homework question
    studentAnswer?: string;        // Student's current answer
    correctAnswer?: string;        // Correct answer (if available)
  };
}
```

### **MCP (Model Context Protocol) Endpoints**

#### `GET /api/mcp/status`
Checks MCP server connectivity and health.

**Response**:
```typescript
{
  status: 'connected' | 'disconnected' | 'error';
  server: string;                  // MCP server URL
  lastCheck: string;               // ISO timestamp
  availableTools?: string[];       // List of available MCP tools
}
```

#### `GET /api/mcp/prompts`
Retrieves all canonical prompt definitions from MCP server.

**Response**:
```typescript
{
  success: boolean;
  prompts: Array<{
    name: string;                  // Prompt identifier
    content: string;               // Full prompt text
    variables: string[];           // Detected variables like {student_name}
    category: string;              // e.g., 'grading', 'tutorial', 'chat'
    lastUpdated: string;           // ISO timestamp
  }>;
}
```

#### `POST /api/mcp/sync-prompt`
Synchronizes a specific prompt with MCP server (Reset to MCP functionality).

**Request Body**:
```typescript
{
  promptName: string;              // Name of prompt to sync
  resetToMCP: boolean;             // Whether to overwrite with MCP version
}
```

### **Assessment & Homework Endpoints**

#### `GET /api/classes/{classId}/assessments/count`
Gets assessment count for a specific class (teacher dashboard).

**URL Parameters**:
- `classId`: Class identifier

**Response**:
```typescript
{
  classId: number;
  homeworkCount: number;           // Number() converted to prevent string concat
  adminExerciseCount: number;      // Admin-created exercises only
  totalAssessments: number;        // Sum of above (numeric addition)
  lastUpdated: string;
}
```

#### `GET /api/homework/{homeworkId}/feedback`
Retrieves AI-generated feedback for completed homework.

**Response**:
```typescript
{
  homeworkId: number;
  feedback: {
    overallScore: number;
    questionAnalysis: Array<{
      questionNumber: number;
      studentAnswer: string;
      correctAnswer: string;
      analysis: string;            // Real AI feedback, not placeholder
      scoreEarned: number;
      scoreTotal: number;
      improvementSuggestions: string[];
    }>;
    strengths: string[];
    improvementAreas: string[];
    nextSteps: string[];
  };
}
```

### **Authentication Endpoints**

#### `POST /api/auth/login`
User login with email/password.

**Request Body**:
```typescript
{
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

**Response**:
```typescript
{
  success: boolean;
  user: {
    id: number;
    email: string;
    role: 'student' | 'teacher' | 'parent' | 'tutor' | 'admin';
    firstName: string;
    lastName: string;
  };
  sessionExpiry: string;           // ISO timestamp
}
```

#### `GET /api/auth/check`
Verifies current authentication status.

**Response**:
```typescript
{
  authenticated: boolean;
  user?: UserObject;               // If authenticated
  sessionTimeRemaining?: number;   // Seconds until expiry
}
```

#### `POST /api/auth/logout`
Ends current user session.

## 🗃 **Database Schema Types**

### **Core Types**
```typescript
// From shared/schema.ts
type User = {
  id: number;
  email: string;
  role: 'student' | 'teacher' | 'parent' | 'tutor' | 'admin';
  firstName: string;
  lastName: string;
  hashedPassword: string;
  createdAt: Date;
};

type Homework = {
  id: number;
  title: string;
  description: string;
  dueDate: Date;
  classId: number;
  createdBy: number;              // Teacher ID
  questions: HomeworkQuestion[];
  isPublished: boolean;
};

type HomeworkQuestion = {
  id: number;
  homeworkId: number;
  questionText: string;
  questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'calculation';
  correctAnswer: string;
  points: number;
  orderIndex: number;
};

type Tutorial = {
  id: string;
  title: string;
  description: string;
  totalSteps: number;
  steps: TutorialStep[];
  targetedWeaknesses: string[];
  estimatedDuration: number;
  createdAt: Date;
  completedBy?: number[];         // Student IDs who completed
};

type TutorialStep = {
  stepNumber: number;
  title: string;
  explanation: string;
  keyFormula?: string;
  example: TutorialExample;
  tips: string[];
};

type TutorialExample = {
  problem: string;
  solution: string;
  keyPoint: string;
};
```

### **Insert Schemas** (for API validation)
```typescript
import { createInsertSchema } from 'drizzle-zod';

const insertHomeworkSchema = createInsertSchema(homework).omit({
  id: true,
  createdAt: true
});

const insertTutorialSchema = createInsertSchema(tutorials).omit({
  id: true,
  createdAt: true
});

// Usage in API routes:
const validatedData = insertHomeworkSchema.parse(req.body);
```

## 🔧 **Error Handling**

### **Standard Error Response Format**
```typescript
{
  success: false;
  error: {
    code: string;                  // Error code (e.g., 'VALIDATION_ERROR')
    message: string;               // User-friendly message
    details?: any;                 // Additional error context
    timestamp: string;             // ISO timestamp
  };
}
```

### **Common Error Codes**
- `AUTHENTICATION_REQUIRED`: User not logged in
- `AUTHORIZATION_DENIED`: User lacks required permissions
- `VALIDATION_ERROR`: Request data validation failed
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `MCP_SERVER_ERROR`: MCP server communication failed
- `OPENAI_API_ERROR`: OpenAI API request failed
- `DATABASE_ERROR`: Database operation failed

## 🚀 **Rate Limits & Performance**

### **Rate Limits** (per user)
- Tutorial Generation: 10 requests/hour
- AI Chat: 100 messages/hour
- MCP Sync: 20 requests/hour
- Standard API: 1000 requests/hour

### **Response Time Targets**
- Database queries: < 100ms
- Tutorial generation: 10-15 seconds
- AI chat responses: 3-5 seconds
- MCP sync operations: < 1 second

### **Caching Strategy**
- User sessions: In-memory + database
- Assessment counts: 5-minute cache
- Tutorial content: 24-hour cache
- MCP prompts: 1-hour cache

## 🧪 **Testing Endpoints**

### **Health Check**
```bash
curl localhost:5000/api/health
# Expected: { "status": "ok", "timestamp": "..." }
```

### **Feature-Specific Tests**
```bash
# Tutorial Generation
curl -X POST localhost:5000/api/generate-tutorial-exercise \
  -H "Content-Type: application/json" \
  -d '{"homeworkId": 1, "topicName": "Test", "weaknessAreas": ["test"]}'

# MCP Status
curl localhost:5000/api/mcp/status

# Authentication Check
curl -b cookies.txt localhost:5000/api/auth/check
```

## 📋 **API Versioning**

**Current Version**: v1 (implicit)  
**Versioning Strategy**: URL path versioning when breaking changes occur  
**Backwards Compatibility**: Maintained for at least 6 months after version changes

**Future Versioning**:
- v2 endpoints would be: `/api/v2/endpoint`
- v1 remains available during transition period
- Deprecation notices provided 3 months before removal

---

**Last Updated**: September 16, 2025  
**Maintainer**: AI Learning Team  
**API Version**: v1 (current)