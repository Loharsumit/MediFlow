const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const requireAuth = require('../middleware/authMiddleware');

router.use(requireAuth);

// GET all purchases
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('purchases')
            .select('*, suppliers(name)')
            .eq('user_id', req.user.id)
            .order('date', { ascending: false });

        if (error) throw error;

        const formattedData = data.map(p => ({
            ...p,
            supplierName: p.suppliers ? p.suppliers.name : null
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET single purchase with items
router.get('/:id', async (req, res) => {
    try {
        const { data: purchase, error } = await supabase.from('purchases').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
        if (error) throw error;
        if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

        const { data: items, error: itemsError } = await supabase.from('purchase_items').select('*').eq('purchaseid', purchase.id);
        if (itemsError) throw itemsError;

        purchase.items = items;
        res.json(purchase);
    } catch (error) {
        console.error('Error fetching purchase:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST new purchase (adds stock to inventory, updates supplier)
router.post('/', async (req, res) => {
    try {
        const { supplierId, supplierInvNo, invoiceDate, total, items } = req.body;
        const purchaseNo = 'PUR-' + Date.now();

        // 1. Insert Purchase
        const { data: purchase, error: purError } = await supabase.from('purchases').insert([{
            user_id: req.user.id,
            purchaseno: purchaseNo,
            supplierid: supplierId || null,
            supplierinvno: supplierInvNo || '',
            invoicedate: invoiceDate || '',
            total: total || 0
        }]).select().single();

        if (purError) throw purError;
        const purchaseId = purchase.id;

        // 2. Insert Purchase Items & Update Inventory
        if (items && items.length) {
            const purItems = items.map(item => ({
                purchaseid: purchaseId,
                name: item.name,
                batch: item.batch || '',
                expirydate: item.expiryDate || '',
                qty: item.qty || 0,
                purchaseprice: item.purchasePrice || 0,
                mrp: item.mrp || 0,
                hsn: item.hsn || '',
                gstrate: item.gstRate || 12,
                category: item.category || 'General',
                schedule: item.schedule || 'None',
                rackno: item.rackNo || '',
                reorderlevel: item.reorderLevel || 10,
                company: item.company || ''
            }));

            const { error: itemsError } = await supabase.from('purchase_items').insert(purItems);
            if (itemsError) throw itemsError;

            // Process each item to update or create in inventory
            for (const item of items) {
                const { data: meds, error: findError } = await supabase
                    .from('medicines')
                    .select('*')
                    .eq('user_id', req.user.id)
                    .ilike('name', item.name)
                    .eq('batch', item.batch || '');

                const existing = meds && meds.length > 0 ? meds[0] : null;

                if (existing) {
                    const updates = {
                        stock: existing.stock + (item.qty || 0),
                        purchaseprice: item.purchasePrice || 0,
                        updatedat: new Date().toISOString()
                    };
                    if ((item.mrp || 0) > 0) updates.mrp = item.mrp;
                    if (item.expiryDate && item.expiryDate !== '') updates.expirydate = item.expiryDate;

                    await supabase.from('medicines').update(updates).eq('id', existing.id).eq('user_id', req.user.id);
                } else {
                    await supabase.from('medicines').insert([{
                        user_id: req.user.id,
                        name: item.name,
                        company: item.company || '',
                        batch: item.batch || '',
                        hsn: item.hsn || '',
                        schedule: item.schedule || 'None',
                        stock: item.qty || 0,
                        mrp: item.mrp || 0,
                        purchaseprice: item.purchasePrice || 0,
                        expirydate: item.expiryDate || '',
                        gstrate: item.gstRate || 12,
                        reorderlevel: item.reorderLevel || 10,
                        rackno: item.rackNo || '',
                        category: item.category || 'General',
                        supplierid: supplierId || null
                    }]);
                }
            }
        }

        // 3. Update Supplier totals
        if (supplierId) {
            const { data: supp, error: suppError } = await supabase.from('suppliers').select('totalpurchases, balance').eq('id', supplierId).eq('user_id', req.user.id).single();
            if (!suppError && supp) {
                const tp = (supp.totalpurchases || 0) + (total || 0);
                const bal = (supp.balance || 0) + (total || 0);
                await supabase.from('suppliers').update({ totalpurchases: tp, balance: bal }).eq('id', supplierId).eq('user_id', req.user.id);
            }
        }

        // 4. Return complete purchase
        const { data: finalItems } = await supabase.from('purchase_items').select('*').eq('purchaseid', purchaseId);
        purchase.items = finalItems || [];
        res.json(purchase);

    } catch (error) {
        console.error('Error creating purchase:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
