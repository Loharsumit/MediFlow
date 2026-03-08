const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// GET all sales
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET single sale with items
router.get('/:id', async (req, res) => {
    try {
        const { data: sale, error } = await supabase.from('sales').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        if (!sale) return res.status(404).json({ error: 'Sale not found' });

        const { data: items, error: itemsError } = await supabase.from('sale_items').select('*').eq('saleid', sale.id);
        if (itemsError) throw itemsError;

        sale.items = items;
        res.json(sale);
    } catch (error) {
        console.error('Error fetching sale:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST new sale (creates invoice, deducts stock, updates customer)
router.post('/', async (req, res) => {
    try {
        const { customerName, customerId, doctorName, paymentMode, subtotal, discPct, cgst, sgst, netTotal, items } = req.body;
        const invoiceNo = 'INV-' + Date.now();

        // 1. Insert Sale record
        const { data: sale, error: saleError } = await supabase.from('sales').insert([{
            invoiceno: invoiceNo,
            customername: customerName || 'Walk-in',
            customerid: customerId || null,
            doctorname: doctorName || 'Self',
            paymentmode: paymentMode || 'Cash',
            subtotal: subtotal || 0,
            discpct: discPct || 0,
            cgst: cgst || 0,
            sgst: sgst || 0,
            nettotal: netTotal || 0
        }]).select().single();

        if (saleError) throw saleError;
        const saleId = sale.id;

        // 2. Insert Sale Items and update Medicine stock
        if (items && items.length) {
            const saleItems = items.map(item => ({
                saleid: saleId,
                medicineid: item.medicineId || null,
                name: item.name,
                batch: item.batch || '',
                expiry: item.expiry || '',
                qty: item.qty || 1,
                mrp: item.mrp || 0,
                gstrate: item.gstRate || 12
            }));

            const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
            if (itemsError) throw itemsError;

            // Update medicine stock
            for (const item of items) {
                if (item.medicineId) {
                    const { data: med, error: medError } = await supabase.from('medicines').select('stock').eq('id', item.medicineId).single();
                    if (!medError && med) {
                        const newStock = Math.max(0, med.stock - item.qty);
                        await supabase.from('medicines').update({ stock: newStock }).eq('id', item.medicineId);
                    }
                }
            }
        }

        // 3. Update Customer totals
        if (customerId) {
            const { data: cust, error: custError } = await supabase.from('customers').select('totalpurchases, balance').eq('id', customerId).single();
            if (!custError && cust) {
                const tp = (cust.totalpurchases || 0) + (netTotal || 0);
                const bal = paymentMode === 'Credit' ? (cust.balance || 0) + (netTotal || 0) : cust.balance;
                await supabase.from('customers').update({ totalpurchases: tp, balance: bal }).eq('id', customerId);
            }
        }

        // 4. Return the complete sale
        const { data: finalItems } = await supabase.from('sale_items').select('*').eq('saleid', saleId);
        sale.items = finalItems || [];

        res.json({ ...sale, invoiceNo: sale.invoiceno });
    } catch (error) {
        console.error('Error creating sale:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
