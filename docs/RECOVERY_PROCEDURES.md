# XtraClass.ai Recovery Procedures

## 🚨 **Emergency Response Guide**

### **Complete System Failure**

#### **Symptoms**
- Application won't start or immediately crashes
- Database connection failures
- Multiple component failures
- No response from any endpoints

#### **Immediate Response (< 5 minutes)**
```bash
# 1. Stop workflow
# Use Replit interface to stop "Start application" workflow

# 2. Check environment basics
echo "Node version: $(node --version)"
echo "Environment variables:"
echo "DATABASE_URL exists: ${DATABASE_URL:+YES}"
echo "OPENAI_API_KEY exists: ${OPENAI_API_KEY:+YES}"

# 3. Quick database check
npm run db:studio
# If database unreachable, contact Replit support

# 4. Clear any corrupted processes
pkill -f "npm run dev"
pkill -f "tsx"
pkill -f "node"

# 5. Restart workflow
# Use Replit interface to restart "Start application"
```

#### **If System Still Down (5-15 minutes)**
```bash
# 1. Force database schema push
npm run db:push --force

# 2. Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Check for recent git changes
git log --oneline -10
git status

# 4. Consider rollback if recent changes caused issue
# Use Replit's checkpoint system to rollback
```

### **Tutorial Generation Not Working**

#### **Quick Diagnosis (< 2 minutes)**
```bash
# 1. Test MCP server status
curl -X POST http://localhost:5000/api/generate-tutorial-exercise \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{
    "topicName": "Test Topic",
    "weaknessAreas": ["test area"],
    "subject": "mathematics",
    "grade": "8"
  }'

# 2. Check environment
echo "OpenAI API Key configured: ${OPENAI_API_KEY:+YES}"

# 3. Check server logs for MCP errors
# Look for "MCP server error" or "generate_tutorial" messages
```

#### **Common Fixes**
**Problem**: Placeholder content instead of rich tutorials
```bash
# Check MCP client service is using correct tool
grep -n "generate_tutorial" server/mcp-client-service.ts
# Should show: callMCPServer('generate_tutorial', ...)
# NOT: callMCPServer('generate_adaptive_exercise', ...)
```

**Problem**: No AI response
```bash
# 1. Verify OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# 2. Check MCP server process
ps aux | grep mcp-server.js

# 3. Test MCP server directly
node server/mcp-server.js
```

**Problem**: Frontend crash on tutorial display
```javascript
// In browser console, check tutorial data structure
console.log('Tutorial data:', tutorialData);
// Should have: steps[], totalSteps, title, description
// Missing fields indicate MCP response formatting issue
```

### **AI Chat Not Responding**

#### **Quick Diagnosis**
```bash
# 1. Test chat endpoint directly
curl -X POST http://localhost:5000/api/tutorial-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{
    "message": "Test question",
    "context": {
      "tutorialTitle": "Test",
      "currentStep": 1,
      "totalSteps": 3,
      "stepTitle": "Test Step",
      "stepContent": "Test content",
      "example": {},
      "grade": "8",
      "subject": "mathematics",
      "topic": "test"
    }
  }'
```

#### **Recovery Steps**
1. **Check Authentication**: Ensure user session is valid
2. **Verify MCP Connection**: Confirm MCP server is responding
3. **Test OpenAI API**: Direct API call to verify service
4. **Clear Chat State**: Reset any stuck chat sessions
5. **Check Rate Limits**: Verify API usage hasn't exceeded limits

### **Assessment Counts Incorrect**

#### **Diagnosis**
```sql
-- Check raw database counts
SELECT 
  COUNT(*) as homework_count 
FROM homework 
WHERE grade = 'target_grade' AND subject = 'target_subject';

SELECT 
  COUNT(*) as exercise_count 
FROM exercises 
WHERE grade = 'target_grade' 
  AND subject = 'target_subject' 
  AND "generatedFor" IS NULL 
  AND "isTutorial" = false;
```

