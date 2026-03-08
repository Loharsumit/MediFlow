const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

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
            value: String(value)
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
            supabase.from('medicines').select('*'),
            supabase.from('suppliers').select('*'),
            supabase.from('customers').select('*'),
            supabase.from('sales').select('*'),
            supabase.from('sale_items').select('*'),
            supabase.from('purchases').select('*'),
            supabase.from('purchase_items').select('*'),
            supabase.from('settings').select('*')
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
        const { data: meds, error } = await supabase.from('medicines').select('*').order('name', { ascending: true });
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
        // using .neq('id', 0) to delete all.

        await supabase.from('sale_items').delete().neq('id', 0);
        await supabase.from('sales').delete().neq('id', 0);
        await supabase.from('purchase_items').delete().neq('id', 0);
        await supabase.from('purchases').delete().neq('id', 0);
        await supabase.from('medicines').delete().neq('id', 0);
        await supabase.from('suppliers').delete().neq('id', 0);
        await supabase.from('customers').delete().neq('id', 0);

        res.json({ message: 'All data cleared' });
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
