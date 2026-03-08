const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const requireAuth = require('../middleware/authMiddleware');

router.use(requireAuth);

// GET all settings
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw error;

        const settings = {};
        (data || []).forEach(r => { settings[r.key] = r.value; });
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT update settings
router.put('/', async (req, res) => {
    try {
        const updates = Object.entries(req.body).map(([key, value]) => ({
            key,
            value: String(value),
            user_id: req.user.id
        }));

        // Supabase upsert requires primary key conflict resolution
        const { error } = await supabase.from('settings').upsert(updates, { onConflict: 'key' });
        if (error) throw error;

        res.json({ message: 'Settings saved' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET export all data as JSON
router.get('/export', async (req, res) => {
    try {
        // Fetch all tables concurrently
        const [meds, supps, custs, sales, saleItems, purs, purItems, sets] = await Promise.all([
            supabase.from('medicines').select('*').eq('user_id', req.user.id),
            supabase.from('suppliers').select('*').eq('user_id', req.user.id),
            supabase.from('customers').select('*').eq('user_id', req.user.id),
            supabase.from('sales').select('*').eq('user_id', req.user.id),
            supabase.from('sale_items').select('*, sales!inner(user_id)').eq('sales.user_id', req.user.id), // assumes relation
            supabase.from('purchases').select('*').eq('user_id', req.user.id),
            supabase.from('purchase_items').select('*, purchases!inner(user_id)').eq('purchases.user_id', req.user.id), // assumes relation
            supabase.from('settings').select('*').eq('user_id', req.user.id)
        ]);

        const data = {
            medicines: meds.data || [],
            suppliers: supps.data || [],
            customers: custs.data || [],
            sales: sales.data || [],
            sale_items: saleItems.data || [],
            purchases: purs.data || [],
            purchase_items: purItems.data || [],
            settings: sets.data || [],
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=mediflow_backup.json');
        res.send(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET export inventory as CSV
router.get('/export/csv/inventory', async (req, res) => {
    try {
        const { data: meds, error } = await supabase.from('medicines').select('*').eq('user_id', req.user.id).order('name', { ascending: true });
        if (error) throw error;

        if (!meds || !meds.length) return res.status(404).send('No data');

        const headers = Object.keys(meds[0]);
        const rows = meds.map(m => headers.map(h => `"${String(m[h] ?? '').replace(/"/g, '""')}"`).join(','));
        const csv = [headers.join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
        res.send(csv);
    } catch (error) {
        console.error('Error exporting inventory CSV:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST clear all data
router.post('/clear', async (req, res) => {
    try {
        // We have foreign key constraints, so order matters. Must delete child items first.
        // OR we can just delete via raw RPC, but let's do sequential deletes.
        // Note: Supabase delete requires filters or neq. 
        // using .eq('user_id', req.user.id) to delete only current user's data.

        // Items first (via parent eq)
        const { data: userSales } = await supabase.from('sales').select('id').eq('user_id', req.user.id);
        if (userSales && userSales.length) {
            await supabase.from('sale_items').delete().in('saleid', userSales.map(s => s.id));
        }

        const { data: userPurchases } = await supabase.from('purchases').select('id').eq('user_id', req.user.id);
        if (userPurchases && userPurchases.length) {
            await supabase.from('purchase_items').delete().in('purchaseid', userPurchases.map(p => p.id));
        }

        await supabase.from('sales').delete().eq('user_id', req.user.id);
        await supabase.from('purchases').delete().eq('user_id', req.user.id);
        await supabase.from('medicines').delete().eq('user_id', req.user.id);
        await supabase.from('suppliers').delete().eq('user_id', req.user.id);
        await supabase.from('customers').delete().eq('user_id', req.user.id);

        res.json({ message: 'All data cleared' });
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
