const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const requireAuth = require('../middleware/authMiddleware');

router.use(requireAuth);

// Sales report
router.get('/sales', async (req, res) => {
    try {
        const { from, to } = req.query;
        let query = supabase.from('sales').select('*').eq('user_id', req.user.id).order('date', { ascending: false });

        if (from) query = query.gte('date', from);
        if (to) query = query.lte('date', to + 'T23:59:59');

        const { data: sales, error } = await query;
        if (error) throw error;

        const totalRevenue = (sales || []).reduce((a, s) => a + (s.nettotal || 0), 0);
        const totalGst = (sales || []).reduce((a, s) => a + (s.cgst || 0) + (s.sgst || 0), 0);

        res.json({ sales: sales || [], totalRevenue, totalGst, count: (sales || []).length });
    } catch (error) {
        console.error('Error fetching sales report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Purchase report
router.get('/purchases', async (req, res) => {
    try {
        const { from, to } = req.query;
        let query = supabase.from('purchases').select('*, suppliers(name)').eq('user_id', req.user.id).order('date', { ascending: false });

        if (from) query = query.gte('date', from);
        if (to) query = query.lte('date', to + 'T23:59:59');

        const { data, error } = await query;
        if (error) throw error;

        const purchases = (data || []).map(p => ({
            ...p,
            supplierName: p.suppliers ? p.suppliers.name : null
        }));

        const total = purchases.reduce((a, p) => a + (p.total || 0), 0);
        res.json({ purchases, total, count: purchases.length });
    } catch (error) {
        console.error('Error fetching purchase report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stock report
router.get('/stock', async (req, res) => {
    try {
        const { data: inventory, error } = await supabase.from('medicines').select('*').eq('user_id', req.user.id).order('name', { ascending: true });
        if (error) throw error;

        const totalItems = (inventory || []).length;
        const mrpValue = (inventory || []).reduce((a, m) => a + (m.stock || 0) * (m.mrp || 0), 0);
        const costValue = (inventory || []).reduce((a, m) => a + (m.stock || 0) * (m.purchaseprice || 0), 0);

        res.json(inventory || []);
    } catch (error) {
        console.error('Error fetching stock report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Expiry report
router.get('/expiry', async (req, res) => {
    try {
        const { days } = req.query;
        const d = parseInt(days) || 30;
        const now = new Date();
        const nowStr = now.toISOString().split('T')[0];

        let query = supabase.from('medicines').select('*').eq('user_id', req.user.id).neq('expirydate', '').order('expirydate', { ascending: true });

        if (d === -1) {
            query = query.lte('expirydate', nowStr);
        } else {
            const future = new Date();
            future.setDate(now.getDate() + d);
            const futureStr = future.toISOString().split('T')[0];
            query = query.gt('expirydate', nowStr).lte('expirydate', futureStr);
        }

        const { data: items, error } = await query;
        if (error) throw error;

        res.json(items || []);
    } catch (error) {
        console.error('Error fetching expiry report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Profit/Loss report
router.get('/profitloss', async (req, res) => {
    try {
        const { from, to } = req.query;

        let salesQuery = supabase.from('sales').select('nettotal').eq('user_id', req.user.id);
        let purQuery = supabase.from('purchases').select('total').eq('user_id', req.user.id);

        if (from) {
            salesQuery = salesQuery.gte('date', from);
            purQuery = purQuery.gte('date', from);
        }
        if (to) {
            salesQuery = salesQuery.lte('date', to + 'T23:59:59');
            purQuery = purQuery.lte('date', to + 'T23:59:59');
        }

        const [salesRes, purRes] = await Promise.all([salesQuery, purQuery]);

        if (salesRes.error) throw salesRes.error;
        if (purRes.error) throw purRes.error;

        const totalSales = (salesRes.data || []).reduce((a, s) => a + (s.nettotal || 0), 0);
        const totalPurchases = (purRes.data || []).reduce((a, p) => a + (p.total || 0), 0);

        res.json({ totalSales, totalPurchases, profit: totalSales - totalPurchases });
    } catch (error) {
        console.error('Error calculating profit/loss:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
