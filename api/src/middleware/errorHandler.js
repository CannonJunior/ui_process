/**
 * Global Error Handler Middleware
 * Centralized error handling and logging
 */

export const errorHandler = (error, req, res, next) => {
    // Log error details
    console.error('API Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });

    // Default error response
    let status = 500;
    let errorResponse = {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
    };

    // Handle specific error types
    if (error.code) {
        switch (error.code) {
            case '23505': // Unique constraint violation
                status = 409;
                errorResponse = {
                    error: 'ConflictError',
                    message: 'Resource already exists',
                    details: error.detail
                };
                break;
                
            case '23503': // Foreign key constraint violation
                status = 400;
                errorResponse = {
                    error: 'InvalidReference',
                    message: 'Referenced resource does not exist',
                    details: error.detail
                };
                break;
                
            case '23502': // Not null constraint violation
                status = 400;
                errorResponse = {
                    error: 'MissingRequiredField',
                    message: 'Required field is missing',
                    details: error.detail
                };
                break;
                
            case '22P02': // Invalid input syntax
                status = 400;
                errorResponse = {
                    error: 'InvalidInput',
                    message: 'Invalid input format',
                    details: error.message
                };
                break;
        }
    }

    // Handle validation errors (Joi)
    if (error.isJoi) {
        status = 400;
        errorResponse = {
            error: 'ValidationError',
            message: 'Input validation failed',
            details: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }))
        };
    }

    // Handle custom application errors
    if (error.name === 'AuthenticationError') {
        status = 401;
        errorResponse = {
            error: 'AuthenticationError',
            message: error.message || 'Authentication failed'
        };
    }

    if (error.name === 'AuthorizationError') {
        status = 403;
        errorResponse = {
            error: 'AuthorizationError',
            message: error.message || 'Access denied'
        };
    }

    if (error.name === 'NotFoundError') {
        status = 404;
        errorResponse = {
            error: 'NotFound',
            message: error.message || 'Resource not found'
        };
    }

    if (error.name === 'ValidationError') {
        status = 400;
        errorResponse = {
            error: 'ValidationError',
            message: error.message || 'Validation failed'
        };
    }

    // Handle multer file upload errors
    if (error.code === 'LIMIT_FILE_SIZE') {
        status = 413;
        errorResponse = {
            error: 'FileTooLarge',
            message: 'File size exceeds the allowed limit'
        };
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
        status = 400;
        errorResponse = {
            error: 'TooManyFiles',
            message: 'Too many files uploaded'
        };
    }

    // Don't expose sensitive error details in production
    if (process.env.NODE_ENV === 'production') {
        // Remove stack trace and detailed error messages
        delete errorResponse.stack;
        delete errorResponse.details;
        
        // Generic message for unexpected errors
        if (status === 500) {
            errorResponse.message = 'Internal server error';
        }
    } else {
        // In development, include more details
        errorResponse.stack = error.stack;
        if (error.query) {
            errorResponse.query = error.query;
        }
    }

    res.status(status).json(errorResponse);
};

// Custom error classes
export class AuthenticationError extends Error {
    constructor(message = 'Authentication failed') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends Error {
    constructor(message = 'Access denied') {
        super(message);
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class ValidationError extends Error {
    constructor(message = 'Validation failed') {
        super(message);
        this.name = 'ValidationError';
    }
}