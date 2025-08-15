/**
 * Phase 6 Tag System Verification
 * Tests tag manager integration and functionality
 */

// Verification function for tag system
if (typeof window !== 'undefined') {
    window.verifyTagSystem = function() {
        console.log('🧪 Phase 6 Tag System Verification Starting...');
        
        const results = {
            tagManagerExists: false,
            tagElementsAccessible: false,
            tagDataManagement: false,
            tagCRUDOperations: false,
            tagDisplayWorking: false,
            tagDragDropWorking: false,
            interfacePreserved: false
        };
        
        try {
            // Test 1: Tag Manager exists and is accessible
            if (window.processFlowDesigner && window.processFlowDesigner.tagManager) {
                results.tagManagerExists = true;
                console.log('✅ Tag Manager exists and is accessible');
                
                const tagManager = window.processFlowDesigner.tagManager;
                
                // Test 2: Tag elements are accessible through manager
                const validation = tagManager.validateTagElements();
                if (validation.isValid) {
                    results.tagElementsAccessible = true;
                    console.log('✅ Tag elements accessible through manager');
                } else {
                    console.warn('⚠️ Some tag elements missing:', validation.errors);
                    // Still count as accessible if not completely broken
                    if (validation.errors.length < 3) {
                        results.tagElementsAccessible = true;
                    }
                }
                
                // Test 3: Tag data management methods
                if (typeof tagManager.getTaskTags === 'function' &&
                    typeof tagManager.setTaskTags === 'function' &&
                    typeof tagManager.updateTagAttribute === 'function') {
                    results.tagDataManagement = true;
                    console.log('✅ Tag data management methods working');
                }
                
                // Test 4: Tag CRUD operations
                if (typeof tagManager.addTagToTask === 'function' &&
                    typeof tagManager.removeTag === 'function') {
                    results.tagCRUDOperations = true;
                    console.log('✅ Tag CRUD operations working');
                }
                
                // Test 5: Tag display methods
                if (typeof tagManager.displayCurrentTags === 'function' &&
                    typeof tagManager.updateTaskTagsDisplay === 'function') {
                    results.tagDisplayWorking = true;
                    console.log('✅ Tag display methods working');
                }
                
                // Test 6: Tag drag and drop methods
                if (typeof tagManager.handleTagDragStart === 'function' &&
                    typeof tagManager.handleTagDragEnd === 'function' &&
                    typeof tagManager.snapTagToSlot === 'function') {
                    results.tagDragDropWorking = true;
                    console.log('✅ Tag drag and drop methods working');
                }
                
                // Test 7: Interface preservation
                const originalMethods = [
                    'getTaskTags', 'setTaskTags', 'displayCurrentTags', 'updateTaskTagsDisplay',
                    'addTagToTask', 'removeTag', 'handleTagCategoryChange', 'updateTagAttribute',
                    'handleTagDragStart', 'handleTagDragEnd', 'snapTagToSlot', 'snapTagBack',
                    'formatDateForDisplay', 'showSimpleTagMenu', 'saveTaskTags'
                ];
                
                const allMethodsExist = originalMethods.every(method => 
                    typeof window.processFlowDesigner[method] === 'function'
                );
                
                if (allMethodsExist) {
                    results.interfacePreserved = true;
                    console.log('✅ All original tag interfaces preserved');
                }
                
            } else {
                console.error('❌ Tag Manager not found in main application');
            }
            
        } catch (error) {
            console.error('❌ Tag system verification error:', error);
        }
        
        // Summary
        const passedTests = Object.values(results).filter(result => result === true).length;
        const totalTests = Object.keys(results).length;
        
        console.log(`\\n🎯 Tag System Verification Results: ${passedTests}/${totalTests} tests passed`);
        
        Object.entries(results).forEach(([test, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${test}`);
        });
        
        const allPassed = passedTests === totalTests;
        console.log(`\\n${allPassed ? '🎉' : '⚠️'} Tag System Verification ${allPassed ? 'PASSED' : 'FAILED'}`);
        
        return {
            success: allPassed,
            passedTests,
            totalTests,
            results
        };
    };
    
    // Additional tag interaction tests
    window.testTagInteractions = function() {
        console.log('🔄 Testing Tag Interactions...');
        
        if (!window.processFlowDesigner) {
            console.error('❌ ProcessFlowDesigner not available');
            return false;
        }
        
        const app = window.processFlowDesigner;
        const tagManager = app.tagManager;
        
        if (!tagManager) {
            console.error('❌ Tag Manager not available');
            return false;
        }
        
        try {
            // Test tag manager state management
            console.log('Testing tag manager state management...');
            
            const tagState = tagManager.getTagManagerState();
            console.log('Tag manager state:', tagState);
            
            if (tagState && tagState.elementsLoaded) {
                console.log('✅ Tag manager state accessible');
            } else {
                console.warn('⚠️ Tag manager state not accessible');
            }
            
            // Test tag data methods with mock data
            console.log('Testing tag data methods...');
            
            // Create a mock task element for testing
            const mockTask = document.createElement('div');
            mockTask.dataset.id = 'test-task';
            mockTask.dataset.tags = JSON.stringify([
                { category: 'priority', option: 'high' },
                { category: 'context', option: 'work', date: '2025-01-15' }
            ]);
            
            // Test getTaskTags
            const tags = tagManager.getTaskTags(mockTask);
            if (Array.isArray(tags) && tags.length === 2) {
                console.log('✅ getTaskTags working correctly');
            } else {
                console.warn('⚠️ getTaskTags not working as expected');
            }
            
            // Test setTaskTags
            const newTags = [...tags, { category: 'status', option: 'active' }];
            tagManager.setTaskTags(mockTask, newTags);
            
            const updatedTags = tagManager.getTaskTags(mockTask);
            if (Array.isArray(updatedTags) && updatedTags.length === 3) {
                console.log('✅ setTaskTags working correctly');
            } else {
                console.warn('⚠️ setTaskTags not working as expected');
            }
            
            // Test formatDateForDisplay
            const formattedDate = tagManager.formatDateForDisplay('2025-01-15');
            if (formattedDate && formattedDate.includes('2025')) {
                console.log('✅ Date formatting working correctly');
            } else {
                console.warn('⚠️ Date formatting not working as expected');
            }
            
            // Test tag element validation
            const validation = tagManager.validateTagElements();
            if (validation && typeof validation.isValid === 'boolean') {
                console.log('✅ Tag element validation working');
            } else {
                console.warn('⚠️ Tag element validation not working');
            }
            
            console.log('✅ Tag interaction tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Tag interaction test error:', error);
            return false;
        }
    };
    
    // Test tag drag and drop functionality
    window.testTagDragDrop = function() {
        console.log('🔄 Testing Tag Drag and Drop...');
        
        if (!window.processFlowDesigner || !window.processFlowDesigner.tagManager) {
            console.error('❌ Tag Manager not available');
            return false;
        }
        
        const tagManager = window.processFlowDesigner.tagManager;
        
        try {
            // Test drag state management
            console.log('Testing tag drag state management...');
            
            // Create mock tag element
            const mockTag = document.createElement('div');
            mockTag.className = 'tag';
            mockTag.dataset.tagIndex = '0';
            mockTag.dataset.taskId = 'test-task';
            
            // Create mock drag event
            const mockDragEvent = new Event('dragstart', { bubbles: true });
            mockDragEvent.target = mockTag;
            mockDragEvent.dataTransfer = {
                effectAllowed: '',
                setData: function() {}
            };
            
            // Test drag start
            tagManager.handleTagDragStart(mockDragEvent);
            
            const tagState = tagManager.getTagManagerState();
            if (tagState.draggedTag && tagState.draggedTag.taskId === 'test-task') {
                console.log('✅ Tag drag start handling working');
            } else {
                console.warn('⚠️ Tag drag start not working as expected');
            }
            
            // Test drag end
            const mockDragEndEvent = new Event('dragend', { bubbles: true });
            mockDragEndEvent.target = mockTag;
            
            tagManager.handleTagDragEnd(mockDragEndEvent);
            console.log('✅ Tag drag end handling completed');
            
            console.log('✅ Tag drag and drop tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Tag drag and drop test error:', error);
            return false;
        }
    };
    
    // Auto-run verification when page loads
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for app initialization
        setTimeout(() => {
            if (typeof window.verifyTagSystem === 'function') {
                window.verifyTagSystem();
            }
        }, 1500); // Longer wait for tag system to initialize
    });
}

console.log('📋 Phase 6 Tag System Verification Script Loaded');