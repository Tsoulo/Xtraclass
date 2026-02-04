# XtraClass.ai Test Suite

This comprehensive test suite preserves the complex AI-driven educational workflow functionality and serves as living documentation for the system's behavior.

## Test Structure

### 1. Backend Integration Tests (`ai-exercise-flow.test.ts`)

Tests the complete server-side AI workflow:

- **Homework Submission & AI Grading**: Validates AI-powered marking and feedback generation
- **Tutorial Exercise Generation**: Tests personalized exercise creation based on student weaknesses  
- **MCP Integration**: Ensures all AI operations use Model Context Protocol correctly
- **Topic-Specific Feedback**: Validates feedback storage and aggregation by subject/topic
- **Cache Invalidation**: Tests real-time data updates in API responses
- **Daily Generation Limits**: Enforces exercise generation quotas
- **Multi-Role Access Control**: Validates student/teacher/parent permissions
- **Data Integrity**: Ensures proper question numbering, marking, and referential integrity

### 2. Frontend Integration Tests (`frontend-ai-flow.test.tsx`)

Tests the complete client-side user experience:

- **Calendar Exercise Display**: AI-generated exercises appear with proper styling and metadata
- **Tutorial Flow Experience**: Brilliant-style step-by-step learning interface
- **Homework Feedback**: AI feedback display with color-coded performance indicators
- **Cache Invalidation**: Real-time UI updates when new exercises are generated
- **Error Handling**: Graceful handling of API errors and edge cases
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

## Key Workflows Tested

### AI Exercise Generation Flow
1. Student submits homework with incorrect answers
2. AI analyzes answers and identifies weakness areas (e.g., "algebraic simplification")
3. System generates personalized tutorial with step-by-step explanations
4. Tutorial includes interactive examples and practice questions
5. Exercise appears immediately in calendar with proper cache invalidation
6. Student completes tutorial and earns points
7. Feedback is stored by topic for future personalization

### Tutorial Experience Flow
1. Student clicks "Start Tutorial" from calendar
2. Brilliant-style interface guides through concept explanations
3. Each step includes problem examples and key learning points
4. Progress tracking shows completion percentage
5. Final step triggers exercise generation and calendar navigation
6. Cache invalidation ensures immediate UI updates

### Feedback and Marking Flow  
1. AI analyzes student answers using OpenAI GPT-3.5-turbo
2. Generates specific feedback identifying strengths and improvements
3. Color-coded performance indicators (green/yellow/red based on score)
4. Weakness areas trigger personalized exercise generation
5. Topic-specific feedback aggregated across multiple assignments

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode during development
npm run test:watch

# Run tests once with coverage report
npm run test:coverage

# Run tests with UI interface
npm run test:ui
```

## Test Data and Mocking

Tests use realistic educational data:
- Authentic homework questions with proper marking schemes
- Real AI feedback patterns based on student errors
- Valid tutorial content with mathematical examples
- Proper exercise metadata and difficulty levels

API responses are mocked to provide consistent, deterministic test results while maintaining data authenticity.

## Critical Test Scenarios

### Cache Invalidation Validation
- Tests multiple invalidation strategies (predicate-based, specific query targeting, force refetch, cache removal)
- Validates that new exercises appear immediately without page reload
- Ensures calendar updates reflect latest exercise generation

### AI Integration Testing
- Validates MCP protocol usage for all AI operations
- Tests error handling when AI services are unavailable
- Ensures feedback quality and relevance to student answers

### Multi-User Experience
- Tests role-based access (student sees personalized content, teachers see all students)
- Validates parent dashboard functionality
- Ensures proper data isolation between users

## Importance for Project Continuity

These tests serve as:

1. **Living Documentation**: Detailed examples of how the AI educational flow should work
2. **Regression Prevention**: Catches breaking changes to the complex AI workflow
3. **Knowledge Preservation**: Maintains understanding of the system even if conversation context is lost
4. **Quality Assurance**: Ensures new features don't break existing AI functionality
5. **Onboarding Guide**: Helps new developers understand the system's behavior

## Test Maintenance

When adding new AI features:
1. Add corresponding test cases to validate the new functionality
2. Update existing tests if the workflow changes
3. Ensure test data remains realistic and educationally valid
4. Document any new testing patterns or approaches

The test suite is designed to evolve with the system while preserving the core educational AI workflows that define XtraClass.ai's value proposition.