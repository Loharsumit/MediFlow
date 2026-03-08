const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name: name || email.split('@')[0] } }
        });

        if (error) throw error;
        res.json({ message: 'Signup successful', user: data.user });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(400).json({ error: error.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;
        res.json({
            message: 'Login successful',
            user: data.user,
            session: { access_token: data.session.access_token, expires_at: data.session.expires_at }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        res.json({ message: 'Logged out' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const { data, error } = await supabase.auth.getUser(token);
        if (error) throw error;
        res.json({ user: data.user });
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// GET /api/auth/google
router.get('/google', async (req, res) => {
    try {
        const redirectUrl = `${req.protocol}://${req.get('host')}/api/auth/callback`;
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
            }
        });

        if (error) throw error;
        res.redirect(data.url);
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/auth/callback
router.get('/callback', async (req, res) => {
    // Supabase redirects to the callback URL with the token in the URL hash (e.g., #access_token=...)
    // Since this is handled on the client-side (app.js reads the hash), we just need to redirect back to the home page
    // The client-side will extract the token from the hash.
    // However, if the server needs to handle a code exchange (if using PKCE), that would be done here.
    // For standard Supabase implicit flow, redirecting to / with the hash preserved is usually sufficient.
    res.redirect('/');
});

module.exports = router;
