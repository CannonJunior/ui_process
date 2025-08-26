/**
 * Authentication Routes
 * Handles user login, registration, and token management
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { authRateLimiterMiddleware } from '../middleware/rateLimiter.js';
import { AuthenticationError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(255).required(),
    password: Joi.string().min(8).required(),
    organizationName: Joi.string().min(2).max(255).optional(),
    organizationSlug: Joi.string().min(2).max(100).optional()
});

// Generate JWT tokens
function generateTokens(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });

    const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
}

/**
 * POST /api/v1/auth/login
 * Authenticate user with email and password
 */
router.post('/login', authRateLimiterMiddleware, async (req, res, next) => {
    try {
        // Validate input
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }

        const { email, password } = value;

        // Find user by email
        const userResult = await query(
            'SELECT id, email, name, role, organization_id, password FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            throw new AuthenticationError('Invalid email or password');
        }

        const user = userResult.rows[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new AuthenticationError('Invalid email or password');
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Get organization info
        const orgResult = await query(
            'SELECT name, slug FROM organizations WHERE id = $1',
            [user.organization_id]
        );

        // Remove password from response
        delete user.password;

        res.json({
            message: 'Login successful',
            user: {
                ...user,
                organization: orgResult.rows[0] || null
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        });

        console.log(`✅ User logged in: ${user.email} (${user.id})`);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/auth/register
 * Register a new user and optionally create organization
 */
router.post('/register', authRateLimiterMiddleware, async (req, res, next) => {
    try {
        // Validate input
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }

        const { email, name, password, organizationName, organizationSlug } = value;

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'UserExists',
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        let organizationId;

        // Create organization if provided, otherwise use default
        if (organizationName && organizationSlug) {
            const orgResult = await query(
                'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id',
                [organizationName, organizationSlug]
            );
            organizationId = orgResult.rows[0].id;
        } else {
            // Use default development organization
            const defaultOrg = await query(
                'SELECT id FROM organizations WHERE slug = $1',
                ['ui-process-dev']
            );
            organizationId = defaultOrg.rows[0]?.id;

            if (!organizationId) {
                throw new Error('Default organization not found. Please run database setup.');
            }
        }

        // Create user
        const userResult = await query(
            'INSERT INTO users (email, name, password, organization_id, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, organization_id, created_at',
            [email, name, hashedPassword, organizationId, organizationName ? 'admin' : 'user']
        );

        const user = userResult.rows[0];

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Get organization info
        const orgResult = await query(
            'SELECT name, slug FROM organizations WHERE id = $1',
            [organizationId]
        );

        res.status(201).json({
            message: 'Registration successful',
            user: {
                ...user,
                organization: orgResult.rows[0]
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        });

        console.log(`✅ User registered: ${user.email} (${user.id})`);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AuthenticationError('Refresh token required');
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Get user info
        const userResult = await query(
            'SELECT id, email, name, role, organization_id FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            throw new AuthenticationError('User not found');
        }

        const user = userResult.rows[0];

        // Generate new tokens
        const tokens = generateTokens(user);

        res.json({
            message: 'Token refreshed successfully',
            tokens: {
                ...tokens,
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            next(new AuthenticationError('Invalid or expired refresh token'));
        } else {
            next(error);
        }
    }
});

/**
 * POST /api/v1/auth/logout
 * Logout user (client should discard tokens)
 */
router.post('/logout', (req, res) => {
    // In a more sophisticated system, we'd blacklist the token
    // For now, we rely on client-side token removal
    res.json({
        message: 'Logout successful'
    });
});

/**
 * GET /api/v1/auth/me
 * Get current user info (requires auth)
 */
router.get('/me', async (req, res, next) => {
    try {
        // This endpoint needs auth middleware applied externally
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthenticationError('No authorization token provided');
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const userResult = await query(
            `SELECT u.id, u.email, u.name, u.role, u.created_at, u.updated_at,
                    o.id as org_id, o.name as org_name, o.slug as org_slug
             FROM users u
             JOIN organizations o ON u.organization_id = o.id
             WHERE u.id = $1`,
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            throw new AuthenticationError('User not found');
        }

        const row = userResult.rows[0];
        
        res.json({
            user: {
                id: row.id,
                email: row.email,
                name: row.name,
                role: row.role,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                organization: {
                    id: row.org_id,
                    name: row.org_name,
                    slug: row.org_slug
                }
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            next(new AuthenticationError('Invalid or expired token'));
        } else {
            next(error);
        }
    }
});

export default router;