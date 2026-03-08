const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const requireAuth = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Today's sales
        const { data: todaySales, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .eq('user_id', req.user.id)
            .gte('date', todayStr);

        if (salesError) throw salesError;
        const totalSalesRevenue = (todaySales || []).reduce((a, s) => a + (s.nettotal || 0), 0);

        // Today's purchases
        const { data: todayPurchases, error: purError } = await supabase
            .from('purchases')
            .select('*')
            .eq('user_id', req.user.id)
            .gte('date', todayStr);

        if (purError) throw purError;
        const totalPurchaseValue = (todayPurchases || []).reduce((a, p) => a + (p.total || 0), 0);

        // Low stock
        const { data: allMeds, error: medsError } = await supabase
            .from('medicines')
            .select('*')
            .eq('user_id', req.user.id);

        if (medsError) throw medsError;

        const lowStockItems = (allMeds || [])
            .filter(m => m.stock <= m.reorderlevel)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 10);

        // Expiring within 30 days
        const now = new Date();
        const thirtyDays = new Date();
        thirtyDays.setDate(now.getDate() + 30);

        const nowStr = now.toISOString().split('T')[0];
        const thirtyDaysStr = thirtyDays.toISOString().split('T')[0];

        const { data: expiringItems, error: expError } = await supabase
            .from('medicines')
            .select('*')
            .eq('user_id', req.user.id)
            .gt('expirydate', nowStr)
            .lte('expirydate', thirtyDaysStr)
            .neq('expirydate', '');

        if (expError) throw expError;

        // Recent sales
        const { data: recentSalesAll } = await supabase
            .from('sales')
            .select('*')
            .eq('user_id', req.user.id)
            .order('date', { ascending: false })
            .limit(8);

        res.json({
            totalSalesRevenue,
            salesCount: (todaySales || []).length,
            totalPurchaseValue,
            purchaseCount: (todayPurchases || []).length,
            lowStockCount: lowStockItems.length,
            lowStockItems,
            expiringCount: (expiringItems || []).length,
            recentSales: recentSalesAll || [],
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
