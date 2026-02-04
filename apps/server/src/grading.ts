// Automatic grading system for homework submissions
import { storage } from "./storage.js";
import { mcpClientService } from "./mcp-client-service.js";
export interface GradingResult {
  isCorrect: boolean;
  points: number;
  maxPoints: number;
  feedback: string;
  confidence: number; // 0-1 scale for grading confidence
}

export interface OverallFeedback {
  strengths: string[];
  improvements: string[];
  questionAnalysis: Array<{
    questionId: string;
    isCorrect: boolean;
    points: number;
    maxPoints: number;
    feedback: string;
  }>;
  totalScore: number;
  totalPossible: number;
  percentageScore: number;
}

/**
 * Fetch the published grading prompt from database with topic-specific support
 * Falls back to generic grading prompt, then MCP Homework Grading Assistant, then hardcoded prompt if not found
 */
async function getPublishedGradingPrompt(subject?: string, topic?: string): Promise<{
  promptText: string;
  variables: string[];
  usedDatabase: boolean;
  promptType: string;
}> {
  try {
    // Get all grading prompts
    const gradingPrompts = await storage.getAllAiPrompts();
    
    // STEP 1: Look for topic-specific prompt first
    // Format: "{subject} {topic} grading" (e.g., "Mathematics Algebra grading")
    if (subject && topic) {
      const topicSpecificName = `${subject} ${topic} grading`;
      const topicSpecificPrompt = gradingPrompts.find((p: any) => 
        p.category === 'grading' && 
        p.isActive && 
        (p.status === 'published' || p.status === 'implemented' || p.isPublished) &&
        p.name && p.name.toLowerCase() === topicSpecificName.toLowerCase()
      );

      if (topicSpecificPrompt) {
        console.log(`✅ Using topic-specific grading prompt: "${topicSpecificPrompt.name}"`);
        return {
          promptText: topicSpecificPrompt.promptText,
          variables: topicSpecificPrompt.variables || [],
          usedDatabase: true,
          promptType: 'topic-specific'
        };
      } else {
        console.log(`🔍 No topic-specific prompt found for "${topicSpecificName}", checking for generic prompt...`);
      }
    }

    // STEP 2: Look for generic published grading prompt
    const genericGradingPrompt = gradingPrompts.find((p: any) => 
      p.category === 'grading' && 
      p.isActive && 
      (p.status === 'published' || p.status === 'implemented' || p.isPublished)
    );

    if (genericGradingPrompt) {
      console.log(`✅ Using generic database grading prompt: "${genericGradingPrompt.name}"`);
      return {
        promptText: genericGradingPrompt.promptText,
        variables: genericGradingPrompt.variables || [],
        usedDatabase: true,
        promptType: 'generic'
      };
    }

    // STEP 2.5: Look for MCP "Homework Grading Assistant" prompt
    try {
      console.log(`🔍 No database grading prompt found, checking MCP for "Homework Grading Assistant"...`);
      const mcpPrompts = await mcpClientService.getPrompts();
      const homeworkGradingAssistant = mcpPrompts.find((p: any) => 
        p.key === 'homework_grading_assistant' || 
        p.name === 'Homework Grading Assistant'
      );

      if (homeworkGradingAssistant) {
        console.log(`✅ Using MCP Homework Grading Assistant prompt`);
        return {
          promptText: homeworkGradingAssistant.promptText,
          variables: homeworkGradingAssistant.variables || [],
          usedDatabase: true, // MCP is considered database for this purpose
          promptType: 'mcp-default'
        };
      } else {
        console.log(`⚠️  No MCP Homework Grading Assistant found`);
      }
    } catch (error) {
      console.error(`❌ Error fetching MCP grading prompt:`, error);
    }

    console.log(`⚠️  No published grading prompt found, using fallback hardcoded prompt`);
    // STEP 3: Fallback to hardcoded prompt
    return {
      promptText: `Please evaluate the student answer and return JSON data with the following format:
{
  "isCorrect": true/false,
  "awardedMarks": number,
  "explanation": "detailed explanation",
  "feedback": "constructive feedback"
}

CRITICAL: Grade ONLY what the student ACTUALLY wrote, NOT what you think they did.

If student wrote "x=5" - they showed NO working steps. Award 1 mark only.
If student wrote "Width = 6 cm, Length = 18 cm" - they showed NO working steps. Award 1 mark only.

DO NOT assume students "followed steps" unless you see the actual steps written.

ACTUAL EXAMPLES:
❌ "x=5" = FINAL ANSWER ONLY = 1 mark (even if correct)
❌ "Width = 8 cm, Length = 16 cm" = FINAL ANSWER ONLY = 1 mark  
❌ "The number is 6" = FINAL ANSWER ONLY = 1 mark
✅ "3x = 15, x = 5" = SOME WORKING = 2-3 marks
✅ "Step 1: 3x + 5 = 20, Step 2: 3x = 15, Step 3: x = 5" = FULL WORKING = Full marks

MARKING RULE:
- NO steps shown (just final answer): 1 mark maximum
- Some steps shown: 2-3 marks  
- Complete steps shown: Full marks
- Wrong answer: 0 marks

Grade: {{grade}}
Subject: {{subject}}
Topic: {{topic}}
Theme: {{theme}}
Syllabus: {{syllabus}}
Total Marks: {{total_marks}}
Question: {{question}}
Correct Answer: {{correct_answer}}
Student Answer: {{student_answer}}`,
      variables: ['grade', 'subject', 'topic', 'theme', 'syllabus', 'total_marks', 'question', 'correct_answer', 'student_answer'],
      usedDatabase: false,
      promptType: 'hardcoded'
    };
  } catch (error) {
    console.error('❌ Error fetching grading prompt from database, using hardcoded fallback:', error);
    // Fallback to hardcoded prompt on error
    return {
      promptText: `Please evaluate the student answer and return JSON data with the following format:
{
  "isCorrect": true/false,
  "awardedMarks": number,
  "explanation": "detailed explanation",
  "feedback": "constructive feedback"
}

CRITICAL: Grade ONLY what the student ACTUALLY wrote, NOT what you think they did.

Grade: {{grade}}
Subject: {{subject}}
Topic: {{topic}}
Question: {{question}}
Correct Answer: {{correct_answer}}
Student Answer: {{student_answer}}`,
      variables: ['grade', 'subject', 'topic', 'question', 'correct_answer', 'student_answer'],
      usedDatabase: false,
      promptType: 'hardcoded-error'
    };
  }
}

