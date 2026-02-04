# XtraClass.ai Troubleshooting Guide

## 🚨 **Common Issues & Quick Fixes**

### **Tutorial Generation Issues**

#### **Problem**: Tutorial shows placeholder content instead of AI-generated steps
**Symptoms**:
- User clicks "Generate Practice Exercise"  
- Tutorial displays generic "Understanding the Concept" text
- No real AI-generated explanations or examples

**Quick Fix**:
```bash
# 1. Check MCP server status
curl localhost:5000/api/mcp/status

# 2. Verify tutorial endpoint
curl -X POST localhost:5000/api/generate-tutorial-exercise \
  -H "Content-Type: application/json" \
  -d '{"homeworkId": 99, "topicName": "Algebra", "weaknessAreas": ["equations"]}'
```

**Root Cause & Solution**:
- **Cause**: MCP client calling wrong tool (generate_adaptive_exercise vs generate_tutorial)
- **Fix**: Update `server/mcp-client-service.ts` generateTutorial method to use `generate_tutorial` tool
- **Prevention**: Always use `generate_tutorial` for step-by-step educational content

**Code Fix**:
```typescript
// In server/mcp-client-service.ts
async generateTutorial(...) {
  // CORRECT: Use generate_tutorial tool
  const response = await this.callMCPServer('generate_tutorial', {
    context: educationalContext,
    improvementAreas,
    targetConcepts
  });
  
  // INCORRECT: Don't use generate_adaptive_exercise
  // const response = await this.callMCPServer('generate_adaptive_exercise', ...);
}
```

#### **Problem**: Tutorial generation timeout or no response
**Symptoms**:
- Loading spinner shows indefinitely
- Network errors in browser console
- MCP server connection failures

**Diagnosis Steps**:
1. Check server logs: `npm run dev` output
2. Verify OpenAI API key is set: Environment variables
3. Test MCP server connectivity: `curl localhost:5000/api/mcp/status`
4. Check browser network tab for failed requests

**Solutions**:
- **Missing API Key**: Set OPENAI_API_KEY environment variable
- **Server Down**: Restart workflow using restart button
- **Network Issues**: Check Replit network connectivity
- **MCP Timeout**: Increase timeout in MCP client service

### **AI Chat & Feedback Issues**

#### **Problem**: "Ask AI" buttons not working
**Symptoms**:
- Buttons present but no response when clicked
- Chat interface doesn't open
- No loading indicators

**Quick Check**:
```javascript
// Open browser console and run:
console.log('API Key configured:', !!import.meta.env.VITE_API_URL);
```

**Solutions**:
1. **Check Component State**: Verify React component state management
2. **API Connectivity**: Test `/api/tutorial-chat` endpoint
3. **Authentication**: Ensure user session is valid
4. **Browser Cache**: Clear cache and reload page

#### **Problem**: AI responses show generic messages instead of real feedback
**Symptoms**:
- Chat shows "Here's some feedback..." placeholder text
- No personalized or context-specific responses
- Same response for different questions

**Root Cause**: Frontend displaying fallback text instead of actual AI responses

**Fix Location**: Check AI response handling in:
- `HomeworkFeedback.tsx` (lines 751-837)
- `TutorialCard.tsx` (lines 87-170)
- `TutorialExerciseFeedback.tsx` (lines 668-782)

**Verification**: Real AI responses should reference specific student work and provide detailed explanations

### **Assessment Count Issues**

#### **Problem**: Teacher dashboard shows inflated assessment counts
**Symptoms**:
- Counts like 354 instead of expected 40
- String values instead of numbers
- Incorrect totals in class cards

**Root Cause**: String concatenation instead of numeric addition

**Fix Location**: `server/routes.ts` lines ~1531-1549
```typescript
// CORRECT: Use Number() conversion
const homeworkCount = Number(homeworkData.length);
const exerciseCount = Number(adminExercises.length);
const totalAssessments = homeworkCount + exerciseCount;

// INCORRECT: String concatenation
// const totalAssessments = homeworkData.length + adminExercises.length;
```

**Prevention**: Always use `Number()` conversion before arithmetic operations

### **MCP Sync System Issues**

#### **Problem**: All prompts show "Out of Sync" when they should be synchronized
**Symptoms**:
- Red sync status indicators
- "Reset to MCP" buttons appear unnecessarily
- Content appears identical but marked as different

**Diagnosis**:
```bash
# Check MCP server prompt list
curl localhost:5000/api/mcp/prompts

# Compare with frontend prompt builder data
# Look for whitespace, formatting, or encoding differences
```

**Common Causes**:
1. **Whitespace Differences**: Trailing spaces, line endings
2. **Content Formatting**: HTML encoding vs plain text
3. **Case Sensitivity**: Prompt names with different casing
4. **Special Characters**: Unicode or encoding issues

