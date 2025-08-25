/**
 * Data Relationship Tracking Service
 * Manages relationships between all workflow entities (nodes, tasks, opportunities, tags)
 * Provides foundation for future PostgreSQL integration and RAG capabilities
 * 
 * SAFETY: Manages complex data relationships with validation and consistency checks
 * Risk Level: MEDIUM - Complex state management, data integrity critical
 */

class RelationshipTracker {
    constructor() {
        // Core relationship store
        this.relationships = new Map();
        
        // Entity type registry
        this.entityTypes = {
            NODE: 'node',
            TASK: 'task',  
            OPPORTUNITY: 'opportunity',
            TAG: 'tag',
            WORKFLOW: 'workflow',
            FLOWLINE: 'flowline'
        };
        
        // Relationship type definitions
        this.relationshipTypes = {
            // Direct structural relationships
            ANCHORED_TO: 'anchored_to',        // Task -> Node
            LINKED_TO: 'linked_to',            // Task -> Opportunity  
            FLOWS_TO: 'flows_to',              // Node -> Node (via flowline)
            CONTAINS: 'contains',              // Workflow -> Node/Task
            TAGGED_WITH: 'tagged_with',        // Task -> Tag
            
            // Semantic relationships (for future AI)
            SIMILAR_TO: 'similar_to',          // High semantic similarity
            RELATED_BY_CONTENT: 'related_by_content', // Content-based relation
            SEQUENTIAL: 'sequential',          // Process sequence order
            DEPENDENT_ON: 'dependent_on',      // Task dependencies
            
            // Temporal relationships
            PRECEDES: 'precedes',              // Temporal ordering
            CONCURRENT_WITH: 'concurrent_with' // Parallel activities
        };
        
        // Relationship metadata store
        this.relationshipMetadata = new Map();
        
        // Change event listeners
        this.eventListeners = new Map();
        
        // Statistics cache
        this.stats = {
            totalRelationships: 0,
            relationshipsByType: new Map(),
            entitiesByType: new Map(),
            lastUpdated: null
        };
        
        console.log('RelationshipTracker: Initialized relationship tracking system');
    }
    
    /**
     * Add a relationship between two entities
     * @param {string} sourceType - Source entity type
     * @param {string} sourceId - Source entity ID
     * @param {string} targetType - Target entity type
     * @param {string} targetId - Target entity ID
     * @param {string} relationshipType - Type of relationship
     * @param {Object} metadata - Additional relationship metadata
     * @param {number} strength - Relationship strength (0.0-1.0)
     */
    addRelationship(sourceType, sourceId, targetType, targetId, relationshipType, metadata = {}, strength = 1.0) {
        // Validate inputs
        if (!this.validateEntityType(sourceType) || !this.validateEntityType(targetType)) {
            console.error('RelationshipTracker: Invalid entity type');
            return false;
        }
        
        if (!this.validateRelationshipType(relationshipType)) {
            console.error('RelationshipTracker: Invalid relationship type');
            return false;
        }
        
        // Create relationship key
        const relationshipKey = this.createRelationshipKey(sourceType, sourceId, targetType, targetId, relationshipType);
        
        // Create relationship object
        const relationship = {
            sourceType,
            sourceId,
            targetType,
            targetId,
            relationshipType,
            strength: Math.max(0.0, Math.min(1.0, strength)), // Clamp to 0-1
            metadata,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };
        
        // Store relationship
        this.relationships.set(relationshipKey, relationship);
        this.relationshipMetadata.set(relationshipKey, {
            bidirectional: metadata.bidirectional || false,
            system: metadata.system || false,
            confidence: metadata.confidence || 1.0
        });
        
        // Update statistics
        this.updateStats();
        
        // Dispatch event
        this.dispatchEvent('relationshipAdded', { relationship, key: relationshipKey });
        
        console.log(`RelationshipTracker: Added relationship ${relationshipType} from ${sourceType}:${sourceId} to ${targetType}:${targetId}`);
        return true;
    }
    
