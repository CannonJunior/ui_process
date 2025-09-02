/**
 * Debug Routes
 * Simple debug endpoint for logging from frontend
 */

import express from 'express';

const router = express.Router();

// POST /api/v1/debug/log
router.post('/log', (req, res) => {
    const { level, message, data } = req.body;
    const timestamp = new Date().toISOString();
    
    console.log(`🖥️ FRONTEND LOG [${level}] ${timestamp}:`, message);
    if (data) {
        console.log('🖥️ FRONTEND DATA:', data);
    }
    
    res.json({ status: 'logged' });
});

export default router;