/**
 * Flowlines Routes
 * Basic CRUD operations for workflow flowlines (connections between nodes)
 */

import express from 'express';
import Joi from 'joi';
import { query } from '../config/database.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

const flowlineSchema = Joi.object({
    workflowId: Joi.string().uuid().required(),
    sourceNodeId: Joi.string().uuid().required(),
    targetNodeId: Joi.string().uuid().required(),
    type: Joi.string().default('straight'),
    pathData: Joi.string().optional(),
    style: Joi.object().default({}),
    metadata: Joi.object().default({})
});

// GET /api/v1/flowlines
router.get('/', async (req, res, next) => {
    try {
        const { workflowId } = req.query;
        
        if (!workflowId) {
            throw new ValidationError('workflowId is required');
        }

        console.log('🔍 FLOWLINES API: Getting flowlines for workflow:', workflowId);

        // Verify workflow access
        const workflowCheck = await query(`
            SELECT id FROM workflows WHERE id = $1 AND organization_id = $2
        `, [workflowId, req.user.organization_id]);

        if (workflowCheck.rows.length === 0) {
            throw new NotFoundError('Workflow not found');
        }

        const result = await query(`
            SELECT * FROM flowlines WHERE workflow_id = $1 ORDER BY created_at
        `, [workflowId]);

        console.log('✅ FLOWLINES API: Found', result.rows.length, 'flowlines');
        res.json({ flowlines: result.rows });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/flowlines
router.post('/', async (req, res, next) => {
    try {
        console.log('🔍 FLOWLINES API: Received POST request body:', JSON.stringify(req.body, null, 2));
        
        const { error, value } = flowlineSchema.validate(req.body);
        if (error) {
            console.log('❌ FLOWLINES API: Validation error:', error.details[0].message);
            throw new ValidationError(error.details[0].message);
        }

        const { workflowId, sourceNodeId, targetNodeId, type, pathData, style, metadata } = value;

        console.log('🔍 FLOWLINES API: Checking workflow access');
        console.log('🔍 FLOWLINES API: workflowId:', workflowId);
        console.log('🔍 FLOWLINES API: user.organization_id:', req.user?.organization_id);

        // Verify workflow access
        const workflowCheck = await query(`
            SELECT id FROM workflows WHERE id = $1 AND organization_id = $2
        `, [workflowId, req.user.organization_id]);

        console.log('🔍 FLOWLINES API: Workflow query result:', workflowCheck.rows.length, 'rows found');

        if (workflowCheck.rows.length === 0) {
            // Let's also check if the workflow exists without organization filter
            const workflowExistsCheck = await query(`SELECT id FROM workflows WHERE id = $1`, [workflowId]);
            console.log('🔍 FLOWLINES API: Workflow exists (no org filter):', workflowExistsCheck.rows.length, 'rows found');
            
            if (workflowExistsCheck.rows.length === 0) {
                // Workflow doesn't exist at all, create it automatically
                console.log('🆕 FLOWLINES API: Auto-creating missing workflow:', workflowId);
                
                try {
                    // First, ensure the organization exists
                    const orgCheck = await query(`SELECT id FROM organizations WHERE id = $1`, [req.user.organization_id]);
                    console.log('🔍 FLOWLINES API: Organization exists:', orgCheck.rows.length, 'rows found');
                    
                    if (orgCheck.rows.length === 0) {
                        // Create the missing organization first
                        console.log('🆕 FLOWLINES API: Auto-creating missing organization:', req.user.organization_id);
                        await query(`
                            INSERT INTO organizations (id, name, slug, created_at, updated_at)
                            VALUES ($1, $2, $3, NOW(), NOW())
                        `, [
                            req.user.organization_id,
                            'Development Organization',
                            'auto-created-dev-org'
                        ]);
                        console.log('✅ FLOWLINES API: Successfully auto-created organization:', req.user.organization_id);
                    }
                    
                    // Now create the workflow
                    await query(`
                        INSERT INTO workflows (id, organization_id, name, description, version, metadata, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                    `, [
                        workflowId,
                        req.user.organization_id,
                        'Auto-created Workflow',
                        'Automatically created when creating a flowline',
                        '1.0.0',
                        JSON.stringify({
                            auto_created: true,
                            created_by: 'flowline_creation',
                            created_at: new Date().toISOString()
                        })
                    ]);
                    
                    console.log('✅ FLOWLINES API: Successfully auto-created workflow:', workflowId);
                } catch (createError) {
                    console.error('❌ FLOWLINES API: Failed to auto-create workflow:', createError);
                    throw new NotFoundError('Workflow not found and could not be created');
                }
            } else {
                // Workflow exists but not for this organization
                throw new NotFoundError('Workflow not found');
            }
        }

        // Verify that both source and target nodes exist
        const nodesCheck = await query(`
            SELECT id FROM nodes WHERE workflow_id = $1 AND id IN ($2, $3)
        `, [workflowId, sourceNodeId, targetNodeId]);

        console.log('🔍 FLOWLINES API: Found', nodesCheck.rows.length, 'of 2 required nodes');
        
        if (nodesCheck.rows.length !== 2) {
            throw new ValidationError('Source or target node not found in this workflow');
        }

        const result = await query(`
            INSERT INTO flowlines (workflow_id, source_node_id, target_node_id, type, path_data, style, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [workflowId, sourceNodeId, targetNodeId, type, pathData, 
            JSON.stringify(style), JSON.stringify(metadata)]);

        console.log('✅ FLOWLINES API: Flowline created successfully:', result.rows[0].id);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('❌ FLOWLINES API: Error creating flowline:', error);
        next(error);
    }
});

// DELETE /api/v1/flowlines/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log('🔍 FLOWLINES API: Deleting flowline:', id);

        // Verify flowline exists and user has access
        const flowlineCheck = await query(`
            SELECT f.*, w.organization_id 
            FROM flowlines f
            JOIN workflows w ON f.workflow_id = w.id
            WHERE f.id = $1 AND w.organization_id = $2
        `, [id, req.user.organization_id]);

        if (flowlineCheck.rows.length === 0) {
            throw new NotFoundError('Flowline not found');
        }

        const result = await query(`
            DELETE FROM flowlines WHERE id = $1 RETURNING *
        `, [id]);

        console.log('✅ FLOWLINES API: Flowline deleted successfully:', id);
        res.json({ message: 'Flowline deleted successfully', flowline: result.rows[0] });
    } catch (error) {
        console.error('❌ FLOWLINES API: Error deleting flowline:', error);
        next(error);
    }
});

export default router;