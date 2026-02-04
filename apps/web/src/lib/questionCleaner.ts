/**
 * UI-level question cleaning utility
 * Provides fallback cleaning for any remaining mixed solution content
 * that wasn't caught by server-side repairs
 */

/**
 * Detects if a question contains solution steps mixed into the question text
 * Uses conservative patterns to avoid breaking valid multi-equation questions
 */
export function hasMixedSolutionContent(questionText: string): boolean {
  if (!questionText || typeof questionText !== 'string') return false;
  
  // Conservative patterns to avoid false positives on valid multi-equation questions
  const solutionMarkers = [
    // Clear solution step sequences (multiple steps on same line without proper formatting)
    /\s+\d+[x\w]*\s*=\s*\d+\s+x\s*=\s*[-]?\d+/,               // "2x = 16 x = 8" (clear steps)
    
    // Tutorial conclusion text (very specific to generated content)
    /By\s+practicing\s+these\s+questions/i,                    // Tutorial conclusion text
    /the\s+student\s+(can|will)\s+(strengthen|improve)/i,      // Tutorial feedback text
    
    // Clear solution annotations
    /\s*\([^)]*solution\)/i,                                   // "(No solution)" 
    /\s+(solution|steps?):\s*/i,                               // "Solution:" or "Steps:"
    
    // Mathematical step progression indicators (very conservative)
    /\s+(step\s*\d+)[:,]?\s+/i,                                // "Step 1:" only
    /\s+(therefore|thus)\s+x\s*=\s*[-]?\d+/i,                  // "Therefore x = 5" (clear conclusion)
  ];

  return solutionMarkers.some(pattern => pattern.test(questionText));
}

/**
 * Attempts to extract just the question part from mixed content
 */
export function extractCleanQuestion(questionText: string): string {
  if (!questionText || typeof questionText !== 'string') return '';
  
  let cleanQuestion = questionText.trim();

  // Patterns to identify where solution steps start
  const splitPatterns = [
    // Multiple sequential equations (strongest indicator)
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
 * Main function to clean a question text for display
 * Only cleans tutorial questions to avoid breaking valid multi-equation questions
 * Returns cleaned text if mixed content detected, otherwise returns original
 */
export function cleanQuestionForDisplay(questionText: string, isTutorial: boolean = false): string {
  if (!questionText || typeof questionText !== 'string') return questionText;
  
  // Only clean tutorial questions to avoid breaking valid multi-equation questions
  if (isTutorial && hasMixedSolutionContent(questionText)) {
    console.warn(`🧹 UI cleaning tutorial mixed content: "${questionText.substring(0, 50)}..."`);
    const cleaned = extractCleanQuestion(questionText);
    console.log(`✨ UI cleaned to: "${cleaned}"`);
    return cleaned;
  }
  
  return questionText;
}