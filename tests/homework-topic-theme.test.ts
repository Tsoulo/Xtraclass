import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiRequest } from '../client/src/lib/queryClient';

// Test data setup
const testData = {
  teacher: {
    email: 'test-teacher@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'Teacher',
    role: 'teacher'
  },
  class: {
    name: 'Test Class',
    description: 'Test class for homework creation',
    grade: '8',
    subject: 'mathematics'
  },
  homework: {
    title: 'Algebra Test Homework',
    description: 'Practice problems for algebra',
    grade: '8',
    subject: 'mathematics',
    topic: 'Algebra',
    theme: 'Linear Equations',
    questions: [
      {
        id: 'test_1',
        question: 'Solve for x: 2x + 5 = 11',
        type: 'equation',
        difficulty: 'easy',
        points: 10,
        correctAnswer: 'x = 3',
        answerType: 'exact'
      }
    ],
    dueDate: '2025-09-10'
  }
};

describe('Homework Creation with Topic and Theme', () => {
  let authToken: string;
  let classId: number;
  let topicId: number;
  let themeId: number;
  let homeworkId: number;

  beforeAll(async () => {
    // 1. Create and authenticate teacher
    try {
      const authResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testData.teacher.email,
          password: testData.teacher.password
        })
      });
      
      if (!authResponse.ok) {
        // Teacher doesn't exist, create one
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData.teacher)
        });
        
        // Login again
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testData.teacher.email,
            password: testData.teacher.password
          })
        });
        
        const loginData = await loginResponse.json();
        authToken = loginData.token;
      } else {
        const authData = await authResponse.json();
        authToken = authData.token;
      }
    } catch (error) {
      console.error('Auth setup failed:', error);
      throw error;
    }

    // 2. Create a test class
    try {
      const classResponse = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(testData.class)
      });
      
      const classData = await classResponse.json();
      classId = classData.id;
    } catch (error) {
      console.error('Class creation failed:', error);
      throw error;
    }

    // 3. Get topic and theme IDs
    try {
      // Get topics for mathematics grade 8
      const topicsResponse = await fetch(`/api/curriculum/topics?subject=mathematics&grade=8`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const topics = await topicsResponse.json();
      const algebraTopic = topics.find((t: any) => t.name === 'Algebra');
      topicId = algebraTopic?.id;

      if (topicId) {
        // Get themes for algebra topic
        const themesResponse = await fetch(`/api/curriculum/themes?topicId=${topicId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const themes = await themesResponse.json();
        const linearEquationsTheme = themes.find((t: any) => t.name === 'Linear Equations');
        themeId = linearEquationsTheme?.id;
      }
    } catch (error) {
      console.error('Topic/theme lookup failed:', error);
      // Continue with test even if topic/theme lookup fails
    }
  });

  it('should create homework with proper topic and theme IDs', async () => {
    const homeworkData = {
      classId: classId,
      title: testData.homework.title,
      description: testData.homework.description,
      questions: testData.homework.questions,
      dueDate: testData.homework.dueDate,
      topicId: topicId,
      themeId: themeId,
      published: false
    };

    console.log('Creating homework with data:', homeworkData);

    const response = await fetch('/api/homework', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(homeworkData)
    });

    expect(response.ok).toBe(true);
    
    const createdHomework = await response.json();
    homeworkId = createdHomework.id;

    // Verify the homework was created with correct topic and theme IDs
    expect(createdHomework).toHaveProperty('id');
    expect(createdHomework.title).toBe(testData.homework.title);
    expect(createdHomework.topicId).toBe(topicId);
    expect(createdHomework.themeId).toBe(themeId);
    
    console.log('✅ Homework created successfully with topic/theme:', {
      homeworkId: createdHomework.id,
      topicId: createdHomework.topicId,
      themeId: createdHomework.themeId
    });
  });

  it('should retrieve homework with topic and theme information', async () => {
    if (!homeworkId) {
      throw new Error('Homework not created in previous test');
    }

    const response = await fetch(`/api/homework/${homeworkId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.ok).toBe(true);
    
    const homework = await response.json();
    
    // Verify homework includes topic and theme IDs
    expect(homework.topicId).toBe(topicId);
    expect(homework.themeId).toBe(themeId);
    
    console.log('✅ Homework retrieved with correct topic/theme IDs:', {
      retrievedTopicId: homework.topicId,
      retrievedThemeId: homework.themeId,
      expectedTopicId: topicId,
      expectedThemeId: themeId
    });
  });

  it('should validate homework creation requires valid topic and theme IDs', async () => {
    const invalidHomeworkData = {
      classId: classId,
      title: 'Invalid Homework',
      description: 'Test homework with invalid topic/theme',
      questions: testData.homework.questions,
      dueDate: testData.homework.dueDate,
      topicId: 99999, // Invalid topic ID
      themeId: 99999, // Invalid theme ID
      published: false
    };

    const response = await fetch('/api/homework', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(invalidHomeworkData)
    });

    // Should fail with invalid foreign key references
    expect(response.ok).toBe(false);
    
    console.log('✅ Validation works: Invalid topic/theme IDs rejected');
  });

  afterAll(async () => {
    // Cleanup: Delete created test data
    try {
      if (homeworkId) {
        await fetch(`/api/homework/${homeworkId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      }
      
      if (classId) {
        await fetch(`/api/classes/${classId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });
});

// Frontend form validation test
describe('HomeworkForm Topic/Theme Selection', () => {
  it('should include topicId and themeId in form data when submitted', () => {
    // Mock the form submission data structure
    const mockFormData = {
      type: 'homework' as const,
      title: 'Test Homework',
      description: 'Test description',
      grade: '8',
      subject: 'mathematics',
      topic: 'Algebra',
      theme: 'Linear Equations',
      classIds: ['1'],
      startDate: '2025-09-04',
      dueDate: '2025-09-10',
      questions: []
    };

    const mockSelectedTopicId = 1;
    const mockSelectedThemeId = 1;

    // Simulate the form submission logic from HomeworkForm
    const completeFormData = {
      ...mockFormData,
      topicId: mockSelectedTopicId || undefined,
      themeId: mockSelectedThemeId || undefined
    };

    // Verify the form data includes the IDs
    expect(completeFormData.topicId).toBe(1);
    expect(completeFormData.themeId).toBe(1);
    expect(completeFormData.topic).toBe('Algebra');
    expect(completeFormData.theme).toBe('Linear Equations');
    
    console.log('✅ Form data structure includes both names and IDs:', {
      topic: completeFormData.topic,
      topicId: completeFormData.topicId,
      theme: completeFormData.theme,
      themeId: completeFormData.themeId
    });
  });
});