/**
 * pos.js - MediFlow ERP v2.0
 * Point of Sale with cart, GST calculation, checkout
 */

(function () {
    let cart = [];
    let payMode = 'Cash';

    window.renderPOS = function () {
        const page = document.getElementById('page-pos');
        page.innerHTML = `
            <div class="pos-grid">
                <!-- Left: Search + Cart -->
                <div class="pos-left">
                    <div class="pos-search-wrap">
                        <input type="text" id="pos-search" placeholder="Search medicine by name or batch..." style="width:100%;padding:0.7rem 0.85rem;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.9rem;outline:none"/>
                        <div id="pos-results" class="pos-search-results" style="display:none"></div>
                    </div>
                    <div class="table-responsive"><div class="table-wrap">
                        <table>
                            <thead><tr><th>Medicine</th><th>Batch</th><th>MRP</th><th>Qty</th><th>GST%</th><th>Total</th><th></th></tr></thead>
                            <tbody id="pos-cart-tbody"><tr><td colspan="7" class="table-empty">Search and add medicines to start billing</td></tr></tbody>
                        </table>
                    </div></div>
                </div>

                <!-- Right: Summary -->
                <div class="pos-right">
                    <div class="card" style="margin-bottom:1rem">
                        <div class="form-group"><label>Customer Name</label><input type="text" id="pos-customer" placeholder="Walk-in" style="padding:0.55rem 0.75rem;font-size:0.85rem"/></div>
                        <div class="form-group"><label>Doctor Name</label><input type="text" id="pos-doctor" placeholder="Self" style="padding:0.55rem 0.75rem;font-size:0.85rem"/></div>
                        <div class="form-group">
                            <label>Payment Mode</label>
                            <div style="display:flex;gap:0.5rem">
                                <button type="button" class="btn btn-sm pay-btn active-pay" data-pay="Cash" onclick="setPay('Cash')">Cash</button>
                                <button type="button" class="btn btn-ghost btn-sm pay-btn" data-pay="Card" onclick="setPay('Card')">Card</button>
                                <button type="button" class="btn btn-ghost btn-sm pay-btn" data-pay="UPI" onclick="setPay('UPI')">UPI</button>
                                <button type="button" class="btn btn-ghost btn-sm pay-btn" data-pay="Credit" onclick="setPay('Credit')">Credit</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Discount %</label>
                            <input type="number" id="pos-discount" value="0" min="0" max="100" step="0.5" onchange="updatePOSSummary()" style="padding:0.55rem 0.75rem;font-size:0.85rem"/>
                        </div>
                    </div>

                    <div class="pos-summary">
                        <div class="pos-summary-row"><span>Items</span><span id="pos-items-count">0</span></div>
                        <div class="pos-summary-row"><span>Subtotal</span><span id="pos-subtotal">₹0.00</span></div>
                        <div class="pos-summary-row"><span>CGST</span><span id="pos-cgst">₹0.00</span></div>
                        <div class="pos-summary-row"><span>SGST</span><span id="pos-sgst">₹0.00</span></div>
                        <div class="pos-summary-row"><span>Discount</span><span id="pos-disc-amt">-₹0.00</span></div>
                        <div class="pos-summary-row total"><span>Net Total</span><span id="pos-net">₹0.00</span></div>
                    </div>

                    <div style="display:flex;gap:0.75rem;margin-top:1rem">
                        <button class="btn btn-ghost" style="flex:1" onclick="clearPOS()">
                            <span class="material-symbols-outlined">delete_sweep</span> Clear
                        </button>
                        <button class="btn btn-primary" style="flex:2" onclick="checkoutPOS()">
                            <span class="material-symbols-outlined">receipt_long</span> Complete Sale
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Search listener
        const searchInput = document.getElementById('pos-search');
        const resultsDiv = document.getElementById('pos-results');
        let debounce;

        searchInput.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(async () => {
                const q = searchInput.value.trim();
                if (q.length < 2) { resultsDiv.style.display = 'none'; return; }
                try {
                    const meds = await API.getMedicines(`?search=${encodeURIComponent(q)}`);
                    if (!meds.length) {
                        resultsDiv.innerHTML = '<div class="pos-search-item" style="color:var(--text-muted)">No medicines found</div>';
                    } else {
                        resultsDiv.innerHTML = meds.map(m => `
                            <div class="pos-search-item" onclick="addToCart(${JSON.stringify(m).replace(/"/g, '&quot;')})">
                                <div>
                                    <div class="text-bold">${m.name}</div>
                                    <div style="font-size:0.75rem;color:var(--text-muted)">Batch: ${m.batch} | Exp: ${m.expirydate || '--'}</div>
                                </div>
                                <div style="text-align:right">
                                    <div style="font-weight:700;color:var(--accent)">₹${fmt(m.mrp)}</div>
                                    <div style="font-size:0.75rem;color:${m.stock === 0 ? 'var(--danger)' : 'var(--success)'};font-weight:600">Stock: ${m.stock}</div>
                                </div>
                            </div>
                        `).join('');
                    }
                    resultsDiv.style.display = 'block';
                } catch (e) { resultsDiv.style.display = 'none'; }
            }, 300);
        });

        // Close search results on outside click
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) resultsDiv.style.display = 'none';
        });
    };

    window.addToCart = function (med) {
        if (med.stock === 0) { showToast('Out of stock!', 'warning'); return; }
        const existing = cart.find(c => c.id === med.id);
        if (existing) {
            if (existing.qty >= med.stock) { showToast(`Only ${med.stock} in stock!`, 'warning'); return; }
            existing.qty++;
        } else {
            cart.push({ ...med, qty: 1 });
        }
        document.getElementById('pos-search').value = '';
        document.getElementById('pos-results').style.display = 'none';
        renderCart();
    };

    window.removeFromCart = function (idx) {
        cart.splice(idx, 1);
        renderCart();
    };

    window.updateCartQty = function (idx, val) {
        const qty = parseInt(val);
        if (isNaN(qty) || qty < 1) { cart.splice(idx, 1); }
        else if (qty > cart[idx].stock) { showToast(`Max stock: ${cart[idx].stock}`, 'warning'); cart[idx].qty = cart[idx].stock; }
        else { cart[idx].qty = qty; }
        renderCart();
    };

    function renderCart() {
        const tbody = document.getElementById('pos-cart-tbody');
        if (!cart.length) { tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Cart is empty</td></tr>'; updatePOSSummary(); return; }
        tbody.innerHTML = cart.map((item, i) => {
            const total = item.qty * parseFloat(item.mrp || 0);
            return `<tr>
                <td class="text-bold">${item.name}</td>
                <td>${item.batch}</td>
                <td>₹${fmt(item.mrp)}</td>
                <td><input type="number" value="${item.qty}" min="1" max="${item.stock}" onchange="updateCartQty(${i}, this.value)" style="width:60px;padding:0.3rem 0.5rem;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text-primary);text-align:center;font-size:0.85rem"/></td>
                <td>${item.gstrate || 12}%</td>
                <td class="text-bold">₹${fmt(total)}</td>
                <td><button class="btn-icon" onclick="removeFromCart(${i})"><span class="material-symbols-outlined" style="font-size:18px;color:var(--danger)">close</span></button></td>
            </tr>`;
        }).join('');
        updatePOSSummary();
    }

    window.updatePOSSummary = function () {
        let subtotal = 0, totalCgst = 0, totalSgst = 0;
        cart.forEach(item => {
            const lineTotal = item.qty * parseFloat(item.mrp || 0);
            const gstRate = parseFloat(item.gstrate || 12);
            const gstAmt = lineTotal * gstRate / (100 + gstRate); // GST is inclusive in MRP
            totalCgst += gstAmt / 2;
            totalSgst += gstAmt / 2;
            subtotal += lineTotal;
        });
        const discPct = parseFloat(document.getElementById('pos-discount')?.value || 0);
        const discAmt = subtotal * discPct / 100;
        const net = subtotal - discAmt;

        document.getElementById('pos-items-count').textContent = cart.reduce((a, c) => a + c.qty, 0);
        document.getElementById('pos-subtotal').textContent = `₹${fmt(subtotal)}`;
        document.getElementById('pos-cgst').textContent = `₹${fmt(totalCgst)}`;
        document.getElementById('pos-sgst').textContent = `₹${fmt(totalSgst)}`;
        document.getElementById('pos-disc-amt').textContent = `-₹${fmt(discAmt)}`;
        document.getElementById('pos-net').textContent = `₹${fmt(net)}`;
    };

    window.setPay = function (mode) {
        payMode = mode;
        document.querySelectorAll('.pay-btn').forEach(b => {
            b.classList.toggle('btn-primary', b.dataset.pay === mode);
            b.classList.toggle('active-pay', b.dataset.pay === mode);
            b.classList.toggle('btn-ghost', b.dataset.pay !== mode);
        });
    };

    window.clearPOS = function () {
        cart = [];
        payMode = 'Cash';
        renderCart();
        const d = document.getElementById('pos-discount'); if (d) d.value = 0;
        const c = document.getElementById('pos-customer'); if (c) c.value = '';
        const doc = document.getElementById('pos-doctor'); if (doc) doc.value = '';
        setPay('Cash');
    };

    window.checkoutPOS = async function () {
        if (!cart.length) { showToast('Cart is empty!', 'warning'); return; }

        let subtotal = 0;
        cart.forEach(item => subtotal += item.qty * parseFloat(item.mrp || 0));
        const discPct = parseFloat(document.getElementById('pos-discount')?.value || 0);
        const discAmt = subtotal * discPct / 100;

        let totalCgst = 0, totalSgst = 0;
        cart.forEach(item => {
            const lineTotal = item.qty * parseFloat(item.mrp || 0);
            const gstRate = parseFloat(item.gstrate || 12);
            const gstAmt = lineTotal * gstRate / (100 + gstRate);
            totalCgst += gstAmt / 2;
            totalSgst += gstAmt / 2;
        });

        const sale = {
            customerName: document.getElementById('pos-customer')?.value || 'Walk-in',
            doctorName: document.getElementById('pos-doctor')?.value || 'Self',
            paymentMode: payMode,
            subtotal: subtotal,
            discPct: discPct,
            cgst: totalCgst,
            sgst: totalSgst,
            netTotal: subtotal - discAmt,
            items: cart.map(item => ({
                medicineId: item.id,
                name: item.name,
                batch: item.batch,
                expiry: item.expirydate || '',
                qty: item.qty,
                mrp: parseFloat(item.mrp || 0),
                gstRate: parseInt(item.gstrate || 12),
            }))
        };

        try {
            const result = await API.addSale(sale);
            showToast(`Sale completed! Invoice: ${result.invoiceNo || 'Created'}`, 'success');
            clearPOS();
        } catch (e) { /* toast shown by API */ }
    };
})();
