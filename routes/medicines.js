const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// GET all medicines (with optional search/filter)
router.get('/', async (req, res) => {
    try {
        const { search, stockFilter, schedule } = req.query;
        let query = supabase.from('medicines').select('*').order('name', { ascending: true });

        if (search) {
            query = query.or(`name.ilike.%${search}%,batch.ilike.%${search}%,company.ilike.%${search}%,hsn.ilike.%${search}%`);
        }

        if (stockFilter === 'out') {
            query = query.eq('stock', 0);
        }

        if (schedule && schedule !== '') {
            query = query.eq('schedule', schedule);
        }

        const { data, error } = await query;
        if (error) throw error;

        let results = data;

        // Manual filter for col-to-col comparison
        if (stockFilter === 'low') {
            results = results.filter(m => m.stock > 0 && m.stock <= m.reorderlevel);
        } else if (stockFilter === 'ok') {
            results = results.filter(m => m.stock > m.reorderlevel);
        }

        res.json(results);
    } catch (error) {
        console.error('Error fetching medicines:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET single medicine
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('medicines').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Medicine not found' });
        res.json(data);
    } catch (error) {
        console.error('Error fetching medicine:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST new medicine
router.post('/', async (req, res) => {
    try {
        const { name, company, batch, hsn, schedule, stock, mrp, purchasePrice, expiryDate, gstRate, reorderLevel, rackNo, category } = req.body;
        const { data, error } = await supabase.from('medicines').insert([{
            name, company: company || '', batch, hsn: hsn || '', schedule: schedule || 'None',
            stock: stock || 0, mrp: mrp || 0, purchaseprice: purchasePrice || 0,
            expirydate: expiryDate || '', gstrate: gstRate || 12, reorderlevel: reorderLevel || 10,
            rackno: rackNo || '', category: category || 'General'
        }]).select().single();

        if (error) throw error;
        res.json({ id: data.id, message: 'Medicine added' });
    } catch (error) {
        console.error('Error adding medicine:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT update medicine
router.put('/:id', async (req, res) => {
    try {
        const { name, company, batch, hsn, schedule, stock, mrp, purchasePrice, expiryDate, gstRate, reorderLevel, rackNo, category } = req.body;
        const { error } = await supabase.from('medicines').update({
            name, company: company || '', batch, hsn: hsn || '', schedule: schedule || 'None',
            stock: stock || 0, mrp: mrp || 0, purchaseprice: purchasePrice || 0,
            expirydate: expiryDate || '', gstrate: gstRate || 12, reorderlevel: reorderLevel || 10,
            rackno: rackNo || '', category: category || 'General', updatedat: new Date().toISOString()
        }).eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Medicine updated' });
    } catch (error) {
        console.error('Error updating medicine:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE medicine
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('medicines').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Medicine deleted' });
    } catch (error) {
        console.error('Error deleting medicine:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
