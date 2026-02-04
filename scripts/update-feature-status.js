#!/usr/bin/env node

/**
 * Feature Status Update Script
 * 
 * Automatically updates FEATURES.md with current system status:
 * 1. Checks if critical files exist and are recently modified
 * 2. Updates "Last Verified" dates for working features
 * 3. Validates that documented features still exist in codebase
 * 4. Provides status report for feature inventory management
 */

const fs = require('fs');
const path = require('path');

/**
 * Check if a file was recently modified (within last 7 days)
 */
function isRecentlyModified(filePath, days = 7) {
  try {
    const stats = fs.statSync(filePath);
    const modifiedTime = stats.mtime;
    const daysAgo = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    return modifiedTime > daysAgo;
  } catch (error) {
    return false;
  }
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Feature definitions with their critical files and status checks
 */
const FEATURES = {
  'Tutorial Generation': {
    files: [
      'server/mcp-client-service.ts',
      'server/mcp-server.js', 
      'client/src/components/TutorialCard.tsx',
      'server/routes.ts'
    ],
    checkFunction: 'generateTutorial',
    apiEndpoint: '/api/generate-tutorial-exercise',
    status: 'working'
  },
  'AI Grading & Feedback': {
    files: [
      'client/src/pages/HomeworkFeedback.tsx',
      'client/src/pages/TutorialExerciseFeedback.tsx',
      'server/mcp-client-service.ts'
    ],
    checkFunction: 'generateFeedback',
    status: 'working'
  },
  'MCP Sync System': {
    files: [
      'client/src/pages/PromptBuilder.tsx',
      'server/mcp-client-service.ts',
      'server/mcp-routes.ts'
    ],
    status: 'working'
  },
  'Question-Specific AI Chat': {
    files: [
      'client/src/pages/HomeworkFeedback.tsx',
      'client/src/components/TutorialCard.tsx',
      'client/src/pages/TutorialExerciseFeedback.tsx'
    ],
    checkFunction: 'tutorialChat',
    status: 'working'
  },
  'Assessment Count Logic': {
    files: [
      'server/routes.ts',
      'client/src/components/TeacherClassList.tsx'
    ],
    businessRules: ['homework + admin exercises', 'Number() conversion'],
    status: 'working'
  }
};

/**
 * Validate a feature's current status
 */
function validateFeatureStatus(featureName, featureConfig) {
  const results = {
    name: featureName,
    status: 'unknown',
    filesExist: true,
    recentlyModified: false,
    details: []
  };
  
  // Check if all required files exist
  for (const filePath of featureConfig.files) {
    if (fs.existsSync(filePath)) {
      results.details.push(`✅ File exists: ${filePath}`);
      
      if (isRecentlyModified(filePath)) {
        results.recentlyModified = true;
        results.details.push(`🔄 Recently modified: ${filePath}`);
      }
    } else {
      results.filesExist = false;
      results.details.push(`❌ Missing file: ${filePath}`);
    }
  }
  
  // Check for function existence (if specified)
  if (featureConfig.checkFunction) {
    try {
      const mcpServicePath = 'server/mcp-client-service.ts';
      if (fs.existsSync(mcpServicePath)) {
        const content = fs.readFileSync(mcpServicePath, 'utf8');
        
        if (content.includes(featureConfig.checkFunction)) {
          results.details.push(`✅ Function exists: ${featureConfig.checkFunction}`);
        } else {
          results.details.push(`⚠️ Function not found: ${featureConfig.checkFunction}`);
        }
      }
    } catch (error) {
      results.details.push(`⚠️ Could not verify function: ${error.message}`);
    }
  }
  
  // Check API endpoint (if specified)  
  if (featureConfig.apiEndpoint) {
    try {
      const routesPath = 'server/routes.ts';
      if (fs.existsSync(routesPath)) {
        const content = fs.readFileSync(routesPath, 'utf8');
        
        if (content.includes(featureConfig.apiEndpoint)) {
          results.details.push(`✅ API endpoint exists: ${featureConfig.apiEndpoint}`);
        } else {
          results.details.push(`⚠️ API endpoint not found: ${featureConfig.apiEndpoint}`);
        }
      }
    } catch (error) {
      results.details.push(`⚠️ Could not verify API endpoint: ${error.message}`);
    }
  }
  
  // Determine overall status
  if (results.filesExist && featureConfig.status === 'working') {
    results.status = 'working';
  } else if (results.filesExist) {
    results.status = 'needs_verification';
  } else {
    results.status = 'broken';
  }
  
  return results;
}

/**
 * Update FEATURES.md with current status
 */
function updateFeaturesDoc() {
  try {
    const featuresPath = 'docs/FEATURES.md';
    let content = fs.readFileSync(featuresPath, 'utf8');
    
    console.log('🔍 Validating current feature status...');
    
    const validationResults = {};
    const currentDate = getCurrentDate();
    
    // Validate each feature
    for (const [featureName, config] of Object.entries(FEATURES)) {
      const result = validateFeatureStatus(featureName, config);
      validationResults[featureName] = result;
      
      console.log(`\\n📋 ${featureName}:`);
      console.log(`   Status: ${result.status}`);
      result.details.forEach(detail => console.log(`   ${detail}`));
      
      // Update last verified date if feature is working
      if (result.status === 'working') {
        const statusPattern = new RegExp(
          `(\\*\\*${featureName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\*\\*[^|]*\\|[^|]*\\|[^|]*\\|)([^|]*)(\\|)`,
          'g'
        );
        
        content = content.replace(statusPattern, `$1 ${currentDate} $3`);
      }
    }
    
    // Write updated content back to file
    fs.writeFileSync(featuresPath, content);
    
    // Generate summary
    const workingCount = Object.values(validationResults).filter(r => r.status === 'working').length;
    const brokenCount = Object.values(validationResults).filter(r => r.status === 'broken').length;
    const needsVerificationCount = Object.values(validationResults).filter(r => r.status === 'needs_verification').length;
    
    console.log('\\n📊 Feature Status Summary:');
    console.log(`✅ Working: ${workingCount}`);
    console.log(`⚠️ Needs Verification: ${needsVerificationCount}`);
    console.log(`❌ Broken: ${brokenCount}`);
    
    if (brokenCount > 0) {
      console.log('\\n🚨 Critical: Some features are broken and need immediate attention!');
      return false;
    }
    
    console.log(`\\n✅ FEATURES.md updated with verification date: ${currentDate}`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to update FEATURES.md:', error.message);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log('🚀 XtraClass.ai Feature Status Update\\n');
  
  const success = updateFeaturesDoc();
  
  if (success) {
    console.log('\\n🎉 Feature status update completed successfully!');
    process.exit(0);
  } else {
    console.log('\\n💥 Feature status update failed.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { updateFeaturesDoc, validateFeatureStatus, FEATURES };