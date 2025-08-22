#!/usr/bin/env node

// Simple debug script to test the tag modal issue
// This will help identify if the issue is in element retrieval, config access, or event handling

console.log('🔍 Debug Tag Modal Issue');
console.log('========================');

// Test 1: Check if we can access the config directly
console.log('\n1. Testing config access:');
try {
    const fs = require('fs');
    const path = require('path');
    
    // Read config.js as text and extract the config object
    const configPath = path.join(__dirname, 'config.js');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Extract the stage options
    const stageMatch = configContent.match(/stage:\s*\[([\s\S]*?)\]/);
    if (stageMatch) {
        console.log('✅ Found stage options in config.js');
        const stageOptionsText = stageMatch[1];
        const stageCount = (stageOptionsText.match(/value:/g) || []).length;
        console.log(`   Found ${stageCount} stage options`);
    } else {
        console.log('❌ Could not find stage options in config.js');
    }
} catch (error) {
    console.log('❌ Error reading config.js:', error.message);
}

// Test 2: Check HTML structure
console.log('\n2. Testing HTML structure:');
try {
    const fs = require('fs');
    const path = require('path');
    
    const htmlPath = path.join(__dirname, 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Check for required elements
    const requiredIds = [
        'tagCategoryDropdown',
        'tagOptionDropdown',
        'tagModal',
        'currentTags'
    ];
    
    requiredIds.forEach(id => {
        const found = htmlContent.includes(`id="${id}"`);
        console.log(`   ${found ? '✅' : '❌'} ${id}: ${found ? 'Found' : 'Missing'}`);
    });
    
    // Check modal structure
    const hasManageTagsTitle = htmlContent.includes('Manage Task Tags');
    console.log(`   ${hasManageTagsTitle ? '✅' : '❌'} Modal title: ${hasManageTagsTitle ? 'Found' : 'Missing'}`);
    
} catch (error) {
    console.log('❌ Error reading index.html:', error.message);
}

// Test 3: Check service files
console.log('\n3. Testing service files:');
const serviceFiles = [
    'services/dom-service.js',
    'services/config-service.js',
    'features/tag-manager.js'
];

serviceFiles.forEach(file => {
    try {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, file);
        const exists = fs.existsSync(filePath);
        console.log(`   ${exists ? '✅' : '❌'} ${file}: ${exists ? 'Found' : 'Missing'}`);
        
        if (exists) {
            const content = fs.readFileSync(filePath, 'utf8');
            
            if (file.includes('tag-manager')) {
                const hasHandleChange = content.includes('handleTagCategoryChange');
                const hasGetTagOptions = content.includes('getTagOptions');
                console.log(`      - handleTagCategoryChange: ${hasHandleChange ? '✅' : '❌'}`);
                console.log(`      - references getTagOptions: ${hasGetTagOptions ? '✅' : '❌'}`);
            }
            
            if (file.includes('config-service')) {
                const hasPopulateDropdown = content.includes('populateDropdown');
                const hasGetTagOptions = content.includes('getTagOptions');
                console.log(`      - populateDropdown method: ${hasPopulateDropdown ? '✅' : '❌'}`);
                console.log(`      - getTagOptions method: ${hasGetTagOptions ? '✅' : '❌'}`);
            }
            
            if (file.includes('dom-service')) {
                const hasGetElement = content.includes('getElement');
                console.log(`      - getElement method: ${hasGetElement ? '✅' : '❌'}`);
            }
        }
    } catch (error) {
        console.log(`❌ Error checking ${file}:`, error.message);
    }
});

console.log('\n4. Potential Issues Identified:');
console.log('   Based on code analysis:');
console.log('   - TagManager uses configService.populateDropdown()');
console.log('   - ModalManager uses direct AppConfig access');
console.log('   - Both handle the same dropdown change event');
console.log('   - Potential race condition or conflicting handlers');

console.log('\n5. Recommended Investigation Steps:');
console.log('   1. Open http://localhost:8000 in browser');
console.log('   2. Create a task node');
console.log('   3. Right-click task → "Manage Tags"');
console.log('   4. Open browser DevTools Console');
console.log('   5. Select "Stage" in first dropdown');
console.log('   6. Check for console errors or debug messages');
console.log('   7. Verify which handleTagCategoryChange is being called');

console.log('\n6. Files Modified with Debug Logging:');
console.log('   ✅ features/tag-manager.js - Added extensive logging');
console.log('   ✅ services/config-service.js - Added logging');
console.log('   ✅ Required element validation updated');

console.log('\n🎯 Most Likely Issues:');
console.log('   1. tagOptionDropdown element is null/undefined');
console.log('   2. ConfigService path resolution failing'); 
console.log('   3. Conflict between ModalManager and TagManager handlers');
console.log('   4. AppConfig not properly loaded when TagManager initializes');

console.log('\nRun this and check browser console for detailed debug output!');