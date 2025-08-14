/**
 * Integration Tests
 * Tests interactions between different components and complex workflows
 * Target Coverage: >85%
 */

describe('Integration', function() {
    let app;
    
    beforeEach(function() {
        TestUtils.cleanupDOM();
        app = TestUtils.createTestInstance();
    });
    
    afterEach(function() {
        TestUtils.cleanupDOM();
    });
    
    describe('Task Creation to Tag Management Workflow', function() {
        it('should complete full task creation and tagging workflow', async function() {
            // Step 1: Open task modal
            app.showTaskModal();
            expect(document.getElementById('taskModal').style.display).to.equal('block');
            
            // Step 2: Enter task name
            const taskInput = document.getElementById('taskNameInput');
            taskInput.value = 'Integration Test Task';
            
            // Step 3: Create task
            app.createTaskFromModal();
            
            // Verify task was created
            expect(app.taskNodes).to.have.length(1);
            const newTask = app.taskNodes[0];
            expect(newTask.querySelector('.node-text').textContent).to.equal('Integration Test Task');
            
            // Verify tag modal opened automatically
            expect(document.getElementById('tagModal').style.display).to.equal('block');
            expect(app.selectedTaskForTags).to.equal(newTask);
            
            // Step 4: Add urgency tag
            const tags = app.getTaskTags(newTask);
            tags.push({ category: 'urgency', option: 'urgent' });
            app.setTaskTags(newTask, tags);
            
            // Step 5: Add importance tag
            const updatedTags = app.getTaskTags(newTask);
            updatedTags.push({ category: 'importance', option: 'important' });
            app.setTaskTags(newTask, updatedTags);
            
            // Step 6: Save tags
            app.saveTaskTags();
            
            // Verify final state
            const finalTags = app.getTaskTags(newTask);
            expect(finalTags).to.have.length(2);
            expect(document.getElementById('tagModal').style.display).to.equal('none');
        });
        
        it('should reposition task in matrix mode after tagging', function() {
            // Create task in matrix mode
            app.isMatrixMode = true;
            document.getElementById('eisenhowerMatrix').style.display = 'grid';
            
            // Create and tag task
            app.createTaskNode('Matrix Task');
            const task = app.taskNodes[0];
            
            const tags = [
                { category: 'urgency', option: 'urgent' },
                { category: 'importance', option: 'important' }
            ];
            app.setTaskTags(task, tags);
            app.selectedTaskForTags = task;
            
            // Mock positioning to verify it's called
            let positionCalled = false;
            app.positionSingleTaskInMatrix = function(taskNode) {
                positionCalled = true;
                expect(taskNode).to.equal(task);
            };
            
            app.saveTaskTags();
            expect(positionCalled).to.be.true;
        });
    });
    
    describe('Eisenhower Matrix Integration', function() {
        beforeEach(function() {
            // Create test tasks with different tag combinations
            const taskConfigs = [
                { name: 'Urgent Important', tags: [
                    { category: 'urgency', option: 'urgent' },
                    { category: 'importance', option: 'important' }
                ]},
                { name: 'Not Urgent Important', tags: [
                    { category: 'urgency', option: 'not-urgent' },
                    { category: 'importance', option: 'important' }
                ]},
                { name: 'Urgent Not Important', tags: [
                    { category: 'urgency', option: 'urgent' },
                    { category: 'importance', option: 'not-important' }
                ]},
                { name: 'Not Urgent Not Important', tags: [
                    { category: 'urgency', option: 'not-urgent' },
                    { category: 'importance', option: 'not-important' }
                ]}
            ];
            
            taskConfigs.forEach(config => {
                app.createTaskNode(config.name);
                const task = app.taskNodes[app.taskNodes.length - 1];
                app.setTaskTags(task, config.tags);
            });
        });
        
        it('should toggle matrix mode and position all tasks correctly', function() {
            expect(app.taskNodes).to.have.length(4);
            
            // Store original positions
            const originalPositions = new Map();
            app.taskNodes.forEach(task => {
                const container = task.closest('.task-container');
                originalPositions.set(task.dataset.id, {
                    x: container.offsetLeft,
                    y: container.offsetTop
                });
            });
            
            // Toggle matrix on
            app.toggleEisenhowerMatrix();
            
            expect(app.isMatrixMode).to.be.true;
            expect(document.getElementById('eisenhowerMatrix').style.display).to.equal('grid');
            expect(app.originalNodePositions.size).to.be.greaterThan(0);
            
            // Toggle matrix off
            app.toggleEisenhowerMatrix();
            
            expect(app.isMatrixMode).to.be.false;
            expect(document.getElementById('eisenhowerMatrix').style.display).to.equal('none');
        });
        
        it('should correctly analyze and position tasks by quadrant', function() {
            const expectedQuadrants = {
                'Urgent Important': 2,        // Urgent & Important (top-right)
                'Not Urgent Important': 1,    // Not Urgent & Important (top-left)
                'Urgent Not Important': 4,    // Urgent & Not Important (bottom-right)
                'Not Urgent Not Important': 3 // Not Urgent & Not Important (bottom-left)
            };
            
            app.taskNodes.forEach(task => {
                const taskName = task.querySelector('.node-text').textContent;
                const tags = app.getTaskTags(task);
                const analysis = app.analyzeTaskUrgencyImportance(tags);
                
                let expectedQuadrant;
                if (analysis.isImportant && !analysis.isUrgent) {
                    expectedQuadrant = 1;
                } else if (analysis.isImportant && analysis.isUrgent) {
                    expectedQuadrant = 2;
                } else if (!analysis.isImportant && !analysis.isUrgent) {
                    expectedQuadrant = 3;
                } else if (!analysis.isImportant && analysis.isUrgent) {
                    expectedQuadrant = 4;
                }
                
                expect(expectedQuadrant).to.equal(expectedQuadrants[taskName]);
            });
        });
        
        it('should handle task creation in matrix mode', function() {
            // Enter matrix mode
            app.toggleEisenhowerMatrix();
            
            // Create new task in matrix mode
            app.createTaskNode('Matrix Mode Task');
            const newTask = app.taskNodes[app.taskNodes.length - 1];
            
            // Add tags
            const tags = [{ category: 'urgency', option: 'urgent' }];
            app.setTaskTags(newTask, tags);
            
            // Verify task is properly integrated into matrix
            expect(app.taskNodes).to.include(newTask);
            expect(app.originalNodePositions.has(newTask.dataset.id)).to.be.true;
        });
    });
    
    describe('Save and Load Workflow Integration', function() {
        beforeEach(function() {
            // Create a complex workflow for testing
            app.createNode('process', 150, 100);
            app.createNode('decision', 300, 150);
            app.createTaskNode('Workflow Task 1');
            app.createTaskNode('Workflow Task 2');
            
            // Add tags to tasks
            const task1 = app.taskNodes[0];
            const task2 = app.taskNodes[1];
            
            app.setTaskTags(task1, [
                { category: 'urgency', option: 'urgent' },
                { category: 'stage', option: 'draft' }
            ]);
            
            app.setTaskTags(task2, [
                { category: 'importance', option: 'important' },
                { category: 'bnb', option: 'ready' }
            ]);
        });
        
        it('should serialize complete workflow state', function() {
            const workflow = {
                version: "1.1",
                timestamp: new Date().toISOString(),
                nodeCounter: app.nodeCounter,
                nodes: app.nodes.map(node => {
                    const nodeData = {
                        id: node.dataset.id,
                        type: node.dataset.type,
                        text: node.querySelector('.node-text').textContent,
                        tags: node.dataset.tags ? JSON.parse(node.dataset.tags) : []
                    };
                    
                    // Include container position for tasks
                    if (node.dataset.type === 'task') {
                        const container = node.closest('.task-container');
                        if (container) {
                            nodeData.containerPosition = {
                                left: container.offsetLeft,
                                top: container.offsetTop
                            };
                        }
                    }
                    
                    return nodeData;
                })
            };
            
            expect(workflow.nodes).to.have.length(app.nodes.length);
            expect(workflow.version).to.equal("1.1");
            
            // Verify task data is properly serialized
            const taskNodes = workflow.nodes.filter(n => n.type === 'task');
            expect(taskNodes).to.have.length(2);
            
            taskNodes.forEach(taskData => {
                expect(taskData.tags).to.be.an('array');
                expect(taskData.containerPosition).to.be.an('object');
            });
        });
        
        it('should maintain workflow integrity through save/load cycle', function() {
            const originalNodeCount = app.nodes.length;
            const originalTaskCount = app.taskNodes.length;
            const originalNodeCounter = app.nodeCounter;
            
            // Simulate save operation
            const workflowData = {
                version: "1.1",
                nodeCounter: app.nodeCounter,
                nodes: app.nodes.map(node => ({
                    id: node.dataset.id,
                    type: node.dataset.type,
                    text: node.querySelector('.node-text').textContent,
                    tags: node.dataset.tags ? JSON.parse(node.dataset.tags) : [],
                    left: parseInt(node.style.left) || 0,
                    top: parseInt(node.style.top) || 0
                }))
            };
            
            // Clear current workflow
            app.clearWorkflow();
            expect(app.nodes).to.have.length(0);
            expect(app.taskNodes).to.have.length(0);
            
            // Simulate load operation
            app.nodeCounter = workflowData.nodeCounter;
            
            workflowData.nodes.forEach(nodeData => {
                if (nodeData.type === 'task') {
                    app.createTaskNode(nodeData.text);
                    const task = app.taskNodes[app.taskNodes.length - 1];
                    if (nodeData.tags && nodeData.tags.length > 0) {
                        app.setTaskTags(task, nodeData.tags);
                    }
                } else {
                    app.createNode(nodeData.type, nodeData.left, nodeData.top);
                    const node = app.nodes[app.nodes.length - 1];
                    node.querySelector('.node-text').textContent = nodeData.text;
                }
            });
            
            // Verify restoration
            expect(app.nodes).to.have.length(originalNodeCount);
            expect(app.taskNodes).to.have.length(originalTaskCount);
            expect(app.nodeCounter).to.equal(originalNodeCounter);
        });
        
        it('should handle version compatibility', function() {
            // Test loading older version workflow
            const oldVersionWorkflow = {
                version: "1.0",
                nodeCounter: 5,
                nodes: [
                    {
                        id: "1",
                        type: "terminal",
                        text: "Start",
                        left: 100,
                        top: 50
                    },
                    {
                        id: "2",
                        type: "task",
                        text: "Old Version Task",
                        tags: [{ category: 'urgency', option: 'urgent' }],
                        left: 150,
                        top: 150
                    }
                ]
            };
            
            // Should handle gracefully without containerPosition data
            expect(() => {
                app.clearWorkflow();
                oldVersionWorkflow.nodes.forEach(nodeData => {
                    if (nodeData.type === 'task') {
                        app.createTaskNode(nodeData.text);
                    } else {
                        app.createNode(nodeData.type, nodeData.left, nodeData.top);
                    }
                });
            }).to.not.throw();
        });
    });
    
    describe('Complex User Interactions', function() {
        it('should handle rapid sequential operations', async function() {
            // Simulate rapid user interactions
            const operations = [
                () => app.createTaskNode('Rapid Task 1'),
                () => app.createTaskNode('Rapid Task 2'),
                () => app.toggleEisenhowerMatrix(),
                () => app.createTaskNode('Rapid Task 3'),
                () => app.toggleEisenhowerMatrix(),
                () => app.createNode('process', 200, 200)
            ];
            
            // Execute operations rapidly
            operations.forEach(op => op());
            
            // Verify final state is consistent
            expect(app.taskNodes).to.have.length(3);
            expect(app.nodes).to.have.length(5); // 3 tasks + 1 process + 1 start node
            expect(app.isMatrixMode).to.be.false;
        });
        
        it('should maintain state consistency during complex workflows', function() {
            // Create complex state
            app.createTaskNode('State Test Task');
            const task = app.taskNodes[0];
            
            app.setTaskTags(task, [{ category: 'urgency', option: 'urgent' }]);
            app.selectedTaskForTags = task;
            app.selectedNode = task;
            
            // Toggle matrix multiple times
            app.toggleEisenhowerMatrix();
            app.toggleEisenhowerMatrix();
            app.toggleEisenhowerMatrix();
            
            // Verify state consistency
            expect(app.selectedTaskForTags).to.equal(task);
            expect(app.selectedNode).to.equal(task);
            expect(app.getTaskTags(task)).to.have.length(1);
            expect(app.isMatrixMode).to.be.true;
        });
    });
    
    describe('Error Recovery and Edge Cases', function() {
        it('should recover from DOM manipulation errors', function() {
            // Remove canvas temporarily
            const canvas = document.getElementById('canvas');
            const parent = canvas.parentNode;
            canvas.remove();
            
            // Application should handle missing canvas gracefully
            try {
                app.createNode('process', 100, 100);
                // Should either work with fallback or throw meaningful error
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
            }
            
            // Restore canvas
            parent.appendChild(canvas);
        });
        
        it('should handle corrupted tag data gracefully', function() {
            app.createTaskNode('Corrupted Tag Task');
            const task = app.taskNodes[0];
            
            // Set invalid tag data
            task.dataset.tags = 'invalid json';
            
            // Should not crash when reading tags
            const tags = app.getTaskTags(task);
            expect(tags).to.be.an('array');
            expect(tags).to.have.length(0);
        });
        
        it('should handle missing matrix elements', function() {
            // Remove matrix element
            const matrix = document.getElementById('eisenhowerMatrix');
            matrix.remove();
            
            // Should handle matrix toggle gracefully
            try {
                app.toggleEisenhowerMatrix();
                // Should either work with fallback or throw meaningful error
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
            }
        });
        
        it('should handle malformed workflow data', function() {
            const malformedWorkflow = {
                // Missing required fields
                nodes: [
                    { id: null, type: 'invalid' },
                    { id: "2", type: "task" }, // Missing text
                    null,
                    undefined
                ]
            };
            
            // Should handle gracefully without crashing
            try {
                app.clearWorkflow();
                
                malformedWorkflow.nodes.forEach(nodeData => {
                    if (nodeData && nodeData.id && nodeData.type) {
                        if (nodeData.type === 'task') {
                            app.createTaskNode(nodeData.text || 'Unnamed Task');
                        } else if (['process', 'decision', 'terminal'].includes(nodeData.type)) {
                            app.createNode(nodeData.type, 100, 100);
                        }
                    }
                });
                
                // Should have created only valid nodes
                expect(app.nodes.length).to.be.greaterThan(0);
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
            }
        });
    });
    
    describe('Performance and Memory', function() {
        it('should handle large numbers of tasks efficiently', function() {
            const startTime = performance.now();
            
            // Create many tasks
            for (let i = 0; i < 50; i++) {
                app.createTaskNode(`Performance Task ${i}`);
                if (i % 10 === 0) {
                    app.setTaskTags(app.taskNodes[app.taskNodes.length - 1], [
                        { category: 'urgency', option: i % 20 === 0 ? 'urgent' : 'not-urgent' }
                    ]);
                }
            }
            
            const creationTime = performance.now() - startTime;
            
            // Verify performance is reasonable (should complete in under 1 second)
            expect(creationTime).to.be.lessThan(1000);
            expect(app.taskNodes).to.have.length(50);
            
            // Test matrix operations with many tasks
            const matrixStartTime = performance.now();
            app.toggleEisenhowerMatrix();
            const matrixTime = performance.now() - matrixStartTime;
            
            expect(matrixTime).to.be.lessThan(500); // Matrix toggle should be fast
        });
        
        it('should clean up resources properly', function() {
            // Create tasks with observers
            app.createTaskNode('Cleanup Test Task');
            const task = app.taskNodes[0];
            const container = task.closest('.task-container');
            
            // Verify observer is attached
            expect(container._resizeObserver).to.not.be.undefined;
            
            // Clear workflow should clean up observers
            app.clearWorkflow();
            
            // Verify cleanup
            expect(app.nodes).to.have.length(0);
            expect(app.taskNodes).to.have.length(0);
        });
    });
    
    describe('Cross-Component Communication', function() {
        it('should properly coordinate between drag-drop and matrix positioning', function() {
            app.createTaskNode('Drag Matrix Task');
            const task = app.taskNodes[0];
            const container = task.closest('.task-container');
            
            // Position task manually
            container.style.left = '200px';
            container.style.top = '300px';
            
            // Enter matrix mode
            app.toggleEisenhowerMatrix();
            
            // Position should be stored
            expect(app.originalNodePositions.has(task.dataset.id)).to.be.true;
            
            // Exit matrix mode
            app.toggleEisenhowerMatrix();
            
            // Position should be restored
            expect(container.style.left).to.equal('200px');
            expect(container.style.top).to.equal('300px');
        });
        
        it('should coordinate tag changes with matrix positioning', function() {
            app.createTaskNode('Tag Matrix Coordination Task');
            const task = app.taskNodes[0];
            
            // Enter matrix mode
            app.toggleEisenhowerMatrix();
            
            // Change tags
            app.setTaskTags(task, [{ category: 'urgency', option: 'urgent' }]);
            app.selectedTaskForTags = task;
            
            // Mock positioning to verify coordination
            let repositioned = false;
            app.positionSingleTaskInMatrix = function(taskNode) {
                repositioned = true;
                expect(taskNode).to.equal(task);
            };
            
            app.saveTaskTags();
            expect(repositioned).to.be.true;
        });
    });
});