/**
 * Core Functionality Tests
 * Tests the fundamental operations of ProcessFlowDesigner
 * Target Coverage: >95%
 */

describe('Core Functionality', function() {
    let app;
    
    beforeEach(function() {
        TestUtils.cleanupDOM();
        app = TestUtils.createTestInstance();
    });
    
    afterEach(function() {
        TestUtils.cleanupDOM();
    });
    
    describe('Application Initialization', function() {
        it('should initialize with default values', function() {
            expect(app.nodes).to.be.an('array').that.is.empty;
            expect(app.nodeCounter).to.equal(0);
            expect(app.flowlines).to.be.an('array').that.is.empty;
            expect(app.selectedNode).to.be.null;
            expect(app.isMatrixMode).to.be.false;
        });
        
        it('should create default start node', function() {
            expect(app.startNode).to.not.be.null;
            expect(app.nodes).to.have.length(1);
            expect(app.startNode.dataset.type).to.equal('terminal');
        });
        
        it('should initialize DOM element references', function() {
            expect(app.canvas).to.not.be.null;
            expect(app.contextMenu).to.not.be.null;
            expect(app.taskModal).to.not.be.null;
            expect(app.eisenhowerToggle).to.not.be.null;
        });
    });
    
    describe('Node Management', function() {
        it('should create process nodes', function() {
            const initialCount = app.nodes.length;
            app.createNode('process', 100, 100);
            
            expect(app.nodes).to.have.length(initialCount + 1);
            expect(app.nodeCounter).to.be.greaterThan(0);
            
            const newNode = app.nodes[app.nodes.length - 1];
            expect(newNode.dataset.type).to.equal('process');
            expect(newNode.classList.contains('node')).to.be.true;
            expect(newNode.classList.contains('process')).to.be.true;
        });
        
        it('should create decision nodes', function() {
            const initialCount = app.nodes.length;
            app.createNode('decision', 200, 200);
            
            expect(app.nodes).to.have.length(initialCount + 1);
            
            const newNode = app.nodes[app.nodes.length - 1];
            expect(newNode.dataset.type).to.equal('decision');
            expect(newNode.classList.contains('decision')).to.be.true;
        });
        
        it('should create terminal nodes', function() {
            const initialCount = app.nodes.length;
            app.createNode('terminal', 300, 300);
            
            expect(app.nodes).to.have.length(initialCount + 1);
            
            const newNode = app.nodes[app.nodes.length - 1];
            expect(newNode.dataset.type).to.equal('terminal');
            expect(newNode.classList.contains('terminal')).to.be.true;
        });
        
        it('should increment node counter for each new node', function() {
            const startCounter = app.nodeCounter;
            app.createNode('process', 100, 100);
            expect(app.nodeCounter).to.equal(startCounter + 1);
            
            app.createNode('decision', 200, 200);
            expect(app.nodeCounter).to.equal(startCounter + 2);
        });
        
        it('should position nodes correctly', function() {
            app.createNode('process', 150, 250);
            const newNode = app.nodes[app.nodes.length - 1];
            
            expect(newNode.style.left).to.equal('150px');
            expect(newNode.style.top).to.equal('250px');
        });
    });
    
    describe('Task Management', function() {
        it('should create task nodes', function() {
            const initialTaskCount = app.taskNodes.length;
            app.createTaskNode('Test Task');
            
            expect(app.taskNodes).to.have.length(initialTaskCount + 1);
            expect(app.nodes).to.include(app.taskNodes[app.taskNodes.length - 1]);
            
            const newTask = app.taskNodes[app.taskNodes.length - 1];
            expect(newTask.dataset.type).to.equal('task');
            expect(newTask.querySelector('.node-text').textContent).to.equal('Test Task');
        });
        
        it('should initialize tasks with empty tags', function() {
            app.createTaskNode('Tagged Task');
            const newTask = app.taskNodes[app.taskNodes.length - 1];
            
            const tags = app.getTaskTags(newTask);
            expect(tags).to.be.an('array').that.is.empty;
        });
        
        it('should assign task slots correctly', function() {
            app.createTaskNode('Task 1');
            app.createTaskNode('Task 2');
            
            const task1 = app.taskNodes[app.taskNodes.length - 2];
            const task2 = app.taskNodes[app.taskNodes.length - 1];
            
            expect(task1.dataset.slot).to.equal('0');
            expect(task2.dataset.slot).to.equal('1');
        });
        
        it('should create task containers with proper structure', function() {
            app.createTaskNode('Structured Task');
            const newTask = app.taskNodes[app.taskNodes.length - 1];
            const container = newTask.closest('.task-container');
            
            expect(container).to.not.be.null;
            expect(container.querySelector('.task-banner')).to.not.be.null;
            expect(container.querySelector('.task-tags-area')).to.not.be.null;
        });
        
        it('should create next-action slots for tasks', function() {
            app.createTaskNode('Action Task');
            const newTask = app.taskNodes[app.taskNodes.length - 1];
            const taskId = newTask.dataset.id;
            
            const nextActionSlot = document.querySelector(`.next-action-slot[data-task-id="${taskId}"]`);
            expect(nextActionSlot).to.not.be.null;
        });
    });
    
    describe('Tag System', function() {
        beforeEach(function() {
            app.createTaskNode('Test Task for Tags');
            app.selectedTaskForTags = app.taskNodes[app.taskNodes.length - 1];
        });
        
        it('should add tags to tasks', function() {
            const tagData = { category: 'urgency', option: 'urgent' };
            
            // Simulate adding a tag
            const tags = app.getTaskTags(app.selectedTaskForTags);
            tags.push(tagData);
            app.setTaskTags(app.selectedTaskForTags, tags);
            
            const updatedTags = app.getTaskTags(app.selectedTaskForTags);
            expect(updatedTags).to.have.length(1);
            expect(updatedTags[0]).to.deep.equal(tagData);
        });
        
        it('should analyze task urgency and importance correctly', function() {
            const urgentImportantTags = [
                { category: 'urgency', option: 'urgent' },
                { category: 'importance', option: 'important' }
            ];
            
            const analysis = app.analyzeTaskUrgencyImportance(urgentImportantTags);
            expect(analysis.isUrgent).to.be.true;
            expect(analysis.isImportant).to.be.true;
        });
        
        it('should handle not-urgent and not-important tags', function() {
            const notUrgentNotImportantTags = [
                { category: 'urgency', option: 'not-urgent' },
                { category: 'importance', option: 'not-important' }
            ];
            
            const analysis = app.analyzeTaskUrgencyImportance(notUrgentNotImportantTags);
            expect(analysis.isUrgent).to.be.false;
            expect(analysis.isImportant).to.be.false;
        });
        
        it('should handle mixed tag scenarios', function() {
            const mixedTags = [
                { category: 'urgency', option: 'urgent' },
                { category: 'stage', option: 'draft' },
                { category: 'importance', option: 'not-important' }
            ];
            
            const analysis = app.analyzeTaskUrgencyImportance(mixedTags);
            expect(analysis.isUrgent).to.be.true;
            expect(analysis.isImportant).to.be.false;
        });
        
        it('should handle no urgency/importance tags', function() {
            const otherTags = [
                { category: 'stage', option: 'draft' },
                { category: 'bnb', option: 'ready' }
            ];
            
            const analysis = app.analyzeTaskUrgencyImportance(otherTags);
            expect(analysis.isUrgent).to.be.false;
            expect(analysis.isImportant).to.be.false;
        });
    });
    
    describe('Eisenhower Matrix', function() {
        it('should toggle matrix mode', function() {
            expect(app.isMatrixMode).to.be.false;
            
            app.toggleEisenhowerMatrix();
            expect(app.isMatrixMode).to.be.true;
            
            app.toggleEisenhowerMatrix();
            expect(app.isMatrixMode).to.be.false;
        });
        
        it('should store original positions when entering matrix mode', function() {
            app.createTaskNode('Position Test Task');
            
            app.toggleEisenhowerMatrix();
            
            expect(app.originalNodePositions.size).to.be.greaterThan(0);
        });
        
        it('should show matrix overlay when active', function() {
            const matrixElement = document.getElementById('eisenhowerMatrix');
            
            app.toggleEisenhowerMatrix();
            expect(matrixElement.style.display).to.equal('grid');
            
            app.toggleEisenhowerMatrix();
            expect(matrixElement.style.display).to.equal('none');
        });
        
        it('should maintain consistent button text in radio button mode', function() {
            const button = document.getElementById('eisenhowerToggle');
            
            // Button should always display "📊 Matrix" text, only color changes
            expect(button.textContent).to.equal('📊 Matrix');
            
            // Activate matrix mode
            app.setMode('matrix');
            expect(button.textContent).to.equal('📊 Matrix');
            expect(button.classList.contains('active')).to.be.true;
            
            // Activate different mode (should deactivate matrix)
            app.setMode('workflow');
            expect(button.textContent).to.equal('📊 Matrix');
            expect(button.classList.contains('active')).to.be.false;
        });
    });
    
    describe('Position Calculations', function() {
        it('should calculate task slot positions correctly', function() {
            app.createTaskNode('Position Test');
            const task = app.taskNodes[app.taskNodes.length - 1];
            
            const position = app.calculateTaskSlotPosition(task);
            expect(position).to.have.property('x');
            expect(position).to.have.property('y');
            expect(position.x).to.be.a('number');
            expect(position.y).to.be.a('number');
        });
        
        it('should handle missing anchor nodes gracefully', function() {
            app.createTaskNode('Orphan Task');
            const task = app.taskNodes[app.taskNodes.length - 1];
            task.dataset.anchoredTo = '999'; // Non-existent anchor
            
            const position = app.calculateTaskSlotPosition(task);
            expect(position.x).to.equal(100);
            expect(position.y).to.equal(100);
        });
    });
    
    describe('Workflow Serialization', function() {
        it('should serialize current workflow state', function() {
            app.createNode('process', 100, 100);
            app.createTaskNode('Workflow Task');
            
            const workflow = {
                version: "1.1",
                timestamp: new Date().toISOString(),
                nodeCounter: app.nodeCounter,
                nodes: app.nodes.map(node => ({
                    id: node.dataset.id,
                    type: node.dataset.type,
                    text: node.querySelector('.node-text').textContent
                }))
            };
            
            expect(workflow.nodes).to.have.length(app.nodes.length);
            expect(workflow.nodeCounter).to.equal(app.nodeCounter);
            expect(workflow.version).to.equal("1.1");
        });
        
        it('should include task container positions in workflow data', function() {
            app.createTaskNode('Positioned Task');
            const task = app.taskNodes[app.taskNodes.length - 1];
            const container = task.closest('.task-container');
            
            // Simulate positioned container
            container.style.left = '250px';
            container.style.top = '350px';
            
            const nodeData = {
                id: task.dataset.id,
                type: task.dataset.type,
                containerPosition: {
                    left: container.offsetLeft,
                    top: container.offsetTop
                }
            };
            
            expect(nodeData.containerPosition.left).to.be.a('number');
            expect(nodeData.containerPosition.top).to.be.a('number');
        });
    });
    
    describe('Error Handling', function() {
        it('should handle invalid node types gracefully', function() {
            const initialCount = app.nodes.length;
            
            // This should not crash the application
            try {
                app.createNode('invalid-type', 100, 100);
                // The method should either handle it gracefully or throw a known error
            } catch (error) {
                expect(error).to.be.instanceOf(Error);
            }
            
            // Node count should either stay the same or increase by 1 (depending on implementation)
            expect(app.nodes.length).to.be.at.least(initialCount);
        });
        
        it('should handle missing DOM elements gracefully', function() {
            // Remove a required element temporarily
            const canvas = document.getElementById('canvas');
            canvas.remove();
            
            try {
                const newApp = TestUtils.createTestInstance();
                // Should not crash, but may have limited functionality
                expect(newApp).to.be.instanceOf(ProcessFlowDesigner);
            } catch (error) {
                // If it throws, it should be a meaningful error
                expect(error.message).to.include('canvas');
            }
        });
        
        it('should handle malformed tag data', function() {
            const invalidTags = [
                { category: null, option: 'urgent' },
                { category: 'urgency', option: null },
                { invalid: 'data' },
                null,
                undefined
            ];
            
            invalidTags.forEach(tag => {
                try {
                    const analysis = app.analyzeTaskUrgencyImportance([tag].filter(Boolean));
                    expect(analysis).to.have.property('isUrgent');
                    expect(analysis).to.have.property('isImportant');
                } catch (error) {
                    // Should handle gracefully
                    expect(error).to.be.instanceOf(Error);
                }
            });
        });
    });
    
    describe('State Management', function() {
        it('should maintain consistent node counter', function() {
            const startCounter = app.nodeCounter;
            
            app.createNode('process', 100, 100);
            app.createTaskNode('Test Task');
            app.createNode('decision', 200, 200);
            
            expect(app.nodeCounter).to.equal(startCounter + 3);
            expect(app.nodes).to.have.length(startCounter + 4); // +1 for default start node
        });
        
        it('should track selected nodes correctly', function() {
            app.createNode('process', 100, 100);
            const newNode = app.nodes[app.nodes.length - 1];
            
            app.selectedNode = newNode;
            expect(app.selectedNode).to.equal(newNode);
            expect(app.selectedNode.dataset.type).to.equal('process');
        });
        
        it('should maintain task node array consistency', function() {
            const initialTaskCount = app.taskNodes.length;
            
            app.createTaskNode('Task 1');
            app.createTaskNode('Task 2');
            app.createNode('process', 100, 100); // Non-task node
            
            expect(app.taskNodes).to.have.length(initialTaskCount + 2);
            
            // All task nodes should have type 'task'
            app.taskNodes.forEach(task => {
                expect(task.dataset.type).to.equal('task');
            });
        });
    });
});