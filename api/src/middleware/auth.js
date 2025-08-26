/**
 * Authentication Middleware
 * JWT-based authentication for API endpoints
 */

import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No valid authorization token provided'
            });
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user info from database
            const result = await query(
                'SELECT id, email, name, role, organization_id FROM users WHERE id = $1',
                [decoded.userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User not found'
                });
            }
            
            // Add user info to request
            req.user = result.rows[0];
            
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'TokenExpired',
                    message: 'Token has expired'
                });
            } else if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    error: 'InvalidToken',
                    message: 'Invalid token format'
                });
            } else {
                throw jwtError;
            }
        }
        
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            error: 'InternalServerError',
            message: 'Authentication failed'
        });
    }
};

export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }
        
        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Insufficient permissions. Required: ${allowedRoles.join(' or ')}`
            });
        }
        
        next();
    };
};

export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }
        
        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const result = await query(
                'SELECT id, email, name, role, organization_id FROM users WHERE id = $1',
                [decoded.userId]
            );
            
            if (result.rows.length > 0) {
                req.user = result.rows[0];
            } else {
                req.user = null;
            }
        } catch (jwtError) {
            req.user = null;
        }
        
        next();
    } catch (error) {
        console.error('Optional authentication error:', error);
        req.user = null;
        next();
    }
};