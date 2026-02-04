/**
 * One-time repair script to fix tutorial exercise questions with mixed solution content
 * 
 * Problem: Some tutorial questions have solution steps embedded in the question text like:
 * "Solve for x: 4(x + 3) = 2x + 10 4x - 2x = 10 - 12 2x = -2 x = -1"
 * 
 * Should be: "Solve for x: 4(x + 3) = 2x + 10"
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { exerciseQuestions, exercises } from '../shared/schema.ts';

// Initialize database connection
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

/**
 * Detects if a question contains solution steps mixed into the question text
 * @param {string} questionText - The question text to analyze
 * @returns {boolean} - True if solution steps are detected
 */
function hasMixedSolutionContent(questionText) {
  const solutionMarkers = [
    // Multiple equations in sequence (strong indicator of solution steps)
    /=\s*\d+\s+\d+[x\w]*\s*[=]/,                               // "= 10 2x ="
    /=\s*\d+[^\n]*[=]\s*\d+/,                                  // "= 10 ... = 5"
    
    // Solution step patterns
    /\s+\d+[x\w]*\s*[-+]\s*\d+[x\w]*\s*=\s*\d+\s+\d+[x\w]*/, // "4x - 2x = 10 2x"
    /\s+\d+[x\w]*\s*=\s*\d+\s+x\s*=\s*[-]?\d+/,               // "2x = 16 x = 8"
    
    // Variable assignments (final answers)
    /\s+x\s*=\s*[-]?\d+(?:\s|$)/,                              // " x = 5"
    
    // Solution keywords and annotations
    /\s+(solution|answer|steps?):\s*/i,                         // "Solution:"
    /\s*\([^)]*solution\)/i,                                   // "(No solution)"
    /By\s+practicing\s+these\s+questions/i,                    // Tutorial conclusion text
    
    // Mathematical step indicators
    /\s+(thus|therefore|hence|so),?\s+/i,                      // Conclusion words
    /\s+(step\s*\d+|first|next|then|finally)[:,]?\s+/i,       // Step indicators
    
    // Multiple arithmetic operations in sequence
    /\d+[x\w]*\s*[+\-*/]\s*\d+\s*[+\-*/]\s*\d+\s*=\s*\d+/,   // "4x + 6 + 20 = 30"
  ];

  return solutionMarkers.some(pattern => pattern.test(questionText));
}

/**
 * Attempts to extract just the question part from mixed content
 * @param {string} questionText - Mixed question and solution text
 * @returns {string} - Clean question text
 */
function extractCleanQuestion(questionText) {
  let cleanQuestion = questionText.trim();

  // Aggressive patterns to identify where solution steps start
  const splitPatterns = [
    // Multiple sequential equations (strongest indicator) - preserve complete first equation
    /(\s+\d+[x\w]*\s*[-+]\s*\d+[x\w]*\s*=\s*\d+[-\s]+\d+\s+\d+[x\w]*)/,  // "= 2x + 10 4x - 2x = 10 2x"  
    /(\s+=\s*\d+\s+\d+[x\w]*\s*[-+])/,                               // "= 10 2x -" (solution steps start)
    /(\s+=\s*\d+[^\n]*[=]\s*\d+)/,                                  // "= 10 ... = 5"
    
    // Solution step sequences
    /(\s+\d+[x\w]*\s*=\s*\d+\s+x\s*=\s*[-]?\d+)/,                   // "2x = 16 x = 8"
    /(\s+\d+[x\w]*\s*[+-]\s*\d+\s*=\s*\d+\s*\d+[x\w]*)/,          // "4x + 4 = 20 2x"
    
    // Solution keywords and annotations
    /(\s+(solution|answer|steps?):\s*)/i,                           // "Solution:"
    /(\s*\([^)]*solution\))/i,                                     // "(No solution)"
    /(\s+By\s+practicing\s+these\s+questions)/i,                   // Tutorial conclusion
    
    // Step indicators and conclusion words
    /(\s+(thus|therefore|hence|so),?\s+)/i,                        // Conclusion words
    /(\s+(step\s*\d+|first|next|then|finally)[:,]?\s+)/i,         // Step indicators
    
    // Final variable assignments (clearly answers)
    /(\s+x\s*=\s*[-]?\d+(?:\s|$))/,                                // " x = 5"
    
    // Multiple arithmetic operations showing work
    /(\s+\d+[x\w]*\s*[+\-*/]\s*\d+\s*[+\-*/]\s*\d+\s*=)/,        // "4x + 6 + 20 ="
  ];

  for (const pattern of splitPatterns) {
    const match = cleanQuestion.match(pattern);
    if (match) {
      const beforeMatch = cleanQuestion.substring(0, match.index).trim();
      
      // More lenient check - just ensure it's not too short and contains some math
      if (beforeMatch.length > 5 && 
          (beforeMatch.includes('=') ||         // Has an equation
           beforeMatch.includes(':') ||         // Has a colon (instruction)
           /[a-zA-Z]{4,}/.test(beforeMatch))) { // Has substantial text content
        cleanQuestion = beforeMatch;
        break;
      }
    }
  }

  // Clean up trailing incomplete elements
  cleanQuestion = cleanQuestion
    .replace(/[,\s]+$/, '')                    // Remove trailing commas/spaces
    .replace(/\s+[-+*/]\s*$/, '')             // Remove trailing operators
    .replace(/\s*=\s*$/, '')                  // Remove trailing equals
    .replace(/\s+\d+[x\w]*\s*$/, '')          // Remove trailing partial expressions
    .trim();
  
  // Ensure minimal acceptable question length
  if (cleanQuestion.length < 10) {
    return questionText; // Return original if cleaning made it too short
  }
  
  return cleanQuestion;
}