**Solutions**:
- **Normalize Content**: Trim whitespace before comparison
- **Content Hash**: Use consistent hashing for comparison
- **Debug Mode**: Enable detailed sync comparison logging

### **Database & Authentication Issues**

#### **Problem**: User authentication failures
**Symptoms**:
- Login redirect loops
- Session expires immediately
- "Unauthorized" errors

**Quick Checks**:
1. **Database Connection**: Verify PostgreSQL is accessible
2. **JWT Secret**: Ensure JWT_SECRET environment variable is set
3. **Session Store**: Check session storage configuration
4. **Cookie Settings**: Verify cookie domain and security settings

#### **Problem**: Database query failures
**Symptoms**:
- "Table doesn't exist" errors
- Type conversion errors
- Constraint violation errors

**Recovery Steps**:
```bash
# Push schema changes
npm run db:push

# If data loss warning, force push
npm run db:push --force

# Verify tables exist
npm run db:studio
```

## 🛠 **General Debugging Workflow**

### **Step 1: Quick Health Check**
```bash
# Check all critical endpoints
curl localhost:5000/api/health
curl localhost:5000/api/mcp/status
curl localhost:5000/api/auth/check
```

### **Step 2: Log Analysis**
1. **Server Logs**: Check `npm run dev` output for errors
2. **Browser Console**: Look for JavaScript errors and network failures
3. **Network Tab**: Verify API requests and responses
4. **Database Logs**: Check Neon Database logs if available

### **Step 3: Component-Specific Testing**
1. **Tutorial Generation**: Test with known homework ID
2. **AI Chat**: Send test message and verify response
3. **Assessment Counts**: Check specific class/teacher combination
4. **MCP Sync**: Test individual prompt synchronization

### **Step 4: Data Integrity Verification**
1. **Real vs Mock Data**: Ensure production endpoints return actual data
2. **Type Safety**: Verify data types match expected schemas
3. **Null Handling**: Check for undefined/null value handling
4. **Error Boundaries**: Ensure graceful degradation

## 🔄 **Recovery Procedures**

### **Critical System Failure Recovery**

#### **Complete System Reset**
1. **Stop Workflow**: Stop the "Start application" workflow
2. **Clear Cache**: Clear browser cache and application data
3. **Environment Check**: Verify all required environment variables
4. **Database Verify**: Confirm database connectivity and schema
5. **Restart Workflow**: Start application workflow again
6. **Functional Test**: Run critical feature tests

#### **Database Recovery**
```bash
# If database schema is corrupted
npm run db:push --force

# If data is corrupted but schema is OK
# Contact support for database rollback options
```

#### **MCP Server Recovery**
1. **Check Dependencies**: Verify OpenAI API key and connectivity
2. **Restart MCP**: Kill and restart MCP server process
3. **Tool Verification**: Ensure all MCP tools are registered properly
4. **Connection Test**: Verify MCP client can communicate with server

### **Partial Feature Recovery**

#### **Tutorial Generation Only**
1. Test MCP server `generate_tutorial` tool directly
2. Verify tutorial data structure matches expectations
3. Check TutorialCard component can render test data
4. Validate API endpoint `/api/generate-tutorial-exercise`

#### **AI Chat Only**
1. Test individual chat endpoints
2. Verify authentication for chat requests
3. Check AI response generation and formatting
4. Validate chat history storage and retrieval

## 📋 **Prevention Checklist**

### **Before Making Changes**
- [ ] Read `docs/FEATURES.md` for current status
- [ ] Check `docs/WORKING_FEATURES.md` for protected components  
- [ ] Run `tests/ui-validation.test.ts` to establish baseline
- [ ] Document expected behavior before modification

### **After Making Changes**
- [ ] Test all related functionality
- [ ] Verify no regressions in working features
- [ ] Update relevant documentation
- [ ] Add inline comments for complex logic
- [ ] Consider impact on other components

### **Code Quality Checks**
- [ ] Use `Number()` for numeric conversions
- [ ] Handle null/undefined values gracefully
- [ ] Implement proper error boundaries
- [ ] Add loading states for async operations
- [ ] Follow established patterns and conventions

## 🆘 **Emergency Contacts & Escalation**

### **Immediate Issues**
- **System Down**: Restart workflow, check environment
- **Data Loss**: Contact Replit support for database recovery
- **Security Breach**: Rotate API keys, audit access logs
- **Performance Issues**: Check server resources and database queries

### **Development Issues**
- **Code Questions**: Reference `docs/FEATURES.md` and inline documentation
- **Architecture Decisions**: Review `replit.md` and system architecture
- **Testing Problems**: Use `tests/ui-validation.test.ts` as reference
- **Integration Issues**: Check MCP server documentation

---

**Last Updated**: September 16, 2025
**Maintainer**: AI Learning Team
**Review Schedule**: Updated with each major issue resolution