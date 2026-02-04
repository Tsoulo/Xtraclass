/**
 * Simple test to debug homework creation issue
 * Tests the homework API directly with proper topic assignment
 */

const baseURL = 'http://localhost:5000';

// Test data that should create homework with Geometry topic (id=2)
const testHomeworkData = {
  type: 'homework',
  title: 'DEBUG: Geometry Area Test',
  description: 'Test homework to debug topic assignment',
  grade: '8',
  subject: 'mathematics',
  topic: 'Geometry',
  theme: 'Area and Perimeter', 
  topicId: 2,  // Explicitly set Geometry
  themeId: 9,  // Explicitly set Area and Perimeter
  classIds: [9], // Use class ID 9
  startDate: '2025-09-05',
  dueDate: '2025-09-05',
  questions: [
    {
      id: 'debug_q1',
      question: 'Calculate the area of a square with side 4 cm.',
      type: 'equation',
      difficulty: 'easy', 
      points: 10,
      correctAnswer: 'Area = 4 × 4 = 16 cm²',
      answerType: 'algebraic',
      acceptableVariations: ['16', '16 cm²']
    }
  ]
};

async function testHomeworkCreation() {
  console.log('🐛 DEBUG: Testing homework creation with topic assignment...\n');
  
  try {
    console.log('📝 Request data being sent:');
    console.log(JSON.stringify(testHomeworkData, null, 2));
    console.log('\n🎯 Expected result:');
    console.log('- topicId should be 2 (Geometry)');
    console.log('- themeId should be 9 (Area and Perimeter)');
    console.log('\n📡 Making API call...');

    const response = await fetch(`${baseURL}/api/homework`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token' // This will be ignored since we're testing the data flow
      },
      body: JSON.stringify(testHomeworkData)
    });

    console.log(`📊 Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Homework created successfully!');
      console.log('📋 Result:');
      console.log(`   ID: ${result.id}`);
      console.log(`   Title: ${result.title}`);
      console.log(`   Topic ID: ${result.topicId} (Expected: 2)`);
      console.log(`   Theme ID: ${result.themeId} (Expected: 9)`);
      
      if (result.topicId === 2) {
        console.log('✅ Topic ID is correct!');
      } else {
        console.log('❌ Topic ID is WRONG!');
      }
      
      if (result.themeId === 9) {
        console.log('✅ Theme ID is correct!');
      } else {
        console.log('❌ Theme ID is WRONG!');
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Request failed:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${errorText}`);
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

console.log('🔍 This test will help us see what happens during homework creation.');
console.log('💡 Watch the server logs for DEBUG messages showing the data flow.\n');

testHomeworkCreation();