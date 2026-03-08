const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const requireAuth = require('../middleware/authMiddleware');

router.use(requireAuth);

// GET all customers
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = supabase.from('customers').select('*').eq('user_id', req.user.id).order('name', { ascending: true });

        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST new customer
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, address, doctor } = req.body;
        const { data, error } = await supabase.from('customers').insert([{
            user_id: req.user.id,
            name, phone: phone || '', email: email || '', address: address || '', doctor: doctor || ''
        }]).select().single();

        if (error) throw error;
        res.json({ id: data.id, message: 'Customer added' });
    } catch (error) {
        console.error('Error adding customer:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT update customer
router.put('/:id', async (req, res) => {
    try {
        const { name, phone, email, address, doctor } = req.body;
        const { error } = await supabase.from('customers').update({
            name, phone: phone || '', email: email || '', address: address || '', doctor: doctor || ''
        }).eq('id', req.params.id).eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ message: 'Customer updated' });
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('customers').delete().eq('id', req.params.id).eq('user_id', req.user.id);
        if (error) throw error;
        res.json({ message: 'Customer deleted' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
