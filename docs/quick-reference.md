# Educational AI Service - Quick Reference

## Key Terms

| Term | Description |
|------|-------------|
| **Educational AI Service** | Main AI integration system (NOT MCP server) |
| **Educational Context** | Curriculum data (grade, subject, topic, syllabus) |
| **Generated Exercise** | AI-created practice questions with answers |
| **Adaptive Exercise** | Personalized exercise targeting student weaknesses |
| **AI Feedback** | Detailed grading with strengths/improvements |
| **CAPS** | South African curriculum standard |
| **String Normalization** | Mathematical answer format standardization |

## Core Functions

### Exercise Generation
```typescript
// Basic exercise
educationalAIService.generateExercise(context, numQuestions)

// Adaptive exercise (targets weaknesses)
educationalAIService.generateAdaptiveExercise(context, feedbackContext, numQuestions)

// Homework assignment
educationalAIService.generateHomework(context, requirements)
```

### Feedback & Grading
```typescript
// Generate detailed feedback
educationalAIService.generateFeedback(exercise, studentAnswers, context)

// Check service status
educationalAIService.getStatus()
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/educational-ai/generate-exercise` | POST | Generate new exercise |
| `/api/generate-adaptive-exercise` | POST | Generate adaptive exercise |
| `/api/educational-ai/generate-feedback` | POST | Grade and provide feedback |
| `/api/mock-grading` | POST | Test grading system |
| `/api/educational-ai/status` | GET | Service health check |
| `/api/test-ai` | GET | AI testing interface |

## Sample Educational Context
```json
{
  "grade": "8",
  "subject": "mathematics", 
  "topic": "Algebra",
  "difficulty": "medium",
  "syllabus": "CAPS"
}
```

## Important Notes
- ✅ Uses OpenAI GPT-3.5-turbo (cost-efficient)
- ✅ No mock data - authentic AI responses only
- ✅ CAPS curriculum aligned
- ✅ Targets specific student weaknesses
- ⚠️ Requires OPENAI_API_KEY environment variable