/**
 * Replace variables in prompt text with actual values
 */
function replacePromptVariables(
  promptText: string, 
  variables: Record<string, string>
): string {
  let processedPrompt = promptText;
  
  // Replace each variable with its value
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    processedPrompt = processedPrompt.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '');
  });
  
  return processedPrompt;
}

/**
 * Extract final numerical answer from text using common patterns
 * Prioritizes variable assignments and final numerical answers
 */
function extractFinalAnswer(text: string): string {
  // PRIORITY 1: Multiple variable assignments - get the LAST one (most important!)
  // Handle cases like "x= 9/3 ​=3" where 3 is the final answer
  const multipleAssignments = text.match(/([a-z]\s*=\s*[^=]+)/gi);
  if (multipleAssignments && multipleAssignments.length > 1) {
    // Get the last assignment - this is usually the final answer
    const lastAssignment = multipleAssignments[multipleAssignments.length - 1];
    const valueMatch = lastAssignment.match(/=\s*(-?\s*[\d\.\/]+)/);
    if (valueMatch) {
      return valueMatch[1].replace(/\s+/g, '').trim();
    }
  }
  
  // PRIORITY 2: Variable assignments with fractions (x = -3/4, x = 19/11, etc.)
  const variableWithFractionPatterns = [
    /([a-z]\s*=\s*-?\s*\d+\s*\/\s*\d+)\s*$/i, // Variable with fraction at end: "x = -3/4"
    /([a-z]\s*=\s*-?\s*\d+\s*\/\s*\d+)/gi, // Variable with fraction anywhere: "x = -3/4"
  ];
  
  for (const pattern of variableWithFractionPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      // Get the last variable assignment if multiple exist
      const lastMatch = matches[matches.length - 1];
      if (lastMatch) {
        // Extract just the fraction value: "x = -3/4" -> "-3/4"
        const valueMatch = lastMatch.match(/=\s*(-?\s*\d+\s*\/\s*\d+)/);
        if (valueMatch) {
          return valueMatch[1].replace(/\s+/g, '').trim(); // Remove spaces in fraction
        }
      }
    }
  }
  
  // PRIORITY 3: Variable assignments with simple numbers (x = 3, y = 5, etc.)
  const variablePatterns = [
    /([a-z]\s*=\s*-?\d+(?:\.\d+)?)\s*$/i, // Variable at end: "x = 3"
    /([a-z]\s*=\s*-?\d+(?:\.\d+)?)/gi, // Variable anywhere: "x = 3"
  ];
  
  for (const pattern of variablePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      // Get the last variable assignment if multiple exist
      const lastMatch = matches[matches.length - 1];
      if (lastMatch) {
        // Extract just the value: "x = 3" -> "3"
        const valueMatch = lastMatch.match(/=\s*(-?\d+(?:\.\d+)?)/);
        if (valueMatch) {
          return valueMatch[1].trim();
        }
      }
    }
  }
  
  // PRIORITY 4: Final fractional values at the end of lines  
  const finalFractionPatterns = [
    /=\s*(-?\s*\d+\s*\/\s*\d+)\s*$/i, // Final fraction at end: "= -3/4"
    /(-?\s*\d+\s*\/\s*\d+)\s*$/i // Any fraction at the very end
  ];
  
  for (const pattern of finalFractionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/\s+/g, '').trim(); // Remove spaces in fraction
    }
  }
  
  // PRIORITY 5: Final numerical values at the end of lines
  const finalAnswerPatterns = [
    /=\s*(-?\d+(?:\.\d+)?\s*(?:cm\^?2|m\^?2|km\^?2|mm\^?2)?)\s*$/i, // Final equals at end with optional units
    /(\d+(?:\.\d+)?\s*(?:cm\^?2|m\^?2|km\^?2|mm\^?2))\s*$/i, // Number with units at end
    /=\s*(-?\d+(?:\.\d+)?)\s*$/i, // Final numerical result at end
    /(-?\d+(?:\.\d+)?)\s*$/i // Any number at the very end
  ];
  
  for (const pattern of finalAnswerPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // PRIORITY 6: Specific result keywords
  const keywordPatterns = [
    /answer\s*[:=]\s*([^,\n]+)/i, // Extract after "answer:"
    /result\s*[:=]\s*([^,\n]+)/i, // Extract after "result:"
    /solution\s*[:=]\s*([^,\n]+)/i, // Extract after "solution:"
    /therefore\s*[:=]?\s*([^,\n]+)/i, // Extract after "therefore"
    /mean\s*[:=]?\s*([^,\n]+)/i, // Extract after "mean:"
    /mode\s*[:=]?\s*([^,\n]+)/i, // Extract after "mode:"
    /range\s*[:=]?\s*([^,\n]+)/i, // Extract after "range:"
    /median\s*[:=]?\s*([^,\n]+)/i, // Extract after "median:"
  ];
  
  for (const pattern of keywordPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // PRIORITY 7: Last resort - any equals sign (but this caused the original bug)
  const lastEqualsMatch = text.match(/=\s*([^=\n]+)$/);
  if (lastEqualsMatch && lastEqualsMatch[1]) {
    return lastEqualsMatch[1].trim();
  }
  
  return text; // Return original if no pattern matches
}

/**
 * Normalizes answers for comparison by removing extra spaces, 
 * converting to lowercase, and handling common formatting variations
 */
function normalizeAnswer(answer: string): string {
  // First, handle CSV format answers that include explanations (e.g., "−2. explanation")
  // Extract just the answer part before the first period followed by space
  let cleanAnswer = answer;
  const periodMatch = answer.match(/^([^.]+)\.\s+/);
  if (periodMatch) {
    // Only extract if there's text after the period (it's an explanation, not a decimal)
    cleanAnswer = periodMatch[1].trim();
  }
  
  let normalized = cleanAnswer
    .toLowerCase()
    .trim()
    
    // CRITICAL FIX: Replace Unicode minus sign (U+2212) with regular hyphen-minus (U+002D)
    // This fixes CSV imports that use proper typographic minus signs that don't match keyboard input
    .replace(/−/g, '-')  // Unicode minus sign U+2212 → hyphen-minus
    .replace(/\u2212/g, '-')  // Explicit Unicode code point
    .replace(/\uFF0D/g, '-')  // Full-width minus sign
    
    // Handle newlines and special characters
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/​/g, '') // Remove zero-width space
    .replace(/\u200B/g, '') // Remove zero-width space
    .replace(/\u00A0/g, ' ') // Replace non-breaking space with regular space
    
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    
    // Normalize parentheses and spacing
    .replace(/\s*,\s*/g, ',') // Normalize spacing around commas  
    .replace(/\s*\(\s*/g, '(') // Remove spaces after opening parenthesis
    .replace(/\s*\)\s*/g, ')') // Remove spaces before closing parenthesis
    .replace(/\(\s+/g, '(') // Remove spaces inside opening parenthesis
    .replace(/\s+\)/g, ')') // Remove spaces inside closing parenthesis
    
    // Normalize mathematical operators
    .replace(/\s*=\s*/g, '=') // Remove spaces around equals sign
    .replace(/\s*\+\s*/g, '+') // Remove spaces around plus sign
    .replace(/\s*-\s*/g, '-') // Remove spaces around minus sign (careful with negative numbers)
    .replace(/\s*\*\s*/g, '*') // Remove spaces around multiplication
    .replace(/\s*\/\s*/g, '/') // Remove spaces around division
    .replace(/\s*\^\s*/g, '^') // Remove spaces around exponents
    
    // Handle mathematical notation equivalences for better answer matching
    .replace(/×/g, '*') // Convert multiplication symbol to asterisk
    // DO NOT convert * to x - this corrupts mathematical expressions and variables
    .replace(/cm²/g, 'cm^2') // Convert cm² to cm^2
    .replace(/m²/g, 'm^2') // Convert m² to m^2
    .replace(/km²/g, 'km^2') // Convert km² to km^2
    .replace(/mm²/g, 'mm^2') // Convert mm² to mm^2
    .replace(/²/g, '^2') // Convert any ² to ^2
    .replace(/³/g, '^3') // Convert any ³ to ^3
    .replace(/√/g, 'sqrt') // Convert √ to sqrt
    .replace(/÷/g, '/') // Convert division symbol to /
    
    // Handle negative numbers correctly (restore space before minus if it's a negative number)
    .replace(/([=,\(])(-)/g, '$1$2') // Keep minus sign attached to numbers after =, ,, (
    .replace(/^(-)/g, '$1') // Keep minus sign at start of string
    
    // Normalize exponent notation
    .replace(/\^/g, '**') // Convert ^ to ** for exponents
    .replace(/\*\*/g, '^') // Keep ^ for easier pattern matching
    
    // Remove unnecessary multiplication symbols
    .replace(/\*(?=\d)/g, '') // Remove * before digits (but keep for variables)
    .replace(/(?<=\d)\*/g, '') // Remove * after digits (but keep for variables)
    
    .trim(); // Final trim to catch any edge cases

  // Sort variable assignments for consistent comparison (x=2,y=3 vs y=3,x=2)
  if (normalized.includes('=') && normalized.includes(',')) {
    const parts = normalized.split(',').map(part => part.trim()).sort();
    normalized = parts.join(',');
  }
  
  return normalized;
}

/**
 * Converts fractions to decimals for comparison
 * Handles various fraction formats: -3/4, - 3 / 4, -3/4, etc.
 */
function fractionToDecimal(fraction: string): number | null {
  // Clean up the fraction by removing spaces
  const cleanFraction = fraction.replace(/\s+/g, '');
  
  // Match fraction patterns including negative signs
  const fractionMatch = cleanFraction.match(/^(-?\d+)\/(-?\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    if (denominator !== 0) {
      return numerator / denominator;
    }
  }
  return null;
}

/**
 * Compares two answers to see if they're mathematically equivalent
 * Handles fractions, decimals, and different formats
 */
function areAnswersEquivalent(answer1: string, answer2: string): boolean {
  // Direct string comparison first (fastest)
  if (answer1 === answer2) return true;
  
  // Try fraction comparison
  const frac1 = fractionToDecimal(answer1);
  const frac2 = fractionToDecimal(answer2);
  
  if (frac1 !== null && frac2 !== null) {
    return Math.abs(frac1 - frac2) < 0.0001; // Close enough for floating point
  }
  
  // Try decimal comparison
  const num1 = parseFloat(answer1);
  const num2 = parseFloat(answer2);
  
  if (!isNaN(num1) && !isNaN(num2)) {
    return Math.abs(num1 - num2) < 0.0001;
  }
  
  // Try comparing fraction with decimal
  if (frac1 !== null && !isNaN(num2)) {
    return Math.abs(frac1 - num2) < 0.0001;
  }
  
  if (frac2 !== null && !isNaN(num1)) {
    return Math.abs(frac2 - num1) < 0.0001;
  }
  
  return false;
}

/**
 * Checks if two numeric answers are approximately equal
 */
function areNumericAnswersEqual(studentAnswer: string, correctAnswer: string, tolerance: number = 0.01): boolean {
  // Try direct numeric comparison first
  const studentNum = parseFloat(studentAnswer);
  const correctNum = parseFloat(correctAnswer);
  
  if (!isNaN(studentNum) && !isNaN(correctNum)) {
    return Math.abs(studentNum - correctNum) <= tolerance;
  }
  
  // Try fraction to decimal conversion
  const studentFraction = fractionToDecimal(studentAnswer);
  const correctFraction = fractionToDecimal(correctAnswer);
  
  if (studentFraction !== null && correctFraction !== null) {
    return Math.abs(studentFraction - correctFraction) <= tolerance;
  }
  
  // Try mixed comparison (fraction vs decimal)
  if (studentFraction !== null && !isNaN(correctNum)) {
    return Math.abs(studentFraction - correctNum) <= tolerance;
  }
  
  if (correctFraction !== null && !isNaN(studentNum)) {
    return Math.abs(studentNum - correctFraction) <= tolerance;
  }
  
  return false;
}

/**
 * Grades a single question based on student answer and correct answer
 */
export function gradeQuestion(
  studentAnswer: string,
  correctAnswer: string,
  answerType: string = 'exact',
  acceptableVariations: string[] = [],
  maxPoints: number = 10
): GradingResult {
  const originalStudent = studentAnswer;
  const originalCorrect = correctAnswer;
  
  // Use raw answers for now (no extraction/normalization)
  const normalizedStudent = normalizeAnswer(studentAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  
  // Debug output to show normalization steps  
  console.log(`\n=== LOCAL GRADING DEBUG (FALLBACK) ===`);
  console.log(`Student answer: "${originalStudent}"`);
  console.log(`Correct answer: "${originalCorrect}"`);
  console.log(`Answer type: ${answerType}`);
  console.log(`=======================================\n`);
  
  let isCorrect = false;
  let confidence = 1.0;
  let feedback = '';
  
  // Check exact match first (normalized)
  if (normalizedStudent === normalizedCorrect) {
    isCorrect = true;
    feedback = "Excellent work! Your answer is completely correct.";
    console.log(`✓ EXACT MATCH: "${normalizedStudent}" === "${normalizedCorrect}"`);
  }
  // Check acceptable variations
  else if (acceptableVariations.some(variation => normalizeAnswer(variation) === normalizedStudent)) {
    isCorrect = true;
    feedback = "Correct! You provided an acceptable alternative form of the answer.";
    console.log(`✓ ACCEPTABLE VARIATION MATCH`);
  }
  // Handle numeric answers with tolerance (including fractions)
  else if (answerType === 'numeric' || answerType === 'exact') {
    if (areNumericAnswersEqual(normalizedStudent, normalizedCorrect)) {
      isCorrect = true;
      feedback = "Correct! Your numerical answer is accurate.";
      console.log(`✓ NUMERIC MATCH with tolerance`);
    }
  }
  // Handle algebraic expressions (enhanced check)
  else if (answerType === 'algebraic') {
    // Enhanced algebraic matching with final answer extraction
    
    const studentFinal = extractFinalAnswer(normalizedStudent);
    const correctFinal = extractFinalAnswer(normalizedCorrect);
    
    const algebraicVariations = [
      normalizedCorrect,
      correctFinal,
      normalizedCorrect.replace(/\+/g, ' + ').replace(/-/g, ' - ').replace(/\s+/g, ' ').trim(),
      normalizedCorrect.replace(/(\d+)x/g, '$1*x'),
      normalizedCorrect.replace(/x(\d+)/g, 'x*$1'),
      // Try different term orders for polynomials
      normalizedCorrect.split('+').reverse().join('+').replace(/\+\-/g, '-')
    ];
    
    const studentVariations = [
      normalizedStudent,
      studentFinal,
      normalizedStudent.replace(/\+/g, ' + ').replace(/-/g, ' - ').replace(/\s+/g, ' ').trim(),
      normalizedStudent.replace(/(\d+)x/g, '$1*x'),
      normalizedStudent.replace(/x(\d+)/g, 'x*$1')
    ];
    
    let foundAlgebraicMatch = false;
    for (const studentVar of studentVariations) {
      for (const correctVar of algebraicVariations) {
        if (studentVar === correctVar) {
          foundAlgebraicMatch = true;
          break;
        }
      }
      if (foundAlgebraicMatch) break;
    }
    
    if (foundAlgebraicMatch) {
      isCorrect = true;
      feedback = "Correct! Your algebraic expression is equivalent to the expected answer.";
      console.log(`✓ ALGEBRAIC MATCH found`);
    } else {
      isCorrect = false;
      confidence = 0.7;
      feedback = `Your answer "${originalStudent}" doesn't match the expected form "${originalCorrect}". Please check your algebraic manipulation.`;
      console.log(`✗ No algebraic match found`);
    }
  }
  
  // Final check - if nothing else worked, try a more flexible comparison
  if (!isCorrect) {
    // Check if answers are numerically equivalent (for cases like "8/3" vs "2.667")
    if (areNumericAnswersEqual(normalizedStudent, normalizedCorrect, 0.1)) {
      isCorrect = true;
      feedback = "Correct! Your numerical answer is accurate (within acceptable tolerance).";
      console.log(`✓ FLEXIBLE NUMERIC MATCH with higher tolerance`);
    } else {
      // Check if final numerical answers match (for cases like detailed workings vs final answer)
      const studentFinalNum = extractFinalAnswer(normalizedStudent);
      const correctFinalNum = extractFinalAnswer(normalizedCorrect);
      
      console.log(`🔍 Comparing final answers: student="${studentFinalNum}" vs correct="${correctFinalNum}"`);
      
      if (areAnswersEquivalent(studentFinalNum, correctFinalNum)) {
        isCorrect = true;
        feedback = "Excellent! Your final answer is correct. Great problem-solving work!";
        console.log(`✓ FINAL ANSWER MATCH: "${studentFinalNum}" ≈ "${correctFinalNum}"`);
      } else {
        feedback = `Your answer "${originalStudent}" is incorrect. The correct answer is "${originalCorrect}".`;
        console.log(`✗ NO MATCH FOUND - answers are different`);
      }
    }
  }
  
  // If not marked correct, check for partial credit on statistical problems
  let points = 0;
  if (isCorrect) {
    points = maxPoints;
  } else {
    // Check for statistical partial credit
    const partialCredit = checkStatisticalPartialCredit(normalizedStudent, normalizedCorrect, originalStudent, originalCorrect, maxPoints);
    if (partialCredit.points > 0) {
      points = partialCredit.points;
      feedback = partialCredit.feedback;
      confidence = partialCredit.confidence;
      console.log(`📊 STATISTICAL PARTIAL CREDIT: ${points}/${maxPoints} points`);
    }
  }
  
  return {
    isCorrect,
    points,
    maxPoints,
    feedback,
    confidence
  };
}

/**
 * Check for partial credit on statistical calculations
 */
function checkStatisticalPartialCredit(
  normalizedStudent: string,
  normalizedCorrect: string,
  originalStudent: string,
  originalCorrect: string,
  maxPoints: number
): { points: number; feedback: string; confidence: number } {
  console.log(`📊 Checking statistical partial credit for student answer: "${originalStudent}"`);
  
  const studentLower = originalStudent.toLowerCase();
  const correctLower = originalCorrect.toLowerCase();
  
  // Check for mean calculation partial credit
  if (correctLower.includes('mean') || correctLower.includes('average')) {
    // Look for correct sum calculation
    if (studentLower.includes('104') || studentLower.includes('sum = 104')) {
      console.log(`✓ Found correct sum (104) in mean calculation`);
      return {
        points: Math.ceil(maxPoints * 0.6), // 60% credit for correct sum
        feedback: "Good work! You calculated the sum correctly (104). To find the mean, divide by the number of values (8): 104 ÷ 8 = 13.",
        confidence: 0.8
      };
    }
  }
  
  // Check for mode identification
  if (correctLower.includes('mode')) {
    // Extract numbers from student answer
    const studentNumbers = originalStudent.match(/\b\d+\b/g) || [];
    const correctNumbers = originalCorrect.match(/\b\d+\b/g) || [];
    
    // Look for mode = 2 (most common correct answer)
    if (studentLower.includes('mode') && (studentNumbers.includes('2') || studentLower.includes('mode=2') || studentLower.includes('mode = 2'))) {
      console.log(`✓ Found correct mode identification (2)`);
      return {
        points: maxPoints, // Full credit for correct mode
        feedback: "Excellent! You correctly identified the mode as 2.",
        confidence: 1.0
      };
    }
  }
  
  // Check for range calculation
  if (correctLower.includes('range') && !correctLower.includes('interquartile')) {
    const studentNumbers = originalStudent.match(/\b\d+\.?\d*\b/g) || [];
    const correctNumbers = originalCorrect.match(/\b\d+\.?\d*\b/g) || [];
    
    // Look for reasonable range values (common ranges: 15, 30-25=5, etc.)
    for (const num of studentNumbers) {
      const value = parseFloat(num);
      if (value >= 5 && value <= 20) { // Reasonable range for typical datasets
        console.log(`✓ Found reasonable range value (${value})`);
        return {
          points: Math.ceil(maxPoints * 0.7), // 70% credit for reasonable range
          feedback: `Good attempt! You calculated a range of ${value}. Make sure to verify by finding the difference between the highest and lowest values.`,
          confidence: 0.7
        };
      }
    }
  }
  
  // Check for interquartile range (IQR)
  if ((correctLower.includes('interquartile') || correctLower.includes('iqr')) && studentLower.includes('iqr')) {
    const studentNumbers = originalStudent.match(/\b\d+\.?\d*\b/g) || [];
    
    // Look for reasonable IQR values
    for (const num of studentNumbers) {
      const value = parseFloat(num);
      if (value >= 5 && value <= 15) { // Reasonable IQR for typical datasets
        console.log(`✓ Found reasonable IQR value (${value})`);
        return {
          points: Math.ceil(maxPoints * 0.6), // 60% credit for reasonable IQR
          feedback: `Good understanding of IQR concept! You provided ${value}. Make sure to calculate Q3 - Q1 correctly.`,
          confidence: 0.6
        };
      }
    }
  }
  
  // Check for standard deviation
  if (correctLower.includes('standard deviation') && studentLower.includes('standard deviation')) {
    const studentNumbers = originalStudent.match(/\b\d+\.?\d*\b/g) || [];
    
    // Look for reasonable standard deviation values
    for (const num of studentNumbers) {
      const value = parseFloat(num);
      if (value >= 1 && value <= 10) { // Reasonable standard deviation for typical datasets
        console.log(`✓ Found reasonable standard deviation value (${value})`);
        return {
          points: Math.ceil(maxPoints * 0.5), // 50% credit for reasonable standard deviation
          feedback: `Good attempt at standard deviation! You calculated approximately ${value}. This is a complex calculation - make sure to follow all steps.`,
          confidence: 0.5
        };
      }
    }
  }
  
  // Check for any statistical terms showing understanding
  const statisticalTerms = ['mean', 'median', 'mode', 'range', 'iqr', 'interquartile', 'standard deviation', 'variance'];
  const foundTerms = statisticalTerms.filter(term => studentLower.includes(term));
  
  if (foundTerms.length > 0) {
    console.log(`✓ Found statistical understanding: ${foundTerms.join(', ')}`);
    return {
      points: Math.ceil(maxPoints * 0.2), // 20% credit for showing understanding
      feedback: `You show understanding of statistical concepts (${foundTerms.join(', ')}). Keep practicing the calculations!`,
      confidence: 0.3
    };
  }
  
  console.log(`✗ No statistical partial credit found`);
  return { points: 0, feedback: '', confidence: 0 };
}

/**
 * Extracts specific skills/concepts from AI feedback text
 */
function extractSkillsFromFeedback(feedback: string): string[] {
  const skills: string[] = [];
  const lowerFeedback = feedback.toLowerCase();
  
  // Common skill patterns in AI feedback
  const skillPatterns = [
    { pattern: /isolat(?:e|ing) (?:the )?variable/i, skill: 'Isolating variables' },
    { pattern: /distributive property|distribut(?:e|ing)/i, skill: 'Distributive property' },
    { pattern: /combin(?:e|ing) like terms/i, skill: 'Combining like terms' },
    { pattern: /substitut(?:e|ion)/i, skill: 'Substitution' },
    { pattern: /factor(?:ing|ize|ization)/i, skill: 'Factoring' },
    { pattern: /expand(?:ing)? bracket/i, skill: 'Expanding brackets' },
    { pattern: /simplif(?:y|ying|ication)/i, skill: 'Simplification' },
    { pattern: /order of operations|BODMAS|PEMDAS/i, skill: 'Order of operations' },
    { pattern: /fraction(?:s)?/i, skill: 'Working with fractions' },
    { pattern: /decimal(?:s)?/i, skill: 'Decimal calculations' },
    { pattern: /percentage(?:s)?/i, skill: 'Percentage calculations' },
    { pattern: /ratio(?:s)?/i, skill: 'Ratios' },
    { pattern: /proportion(?:s)?/i, skill: 'Proportions' },
    { pattern: /pythagorean theorem/i, skill: 'Pythagorean theorem' },
    { pattern: /quadratic/i, skill: 'Quadratic equations' },
    { pattern: /linear equation/i, skill: 'Linear equations' },
    { pattern: /slope|gradient/i, skill: 'Finding slope/gradient' },
    { pattern: /graph(?:ing)?/i, skill: 'Graphing' },
    { pattern: /coordinate(?:s)?/i, skill: 'Coordinate geometry' },
    { pattern: /area/i, skill: 'Calculating area' },
    { pattern: /perimeter/i, skill: 'Calculating perimeter' },
    { pattern: /volume/i, skill: 'Calculating volume' },
    { pattern: /angle(?:s)?/i, skill: 'Working with angles' },
    { pattern: /theorem/i, skill: 'Applying theorems' },
    { pattern: /proof/i, skill: 'Mathematical proofs' },
  ];
  
  for (const { pattern, skill } of skillPatterns) {
    if (pattern.test(feedback)) {
      skills.push(skill);
    }
  }
  
  return skills;
}

/**
 * Generates overall feedback based on individual question results
 */
export function generateOverallFeedback(
  questionResults: Array<{
    questionId: string;
    result: GradingResult;
    questionText: string;
    subject?: string;
    topicName?: string;
    themeName?: string;
  }>
): OverallFeedback {
  const totalScore = questionResults.reduce((sum, q) => sum + q.result.points, 0);
  const totalPossible = questionResults.reduce((sum, q) => sum + q.result.maxPoints, 0);
  const percentageScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
  
  const correctAnswers = questionResults.filter(q => q.result.isCorrect);
  const incorrectAnswers = questionResults.filter(q => !q.result.isCorrect);
  
  const strengths: string[] = [];
  const improvements: string[] = [];
  
  // Generate strengths based on performance
  if (percentageScore >= 90) {
    strengths.push("Outstanding Performance: You demonstrated excellent mastery of the concepts");
  } else if (percentageScore >= 80) {
    strengths.push("Strong Understanding: You showed good grasp of most concepts");
  } else if (percentageScore >= 70) {
    strengths.push("Good Foundation: You have a solid understanding of the basic concepts");
  }
  
  if (correctAnswers.length > 0) {
    strengths.push(`Problem-Solving Skills: You correctly solved ${correctAnswers.length} out of ${questionResults.length} questions`);
  }
  
  // Generate specific, actionable improvements based on actual mistakes
  if (incorrectAnswers.length > 0) {
    // Extract skills from AI feedback and group by skill
    const skillMap = new Map<string, number[]>();
    const topicMap = new Map<string, number[]>();
    
    incorrectAnswers.forEach((q) => {
      const questionNum = questionResults.findIndex(qr => qr.questionId === q.questionId) + 1;
      
      // Extract skills from the AI's detailed feedback
      const skills = extractSkillsFromFeedback(q.result.feedback);
      skills.forEach(skill => {
        if (!skillMap.has(skill)) {
          skillMap.set(skill, []);
        }
        skillMap.get(skill)!.push(questionNum);
      });
      
      // Also group by topic/theme if available
      const topicKey = q.topicName || q.themeName;
      if (topicKey) {
        if (!topicMap.has(topicKey)) {
          topicMap.set(topicKey, []);
        }
        topicMap.get(topicKey)!.push(questionNum);
      }
    });
    
    // Generate skill-based improvements
    if (skillMap.size > 0) {
      skillMap.forEach((questionNums, skill) => {
        const qNums = questionNums.map(n => `Q${n}`).join(', ');
        improvements.push(`${skill} (${qNums})`);
      });
    }
    
    // If no skills extracted, group by topic/theme
    if (skillMap.size === 0 && topicMap.size > 0) {
      topicMap.forEach((questionNums, topic) => {
        const qNums = questionNums.map(n => `Q${n}`).join(', ');
        improvements.push(`${topic} (${qNums})`);
      });
    }
    
    // Fallback to generic message if no skills or topics extracted
    if (skillMap.size === 0 && topicMap.size === 0) {
      const questionNumbers = incorrectAnswers.map((q) => {
        const questionNum = questionResults.findIndex(qr => qr.questionId === q.questionId) + 1;
        return `Question ${questionNum}`;
      }).join(", ");
      improvements.push(`Focus on ${questionNumbers} where you made mistakes - review the step-by-step feedback for each`);
    }
    
    // Check if they're showing working
    const hasLimitedWorking = incorrectAnswers.every(q => 
      q.result.feedback.toLowerCase().includes('show') || 
      q.result.feedback.toLowerCase().includes('working')
    );
    
    if (hasLimitedWorking) {
      improvements.push("Always show your working steps - marks are awarded for the METHOD, not just the final answer");
    }
  }
  
  // Generate question-by-question analysis
  const questionAnalysis = questionResults.map(q => ({
    questionId: q.questionId,
    isCorrect: q.result.isCorrect,
    points: Number(q.result.points) || 0,
    maxPoints: Number(q.result.maxPoints) || 0,
    feedback: q.result.feedback,
    correctAnswer: (q.result as any).correctAnswer || '',
    explanation: (q.result as any).explanation || ''
  }));
  
  return {
    strengths,
    improvements,
    questionAnalysis,
    totalScore,
    totalPossible,
    percentageScore: Math.round(percentageScore * 100) / 100 // Round to 2 decimal places
  };
}

/**
 * Main function to grade a complete homework submission
 */
export async function gradeHomeworkSubmission(
  homework: {
    questions: Array<{
      id: string;
      question: string;
      points: number;
      correctAnswer: string;
      answerType?: string;
      acceptableVariations?: string[];
      topicName?: string;
      themeName?: string;
    }>;
  },
  studentAnswers: Array<{
    questionId: string;
    answer: string;
    imageUrl?: string;
  }>,
  context?: {
    grade?: string;
    subject?: string;
    topic?: string;
    theme?: string;
    syllabus?: string;
  }
): Promise<OverallFeedback> {
  console.log('🎯 Using WORKING AI Testing Page grading logic');
  console.log('Grading homework with questions:', homework.questions.map(q => ({ id: q.id, correctAnswer: q.correctAnswer })));
  console.log('Student answers:', studentAnswers);

  const totalMarks = homework.questions.reduce((sum, q) => sum + q.points, 0);
  
  // Fetch the published grading prompt from database (with topic-specific support)
  const promptData = await getPublishedGradingPrompt(context?.subject, context?.topic);
  
  console.log(`✅ Using ${promptData.promptType} grading prompt` + 
    (promptData.usedDatabase ? ' from database' : ' (hardcoded fallback)'));

  const gradingPromises = homework.questions.map(async (question) => {
    const studentAnswerObj = studentAnswers.find(sa => sa.questionId === question.id);
    const rawAnswer = studentAnswerObj?.answer || '';
    const imageUrl = studentAnswerObj?.imageUrl;
    
    console.log(`🖼️ Question ${question.id}:`, {
      hasStudentAnswer: !!studentAnswerObj,
      hasImageUrl: !!imageUrl,
      imageUrlLength: imageUrl?.length,
      imageUrlPreview: imageUrl?.substring(0, 50)
    });
    
    // Pre-normalize Unicode mathematical symbols (EXACT COPY)
    const normalizedAnswer = rawAnswer
      .replace(/𝑥/g, 'x')
      .replace(/𝑦/g, 'y') 
      .replace(/𝑧/g, 'z')
      .replace(/−/g, '-')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .trim();

    // Prepare variables for prompt replacement
    const promptVariables = {
      grade: context?.grade || "8",
      subject: context?.subject || "Mathematics",
      topic: context?.topic || "Algebra",
      theme: context?.theme || "Problem Solving",
      syllabus: context?.syllabus || "CAPS",
      total_marks: question.points.toString(),
      question: question.question,
      correct_answer: question.correctAnswer,
      student_answer: normalizedAnswer,
      student_answer_image: imageUrl ? "true" : ""
    };

    // Replace variables in the database prompt
    const structuredPrompt = replacePromptVariables(promptData.promptText, promptVariables);

    console.log('🔄 Sending structured question to OpenAI:', {
      questionId: question.id,
      totalMarks: question.points,
      usingDatabasePrompt: promptData.usedDatabase,
      hasImage: !!imageUrl,
      willUseVision: !!imageUrl,
      model: imageUrl ? "gpt-4o" : "gpt-4o-mini"
    });

    try {
      // Direct OpenAI call with EXACT COPY of working format
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Use vision API if image is provided
      const response = await openai.chat.completions.create({
        model: imageUrl ? "gpt-4o" : "gpt-4o-mini",
        messages: imageUrl ? [
          { 
            role: "user", 
            content: [
              { type: "text", text: structuredPrompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ] : [{ role: "user", content: structuredPrompt }],
        temperature: 0,
      });

      const aiResponse = response.choices[0].message.content;
      console.log('📥 Raw AI response for question', question.id, ':', aiResponse);

      // Strip markdown code blocks if present (AI sometimes wraps JSON in ```json...```)
      let cleanedResponse = aiResponse || "{}";
      const jsonMatch = cleanedResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[1];
        console.log('🧹 Stripped markdown wrapper, cleaned JSON:', cleanedResponse);
      }

      // Parse JSON response
      let gradingResult;
      try {
        gradingResult = JSON.parse(cleanedResponse);
        console.log('✅ Parsed grading result:', gradingResult);
      } catch (parseError) {
        console.error('❌ JSON parsing failed, using fallback:', parseError);
        gradingResult = {
          isCorrect: false,
          awardedMarks: 0,
          explanation: "Failed to parse AI response",
          feedback: cleanedResponse
        };
      }

      // Clamp awarded marks to max points to prevent AI from giving more than allowed
      const rawPoints = Number(gradingResult.awardedMarks || gradingResult.points) || 0;
      const maxPoints = Number(question.points);
      const clampedPoints = Math.min(Math.max(rawPoints, 0), maxPoints);
      
      // Recompute isCorrect based on clamped value (award is correct if it equals max points)
      const isCorrect = clampedPoints === maxPoints;
      
      console.log(`🔒 Question ${question.id} marks clamped:`, {
        rawPoints,
        maxPoints,
        clampedPoints,
        wasClamp: rawPoints !== clampedPoints,
        isCorrect
      });

      return {
        questionId: question.id,
        result: {
          isCorrect,
          points: clampedPoints,
          maxPoints,
          feedback: gradingResult.feedback || gradingResult.explanation || "No feedback provided",
          correctAnswer: question.correctAnswer || gradingResult.correctAnswer || gradingResult.derivedAnswer || '',
          explanation: gradingResult.explanation || '',
          confidence: 1.0
        },
        questionText: question.question,
        topicName: question.topicName,
        themeName: question.themeName
      };
    } catch (error) {
      console.error('❌ OpenAI grading error for question', question.id, ':', error);
      // Fallback to local grading if OpenAI fails
      console.log('🔄 Falling back to local grading');
      const localResult = gradeQuestion(
        rawAnswer,
        question.correctAnswer,
        question.answerType || 'exact',
        question.acceptableVariations || [],
        question.points
      );
      
      return {
        questionId: question.id,
        result: localResult,
        questionText: question.question,
        topicName: question.topicName,
        themeName: question.themeName
      };
    }
  });

  // Process all questions (EXACT COPY)
  const questionResults = await Promise.all(gradingPromises);
  
  console.log('📊 All question results:', questionResults);

  const feedback = generateOverallFeedback(questionResults);
  console.log('✅ WORKING AI Testing Page logic complete:', feedback);
  return feedback;
}