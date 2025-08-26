/**
 * Workflow Routes
 * Handles workflow CRUD operations and related functionality
 */

import express from 'express';
import Joi from 'joi';
import { query, transaction, vectorOps } from '../config/database.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const workflowSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    version: Joi.string().max(20).default('1.0.0'),
    metadata: Joi.object().default({})
});

const workflowImportSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    version: Joi.string().max(20).default('2.0.0'),
    nodes: Joi.array().items(Joi.object()).default([]),
    tasks: Joi.array().items(Joi.object()).default([]),
    flowlines: Joi.array().items(Joi.object()).default([]),
    opportunities: Joi.array().items(Joi.object()).default([]),
    relationships: Joi.object().optional(),
    metadata: Joi.object().default({})
});

/**
 * GET /api/v1/workflows
 * List all workflows for the current user's organization
 */
router.get('/', async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const offset = (page - 1) * limit;
        const organizationId = req.user.organization_id;

        let searchCondition = '';
        let searchParams = [organizationId, limit, offset];
        
        if (search) {
            searchCondition = 'AND (w.name ILIKE $4 OR w.description ILIKE $4)';
            searchParams.push(`%${search}%`);
        }

        const result = await query(`
            SELECT w.id, w.name, w.description, w.version, w.metadata,
                   w.created_at, w.updated_at,
                   u.name as created_by_name, u.email as created_by_email,
                   COUNT(n.id) as node_count,
                   COUNT(t.id) as task_count,
                   COUNT(o.id) as opportunity_count
            FROM workflows w
            LEFT JOIN users u ON w.created_by = u.id
            LEFT JOIN nodes n ON w.id = n.workflow_id
            LEFT JOIN tasks t ON w.id = t.workflow_id
            LEFT JOIN opportunities o ON w.id = o.workflow_id
            WHERE w.organization_id = $1 ${searchCondition}
            GROUP BY w.id, w.name, w.description, w.version, w.metadata,
                     w.created_at, w.updated_at, u.name, u.email
            ORDER BY w.updated_at DESC
            LIMIT $2 OFFSET $3
        `, searchParams);

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM workflows WHERE organization_id = $1 ${searchCondition}`,
            searchCondition ? [organizationId, `%${search}%`] : [organizationId]
        );

        res.json({
            workflows: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/workflows/:id
 * Get a specific workflow with all related data
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.organization_id;

        // Get workflow
        const workflowResult = await query(`
            SELECT w.*, u.name as created_by_name, u.email as created_by_email
            FROM workflows w
            LEFT JOIN users u ON w.created_by = u.id
            WHERE w.id = $1 AND w.organization_id = $2
        `, [id, organizationId]);

        if (workflowResult.rows.length === 0) {
            throw new NotFoundError('Workflow not found');
        }

        const workflow = workflowResult.rows[0];

        // Get related data
        const [nodesResult, tasksResult, flowlinesResult, opportunitiesResult] = await Promise.all([
            query('SELECT * FROM nodes WHERE workflow_id = $1 ORDER BY created_at', [id]),
            query(`
                SELECT t.*, tt.category, tt.option, tt.tag_date, tt.description as tag_description,
                       tt.link_url, tt.completed as tag_completed, tt.is_in_next_action,
                       tt.custom_fields as tag_custom_fields
                FROM tasks t
                LEFT JOIN task_tags tt ON t.id = tt.task_id
                WHERE t.workflow_id = $1
                ORDER BY t.created_at
            `, [id]),
            query('SELECT * FROM flowlines WHERE workflow_id = $1 ORDER BY created_at', [id]),
            query('SELECT * FROM opportunities WHERE workflow_id = $1 ORDER BY created_at', [id])
        ]);

        // Process tasks to group tags
        const tasksMap = new Map();
        tasksResult.rows.forEach(row => {
            const taskId = row.id;
            if (!tasksMap.has(taskId)) {
                const { category, option, tag_date, tag_description, link_url, 
                       tag_completed, is_in_next_action, tag_custom_fields, ...task } = row;
                tasksMap.set(taskId, { ...task, tags: [] });
            }
            
            if (row.category) {
                tasksMap.get(taskId).tags.push({
                    category: row.category,
                    option: row.option,
                    date: row.tag_date,
                    description: row.tag_description,
                    link: row.link_url,
                    completed: row.tag_completed,
                    isInNextAction: row.is_in_next_action,
                    customFields: row.tag_custom_fields
                });
            }
        });

        res.json({
            ...workflow,
            nodes: nodesResult.rows,
            tasks: Array.from(tasksMap.values()),
            flowlines: flowlinesResult.rows,
            opportunities: opportunitiesResult.rows
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/workflows
 * Create a new workflow
 */
router.post('/', async (req, res, next) => {
    try {
        const { error, value } = workflowSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }

        const { name, description, version, metadata } = value;
        const organizationId = req.user.organization_id;
        const userId = req.user.id;

        const result = await query(`
            INSERT INTO workflows (organization_id, name, description, version, created_by, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [organizationId, name, description, version, userId, JSON.stringify(metadata)]);

        const workflow = result.rows[0];

        // Broadcast update to connected clients
        req.app.locals.broadcast?.(workflow.id, {
            type: 'workflow_created',
            workflow: workflow
        });

        res.status(201).json(workflow);
        console.log(`✅ Workflow created: ${workflow.name} (${workflow.id}) by ${req.user.email}`);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/v1/workflows/:id
 * Update a workflow
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error, value } = workflowSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }

        const { name, description, version, metadata } = value;
        const organizationId = req.user.organization_id;

        const result = await query(`
            UPDATE workflows 
            SET name = $1, description = $2, version = $3, metadata = $4, updated_at = NOW()
            WHERE id = $5 AND organization_id = $6
            RETURNING *
        `, [name, description, version, JSON.stringify(metadata), id, organizationId]);

        if (result.rows.length === 0) {
            throw new NotFoundError('Workflow not found');
        }

        const workflow = result.rows[0];

        // Broadcast update
        req.app.locals.broadcast?.(workflow.id, {
            type: 'workflow_updated',
            workflow: workflow
        });

        res.json(workflow);
        console.log(`✅ Workflow updated: ${workflow.name} (${workflow.id}) by ${req.user.email}`);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/v1/workflows/:id
 * Delete a workflow and all related data
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.organization_id;

        const result = await query(`
            DELETE FROM workflows 
            WHERE id = $1 AND organization_id = $2
            RETURNING name
        `, [id, organizationId]);

        if (result.rows.length === 0) {
            throw new NotFoundError('Workflow not found');
        }

        // Broadcast deletion
        req.app.locals.broadcast?.(id, {
            type: 'workflow_deleted',
            workflowId: id
        });

        res.json({ 
            message: 'Workflow deleted successfully',
            workflowName: result.rows[0].name 
        });
        console.log(`✅ Workflow deleted: ${result.rows[0].name} (${id}) by ${req.user.email}`);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/workflows/import
 * Import a complete workflow from JSON data
 */