/**
 * Main repair function
 * @param {boolean} dryRun - If true, only logs what would be changed without making updates
 */
async function repairTutorialQuestions(dryRun = true) {
  console.log(`🔧 Starting tutorial question repair${dryRun ? ' (DRY RUN)' : ''}...`);
  
  try {
    // Find all tutorial exercises (both explicitly marked and by title patterns)
    const allExercises = await db
      .select()
      .from(exercises);

    const tutorialExercises = allExercises.filter(exercise => {
      return exercise.isTutorial === true || 
             exercise.title?.includes('Math Practice:') ||
             exercise.title?.includes('Tutorial:') ||
             exercise.title?.includes('Practice:') ||
             exercise.hasInitialTutorial === true ||
             exercise.generatedFor !== null; // Generated for specific students
    });

    console.log(`📊 Found ${tutorialExercises.length} tutorial exercises to check`);

    let totalProblems = 0;
    let totalFixed = 0;

    for (const exercise of tutorialExercises) {
      // Get questions for this exercise
      const questions = await db
        .select()
        .from(exerciseQuestions)
        .where(eq(exerciseQuestions.exerciseId, exercise.id));

      let exerciseProblems = 0;
      let exerciseFixed = 0;

      for (const question of questions) {
        if (hasMixedSolutionContent(question.question)) {
          exerciseProblems++;
          totalProblems++;

          const cleanQuestion = extractCleanQuestion(question.question);
          
          console.log(`\n❌ PROBLEM DETECTED:`);
          console.log(`   Exercise: "${exercise.title}" (ID: ${exercise.id})`);
          console.log(`   Question ${question.questionNumber}:`);
          console.log(`   BEFORE: "${question.question}"`);
          console.log(`   AFTER:  "${cleanQuestion}"`);

          if (!dryRun && cleanQuestion !== question.question) {
            try {
              await db
                .update(exerciseQuestions)
                .set({ 
                  question: cleanQuestion,
                  updatedAt: new Date()
                })
                .where(eq(exerciseQuestions.id, question.id));
              
              exerciseFixed++;
              totalFixed++;
              console.log(`   ✅ FIXED`);
            } catch (error) {
              console.log(`   ❌ FAILED TO FIX: ${error.message}`);
            }
          }
        }
      }

      if (exerciseProblems > 0) {
        console.log(`\n📈 Exercise "${exercise.title}": ${exerciseProblems} problems found${!dryRun ? `, ${exerciseFixed} fixed` : ''}`);
      }
    }

    console.log(`\n🎯 SUMMARY:`);
    console.log(`   📊 Tutorial exercises checked: ${tutorialExercises.length}`);
    console.log(`   ❌ Questions with mixed content: ${totalProblems}`);
    if (!dryRun) {
      console.log(`   ✅ Questions successfully repaired: ${totalFixed}`);
      console.log(`   ❌ Questions that failed to repair: ${totalProblems - totalFixed}`);
    } else {
      console.log(`   💡 Run with --apply to actually fix these issues`);
    }

  } catch (error) {
    console.error(`💥 Repair script failed:`, error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const dryRun = !isApply;

  if (dryRun) {
    console.log(`🔍 Running in DRY RUN mode. Use --apply to actually make changes.`);
  } else {
    console.log(`⚠️  APPLYING CHANGES to database!`);
  }

  await repairTutorialQuestions(dryRun);
  
  console.log(`\n✅ Repair script completed.`);
  process.exit(0);
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { repairTutorialQuestions, hasMixedSolutionContent, extractCleanQuestion };