    /**
     * Remove a relationship
     * @param {string} sourceType - Source entity type
     * @param {string} sourceId - Source entity ID  
     * @param {string} targetType - Target entity type
     * @param {string} targetId - Target entity ID
     * @param {string} relationshipType - Type of relationship
     */
    removeRelationship(sourceType, sourceId, targetType, targetId, relationshipType) {
        const relationshipKey = this.createRelationshipKey(sourceType, sourceId, targetType, targetId, relationshipType);
        
        if (this.relationships.has(relationshipKey)) {
            const relationship = this.relationships.get(relationshipKey);
            this.relationships.delete(relationshipKey);
            this.relationshipMetadata.delete(relationshipKey);
            
            this.updateStats();
            this.dispatchEvent('relationshipRemoved', { relationship, key: relationshipKey });
            
            console.log(`RelationshipTracker: Removed relationship ${relationshipType} from ${sourceType}:${sourceId} to ${targetType}:${targetId}`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Get all relationships for an entity
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity ID
     * @param {string} direction - 'outgoing', 'incoming', or 'all'
     */
    getEntityRelationships(entityType, entityId, direction = 'all') {
        const relationships = [];
        
        for (const [key, relationship] of this.relationships) {
            const isSource = relationship.sourceType === entityType && relationship.sourceId === entityId;
            const isTarget = relationship.targetType === entityType && relationship.targetId === entityId;
            
            if (direction === 'outgoing' && isSource) {
                relationships.push({ ...relationship, direction: 'outgoing', key });
            } else if (direction === 'incoming' && isTarget) {
                relationships.push({ ...relationship, direction: 'incoming', key });
            } else if (direction === 'all' && (isSource || isTarget)) {
                relationships.push({ 
                    ...relationship, 
                    direction: isSource ? 'outgoing' : 'incoming',
                    key 
                });
            }
        }
        
        return relationships;
    }
    
    /**
     * Get relationships by type
     * @param {string} relationshipType - Type of relationship to find
     */
    getRelationshipsByType(relationshipType) {
        const relationships = [];
        
        for (const [key, relationship] of this.relationships) {
            if (relationship.relationshipType === relationshipType) {
                relationships.push({ ...relationship, key });
            }
        }
        
        return relationships;
    }
    
    /**
     * Find related entities
     * @param {string} entityType - Source entity type
     * @param {string} entityId - Source entity ID
     * @param {string} targetEntityType - Type of entities to find
     * @param {string} relationshipType - Optional relationship type filter
     */
    findRelatedEntities(entityType, entityId, targetEntityType, relationshipType = null) {
        const relatedEntities = [];
        const relationships = this.getEntityRelationships(entityType, entityId);
        
        for (const relationship of relationships) {
            let targetEntity = null;
            
            // Check if this relationship connects to the target entity type
            if (relationship.direction === 'outgoing' && relationship.targetType === targetEntityType) {
                targetEntity = {
                    type: relationship.targetType,
                    id: relationship.targetId,
                    relationshipType: relationship.relationshipType,
                    strength: relationship.strength,
                    metadata: relationship.metadata
                };
            } else if (relationship.direction === 'incoming' && relationship.sourceType === targetEntityType) {
                targetEntity = {
                    type: relationship.sourceType,
                    id: relationship.sourceId,
                    relationshipType: relationship.relationshipType,
                    strength: relationship.strength,
                    metadata: relationship.metadata
                };
            }
            
            // Apply relationship type filter
            if (targetEntity && (!relationshipType || targetEntity.relationshipType === relationshipType)) {
                relatedEntities.push(targetEntity);
            }
        }
        
        return relatedEntities;
    }
    
    /**
     * Build relationship graph for visualization
     * @param {string} rootEntityType - Root entity type
     * @param {string} rootEntityId - Root entity ID
     * @param {number} maxDepth - Maximum traversal depth
     */
    buildRelationshipGraph(rootEntityType, rootEntityId, maxDepth = 3) {
        const graph = {
            nodes: new Map(),
            edges: [],
            metadata: {
                rootEntity: { type: rootEntityType, id: rootEntityId },
                depth: maxDepth,
                generated: new Date().toISOString()
            }
        };
        
        const visited = new Set();
        
        const traverse = (entityType, entityId, currentDepth) => {
            if (currentDepth > maxDepth) return;
            
            const entityKey = `${entityType}:${entityId}`;
            if (visited.has(entityKey)) return;
            visited.add(entityKey);
            
            // Add node to graph
            graph.nodes.set(entityKey, {
                type: entityType,
                id: entityId,
                depth: currentDepth,
                isRoot: currentDepth === 0
            });
            
            // Get relationships
            const relationships = this.getEntityRelationships(entityType, entityId);
            
            for (const relationship of relationships) {
                let connectedEntityType, connectedEntityId;
                
                if (relationship.direction === 'outgoing') {
                    connectedEntityType = relationship.targetType;
                    connectedEntityId = relationship.targetId;
                } else {
                    connectedEntityType = relationship.sourceType;
                    connectedEntityId = relationship.sourceId;
                }
                
                // Add edge
                graph.edges.push({
                    source: relationship.direction === 'outgoing' ? entityKey : `${connectedEntityType}:${connectedEntityId}`,
                    target: relationship.direction === 'outgoing' ? `${connectedEntityType}:${connectedEntityId}` : entityKey,
                    relationshipType: relationship.relationshipType,
                    strength: relationship.strength,
                    metadata: relationship.metadata
                });
                
                // Recursively traverse
                traverse(connectedEntityType, connectedEntityId, currentDepth + 1);
            }
        };
        
        traverse(rootEntityType, rootEntityId, 0);
        
        return {
            nodes: Array.from(graph.nodes.values()),
            edges: graph.edges,
            metadata: graph.metadata
        };
    }
    
    /**
     * Synchronize relationships from current application state
     * @param {Object} appState - Current application state
     */
    syncFromApplicationState(appState) {
        console.log('RelationshipTracker: Synchronizing relationships from application state');
        
        // Clear existing relationships
        this.relationships.clear();
        this.relationshipMetadata.clear();
        
        try {
            // Sync workflow relationships
            if (appState.workflows) {
                appState.workflows.forEach(workflow => {
                    // Workflow contains nodes
                    if (workflow.nodes) {
                        workflow.nodes.forEach(node => {
                            this.addRelationship(
                                this.entityTypes.WORKFLOW, workflow.id,
                                this.entityTypes.NODE, node.id,
                                this.relationshipTypes.CONTAINS,
                                { system: true }
                            );
                        });
                    }
                    
                    // Workflow contains tasks  
                    if (workflow.tasks) {
                        workflow.tasks.forEach(task => {
                            this.addRelationship(
                                this.entityTypes.WORKFLOW, workflow.id,
                                this.entityTypes.TASK, task.id,
                                this.relationshipTypes.CONTAINS,
                                { system: true }
                            );
                        });
                    }
                });
            }
            
            // Sync task relationships
            if (appState.taskNodes) {
                appState.taskNodes.forEach(taskNode => {
                    const taskId = taskNode.dataset.id;
                    
                    // Task anchored to node
                    if (taskNode.dataset.anchoredTo) {
                        this.addRelationship(
                            this.entityTypes.TASK, taskId,
                            this.entityTypes.NODE, taskNode.dataset.anchoredTo,
                            this.relationshipTypes.ANCHORED_TO,
                            { system: true }
                        );
                    }
                    
                    // Task linked to opportunity
                    if (taskNode.dataset.opportunityId) {
                        this.addRelationship(
                            this.entityTypes.TASK, taskId,
                            this.entityTypes.OPPORTUNITY, taskNode.dataset.opportunityId,
                            this.relationshipTypes.LINKED_TO,
                            { system: true }
                        );
                    }
                    
                    // Task tags
                    if (taskNode.dataset.tags) {
                        try {
                            const tags = JSON.parse(taskNode.dataset.tags);
                            tags.forEach((tag, index) => {
                                const tagId = `${taskId}_tag_${index}`;
                                this.addRelationship(
                                    this.entityTypes.TASK, taskId,
                                    this.entityTypes.TAG, tagId,
                                    this.relationshipTypes.TAGGED_WITH,
                                    { 
                                        system: true,
                                        tagData: tag
                                    }
                                );
                            });
                        } catch (error) {
                            console.warn('RelationshipTracker: Error parsing task tags:', error);
                        }
                    }
                });
            }
            
            // Sync flowline relationships  
            if (appState.flowlines) {
                appState.flowlines.forEach(flowline => {
                    this.addRelationship(
                        this.entityTypes.NODE, flowline.source,
                        this.entityTypes.NODE, flowline.target,
                        this.relationshipTypes.FLOWS_TO,
                        { 
                            system: true,
                            flowlineType: flowline.type,
                            flowlineId: flowline.id
                        }
                    );
                });
            }
            
            console.log(`RelationshipTracker: Synchronized ${this.relationships.size} relationships`);
        } catch (error) {
            console.error('RelationshipTracker: Error syncing application state:', error);
        }
    }
    
    /**
     * Export relationship data for persistence
     */
    exportRelationships() {
        const exportData = {
            relationships: Array.from(this.relationships.entries()).map(([key, relationship]) => ({
                key,
                ...relationship,
                metadata: this.relationshipMetadata.get(key)
            })),
            stats: this.stats,
            exported: new Date().toISOString(),
            version: '1.0.0'
        };
        
        return exportData;
    }
    
    /**
     * Import relationship data from persistence
     * @param {Object} importData - Exported relationship data
     */
    importRelationships(importData) {
        if (!importData || !importData.relationships) {
            console.error('RelationshipTracker: Invalid import data');
            return false;
        }
        
        try {
            this.relationships.clear();
            this.relationshipMetadata.clear();
            
            importData.relationships.forEach(item => {
                const { key, metadata, ...relationship } = item;
                this.relationships.set(key, relationship);
                if (metadata) {
                    this.relationshipMetadata.set(key, metadata);
                }
            });
            
            this.updateStats();
            console.log(`RelationshipTracker: Imported ${this.relationships.size} relationships`);
            return true;
        } catch (error) {
            console.error('RelationshipTracker: Error importing relationships:', error);
            return false;
        }
    }
    
    // ==================== UTILITY METHODS ====================
    
    createRelationshipKey(sourceType, sourceId, targetType, targetId, relationshipType) {
        return `${sourceType}:${sourceId}--${relationshipType}-->${targetType}:${targetId}`;
    }
    
    validateEntityType(entityType) {
        return Object.values(this.entityTypes).includes(entityType);
    }
    
    validateRelationshipType(relationshipType) {
        return Object.values(this.relationshipTypes).includes(relationshipType);
    }
    
    updateStats() {
        this.stats.totalRelationships = this.relationships.size;
        this.stats.relationshipsByType.clear();
        this.stats.entitiesByType.clear();
        
        for (const relationship of this.relationships.values()) {
            // Count by relationship type
            const relType = relationship.relationshipType;
            this.stats.relationshipsByType.set(relType, (this.stats.relationshipsByType.get(relType) || 0) + 1);
            
            // Count entities by type
            const sourceType = relationship.sourceType;
            const targetType = relationship.targetType;
            this.stats.entitiesByType.set(sourceType, (this.stats.entitiesByType.get(sourceType) || 0) + 1);
            this.stats.entitiesByType.set(targetType, (this.stats.entitiesByType.get(targetType) || 0) + 1);
        }
        
        this.stats.lastUpdated = new Date().toISOString();
    }
    
    addEventListener(eventType, listener) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(listener);
    }
    
    dispatchEvent(eventType, data) {
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error('RelationshipTracker: Error in event listener:', error);
                }
            });
        }
    }
    
    getStats() {
        return {
            ...this.stats,
            relationshipsByType: Object.fromEntries(this.stats.relationshipsByType),
            entitiesByType: Object.fromEntries(this.stats.entitiesByType)
        };
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RelationshipTracker;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.RelationshipTracker = RelationshipTracker;
}