router.post('/import', async (req, res, next) => {
    try {
        const { error, value } = workflowImportSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }

        const { name, version, nodes, tasks, flowlines, opportunities, relationships, metadata } = value;
        const organizationId = req.user.organization_id;
        const userId = req.user.id;

        const result = await transaction(async (client) => {
            // Create workflow
            const workflowResult = await client.query(`
                INSERT INTO workflows (organization_id, name, version, created_by, metadata)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [organizationId, name, version, userId, JSON.stringify(metadata)]);

            const workflow = workflowResult.rows[0];
            const workflowId = workflow.id;

            // Import nodes
            const nodeIdMap = new Map(); // Map old IDs to new IDs
            for (const node of nodes) {
                const nodeResult = await client.query(`
                    INSERT INTO nodes (workflow_id, type, text, position_x, position_y, style, metadata)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id
                `, [workflowId, node.type, node.text, node.position?.left || 0, 
                    node.position?.top || 0, JSON.stringify(node.style || {}), 
                    JSON.stringify(node.metadata || {})]);
                
                nodeIdMap.set(node.id, nodeResult.rows[0].id);
            }

            // Import opportunities
            const opportunityIdMap = new Map();
            for (const opp of opportunities) {
                const oppResult = await client.query(`
                    INSERT INTO opportunities (organization_id, workflow_id, title, description, 
                                             status, tags, value, priority, deadline, contact_person, 
                                             notes, metadata, source)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    RETURNING id
                `, [organizationId, workflowId, opp.title, opp.description, opp.status,
                    opp.tags || [], opp.metadata?.value, opp.metadata?.priority,
                    opp.metadata?.deadline, opp.metadata?.contact_person,
                    opp.metadata?.notes, JSON.stringify(opp.metadata || {}),
                    opp.metadata?.source || 'import']);
                
                opportunityIdMap.set(opp.opportunity_id, oppResult.rows[0].id);
            }

            // Import tasks
            for (const task of tasks) {
                const anchoredTo = nodeIdMap.get(task.anchoredTo);
                const opportunityId = task.opportunityId ? opportunityIdMap.get(task.opportunityId) : null;
                
                if (anchoredTo) {
                    const taskResult = await client.query(`
                        INSERT INTO tasks (workflow_id, opportunity_id, anchored_to, text, description,
                                         status, priority, due_date, estimated_hours, assigned_to,
                                         position_x, position_y, slot_number, metadata)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                        RETURNING id
                    `, [workflowId, opportunityId, anchoredTo, task.text, task.description,
                        task.status, task.priority, task.dueDate, task.estimatedHours,
                        task.assignedTo, task.position?.left || 0, task.position?.top || 0,
                        task.slot || 0, JSON.stringify(task.metadata || {})]);
                    
                    const taskId = taskResult.rows[0].id;
                    
                    // Import task tags
                    for (const tag of task.tags || []) {
                        await client.query(`
                            INSERT INTO task_tags (task_id, category, option, tag_date, description,
                                                 link_url, completed, is_in_next_action, custom_fields)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        `, [taskId, tag.category, tag.option, tag.date, tag.description,
                            tag.link, tag.completed, tag.isInNextAction,
                            JSON.stringify(tag.customFields || {})]);
                    }
                }
            }

            // Import flowlines
            for (const flowline of flowlines) {
                const sourceId = nodeIdMap.get(flowline.source);
                const targetId = nodeIdMap.get(flowline.target);
                
                if (sourceId && targetId) {
                    await client.query(`
                        INSERT INTO flowlines (workflow_id, source_node_id, target_node_id, type, path_data, style, metadata)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `, [workflowId, sourceId, targetId, flowline.type, flowline.path,
                        JSON.stringify(flowline.style || {}), JSON.stringify(flowline.metadata || {})]);
                }
            }

            return workflow;
        });

        // Broadcast creation
        req.app.locals.broadcast?.(result.id, {
            type: 'workflow_imported',
            workflow: result
        });

        res.status(201).json({
            message: 'Workflow imported successfully',
            workflow: result
        });
        console.log(`✅ Workflow imported: ${result.name} (${result.id}) by ${req.user.email}`);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/workflows/:id/export
 * Export a workflow in the standard JSON format
 */
router.get('/:id/export', async (req, res, next) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.organization_id;

        // Get complete workflow data (reuse the GET /:id logic)
        const workflowResult = await query(`
            SELECT * FROM workflows WHERE id = $1 AND organization_id = $2
        `, [id, organizationId]);

        if (workflowResult.rows.length === 0) {
            throw new NotFoundError('Workflow not found');
        }

        const workflow = workflowResult.rows[0];

        // Get all related data
        const [nodesResult, tasksResult, flowlinesResult, opportunitiesResult] = await Promise.all([
            query('SELECT * FROM nodes WHERE workflow_id = $1 ORDER BY created_at', [id]),
            query(`
                SELECT t.*, 
                       COALESCE(
                           json_agg(
                               json_build_object(
                                   'category', tt.category,
                                   'option', tt.option,
                                   'date', tt.tag_date,
                                   'description', tt.description,
                                   'link', tt.link_url,
                                   'completed', tt.completed,
                                   'isInNextAction', tt.is_in_next_action,
                                   'customFields', tt.custom_fields
                               ) ORDER BY tt.created_at
                           ) FILTER (WHERE tt.id IS NOT NULL), 
                           '[]'
                       ) as tags
                FROM tasks t
                LEFT JOIN task_tags tt ON t.id = tt.task_id
                WHERE t.workflow_id = $1
                GROUP BY t.id
                ORDER BY t.created_at
            `, [id]),
            query('SELECT * FROM flowlines WHERE workflow_id = $1 ORDER BY created_at', [id]),
            query('SELECT * FROM opportunities WHERE workflow_id = $1 ORDER BY created_at', [id])
        ]);

        // Format export data
        const exportData = {
            name: workflow.name,
            version: workflow.version,
            created_at: workflow.created_at,
            updated_at: workflow.updated_at,
            nodes: nodesResult.rows.map(node => ({
                id: node.id,
                type: node.type,
                text: node.text,
                position: {
                    left: node.position_x,
                    top: node.position_y
                },
                style: node.style,
                metadata: node.metadata
            })),
            tasks: tasksResult.rows.map(task => ({
                id: task.id,
                type: 'task',
                text: task.text,
                description: task.description,
                anchoredTo: task.anchored_to,
                opportunityId: task.opportunity_id,
                status: task.status,
                priority: task.priority,
                dueDate: task.due_date,
                estimatedHours: task.estimated_hours,
                assignedTo: task.assigned_to,
                position: {
                    left: task.position_x,
                    top: task.position_y
                },
                slot: task.slot_number,
                tags: task.tags,
                metadata: task.metadata
            })),
            flowlines: flowlinesResult.rows.map(flowline => ({
                id: flowline.id,
                type: flowline.type,
                source: flowline.source_node_id,
                target: flowline.target_node_id,
                path: flowline.path_data,
                style: flowline.style,
                metadata: flowline.metadata
            })),
            opportunities: opportunitiesResult.rows.map(opp => ({
                opportunity_id: opp.id,
                title: opp.title,
                description: opp.description,
                status: opp.status,
                tags: opp.tags,
                created_at: opp.created_at,
                metadata: {
                    ...opp.metadata,
                    value: opp.value,
                    priority: opp.priority,
                    deadline: opp.deadline,
                    contact_person: opp.contact_person,
                    notes: opp.notes,
                    source: opp.source
                }
            })),
            metadata: {
                ...workflow.metadata,
                exportedAt: new Date().toISOString(),
                exportedBy: req.user.email,
                databaseVersion: 'PostgreSQL'
            }
        };

        res.json(exportData);
        console.log(`✅ Workflow exported: ${workflow.name} (${workflow.id}) by ${req.user.email}`);
    } catch (error) {
        next(error);
    }
});

export default router;