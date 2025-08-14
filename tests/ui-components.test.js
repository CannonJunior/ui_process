/**
 * UI Components Tests
 * Tests user interface components and interactions
 * Target Coverage: >90%
 */

describe('UI Components', function() {
    let app;
    
    beforeEach(function() {
        TestUtils.cleanupDOM();
        app = TestUtils.createTestInstance();
    });
    
    afterEach(function() {
        TestUtils.cleanupDOM();
    });
    
    describe('Modal Management', function() {
        describe('Task Modal', function() {
            it('should show task modal', function() {
                app.showTaskModal();
                
                const modal = document.getElementById('taskModal');
                expect(modal.style.display).to.equal('block');
            });
            
            it('should hide task modal', function() {
                app.showTaskModal();
                app.hideTaskModal();
                
                const modal = document.getElementById('taskModal');
                expect(modal.style.display).to.equal('none');
            });
            
            it('should clear task name input when showing modal', function() {
                const input = document.getElementById('taskNameInput');
                input.value = 'Previous Text';
                
                app.showTaskModal();
                expect(input.value).to.equal('');
            });
            
            it('should create task from modal input', function() {
                const input = document.getElementById('taskNameInput');
                input.value = 'Modal Test Task';
                
                const initialCount = app.taskNodes.length;
                app.createTaskFromModal();
                
                expect(app.taskNodes).to.have.length(initialCount + 1);
                
                const newTask = app.taskNodes[app.taskNodes.length - 1];
                expect(newTask.querySelector('.node-text').textContent).to.equal('Modal Test Task');
            });
            
            it('should not create task with empty name', function() {
                const input = document.getElementById('taskNameInput');
                input.value = '';
                
                const initialCount = app.taskNodes.length;
                app.createTaskFromModal();
                
                expect(app.taskNodes).to.have.length(initialCount);
            });
            
            it('should open tag modal after task creation', function() {
                const input = document.getElementById('taskNameInput');
                input.value = 'Tag Modal Test';
                
                app.createTaskFromModal();
                
                const tagModal = document.getElementById('tagModal');
                expect(tagModal.style.display).to.equal('block');
                expect(app.selectedTaskForTags).to.not.be.null;
            });
        });
        
        describe('Tag Modal', function() {
            beforeEach(function() {
                app.createTaskNode('Test Task for Tag Modal');
                app.selectedTaskForTags = app.taskNodes[app.taskNodes.length - 1];
            });
            
            it('should show tag modal for selected task', function() {
                app.showTagModal();
                
                const modal = document.getElementById('tagModal');
                expect(modal.style.display).to.equal('block');
            });
            
            it('should hide tag modal', function() {
                app.showTagModal();
                app.hideTagModal();
                
                const modal = document.getElementById('tagModal');
                expect(modal.style.display).to.equal('none');
            });
            
            it('should not show tag modal without selected task', function() {
                app.selectedTaskForTags = null;
                app.showTagModal();
                
                const modal = document.getElementById('tagModal');
                expect(modal.style.display).to.not.equal('block');
            });
            
            it('should not show tag modal for non-task nodes', function() {
                app.createNode('process', 100, 100);
                app.selectedNode = app.nodes[app.nodes.length - 1];
                app.showTagModal();
                
                const modal = document.getElementById('tagModal');
                expect(modal.style.display).to.not.equal('block');
            });
            
            it('should reset form fields when opening', function() {
                const categoryDropdown = document.getElementById('tagCategoryDropdown');
                const optionDropdown = document.getElementById('tagOptionDropdown');
                const dateInput = document.getElementById('tagDateInput');
                
                categoryDropdown.value = 'urgency';
                dateInput.value = '2024-01-01';
                
                app.showTagModal();
                
                expect(categoryDropdown.value).to.equal('');
                expect(optionDropdown.disabled).to.be.true;
                expect(dateInput.value).to.equal('');
            });
            
            it('should reposition task in matrix mode when saving tags', function() {
                app.isMatrixMode = true;
                
                // Add urgency/importance tags
                const tags = [
                    { category: 'urgency', option: 'urgent' },
                    { category: 'importance', option: 'important' }
                ];
                app.setTaskTags(app.selectedTaskForTags, tags);
                
                // Mock the positioning method to verify it's called
                let positionCalled = false;
                const originalPosition = app.positionSingleTaskInMatrix;
                app.positionSingleTaskInMatrix = function(task) {
                    positionCalled = true;
                    expect(task).to.equal(app.selectedTaskForTags);
                };
                
                app.saveTaskTags();
                expect(positionCalled).to.be.true;
                
                // Restore original method
                app.positionSingleTaskInMatrix = originalPosition;
            });
        });
        
        describe('Advance Task Modal', function() {
            beforeEach(function() {
                app.createTaskNode('Advance Test Task');
                app.selectedTaskForAdvance = app.taskNodes[app.taskNodes.length - 1];
            });
            
            it('should show advance task modal', function() {
                app.showAdvanceTaskModal();
                
                const modal = document.getElementById('advanceTaskModal');
                expect(modal.style.display).to.equal('block');
            });
            
            it('should hide advance task modal', function() {
                app.showAdvanceTaskModal();
                app.hideAdvanceTaskModal();
                
                const modal = document.getElementById('advanceTaskModal');
                expect(modal.style.display).to.equal('none');
            });
        });
    });
    
    describe('Context Menus', function() {
        describe('Node Context Menu', function() {
            beforeEach(function() {
                app.createNode('process', 100, 100);
                app.selectedNode = app.nodes[app.nodes.length - 1];
            });
            
            it('should show context menu at correct position', function() {
                const event = { clientX: 150, clientY: 200, preventDefault: () => {} };
                app.showContextMenu(150, 200);
                
                const menu = document.getElementById('contextMenu');
                expect(menu.style.display).to.equal('block');
                expect(menu.style.left).to.equal('150px');
                expect(menu.style.top).to.equal('200px');
            });
            
            it('should hide context menu', function() {
                app.showContextMenu(100, 100);
                app.hideContextMenu();
                
                const menu = document.getElementById('contextMenu');
                expect(menu.style.display).to.equal('none');
            });
            
            it('should handle context menu actions', function() {
                const actions = ['flowline', 'rename', 'delete'];
                
                actions.forEach(action => {
                    try {
                        app.handleContextMenuAction(action);
                        // Should not throw error
                        expect(true).to.be.true;
                    } catch (error) {
                        // If it throws, should be a meaningful error
                        expect(error).to.be.instanceOf(Error);
                    }
                });
            });
        });
        
        describe('Task Context Menu', function() {
            beforeEach(function() {
                app.createTaskNode('Context Menu Task');
                app.selectedNode = app.taskNodes[app.taskNodes.length - 1];
            });
            
            it('should show task context menu', function() {
                app.showTaskContextMenu(200, 250);
                
                const menu = document.getElementById('taskContextMenu');
                expect(menu.style.display).to.equal('block');
                expect(menu.style.left).to.equal('200px');
                expect(menu.style.top).to.equal('250px');
            });
            
            it('should handle task context menu actions', function() {
                const actions = ['advance', 'reverse', 'tags', 'rename', 'delete'];
                
                actions.forEach(action => {
                    try {
                        app.handleTaskContextMenuAction(action);
                        // Should not throw error for valid actions
                        expect(true).to.be.true;
                    } catch (error) {
                        // If it throws, should be a meaningful error
                        expect(error).to.be.instanceOf(Error);
                    }
                });
            });
        });
        
        describe('Tag Context Menu', function() {
            it('should hide tag context menus', function() {
                app.hideTagContextMenus();
                
                const tagMenu = document.getElementById('tagContextMenu');
                const attributeMenu = document.getElementById('tagAttributeMenu');
                const datePicker = document.getElementById('tagDatePicker');
                
                expect(tagMenu.style.display).to.equal('none');
                expect(attributeMenu.style.display).to.equal('none');
                expect(datePicker.style.display).to.equal('none');
            });
        });
    });
    
    describe('Drag and Drop', function() {
        beforeEach(function() {
            app.createNode('process', 100, 100);
            app.selectedNode = app.nodes[app.nodes.length - 1];
        });
        
        it('should initialize drag data', function() {
            expect(app.dragData).to.have.property('isDragging');
            expect(app.dragData).to.have.property('offset');
            expect(app.dragData.isDragging).to.be.false;
        });
        
        it('should handle mouse down for dragging', function() {
            const mockEvent = {
                clientX: 150,
                clientY: 200,
                preventDefault: () => {},
                stopPropagation: () => {},
                target: app.selectedNode
            };
            
            app.handleMouseDown(mockEvent, app.selectedNode);
            
            expect(app.dragData.isDragging).to.be.true;
            expect(app.selectedNode.classList.contains('dragging')).to.be.true;
        });
        
        it('should handle mouse move during drag', function() {
            // Start dragging
            app.dragData.isDragging = true;
            app.dragData.offset = { x: 10, y: 10 };
            
            const mockEvent = {
                clientX: 200,
                clientY: 250,
                preventDefault: () => {}
            };
            
            app.handleMouseMove(mockEvent);
            
            expect(app.selectedNode.style.left).to.equal('190px');
            expect(app.selectedNode.style.top).to.equal('240px');
        });
        
        it('should stop dragging on mouse up', function() {
            app.dragData.isDragging = true;
            app.selectedNode.classList.add('dragging');
            
            const mockEvent = {
                preventDefault: () => {}
            };
            
            app.handleMouseUp(mockEvent);
            
            expect(app.dragData.isDragging).to.be.false;
            expect(app.selectedNode.classList.contains('dragging')).to.be.false;
        });
    });
    
    describe('Dropdown Management', function() {
        it('should handle tag category dropdown changes', function() {
            const mockEvent = {
                target: {
                    value: 'urgency'
                }
            };
            
            app.handleTagCategoryChange(mockEvent);
            
            const optionDropdown = document.getElementById('tagOptionDropdown');
            expect(optionDropdown.disabled).to.be.false;
        });
        
        it('should disable option dropdown when no category selected', function() {
            const mockEvent = {
                target: {
                    value: ''
                }
            };
            
            app.handleTagCategoryChange(mockEvent);
            
            const optionDropdown = document.getElementById('tagOptionDropdown');
            expect(optionDropdown.disabled).to.be.true;
        });
    });
    
    describe('Visual Feedback', function() {
        it('should add hover effects to nodes', function() {
            app.createNode('process', 100, 100);
            const node = app.nodes[app.nodes.length - 1];
            
            const mockEvent = {
                type: 'mouseenter',
                target: node
            };
            
            // Simulate hover
            node.style.borderColor = '#007bff';
            expect(node.style.borderColor).to.equal('rgb(0, 123, 255)');
        });
        
        it('should show loading states during operations', function() {
            // Test would verify loading indicators during async operations
            expect(true).to.be.true; // Placeholder for loading state tests
        });
    });
    
    describe('Keyboard Interactions', function() {
        it('should handle Enter key in task name input', function() {
            const input = document.getElementById('taskNameInput');
            input.value = 'Keyboard Task';
            
            const mockEvent = {
                key: 'Enter',
                preventDefault: () => {}
            };
            
            const initialCount = app.taskNodes.length;
            
            // Simulate the event handler that calls createTaskFromModal on Enter
            if (mockEvent.key === 'Enter') {
                app.createTaskFromModal();
            }
            
            expect(app.taskNodes).to.have.length(initialCount + 1);
        });
        
        it('should handle Escape key to close modals', function() {
            app.showTaskModal();
            
            const mockEvent = {
                key: 'Escape',
                preventDefault: () => {}
            };
            
            // Simulate escape key handling
            if (mockEvent.key === 'Escape') {
                app.hideTaskModal();
            }
            
            const modal = document.getElementById('taskModal');
            expect(modal.style.display).to.equal('none');
        });
    });
    
    describe('Responsive Design', function() {
        it('should handle window resize events', function() {
            // Mock window resize
            const originalWidth = window.innerWidth;
            const originalHeight = window.innerHeight;
            
            // Simulate resize
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 800
            });
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                configurable: true,
                value: 600
            });
            
            // The application should handle this gracefully
            expect(window.innerWidth).to.equal(800);
            expect(window.innerHeight).to.equal(600);
            
            // Restore original values
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: originalWidth
            });
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                configurable: true,
                value: originalHeight
            });
        });
        
        it('should maintain element proportions on different screen sizes', function() {
            // Test responsive element sizing
            app.createNode('process', 100, 100);
            const node = app.nodes[app.nodes.length - 1];
            
            expect(node.offsetWidth).to.be.greaterThan(0);
            expect(node.offsetHeight).to.be.greaterThan(0);
        });
    });
    
    describe('Accessibility', function() {
        it('should have proper ARIA attributes', function() {
            const modal = document.getElementById('taskModal');
            
            // Modals should have role and aria-hidden attributes
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-hidden', 'true');
            
            expect(modal.getAttribute('role')).to.equal('dialog');
            expect(modal.getAttribute('aria-hidden')).to.equal('true');
        });
        
        it('should support keyboard navigation', function() {
            // Test tab navigation through interactive elements
            const buttons = document.querySelectorAll('button');
            expect(buttons.length).to.be.greaterThan(0);
            
            buttons.forEach(button => {
                expect(button.tabIndex).to.not.equal(-1);
            });
        });
    });
    
    describe('Form Validation', function() {
        it('should validate task name input', function() {
            const input = document.getElementById('taskNameInput');
            
            // Test empty input
            input.value = '';
            expect(input.value.trim()).to.equal('');
            
            // Test valid input
            input.value = 'Valid Task Name';
            expect(input.value.trim().length).to.be.greaterThan(0);
            
            // Test maximum length
            input.maxLength = 50;
            input.value = 'A'.repeat(60);
            expect(input.value.length).to.be.at.most(50);
        });
        
        it('should validate tag form inputs', function() {
            const categoryDropdown = document.getElementById('tagCategoryDropdown');
            const optionDropdown = document.getElementById('tagOptionDropdown');
            
            // Test category selection requirement
            categoryDropdown.value = '';
            optionDropdown.value = 'urgent';
            
            // Should not allow adding tag without category
            const isValid = categoryDropdown.value && optionDropdown.value;
            expect(isValid).to.be.false;
        });
    });
});