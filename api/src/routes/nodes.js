/**
 * Nodes Routes  
 * Basic CRUD operations for workflow nodes
 */

import express from 'express';
import Joi from 'joi';
import { query } from '../config/database.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

const nodeSchema = Joi.object({
    workflowId: Joi.string().uuid().required(),
    type: Joi.string().valid('process', 'decision', 'terminal').required(),
    text: Joi.string().min(1).required(),
    positionX: Joi.number().required(),
    positionY: Joi.number().required(),
    style: Joi.object().default({}),
    metadata: Joi.object().default({})
});

// GET /api/v1/nodes
router.get('/', async (req, res, next) => {
    try {
        const { workflowId } = req.query;
        
        if (!workflowId) {
            throw new ValidationError('workflowId is required');
        }

        // Verify workflow access
        const workflowCheck = await query(`
            SELECT id FROM workflows WHERE id = $1 AND organization_id = $2
        `, [workflowId, req.user.organization_id]);

        if (workflowCheck.rows.length === 0) {
            throw new NotFoundError('Workflow not found');
        }

        const result = await query(`
            SELECT * FROM nodes WHERE workflow_id = $1 ORDER BY created_at
        `, [workflowId]);

        res.json({ nodes: result.rows });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/nodes
router.post('/', async (req, res, next) => {
    try {
        const { error, value } = nodeSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }

        const { workflowId, type, text, positionX, positionY, style, metadata } = value;

        // Verify workflow access
        const workflowCheck = await query(`
            SELECT id FROM workflows WHERE id = $1 AND organization_id = $2
        `, [workflowId, req.user.organization_id]);

        if (workflowCheck.rows.length === 0) {
            throw new NotFoundError('Workflow not found');
        }

        const result = await query(`
            INSERT INTO nodes (workflow_id, type, text, position_x, position_y, style, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [workflowId, type, text, positionX, positionY, 
            JSON.stringify(style), JSON.stringify(metadata)]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

export default router;