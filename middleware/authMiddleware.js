/**
 * authMiddleware.js - MediFlow ERP v2.0
 * Middleware to verify Supabase JWT tokens and extract user context.
 */
const supabase = require('../db/supabase');

const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token with Supabase
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            console.error('JWT Verification Error:', error);
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Attach user info to the request object
        req.user = data.user;
        next();
    } catch (err) {
        console.error('Auth Middleware Exception:', err);
        res.status(500).json({ error: 'Internal Server Error during authentication' });
    }
};

module.exports = requireAuth;
