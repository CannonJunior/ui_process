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
    anchoredTo: Joi.string().uuid().required(),
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
        const { error, value } = taskSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }

        const { workflowId, anchoredTo, opportunityId, text, description, status,
                priority, dueDate, estimatedHours, assignedTo, positionX, positionY, slot } = value;

        // Verify workflow access
        const workflowCheck = await query(`
            SELECT id FROM workflows WHERE id = $1 AND organization_id = $2
        `, [workflowId, req.user.organization_id]);

        if (workflowCheck.rows.length === 0) {
            throw new NotFoundError('Workflow not found');
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