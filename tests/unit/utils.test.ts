import { describe, it, expect } from 'vitest'

describe('Utility Functions Tests', () => {
  describe('Date Utilities', () => {
    it('should format date for API calls', () => {
      const formatDateForAPI = (date: Date) => {
        return date.toISOString().split('T')[0]
      }

      const testDate = new Date('2025-07-18T14:30:00Z')
      expect(formatDateForAPI(testDate)).toBe('2025-07-18')
    })

    it('should parse date strings correctly', () => {
      const parseDateString = (dateStr: string) => {
        const date = new Date(dateStr)
        return {
          year: date.getFullYear(),
          month: date.getMonth() + 1, // Convert to 1-based
          day: date.getDate()
        }
      }

      const result = parseDateString('2025-07-18')
      expect(result.year).toBe(2025)
      expect(result.month).toBe(7)
      expect(result.day).toBe(18)
    })

    it('should calculate days between dates', () => {
      const daysBetween = (date1: string, date2: string) => {
        const d1 = new Date(date1)
        const d2 = new Date(date2)
        const timeDiff = Math.abs(d2.getTime() - d1.getTime())
        return Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
      }

      expect(daysBetween('2025-07-18', '2025-07-20')).toBe(2)
      expect(daysBetween('2025-07-01', '2025-07-31')).toBe(30)
    })

    it('should validate date format', () => {
      const isValidDateFormat = (dateStr: string) => {
        const regex = /^\d{4}-\d{2}-\d{2}$/
        return regex.test(dateStr)
      }

      expect(isValidDateFormat('2025-07-18')).toBe(true)
      expect(isValidDateFormat('2025-7-18')).toBe(false)
      expect(isValidDateFormat('18-07-2025')).toBe(false)
      expect(isValidDateFormat('2025/07/18')).toBe(false)
    })
  })

  describe('String Utilities', () => {
    it('should capitalize first letter', () => {
      const capitalize = (str: string) => {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
      }

      expect(capitalize('mathematics')).toBe('Mathematics')
      expect(capitalize('PHYSICAL SCIENCE')).toBe('Physical science')
      expect(capitalize('algebra')).toBe('Algebra')
    })

    it('should trim and validate non-empty strings', () => {
      const isValidString = (str: string) => {
        return !!(str && str.trim().length > 0)
      }

      expect(isValidString('Valid string')).toBe(true)
      expect(isValidString('   ')).toBe(false)
      expect(isValidString('')).toBe(false)
      expect(isValidString(null as any)).toBe(false)
      expect(isValidString(undefined as any)).toBe(false)
    })

    it('should format lesson titles', () => {
      const formatLessonTitle = (title: string) => {
        return title.trim().replace(/\s+/g, ' ')
      }

      expect(formatLessonTitle('  Introduction   to   Linear   Equations  ')).toBe('Introduction to Linear Equations')
      expect(formatLessonTitle('Algebra\n\nLesson 1')).toBe('Algebra Lesson 1')
    })

    it('should generate lesson codes', () => {
      const generateLessonCode = (grade: string, subject: string, date: string) => {
        const subjectCode = subject.split(' ').map(word => word.charAt(0)).join('')
        const dateCode = date.replace(/-/g, '')
        return `${grade}${subjectCode}${dateCode}`
      }

      expect(generateLessonCode('8', 'Mathematics', '2025-07-18')).toBe('8M20250718')
      expect(generateLessonCode('9', 'Physical Science', '2025-07-18')).toBe('9PS20250718')
      expect(generateLessonCode('10', 'Mathematical Literacy', '2025-07-18')).toBe('10ML20250718')
    })
  })

  describe('Array Utilities', () => {
    it('should filter unique values', () => {
      const getUniqueValues = (arr: any[]) => {
        return [...new Set(arr)]
      }

      expect(getUniqueValues([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
      expect(getUniqueValues(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
    })

    it('should group array by property', () => {
      const groupBy = (arr: any[], key: string) => {
        return arr.reduce((groups, item) => {
          const groupKey = item[key]
          if (!groups[groupKey]) {
            groups[groupKey] = []
          }
          groups[groupKey].push(item)
          return groups
        }, {})
      }

      const lessons = [
        { id: 1, subject: 'Mathematics', grade: '8' },
        { id: 2, subject: 'Mathematics', grade: '9' },
        { id: 3, subject: 'Physical Science', grade: '8' },
      ]

      const bySubject = groupBy(lessons, 'subject')
      expect(Object.keys(bySubject)).toEqual(['Mathematics', 'Physical Science'])
      expect(bySubject['Mathematics']).toHaveLength(2)
      expect(bySubject['Physical Science']).toHaveLength(1)
    })

    it('should sort array by multiple criteria', () => {
      const sortBy = (arr: any[], ...criteria: string[]) => {
        return [...arr].sort((a, b) => {
          for (const criterion of criteria) {
            const aVal = a[criterion]
            const bVal = b[criterion]
            if (aVal < bVal) return -1
            if (aVal > bVal) return 1
          }
          return 0
        })
      }

      const lessons = [
        { grade: '9', subject: 'Mathematics', date: '2025-07-20' },
        { grade: '8', subject: 'Mathematics', date: '2025-07-18' },
        { grade: '8', subject: 'Physical Science', date: '2025-07-19' },
      ]

      const sorted = sortBy(lessons, 'grade', 'date')
      expect(sorted[0].grade).toBe('8')
      expect(sorted[0].date).toBe('2025-07-18')
      expect(sorted[1].grade).toBe('8')
      expect(sorted[1].date).toBe('2025-07-19')
      expect(sorted[2].grade).toBe('9')
    })
  })

  describe('Validation Utilities', () => {
    it('should validate email format', () => {
      const isValidEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return regex.test(email)
      }

      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
    })

    it('should validate URL format', () => {
      const isValidURL = (url: string) => {
        try {
          new URL(url)
          return url.startsWith('http://') || url.startsWith('https://')
        } catch {
          return false
        }
      }

      expect(isValidURL('https://example.com')).toBe(true)
      expect(isValidURL('http://test.com')).toBe(true)
      expect(isValidURL('https://youtube.com/watch?v=abc123')).toBe(true)
      expect(isValidURL('ftp://example.com')).toBe(false)
      expect(isValidURL('not-a-url')).toBe(false)
      expect(isValidURL('javascript:alert("xss")')).toBe(false)
    })

    it('should validate numeric ranges', () => {
      const isInRange = (value: number, min: number, max: number) => {
        return value >= min && value <= max
      }

      expect(isInRange(60, 1, 120)).toBe(true)
      expect(isInRange(0, 1, 120)).toBe(false)
      expect(isInRange(150, 1, 120)).toBe(false)
      expect(isInRange(1, 1, 120)).toBe(true)
      expect(isInRange(120, 1, 120)).toBe(true)
    })

    it('should validate required fields', () => {
      const validateRequired = (obj: any, requiredFields: string[]) => {
        const errors = []
        for (const field of requiredFields) {
          if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
            errors.push(`${field} is required`)
          }
        }
        return errors
      }

      const validObj = { name: 'Test', description: 'Test desc', grade: '8' }
      const invalidObj = { name: '', description: 'Test desc' }

      expect(validateRequired(validObj, ['name', 'description', 'grade'])).toEqual([])
      expect(validateRequired(invalidObj, ['name', 'description', 'grade'])).toEqual(['name is required', 'grade is required'])
    })
  })

  describe('Data Transformation Utilities', () => {
    it('should transform API response data', () => {
      const transformLessonData = (apiData: any) => {
        return {
          id: apiData.id,
          title: apiData.lessonTitle,
          date: apiData.date,
          subject: apiData.subject,
          grade: apiData.grade,
          hasVideo: !!(apiData.videoLink && apiData.videoLink.trim()),
          objectiveCount: apiData.objectives ? apiData.objectives.length : 0,
          duration: apiData.duration || 60
        }
      }

      const apiResponse = {
        id: 1,
        lessonTitle: 'Introduction to Algebra',
        date: '2025-07-18',
        subject: 'Mathematics',
        grade: '8',
        videoLink: 'https://example.com/video',
        objectives: ['Learn basics', 'Practice problems'],
        duration: 90
      }

      const transformed = transformLessonData(apiResponse)
      expect(transformed.title).toBe('Introduction to Algebra')
      expect(transformed.hasVideo).toBe(true)
      expect(transformed.objectiveCount).toBe(2)
      expect(transformed.duration).toBe(90)
    })

    it('should format data for display', () => {
      const formatForDisplay = (lesson: any) => {
        const formatDate = (dateStr: string) => {
          const date = new Date(dateStr)
          return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        }

        return {
          ...lesson,
          formattedDate: formatDate(lesson.date),
          durationText: `${lesson.duration} minutes`,
          subjectIcon: lesson.subject === 'Mathematics' ? '🔢' : 
                      lesson.subject === 'Physical Science' ? '🔬' : '📚'
        }
      }

      const lesson = {
        id: 1,
        title: 'Test Lesson',
        date: '2025-07-18',
        subject: 'Mathematics',
        duration: 60
      }

      const formatted = formatForDisplay(lesson)
      expect(formatted.formattedDate).toContain('Friday')
      expect(formatted.formattedDate).toContain('July')
      expect(formatted.durationText).toBe('60 minutes')
      expect(formatted.subjectIcon).toBe('🔢')
    })
  })
})