#### **Recovery**
```typescript
// Verify Number() conversion in server/routes.ts
const homeworkCount = Number(homeworkResults[0]?.count) || 0;
const exerciseCount = Number(exerciseResults[0]?.count) || 0;
const totalAssessments = homeworkCount + exerciseCount;

// NOT string concatenation:
// const totalAssessments = homeworkResults[0]?.count + exerciseResults[0]?.count;
```

### **Database Connection Issues**

#### **Quick Check**
```bash
# 1. Test database connectivity
npm run db:studio

# 2. Check connection string
echo "DATABASE_URL format: ${DATABASE_URL:0:20}..."

# 3. Test basic query
npx tsx -e "
import { db } from './server/db';
console.log('Testing DB connection...');
db.select().from('users').limit(1).then(console.log).catch(console.error);
"
```

#### **Recovery Options**
1. **Connection Pool Reset**: Restart application to reset connections
2. **Schema Validation**: Run `npm run db:push` to ensure schema sync
3. **Neon Database Status**: Check Neon dashboard for service issues
4. **Fallback Connection**: Test with alternative connection settings

### **Authentication Failures**

#### **Diagnosis**
```bash
# 1. Check session store
ls -la /tmp/ | grep connect

# 2. Test JWT validation
curl -H "Cookie: connect.sid=test-session" \
     http://localhost:5000/api/auth/check

# 3. Check password hashing
node -e "
const bcrypt = require('bcryptjs');
console.log('BCrypt working:', bcrypt.hashSync('test', 10).length > 0);
"
```

#### **Recovery**
1. **Clear Sessions**: Delete session files and restart
2. **JWT Secret**: Verify JWT_SECRET environment variable
3. **Cookie Settings**: Check cookie domain and security settings
4. **Database Auth**: Verify user records exist and passwords are hashed

## 🔧 **Preventive Maintenance**

### **Daily Checks**
- [ ] Application starts without errors
- [ ] Database connection successful
- [ ] MCP server responds to tutorial generation
- [ ] AI chat functionality works
- [ ] Assessment counts display correctly

### **Weekly Validation**
```bash
# Run automated documentation validation
node scripts/validate-docs.js

# Update feature status
node scripts/update-feature-status.js

# Check for outdated dependencies
npm outdated
```

### **Monthly Reviews**
- [ ] Review error logs for patterns
- [ ] Update API documentation for any changes
- [ ] Verify backup and recovery procedures
- [ ] Test disaster recovery scenarios
- [ ] Update feature verification dates

## 📋 **Escalation Procedures**

### **Level 1: Self-Service (0-15 minutes)**
- Follow diagnosis and recovery steps above
- Check documentation and troubleshooting guides
- Test individual components in isolation
- Verify environment variables and configurations

### **Level 2: Code Review (15-30 minutes)**
- Review recent git commits for breaking changes
- Check LSP diagnostics for type errors
- Validate database schema changes
- Examine server and browser logs for errors

### **Level 3: System Rollback (30+ minutes)**
- Use Replit checkpoint system to rollback to working state
- Restore database from backup if needed
- Revert recent code changes if identified as cause
- Contact Replit support for platform issues

### **Level 4: External Support**
- **Database Issues**: Contact Neon support
- **API Failures**: Check OpenAI status page  
- **Platform Issues**: Contact Replit support
- **Code Issues**: Review with development team

## 🎯 **Success Criteria**

After recovery, verify these work:
- [ ] User can log in successfully
- [ ] Student can complete homework and see AI feedback
- [ ] "Generate Practice Exercise" creates rich tutorials
- [ ] AI chat responds to questions in tutorials
- [ ] Teacher dashboard shows correct assessment counts
- [ ] All critical UI components render properly

## 📊 **Recovery Metrics**

Track recovery effectiveness:
- **Mean Time to Detection (MTTD)**: How quickly issues are identified
- **Mean Time to Recovery (MTTR)**: How quickly issues are resolved
- **Recovery Success Rate**: Percentage of successful recoveries
- **Prevention Effectiveness**: Reduction in repeat issues

---

**Last Updated**: September 16, 2025  
**Maintainer**: AI Learning Team  
**Review Schedule**: Updated with each incident resolution