#!/usr/bin/env node

/**
 * Documentation Validation Script
 * 
 * Validates that documentation stays current and accurate:
 * 1. Checks API.md endpoint documentation matches actual routes
 * 2. Validates FEATURES.md entries have recent verification dates
 * 3. Ensures referenced files exist and are accessible
 * 4. Verifies critical functions have proper documentation
 */

const fs = require('fs');
const path = require('path');

const VALIDATION_RESULTS = {
  passes: [],
  warnings: [],
  failures: []
};

function log(level, message, details = '') {
  const entry = { message, details };
  VALIDATION_RESULTS[level].push(entry);
  
  const colors = {
    passes: '\x1b[32m',    // Green
    warnings: '\x1b[33m',  // Yellow  
    failures: '\x1b[31m'   // Red
  };
  
  const symbols = {
    passes: '✅',
    warnings: '⚠️',
    failures: '❌'
  };
  
  console.log(`${colors[level]}${symbols[level]} ${message}\x1b[0m`);
  if (details) console.log(`   ${details}`);
}

/**
 * Check if referenced files exist
 */
function validateFileReferences() {
  const criticalFiles = [
    'docs/FEATURES.md',
    'docs/TROUBLESHOOTING.md', 
    'docs/API.md',
    '.github/pull_request_template.md',
    'server/mcp-client-service.ts',
    'server/routes.ts',
    'client/src/components/TutorialCard.tsx',
    'client/src/pages/HomeworkFeedback.tsx',
    'client/src/pages/TutorialExerciseFeedback.tsx'
  ];
  
  let allFilesExist = true;
  
  for (const filePath of criticalFiles) {
    if (fs.existsSync(filePath)) {
      log('passes', `File exists: ${filePath}`);
    } else {
      log('failures', `Missing critical file: ${filePath}`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

/**
 * Validate feature status dates in FEATURES.md
 */
function validateFeatureStatus() {
  try {
    const featuresContent = fs.readFileSync('docs/FEATURES.md', 'utf8');
    
    // Extract last verified dates
    const datePattern = /Last Verified.*?(\d{4}-\d{2}-\d{2})/g;
    const matches = featuresContent.match(datePattern);
    
    if (!matches || matches.length === 0) {
      log('warnings', 'No "Last Verified" dates found in FEATURES.md');
      return false;
    }
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    let outdatedFeatures = 0;
    
    matches.forEach(match => {
      const dateStr = match.match(/(\d{4}-\d{2}-\d{2})/)[1];
      const verifiedDate = new Date(dateStr);
      
      if (verifiedDate < thirtyDaysAgo) {
        log('warnings', `Feature verification outdated: ${dateStr}`, 'Consider re-verifying this feature');
        outdatedFeatures++;
      } else {
        log('passes', `Feature verification current: ${dateStr}`);
      }
    });
    
    return outdatedFeatures === 0;
  } catch (error) {
    log('failures', 'Failed to validate feature status dates', error.message);
    return false;
  }
}

/**
 * Check if API documentation matches actual routes
 */
function validateAPIDocumentation() {
  try {
    // Read API documentation
    const apiContent = fs.readFileSync('docs/API.md', 'utf8');
    const routesContent = fs.readFileSync('server/routes.ts', 'utf8');
    
    // Extract documented endpoints from API.md
    const apiEndpoints = [];
    const endpointPattern = /#### `(GET|POST|PUT|DELETE) ([^`]+)`/g;
    let match;
    
    while ((match = endpointPattern.exec(apiContent)) !== null) {
      apiEndpoints.push(`${match[1]} ${match[2]}`);
    }
    
    // Extract actual routes from server code
    const actualRoutes = [];
    const routePattern = /app\.(get|post|put|delete)\("([^"]+)"/g;
    
    while ((match = routePattern.exec(routesContent)) !== null) {
      actualRoutes.push(`${match[1].toUpperCase()} ${match[2]}`);
    }
    
    // Check for mismatches
    let mismatches = 0;
    
    apiEndpoints.forEach(endpoint => {
      if (actualRoutes.includes(endpoint)) {
        log('passes', `API endpoint documented and implemented: ${endpoint}`);
      } else {
        log('warnings', `API endpoint documented but not found: ${endpoint}`, 'Check if route exists or update docs');
        mismatches++;
      }
    });
    
    // Check for undocumented routes
    const importantRoutes = actualRoutes.filter(route => 
      route.includes('/api/') && 
      !route.includes('/:') && 
      !route.includes('*')
    );
    
    importantRoutes.forEach(route => {
      if (!apiEndpoints.includes(route)) {
        log('warnings', `Route exists but not documented: ${route}`, 'Consider adding to API.md');
      }
    });
    
    return mismatches === 0;
  } catch (error) {
    log('failures', 'Failed to validate API documentation', error.message);
    return false;
  }
}

/**
 * Check critical functions have proper documentation
 */
function validateInlineDocumentation() {
  const filesToCheck = {
    'server/mcp-client-service.ts': [
      'callMCPServer',
      'generateTutorial', 
      'generateFeedback',
      'tutorialChat'
    ],
    'server/routes.ts': [
      'generate-tutorial-exercise',
      'Assessment Count Logic'
    ]
  };
  
  let allDocumented = true;
  
  for (const [filePath, requiredDocs] of Object.entries(filesToCheck)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      requiredDocs.forEach(docItem => {
        if (content.includes(`* CRITICAL`) && content.includes(docItem)) {
          log('passes', `Critical documentation found: ${docItem} in ${filePath}`);
        } else {
          log('warnings', `Missing critical documentation: ${docItem} in ${filePath}`);
          allDocumented = false;
        }
      });
    } catch (error) {
      log('failures', `Cannot read file for documentation check: ${filePath}`, error.message);
      allDocumented = false;
    }
  }
  
  return allDocumented;
}

/**
 * Main validation function
 */
function runValidation() {
  console.log('🔍 Running XtraClass.ai Documentation Validation\\n');
  
  const results = {
    fileReferences: validateFileReferences(),
    featureStatus: validateFeatureStatus(), 
    apiDocumentation: validateAPIDocumentation(),
    inlineDocumentation: validateInlineDocumentation()
  };
  
  // Summary
  console.log('\\n📊 Validation Summary:');
  console.log(`✅ Passes: ${VALIDATION_RESULTS.passes.length}`);
  console.log(`⚠️  Warnings: ${VALIDATION_RESULTS.warnings.length}`);  
  console.log(`❌ Failures: ${VALIDATION_RESULTS.failures.length}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  const hasFailures = VALIDATION_RESULTS.failures.length > 0;
  
  if (allPassed && !hasFailures) {
    console.log('\\n🎉 All documentation validation checks passed!');
    process.exit(0);
  } else if (hasFailures) {
    console.log('\\n💥 Documentation validation failed with critical errors.');
    process.exit(1);
  } else {
    console.log('\\n⚠️  Documentation validation passed with warnings.');
    console.log('Consider addressing warnings to improve documentation quality.');
    process.exit(0);
  }
}

// Run validation if called directly
if (require.main === module) {
  runValidation();
}

module.exports = { runValidation, VALIDATION_RESULTS };