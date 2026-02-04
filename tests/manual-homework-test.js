// Manual test script to validate homework creation with topic/theme IDs
// Run this in the browser console when logged in as a teacher

console.log('🧪 Testing Homework Creation with Topic/Theme IDs');

// Test function to create homework with topic and theme
async function testHomeworkCreation() {
  console.log('1. Testing form data structure...');
  
  // Simulate the form data from HomeworkForm component
  const mockFormData = {
    type: 'homework',
    title: 'Test Algebra Homework',
    description: 'Testing topic and theme storage',
    grade: '8',
    subject: 'mathematics',
    topic: 'Algebra',
    theme: 'Linear Equations',
    classIds: ['9'], // Use existing class ID
    startDate: '2025-09-04',
    dueDate: '2025-09-10',
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
    ]
  };

  // Simulate topic and theme selection IDs
  const selectedTopicId = 1; // Algebra topic ID
  const selectedThemeId = 1; // Linear Equations theme ID

  // This is the exact logic from our updated HomeworkForm
  const completeFormData = {
    ...mockFormData,
    topicId: selectedTopicId || undefined,
    themeId: selectedThemeId || undefined
  };

  console.log('✅ Form data includes topic/theme IDs:', {
    topic: completeFormData.topic,
    topicId: completeFormData.topicId,
    theme: completeFormData.theme,  
    themeId: completeFormData.themeId
  });

  console.log('2. Testing homework creation API...');
  
  try {
    // This is the exact payload format from ClassAssignments
    const homeworkData = {
      classId: parseInt(completeFormData.classIds[0]),
      title: completeFormData.title,
      description: completeFormData.description,
      questions: completeFormData.questions,
      dueDate: completeFormData.dueDate,
      published: false,
      topicId: completeFormData.topicId, // ✅ Now included
      themeId: completeFormData.themeId  // ✅ Now included
    };

    console.log('📤 Sending homework data:', homeworkData);

    // Get auth token from localStorage or current session
    const token = localStorage.getItem('authToken') || 
                  document.cookie.split(';').find(c => c.includes('token'))?.split('=')[1];

    const response = await fetch('/api/homework', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(homeworkData)
    });

    if (response.ok) {
      const createdHomework = await response.json();
      console.log('✅ Homework created successfully:', {
        id: createdHomework.id,
        title: createdHomework.title,
        topicId: createdHomework.topicId,
        themeId: createdHomework.themeId
      });

      // Test retrieval
      console.log('3. Testing homework retrieval...');
      const getResponse = await fetch(`/api/homework/${createdHomework.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (getResponse.ok) {
        const retrievedHomework = await getResponse.json();
        console.log('✅ Homework retrieved with topic/theme IDs:', {
          topicId: retrievedHomework.topicId,
          themeId: retrievedHomework.themeId
        });

        if (retrievedHomework.topicId === selectedTopicId && 
            retrievedHomework.themeId === selectedThemeId) {
          console.log('🎉 SUCCESS: Topic and theme IDs are properly stored and retrieved!');
        } else {
          console.error('❌ FAIL: Topic/theme IDs do not match expected values');
        }
      } else {
        console.error('❌ Failed to retrieve homework:', getResponse.statusText);
      }

      // Cleanup
      await fetch(`/api/homework/${createdHomework.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('🧹 Test homework deleted');

    } else {
      const error = await response.json();
      console.error('❌ Failed to create homework:', error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Auto-run the test
testHomeworkCreation();

console.log('🔍 Manual Test Instructions:');
console.log('1. Open browser dev tools (F12)');
console.log('2. Go to Console tab'); 
console.log('3. Paste and run this entire script');
console.log('4. Check the console output for test results');