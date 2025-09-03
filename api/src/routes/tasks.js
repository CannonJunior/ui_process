/**
 * Tasks Routes
 * Basic CRUD operations for tasks
 */

import express from 'express';
import Joi from 'joi';
import { query } from '../config/database.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

const taskSchema = Joi.object({
    workflowId: Joi.string().uuid().required(),
    anchoredTo: Joi.alternatives().try(
        Joi.string().uuid(),
        Joi.string().allow(''),
        Joi.allow(null)
    ).optional(),
    opportunityId: Joi.string().uuid().optional(),
    text: Joi.string().min(1).required(),
    description: Joi.string().optional(),
    status: Joi.string().valid('not_started', 'in_progress', 'completed', 'on_hold').default('not_started'),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    dueDate: Joi.date().optional(),
    estimatedHours: Joi.number().min(0).optional(),
    assignedTo: Joi.string().optional(),
    positionX: Joi.number().required(),
    positionY: Joi.number().required(),
    slot: Joi.number().default(0)
});

// GET /api/v1/tasks
router.get('/', async (req, res, next) => {
    try {
        const { workflowId, anchoredTo, status, priority } = req.query;
        
        let whereConditions = [];
        let params = [];

        if (workflowId) {
            whereConditions.push('t.workflow_id = $' + (params.length + 1));
            params.push(workflowId);
            
            // Verify workflow access
            const workflowCheck = await query(`
                SELECT id FROM workflows WHERE id = $1 AND organization_id = $2
            `, [workflowId, req.user.organization_id]);

            if (workflowCheck.rows.length === 0) {
                throw new NotFoundError('Workflow not found');
            }
        }

        if (anchoredTo) {
            whereConditions.push('t.anchored_to = $' + (params.length + 1));
            params.push(anchoredTo);
        }
        if (status) {
            whereConditions.push('t.status = $' + (params.length + 1));
            params.push(status);
        }
        if (priority) {
            whereConditions.push('t.priority = $' + (params.length + 1));
            params.push(priority);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const result = await query(`
            SELECT t.*, n.text as node_text, o.title as opportunity_title
            FROM tasks t
            LEFT JOIN nodes n ON t.anchored_to = n.id
            LEFT JOIN opportunities o ON t.opportunity_id = o.id
            ${whereClause}
            ORDER BY t.created_at
        `, params);

        res.json({ tasks: result.rows });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/tasks
router.post('/', async (req, res, next) => {
    try {
        console.log('🔍 TASKS API: Received POST request body:', JSON.stringify(req.body, null, 2));
        console.log('🔍 TASKS API: anchoredTo value:', req.body.anchoredTo, 'type:', typeof req.body.anchoredTo);
        
        const { error, value } = taskSchema.validate(req.body);
        if (error) {
            console.log('❌ TASKS API: Validation error:', error.details[0].message);
            console.log('❌ TASKS API: Full error details:', JSON.stringify(error.details, null, 2));
            throw new ValidationError(error.details[0].message);
        }

        const { workflowId, opportunityId, text, description, status,
                priority, dueDate, estimatedHours, assignedTo, positionX, positionY, slot } = value;

        // Clean up anchoredTo - if it's not a valid UUID, set to null
        let anchoredTo = value.anchoredTo;
        if (anchoredTo && typeof anchoredTo === 'string' && anchoredTo.trim() !== '') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(anchoredTo)) {
                console.log(`⚠️ TASKS API: Invalid UUID "${anchoredTo}" converted to null`);
                anchoredTo = null;
            }
        } else {
            anchoredTo = null;
        }

        console.log('✅ TASKS API: Processed anchoredTo:', anchoredTo);

        // Verify workflow access
        console.log('🔍 TASKS API: Checking workflow access');
        console.log('🔍 TASKS API: workflowId:', workflowId);
        console.log('🔍 TASKS API: user.organization_id:', req.user?.organization_id);
        console.log('🔍 TASKS API: full user object:', JSON.stringify(req.user, null, 2));
        
        const workflowCheck = await query(`
            SELECT id FROM workflows WHERE id = $1 AND organization_id = $2
        `, [workflowId, req.user.organization_id]);

        console.log('🔍 TASKS API: Workflow query result:', workflowCheck.rows.length, 'rows found');
        console.log('🔍 TASKS API: Query result rows:', JSON.stringify(workflowCheck.rows, null, 2));

        if (workflowCheck.rows.length === 0) {
            // Let's also check if the workflow exists without organization filter
            const workflowExistsCheck = await query(`SELECT id FROM workflows WHERE id = $1`, [workflowId]);
            console.log('🔍 TASKS API: Workflow exists (no org filter):', workflowExistsCheck.rows.length, 'rows found');
            
            if (workflowExistsCheck.rows.length === 0) {
                // Workflow doesn't exist at all, create it automatically
                console.log('🆕 TASKS API: Auto-creating missing workflow:', workflowId);
                
                try {
                    // First, ensure the organization exists
                    const orgCheck = await query(`SELECT id FROM organizations WHERE id = $1`, [req.user.organization_id]);
                    console.log('🔍 TASKS API: Organization exists:', orgCheck.rows.length, 'rows found');
                    
                    if (orgCheck.rows.length === 0) {
                        // Create the missing organization first
                        console.log('🆕 TASKS API: Auto-creating missing organization:', req.user.organization_id);
                        await query(`
                            INSERT INTO organizations (id, name, slug, created_at, updated_at)
                            VALUES ($1, $2, $3, NOW(), NOW())
                        `, [
                            req.user.organization_id,
                            'Development Organization',
                            'auto-created-dev-org'
                        ]);
                        console.log('✅ TASKS API: Successfully auto-created organization:', req.user.organization_id);
                    }
                    
                    // Now create the workflow
                    await query(`
                        INSERT INTO workflows (id, organization_id, name, description, version, metadata, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                    `, [
                        workflowId,
                        req.user.organization_id,
                        'Auto-created Workflow',
                        'Automatically created when creating a task',
                        '1.0.0',
                        JSON.stringify({
                            auto_created: true,
                            created_by: 'task_creation',
                            created_at: new Date().toISOString()
                        })
                    ]);
                    
                    console.log('✅ TASKS API: Successfully auto-created workflow:', workflowId);
                } catch (createError) {
                    console.error('❌ TASKS API: Failed to auto-create workflow:', createError);
                    throw new NotFoundError('Workflow not found and could not be created');
                }
            } else {
                // Workflow exists but not for this organization
                throw new NotFoundError('Workflow not found');
            }
        }

        const result = await query(`
            INSERT INTO tasks (workflow_id, opportunity_id, anchored_to, text, description,
                             status, priority, due_date, estimated_hours, assigned_to,
                             position_x, position_y, slot_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [workflowId, opportunityId, anchoredTo, text, description, status,
            priority, dueDate, estimatedHours, assignedTo, positionX, positionY, slot]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

export default router;