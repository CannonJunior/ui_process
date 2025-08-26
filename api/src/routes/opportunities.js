/**
 * Opportunities Routes
 * Basic CRUD operations for opportunities
 */

import express from 'express';
import Joi from 'joi';
import { query } from '../config/database.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

const opportunitySchema = Joi.object({
    workflowId: Joi.string().uuid().required(),
    title: Joi.string().min(1).max(255).required(),
    description: Joi.string().min(1).required(),
    status: Joi.string().valid('active', 'planning', 'negotiation', 'completed', 'cancelled').default('active'),
    tags: Joi.array().items(Joi.string()).default([]),
    value: Joi.number().min(0).optional(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    deadline: Joi.date().optional(),
    contactPerson: Joi.string().max(255).optional(),
    notes: Joi.string().optional()
});

// GET /api/v1/opportunities
router.get('/', async (req, res, next) => {
    try {
        const { workflowId, status, priority } = req.query;
        const organizationId = req.user.organization_id;

        let whereConditions = ['o.organization_id = $1'];
        let params = [organizationId];

        if (workflowId) {
            whereConditions.push('o.workflow_id = $' + (params.length + 1));
            params.push(workflowId);
        }
        if (status) {
            whereConditions.push('o.status = $' + (params.length + 1));
            params.push(status);
        }
        if (priority) {
            whereConditions.push('o.priority = $' + (params.length + 1));
            params.push(priority);
        }

        const result = await query(`
            SELECT o.*, w.name as workflow_name,
                   COUNT(t.id) as linked_task_count
            FROM opportunities o
            LEFT JOIN workflows w ON o.workflow_id = w.id
            LEFT JOIN tasks t ON o.id = t.opportunity_id
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY o.id, w.name
            ORDER BY o.updated_at DESC
        `, params);

        res.json({ opportunities: result.rows });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/opportunities
router.post('/', async (req, res, next) => {
    try {
        const { error, value } = opportunitySchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }

        const organizationId = req.user.organization_id;
        const { workflowId, title, description, status, tags, value: oppValue, 
                priority, deadline, contactPerson, notes } = value;

        const result = await query(`
            INSERT INTO opportunities (organization_id, workflow_id, title, description, status,
                                     tags, value, priority, deadline, contact_person, notes, source)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [organizationId, workflowId, title, description, status, tags,
            oppValue, priority, deadline, contactPerson, notes, 'manual']);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/opportunities/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.organization_id;

        const result = await query(`
            SELECT o.*, w.name as workflow_name,
                   json_agg(
                       json_build_object(
                           'id', t.id,
                           'text', t.text,
                           'status', t.status,
                           'priority', t.priority
                       )
                   ) FILTER (WHERE t.id IS NOT NULL) as linked_tasks
            FROM opportunities o
            LEFT JOIN workflows w ON o.workflow_id = w.id
            LEFT JOIN tasks t ON o.id = t.opportunity_id
            WHERE o.id = $1 AND o.organization_id = $2
            GROUP BY o.id, w.name
        `, [id, organizationId]);

        if (result.rows.length === 0) {
            throw new NotFoundError('Opportunity not found');
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

export default router;