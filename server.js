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

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n  ┌─────────────────────────────────────┐`);
    console.log(`  │                                     │`);
    console.log(`  │   MediFlow ERP v2.0                 │`);
    console.log(`  │   Server running on port ${PORT}        │`);
    console.log(`  │   http://localhost:${PORT}             │`);
    console.log(`  │                                     │`);
    console.log(`  └─────────────────────────────────────┘\n`);
});
