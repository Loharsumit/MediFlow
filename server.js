/**
 * server.js - MediFlow ERP v2.0
 * Express server entry point
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes setup for local and Netlify
const apiRouter = express.Router();
apiRouter.use('/auth', require('./routes/auth'));
apiRouter.use('/medicines', require('./routes/medicines'));
apiRouter.use('/suppliers', require('./routes/suppliers'));
apiRouter.use('/customers', require('./routes/customers'));
apiRouter.use('/sales', require('./routes/sales'));
apiRouter.use('/purchases', require('./routes/purchases'));
apiRouter.use('/dashboard', require('./routes/dashboard'));
apiRouter.use('/reports', require('./routes/reports'));
apiRouter.use('/settings', require('./routes/settings'));

app.use('/api', apiRouter);
app.use('/.netlify/functions/api', apiRouter); // For Netlify routing

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only listen if not in a serverless environment
if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
    app.listen(PORT, () => {
        console.log(`\n  ┌─────────────────────────────────────┐`);
        console.log(`  │                                     │`);
        console.log(`  │   MediFlow ERP v2.0                 │`);
        console.log(`  │   Server running on port ${PORT}        │`);
        console.log(`  │   http://localhost:${PORT}             │`);
        console.log(`  │                                     │`);
        console.log(`  └─────────────────────────────────────┘\n`);
    });
}

module.exports = app;
