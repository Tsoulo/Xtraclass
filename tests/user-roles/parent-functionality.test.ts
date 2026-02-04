import { describe, it, expect } from 'vitest'

describe('Parent Functionality Tests', () => {
  describe('Parent Registration and Profile', () => {
    it('should validate parent registration data', () => {
      const validParent = {
        email: 'parent@example.com',
        password: 'parentPass123',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phoneNumber: '+27123456789',
        address: '123 Main St, Cape Town',
        role: 'parent',
        emergencyContact: {
          name: 'John Johnson',
          phone: '+27987654321',
          relationship: 'spouse'
        }
      }

      expect(validParent.email).toBeTruthy()
      expect(validParent.password).toBeTruthy()
      expect(validParent.firstName).toBeTruthy()
      expect(validParent.lastName).toBeTruthy()
      expect(validParent.phoneNumber).toBeTruthy()
      expect(validParent.role).toBe('parent')

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      expect(emailRegex.test(validParent.email)).toBe(true)

      // Validate phone number format
      const phoneRegex = /^\+27\d{9}$/
      expect(phoneRegex.test(validParent.phoneNumber)).toBe(true)

      // Validate emergency contact
      expect(validParent.emergencyContact.name).toBeTruthy()
      expect(validParent.emergencyContact.phone).toBeTruthy()
      expect(validParent.emergencyContact.relationship).toBeTruthy()
    })

    it('should validate parent profile updates', () => {
      const allowedUpdates = {
        firstName: 'Updated Name',
        lastName: 'Updated Surname',
        phoneNumber: '+27999888777',
        address: 'New Address',
        emergencyContact: {
          name: 'Updated Emergency Contact',
          phone: '+27888999777',
          relationship: 'sibling'
        }
      }

      const restrictedUpdates = {
        email: 'newemail@test.com', // Requires verification
        role: 'teacher',           // Cannot change role
        id: 999                    // Cannot change ID
      }

      const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'address', 'emergencyContact']
      const restrictedFields = ['email', 'role', 'id']

      Object.keys(allowedUpdates).forEach(key => {
        expect(allowedFields).toContain(key)
      })

      Object.keys(restrictedUpdates).forEach(key => {
        expect(restrictedFields).toContain(key)
      })
    })
  })

  describe('Child Management', () => {
    it('should validate child addition to parent account', () => {
      const childData = {
        firstName: 'Emma',
        lastName: 'Johnson',
        idNumber: '0812345678901',
        grade: '8',
        schoolId: 1,
        parentId: 1,
        relationship: 'daughter'
      }

      expect(childData.firstName).toBeTruthy()
      expect(childData.lastName).toBeTruthy()
      expect(childData.idNumber).toBeTruthy()
      expect(childData.grade).toBeTruthy()
      expect(childData.schoolId).toBeGreaterThan(0)
      expect(childData.parentId).toBeGreaterThan(0)

      // Validate ID number format
      const idRegex = /^\d{13}$/
      expect(idRegex.test(childData.idNumber)).toBe(true)

      // Validate grade
      const validGrades = ['8', '9', '10', '11', '12']
      expect(validGrades).toContain(childData.grade)

      // Validate relationship
      const validRelationships = ['son', 'daughter', 'stepson', 'stepdaughter', 'ward']
      expect(validRelationships).toContain(childData.relationship)
    })

    it('should detect and link existing student accounts', () => {
      const existingStudents = [
        { id: 1, idNumber: '0812345678901', firstName: 'Emma', lastName: 'Johnson', hasParent: false },
        { id: 2, idNumber: '0912345678902', firstName: 'Tom', lastName: 'Smith', hasParent: true },
        { id: 3, idNumber: '0712345678903', firstName: 'Lisa', lastName: 'Brown', hasParent: false },
      ]

      const linkExistingChild = (parentId: number, childIdNumber: string) => {
        const existingStudent = existingStudents.find(s => s.idNumber === childIdNumber)
        
        if (!existingStudent) {
          return { canLink: false, reason: 'Student not found' }
        }
        
        if (existingStudent.hasParent) {
          return { canLink: false, reason: 'Student already has a parent account' }
        }
        
        return { canLink: true, studentId: existingStudent.id }
      }

      expect(linkExistingChild(1, '0812345678901').canLink).toBe(true)
      expect(linkExistingChild(1, '0912345678902').canLink).toBe(false)
      expect(linkExistingChild(1, '0912345678902').reason).toBe('Student already has a parent account')
      expect(linkExistingChild(1, '0999999999999').canLink).toBe(false)
      expect(linkExistingChild(1, '0999999999999').reason).toBe('Student not found')
    })

    it('should validate multiple children management', () => {
      const parentChildren = [
        { id: 1, firstName: 'Emma', lastName: 'Johnson', grade: '8', school: 'Primary School' },
        { id: 2, firstName: 'Jack', lastName: 'Johnson', grade: '10', school: 'High School' },
        { id: 3, firstName: 'Sophie', lastName: 'Johnson', grade: '9', school: 'High School' },
      ]

      const validateChildrenData = (children: any[]) => {
        const schools = [...new Set(children.map(child => child.school))]
        const grades = [...new Set(children.map(child => child.grade))]
        const duplicateNames = children.filter((child, index) => 
          children.findIndex(c => c.firstName === child.firstName && c.lastName === child.lastName) !== index
        )

        return {
          totalChildren: children.length,
          schools,
          grades,
          duplicateNames,
          needsMultipleSchoolAccess: schools.length > 1
        }
      }

      const validation = validateChildrenData(parentChildren)
      expect(validation.totalChildren).toBe(3)
      expect(validation.schools).toHaveLength(2)
      expect(validation.grades).toHaveLength(3)
      expect(validation.duplicateNames).toHaveLength(0)
      expect(validation.needsMultipleSchoolAccess).toBe(true)
    })

    it('should prevent duplicate child entries', () => {
      const existingChildren = [
        { id: 1, parentId: 1, idNumber: '0812345678901', firstName: 'Emma', lastName: 'Johnson' },
        { id: 2, parentId: 1, idNumber: '0912345678902', firstName: 'Jack', lastName: 'Johnson' },
      ]

      const checkDuplicateChild = (parentId: number, childData: any) => {
        const duplicateById = existingChildren.find(child => 
          child.parentId === parentId && child.idNumber === childData.idNumber
        )
        
        const duplicateByName = existingChildren.find(child => 
          child.parentId === parentId && 
          child.firstName === childData.firstName && 
          child.lastName === childData.lastName
        )

        if (duplicateById) {
          return { isDuplicate: true, reason: 'Child with this ID number already exists' }
        }
        
        if (duplicateByName) {
          return { isDuplicate: true, reason: 'Child with this name already exists' }
        }
        
        return { isDuplicate: false }
      }

      const newChild1 = { firstName: 'Emma', lastName: 'Johnson', idNumber: '0812345678901' }
      const newChild2 = { firstName: 'Emma', lastName: 'Johnson', idNumber: '0812345678999' }
      const newChild3 = { firstName: 'Lisa', lastName: 'Johnson', idNumber: '0712345678903' }

      expect(checkDuplicateChild(1, newChild1).isDuplicate).toBe(true)
      expect(checkDuplicateChild(1, newChild2).isDuplicate).toBe(true)
      expect(checkDuplicateChild(1, newChild3).isDuplicate).toBe(false)
    })
  })

  describe('Academic Monitoring', () => {
    it('should track child academic progress', () => {
      const childProgress = {
        childId: 1,
        childName: 'Emma Johnson',
        classes: [
          {
            subject: 'Mathematics',
            teacher: 'Mr. Smith',
            currentGrade: 85,
            assignments: [
              { title: 'Homework 1', score: 90, maxScore: 100, dueDate: '2025-07-01' },
              { title: 'Quiz 1', score: 80, maxScore: 100, dueDate: '2025-07-05' },
            ],
            attendance: 95,
            nextAssignment: { title: 'Project 1', dueDate: '2025-07-30' }
          },
          {
            subject: 'Physical Science',
            teacher: 'Ms. Brown',
            currentGrade: 92,
            assignments: [
              { title: 'Lab Report 1', score: 95, maxScore: 100, dueDate: '2025-07-03' },
              { title: 'Test 1', score: 89, maxScore: 100, dueDate: '2025-07-10' },
            ],
            attendance: 100,
            nextAssignment: { title: 'Lab Report 2', dueDate: '2025-07-25' }
          }
        ]
      }

      const analyzeProgress = (progress: any) => {
        const overallGrade = progress.classes.reduce((sum, cls) => sum + cls.currentGrade, 0) / progress.classes.length
        const averageAttendance = progress.classes.reduce((sum, cls) => sum + cls.attendance, 0) / progress.classes.length
        const upcomingAssignments = progress.classes.map(cls => cls.nextAssignment).filter(assignment => assignment)
        const totalAssignments = progress.classes.reduce((sum, cls) => sum + cls.assignments.length, 0)

        return {
          overallGrade: Math.round(overallGrade * 100) / 100,
          averageAttendance: Math.round(averageAttendance * 100) / 100,
          totalSubjects: progress.classes.length,
          upcomingAssignments: upcomingAssignments.length,
          totalAssignments,
          needsAttention: overallGrade < 70 || averageAttendance < 80
        }
      }

      const analysis = analyzeProgress(childProgress)
      expect(analysis.overallGrade).toBe(88.5)
      expect(analysis.averageAttendance).toBe(97.5)
      expect(analysis.totalSubjects).toBe(2)
      expect(analysis.upcomingAssignments).toBe(2)
      expect(analysis.totalAssignments).toBe(4)
      expect(analysis.needsAttention).toBe(false)
    })

    it('should identify areas needing attention', () => {
      const childrenProgress = [
        {
          childId: 1,
          name: 'Emma',
          subjects: [
            { subject: 'Mathematics', grade: 55, attendance: 70 }, // Needs attention
            { subject: 'Science', grade: 85, attendance: 95 },
          ]
        },
        {
          childId: 2,
          name: 'Jack',
          subjects: [
            { subject: 'Mathematics', grade: 90, attendance: 100 },
            { subject: 'Science', grade: 88, attendance: 95 },
          ]
        }
      ]

      const identifyAlerts = (children: any[]) => {
        const alerts = []
        
        children.forEach(child => {
          child.subjects.forEach(subject => {
            if (subject.grade < 60) {
              alerts.push({
                childId: child.childId,
                childName: child.name,
                subject: subject.subject,
                type: 'low_grade',
                value: subject.grade,
                severity: 'high'
              })
            }
            
            if (subject.attendance < 80) {
              alerts.push({
                childId: child.childId,
                childName: child.name,
                subject: subject.subject,
                type: 'low_attendance',
                value: subject.attendance,
                severity: 'medium'
              })
            }
          })
        })
        
        return alerts
      }

      const alerts = identifyAlerts(childrenProgress)
      expect(alerts).toHaveLength(2)
      expect(alerts[0].type).toBe('low_grade')
      expect(alerts[0].severity).toBe('high')
      expect(alerts[1].type).toBe('low_attendance')
      expect(alerts[1].severity).toBe('medium')
    })

    it('should generate progress reports', () => {
      const reportData = {
        childId: 1,
        childName: 'Emma Johnson',
        reportPeriod: '2025-07-01 to 2025-07-31',
        subjects: [
          {
            subject: 'Mathematics',
            teacher: 'Mr. Smith',
            grade: 85,
            improvement: +5,
            strengths: ['Problem solving', 'Algebra'],
            improvements: ['Geometry', 'Time management'],
            teacherComment: 'Emma shows excellent progress in algebra'
          },
          {
            subject: 'Physical Science',
            teacher: 'Ms. Brown',
            grade: 92,
            improvement: +3,
            strengths: ['Lab work', 'Scientific method'],
            improvements: ['Theory memorization'],
            teacherComment: 'Outstanding practical work and understanding'
          }
        ]
      }

      const generateSummary = (report: any) => {
        const averageGrade = report.subjects.reduce((sum, s) => sum + s.grade, 0) / report.subjects.length
        const averageImprovement = report.subjects.reduce((sum, s) => sum + s.improvement, 0) / report.subjects.length
        const allStrengths = report.subjects.flatMap(s => s.strengths)
        const allImprovements = report.subjects.flatMap(s => s.improvements)

        return {
          averageGrade: Math.round(averageGrade * 100) / 100,
          averageImprovement: Math.round(averageImprovement * 100) / 100,
          totalStrengths: allStrengths.length,
          totalImprovements: allImprovements.length,
          overallTrend: averageImprovement > 0 ? 'improving' : averageImprovement < 0 ? 'declining' : 'stable',
          highestGrade: Math.max(...report.subjects.map(s => s.grade)),
          lowestGrade: Math.min(...report.subjects.map(s => s.grade))
        }
      }

      const summary = generateSummary(reportData)
      expect(summary.averageGrade).toBe(88.5)
      expect(summary.averageImprovement).toBe(4)
      expect(summary.totalStrengths).toBe(4)
      expect(summary.totalImprovements).toBe(3)
      expect(summary.overallTrend).toBe('improving')
      expect(summary.highestGrade).toBe(92)
      expect(summary.lowestGrade).toBe(85)
    })
  })

  describe('Communication with Teachers', () => {
    it('should validate parent-teacher messaging', () => {
      const message = {
        from: 'parent',
        to: 'teacher',
        childId: 1,
        subject: 'Question about Emma\'s math progress',
        content: 'I would like to discuss Emma\'s recent quiz performance and how I can support her learning at home.',
        priority: 'normal',
        requestMeeting: true
      }

      const validateMessage = (message: any) => {
        const errors = []
        
        if (!message.subject || message.subject.trim().length === 0) {
          errors.push('Subject is required')
        }
        
        if (!message.content || message.content.trim().length < 20) {
          errors.push('Message content must be at least 20 characters')
        }
        
        if (!message.childId || message.childId <= 0) {
          errors.push('Child ID is required')
        }
        
        if (message.priority && !['low', 'normal', 'high', 'urgent'].includes(message.priority)) {
          errors.push('Invalid priority level')
        }
        
        return errors
      }

      expect(validateMessage(message)).toHaveLength(0)
      
      const invalidMessage = {
        from: 'parent',
        to: 'teacher',
        childId: 0,
        subject: '',
        content: 'Hi',
        priority: 'invalid'
      }
      
      const errors = validateMessage(invalidMessage)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should schedule parent-teacher meetings', () => {
      const meetingRequest = {
        parentId: 1,
        teacherId: 1,
        childId: 1,
        preferredDates: ['2025-08-01', '2025-08-02', '2025-08-03'],
        preferredTimes: ['09:00', '14:00', '16:00'],
        reason: 'Discuss academic progress',
        duration: 30,
        meetingType: 'in-person'
      }

      const validateMeetingRequest = (request: any) => {
        const errors = []
        
        if (!request.preferredDates || request.preferredDates.length === 0) {
          errors.push('At least one preferred date is required')
        }
        
        if (!request.preferredTimes || request.preferredTimes.length === 0) {
          errors.push('At least one preferred time is required')
        }
        
        if (!request.reason || request.reason.trim().length < 10) {
          errors.push('Meeting reason must be at least 10 characters')
        }
        
        if (!request.duration || request.duration < 15 || request.duration > 120) {
          errors.push('Duration must be between 15 and 120 minutes')
        }
        
        if (!['in-person', 'virtual', 'phone'].includes(request.meetingType)) {
          errors.push('Invalid meeting type')
        }
        
        return errors
      }

      expect(validateMeetingRequest(meetingRequest)).toHaveLength(0)
      
      const invalidRequest = {
        parentId: 1,
        teacherId: 1,
        childId: 1,
        preferredDates: [],
        preferredTimes: [],
        reason: 'Help',
        duration: 200,
        meetingType: 'invalid'
      }
      
      const errors = validateMeetingRequest(invalidRequest)
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('Notification and Alert Management', () => {
    it('should manage notification preferences', () => {
      const notificationSettings = {
        parentId: 1,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: false,
        preferences: {
          gradeUpdates: true,
          assignmentDue: true,
          attendanceIssues: true,
          teacherMessages: true,
          schoolAnnouncements: false,
          disciplinaryActions: true
        },
        quietHours: {
          start: '22:00',
          end: '07:00'
        },
        frequency: 'immediate' // immediate, daily, weekly
      }

      const validateNotificationSettings = (settings: any) => {
        const errors = []
        
        if (!settings.preferences || Object.keys(settings.preferences).length === 0) {
          errors.push('At least one notification preference must be set')
        }
        
        if (settings.quietHours) {
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
          if (!timeRegex.test(settings.quietHours.start) || !timeRegex.test(settings.quietHours.end)) {
            errors.push('Invalid quiet hours format')
          }
        }
        
        if (!['immediate', 'daily', 'weekly'].includes(settings.frequency)) {
          errors.push('Invalid notification frequency')
        }
        
        return errors
      }

      expect(validateNotificationSettings(notificationSettings)).toHaveLength(0)
    })

    it('should generate relevant alerts for parents', () => {
      const childData = {
        childId: 1,
        childName: 'Emma Johnson',
        recentActivity: [
          { type: 'grade', subject: 'Mathematics', grade: 45, date: '2025-07-18' }, // Low grade
          { type: 'attendance', subject: 'Science', status: 'absent', date: '2025-07-17' },
          { type: 'assignment', subject: 'Mathematics', title: 'Homework 2', dueDate: '2025-07-20', submitted: false },
          { type: 'behavior', incident: 'Late to class', date: '2025-07-16' },
        ]
      }

      const generateAlerts = (data: any) => {
        const alerts = []
        
        data.recentActivity.forEach(activity => {
          if (activity.type === 'grade' && activity.grade < 50) {
            alerts.push({
              type: 'low_grade',
              severity: 'high',
              message: `${data.childName} received a low grade (${activity.grade}) in ${activity.subject}`,
              actionRequired: true
            })
          }
          
          if (activity.type === 'attendance' && activity.status === 'absent') {
            alerts.push({
              type: 'absence',
              severity: 'medium',
              message: `${data.childName} was absent from ${activity.subject} on ${activity.date}`,
              actionRequired: false
            })
          }
          
          if (activity.type === 'assignment' && !activity.submitted) {
            const dueDate = new Date(activity.dueDate)
            const today = new Date()
            const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            
            if (daysUntilDue <= 2) {
              alerts.push({
                type: 'assignment_due',
                severity: 'medium',
                message: `${activity.title} is due in ${daysUntilDue} days`,
                actionRequired: true
              })
            }
          }
          
          if (activity.type === 'behavior') {
            alerts.push({
              type: 'behavior',
              severity: 'low',
              message: `Behavior incident: ${activity.incident}`,
              actionRequired: false
            })
          }
        })
        
        return alerts.sort((a, b) => {
          const severityOrder = { high: 3, medium: 2, low: 1 }
          return severityOrder[b.severity] - severityOrder[a.severity]
        })
      }

      const alerts = generateAlerts(childData)
      expect(alerts).toHaveLength(4)
      expect(alerts[0].type).toBe('low_grade')
      expect(alerts[0].severity).toBe('high')
      expect(alerts.filter(a => a.actionRequired)).toHaveLength(2)
    })
  })

  describe('Home Learning Support', () => {
    it('should provide learning resources for parents', () => {
      const learningSupport = {
        childId: 1,
        childGrade: '8',
        subjects: ['Mathematics', 'Physical Science'],
        currentTopics: [
          { subject: 'Mathematics', topic: 'Linear Equations', difficulty: 'medium' },
          { subject: 'Physical Science', topic: 'Forces and Motion', difficulty: 'high' },
        ],
        learningStyle: 'visual',
        strengths: ['Problem solving', 'Logical thinking'],
        challenges: ['Time management', 'Test anxiety']
      }

      const generateSupportRecommendations = (support: any) => {
        const recommendations = []
        
        support.currentTopics.forEach(topic => {
          if (topic.difficulty === 'high') {
            recommendations.push({
              subject: topic.subject,
              topic: topic.topic,
              type: 'extra_practice',
              suggestion: `Provide additional practice materials for ${topic.topic}`,
              resources: ['Khan Academy', 'YouTube tutorials', 'Practice worksheets']
            })
          }
        })
        
        support.challenges.forEach(challenge => {
          if (challenge === 'Time management') {
            recommendations.push({
              type: 'study_skills',
              suggestion: 'Help create a structured study schedule',
              resources: ['Study planner apps', 'Time blocking techniques']
            })
          }
          
          if (challenge === 'Test anxiety') {
            recommendations.push({
              type: 'emotional_support',
              suggestion: 'Practice relaxation techniques and positive self-talk',
              resources: ['Mindfulness apps', 'Breathing exercises']
            })
          }
        })
        
        return recommendations
      }

      const recommendations = generateSupportRecommendations(learningSupport)
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations.some(r => r.type === 'extra_practice')).toBe(true)
      expect(recommendations.some(r => r.type === 'study_skills')).toBe(true)
      expect(recommendations.some(r => r.type === 'emotional_support')).toBe(true)
    })

    it('should track home study progress', () => {
      const homeStudyData = {
        childId: 1,
        weeklyGoals: [
          { subject: 'Mathematics', goal: 'Complete 5 practice problems daily', completed: 4, target: 5 },
          { subject: 'Reading', goal: 'Read 30 minutes daily', completed: 6, target: 7 },
          { subject: 'Science', goal: 'Review notes for 20 minutes', completed: 3, target: 5 },
        ],
        parentInvolvement: [
          { date: '2025-07-15', activity: 'Helped with math homework', duration: 30 },
          { date: '2025-07-16', activity: 'Reviewed science notes together', duration: 20 },
          { date: '2025-07-17', activity: 'Read together', duration: 45 },
        ]
      }

      const analyzeHomeStudy = (data: any) => {
        const goalAnalysis = data.weeklyGoals.map(goal => ({
          subject: goal.subject,
          completionRate: Math.round((goal.completed / goal.target) * 100),
          onTrack: goal.completed >= goal.target * 0.8,
          remaining: Math.max(0, goal.target - goal.completed)
        }))
        
        const totalParentTime = data.parentInvolvement.reduce((sum, activity) => sum + activity.duration, 0)
        const averageSessionTime = totalParentTime / data.parentInvolvement.length
        
        return {
          goalAnalysis,
          totalParentInvolvement: data.parentInvolvement.length,
          totalParentTime,
          averageSessionTime: Math.round(averageSessionTime),
          overallProgress: goalAnalysis.reduce((sum, goal) => sum + goal.completionRate, 0) / goalAnalysis.length
        }
      }

      const analysis = analyzeHomeStudy(homeStudyData)
      expect(analysis.goalAnalysis).toHaveLength(3)
      expect(analysis.totalParentInvolvement).toBe(3)
      expect(analysis.totalParentTime).toBe(95)
      expect(analysis.averageSessionTime).toBe(32)
      expect(analysis.overallProgress).toBeGreaterThan(0)
    })
  })
})