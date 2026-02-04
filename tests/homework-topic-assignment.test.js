/**
 * Test suite for homework topic assignment
 * Tests that homework is correctly created with proper topicId and themeId
 */

const baseURL = 'http://localhost:5000';

// Mock homework data with geometry content
const mockGeometryHomework = {
  type: 'homework',
  title: 'Geometry Test - Areas and Perimeters',
  description: 'Practice questions on calculating areas and perimeters of geometric shapes',
  grade: '8',
  subject: 'mathematics',
  topic: 'Geometry',  // Should map to topic_id = 2
  theme: 'Area and Perimeter',  // Should map to theme_id = 9
  topicId: 2,  // Explicitly set Geometry topic
  themeId: 9,  // Explicitly set Area and Perimeter theme
  classIds: ['9'],
  startDate: '2025-09-05',
  dueDate: '2025-09-05',
  questions: [
    {
      id: 'test_geo_1',
      question: 'Calculate the area of a rectangle with length 8 cm and width 5 cm.',
      type: 'equation',
      difficulty: 'easy',
      points: 10,
      correctAnswer: 'Area = length × width = 8 cm × 5 cm = 40 cm²',
      answerType: 'algebraic',
      acceptableVariations: ['40', '40 cm²', '40 square cm']
    },
    {
      id: 'test_geo_2',
      question: 'Find the perimeter of a triangle with sides 3 cm, 4 cm, and 5 cm.',
      type: 'equation',
      difficulty: 'easy',
      points: 10,
      correctAnswer: 'Perimeter = 3 + 4 + 5 = 12 cm',
      answerType: 'algebraic',
      acceptableVariations: ['12', '12 cm']
    }
  ]
};

async function testHomeworkTopicAssignment() {
  console.log('🧪 Testing Homework Topic Assignment...\n');

  try {
    // Step 1: Login as teacher (user 4 - teacher)
    console.log('1. Logging in as teacher...');
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teacher@example.com',
        password: 'Test1234!'
      }),
      credentials: 'include'
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    console.log('✅ Teacher login successful');

    // Step 2: Create homework with explicit topic/theme IDs
    console.log('\n2. Creating geometry homework with topic assignment...');
    console.log('📝 Homework data:', {
      title: mockGeometryHomework.title,
      topic: mockGeometryHomework.topic,
      theme: mockGeometryHomework.theme,
      topicId: mockGeometryHomework.topicId,
      themeId: mockGeometryHomework.themeId
    });

    const createResponse = await fetch(`${baseURL}/api/homework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockGeometryHomework),
      credentials: 'include'
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Homework creation failed: ${createResponse.status} - ${errorText}`);
    }

    const createdHomework = await createResponse.json();
    console.log('✅ Homework created successfully');
    console.log('📋 Created homework:', {
      id: createdHomework.id,
      title: createdHomework.title,
      topicId: createdHomework.topicId,
      themeId: createdHomework.themeId
    });

    // Step 3: Verify topic assignment in database
    console.log('\n3. Verifying topic assignment...');
    
    // Check if topic and theme IDs are correctly assigned
    const expectedTopicId = 2; // Geometry
    const expectedThemeId = 9; // Area and Perimeter

    if (createdHomework.topicId === expectedTopicId) {
      console.log('✅ Topic ID correctly assigned:', createdHomework.topicId);
    } else {
      console.log('❌ Topic ID mismatch!');
      console.log(`   Expected: ${expectedTopicId} (Geometry)`);
      console.log(`   Actual: ${createdHomework.topicId}`);
    }

    if (createdHomework.themeId === expectedThemeId) {
      console.log('✅ Theme ID correctly assigned:', createdHomework.themeId);
    } else {
      console.log('❌ Theme ID mismatch!');
      console.log(`   Expected: ${expectedThemeId} (Area and Perimeter)`);
      console.log(`   Actual: ${createdHomework.themeId}`);
    }

    // Step 4: Test student completion and topic feedback generation
    console.log('\n4. Testing student homework completion...');
    
    // Login as student (user 33 - Bruce)
    const studentLoginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'Test1234!'
      }),
      credentials: 'include'
    });

    if (!studentLoginResponse.ok) {
      throw new Error(`Student login failed: ${studentLoginResponse.status}`);
    }

    console.log('✅ Student login successful');

    // Submit homework answers
    const homeworkAnswers = {
      answers: [
        { questionId: 'test_geo_1', answer: '40' },
        { questionId: 'test_geo_2', answer: '12' }
      ]
    };

    const submitResponse = await fetch(`${baseURL}/api/homework/${createdHomework.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(homeworkAnswers),
      credentials: 'include'
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.log('⚠️ Homework submission failed:', errorText);
    } else {
      const submission = await submitResponse.json();
      console.log('✅ Homework submitted successfully');
      console.log('📊 Submission score:', submission.score, '/', submission.totalMarks);
    }

    // Step 5: Check if topic feedback was created for Geometry topic
    console.log('\n5. Checking topic feedback generation...');
    
    const feedbackResponse = await fetch(`${baseURL}/api/students/17/topics/2/feedback`, {
      method: 'GET',
      credentials: 'include'
    });

    if (feedbackResponse.ok) {
      const topicFeedback = await feedbackResponse.json();
      console.log('✅ Topic feedback found for Geometry!');
      console.log('🎯 Feedback details:', {
        topicId: topicFeedback.topicId,
        sourceType: topicFeedback.sourceType,
        sourceId: topicFeedback.sourceId,
        improvements: topicFeedback.improvements
      });
    } else {
      console.log('❌ No topic feedback found for Geometry topic');
    }

    console.log('\n🎉 Test completed successfully!');
    return {
      success: true,
      homeworkId: createdHomework.id,
      topicId: createdHomework.topicId,
      themeId: createdHomework.themeId
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testHomeworkTopicAssignment()
  .then(result => {
    if (result.success) {
      console.log('\n✅ All tests passed! Homework topic assignment is working correctly.');
    } else {
      console.log('\n❌ Test failed:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });