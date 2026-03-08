const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// GET all suppliers
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST new supplier
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, address, gstin, drugLicense } = req.body;
        const { data, error } = await supabase.from('suppliers').insert([{
            name, phone: phone || '', email: email || '', address: address || '', gstin: gstin || '', druglicense: drugLicense || ''
        }]).select().single();

        if (error) throw error;
        res.json({ id: data.id, message: 'Supplier added' });
    } catch (error) {
        console.error('Error adding supplier:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT update supplier
router.put('/:id', async (req, res) => {
    try {
        const { name, phone, email, address, gstin, drugLicense } = req.body;
        const { error } = await supabase.from('suppliers').update({
            name, phone: phone || '', email: email || '', address: address || '', gstin: gstin || '', druglicense: drugLicense || ''
        }).eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Supplier updated' });
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE supplier
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('suppliers').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Supplier deleted' });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
