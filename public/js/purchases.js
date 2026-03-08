/**
 * purchases.js - MediFlow ERP v2.0
 * Purchase & Supplier Management
 */

window.renderPurchases = async function () {
    const page = document.getElementById('page-purchases');
    page.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
            <div>
                <div class="page-header">
                    <h3>Suppliers</h3>
                    <button class="btn btn-primary btn-sm" onclick="openSupplierModal()">
                        <span class="material-symbols-outlined">add</span> Add Supplier
                    </button>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Name</th><th>Phone</th><th>GSTIN</th><th>Balance</th><th>Actions</th></tr></thead>
                        <tbody id="sup-tbody"><tr><td colspan="5" class="table-empty">Loading...</td></tr></tbody>
                    </table>
                </div>
            </div>
            <div>
                <div class="page-header">
                    <h3>New Purchase Entry</h3>
                </div>
                <div class="card" id="purchase-form-card">
                    <form id="purchase-form">
                        <div class="form-row">
                            <div class="form-group"><label>Supplier *</label><select id="pf-supplier" required><option value="">Select Supplier</option></select></div>
                            <div class="form-group"><label>Invoice No</label><input type="text" id="pf-invno"/></div>
                        </div>
                        <div class="form-group"><label>Invoice Date</label><input type="date" id="pf-invdate"/></div>
                        <hr style="border-color:var(--border);margin:1rem 0"/>
                        <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:0.75rem">Items</h4>
                        <div id="pf-items"></div>
                        <button type="button" class="btn btn-ghost btn-sm" onclick="addPurchaseItemRow()" style="margin-top:0.5rem">
                            <span class="material-symbols-outlined">add</span> Add Item
                        </button>
                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">Save Purchase</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <div class="page-header"><h3>Purchase History</h3></div>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Purchase #</th><th>Supplier Inv</th><th>Date</th><th>Total</th></tr></thead>
                <tbody id="pur-tbody"><tr><td colspan="4" class="table-empty">Loading...</td></tr></tbody>
            </table>
        </div>
    `;
    loadSupplierTable();
    loadPurchaseHistory();
    populateSupplierDropdown();
    addPurchaseItemRow();

    document.getElementById('purchase-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const supplierId = document.getElementById('pf-supplier').value;
        const supplierInvNo = document.getElementById('pf-invno').value;
        const invoiceDate = document.getElementById('pf-invdate').value;
        const itemRows = document.querySelectorAll('.pf-item-row');
        const items = [];
        let total = 0;
        itemRows.forEach(row => {
            const name = row.querySelector('.pi-name')?.value;
            const batch = row.querySelector('.pi-batch')?.value || '';
            const qty = parseInt(row.querySelector('.pi-qty')?.value || 1);
            const purchasePrice = parseFloat(row.querySelector('.pi-price')?.value || 0);
            const mrp = parseFloat(row.querySelector('.pi-mrp')?.value || 0);
            const expiryDate = row.querySelector('.pi-expiry')?.value || '';
            if (name) {
                items.push({ name, batch, qty, purchasePrice, mrp, expiryDate });
                total += qty * purchasePrice;
            }
        });
        if (!items.length) { showToast('Please add at least one item', 'warning'); return; }
        try {
            await API.addPurchase({ supplierId: parseInt(supplierId), supplierInvNo, invoiceDate, total, items });
            showToast('Purchase saved!', 'success');
            renderPurchases();
        } catch (e) { }
    });
};

window.addPurchaseItemRow = function () {
    const container = document.getElementById('pf-items');
    const row = document.createElement('div');
    row.className = 'pf-item-row';
    row.style.cssText = 'background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:0.75rem;margin-bottom:0.5rem;position:relative';
    row.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem">
            <div class="form-group" style="margin:0"><label style="font-size:0.65rem">Name *</label><input class="pi-name" type="text" placeholder="Medicine name" style="padding:0.4rem 0.5rem;font-size:0.8rem"/></div>
            <div class="form-group" style="margin:0"><label style="font-size:0.65rem">Batch</label><input class="pi-batch" type="text" placeholder="Batch no" style="padding:0.4rem 0.5rem;font-size:0.8rem"/></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0.5rem">
            <div class="form-group" style="margin:0"><label style="font-size:0.65rem">Qty</label><input class="pi-qty" type="number" value="1" min="1" style="padding:0.4rem 0.5rem;font-size:0.8rem;width:100%"/></div>
            <div class="form-group" style="margin:0"><label style="font-size:0.65rem">P.Price (₹)</label><input class="pi-price" type="number" step="0.01" value="0" style="padding:0.4rem 0.5rem;font-size:0.8rem;width:100%"/></div>
            <div class="form-group" style="margin:0"><label style="font-size:0.65rem">MRP (₹)</label><input class="pi-mrp" type="number" step="0.01" value="0" style="padding:0.4rem 0.5rem;font-size:0.8rem;width:100%"/></div>
            <div class="form-group" style="margin:0"><label style="font-size:0.65rem">Expiry</label><input class="pi-expiry" type="date" style="padding:0.4rem 0.5rem;font-size:0.8rem;width:100%"/></div>
        </div>
        <button type="button" class="btn-icon" onclick="this.closest('.pf-item-row').remove()" style="position:absolute;top:0.4rem;right:0.4rem" title="Remove item"><span class="material-symbols-outlined" style="font-size:16px;color:var(--danger)">close</span></button>
    `;
    container.appendChild(row);
};

async function loadSupplierTable() {
    const tbody = document.getElementById('sup-tbody');
    try {
        const sups = await API.getSuppliers();
        if (!sups.length) { tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No suppliers yet</td></tr>'; return; }
        tbody.innerHTML = sups.map(s => `<tr>
            <td class="text-bold">${s.name}</td>
            <td>${s.phone || '--'}</td>
            <td>${s.gstin || '--'}</td>
            <td class="${parseFloat(s.balance || 0) > 0 ? 'text-red' : ''}" style="font-weight:600">₹${fmt(s.balance)}</td>
            <td>
                <button class="btn-icon" onclick="editSupplier(${s.id})"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button>
                <button class="btn-icon" onclick="deleteSupplier(${s.id})"><span class="material-symbols-outlined" style="font-size:18px;color:var(--danger)">delete</span></button>
            </td>
        </tr>`).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Error loading suppliers</td></tr>'; }
}

async function populateSupplierDropdown() {
    try {
        const sups = await API.getSuppliers();
        const sel = document.getElementById('pf-supplier');
        sel.innerHTML = '<option value="">Select Supplier</option>' + sups.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch (e) { }
}

async function loadPurchaseHistory() {
    const tbody = document.getElementById('pur-tbody');
    try {
        const purs = await API.getPurchases();
        if (!purs.length) { tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No purchases yet</td></tr>'; return; }
        tbody.innerHTML = purs.map(p => `<tr>
            <td class="text-bold">${p.purchaseno || '--'}</td>
            <td>${p.supplierinvno || '--'}</td>
            <td>${p.date ? new Date(p.date).toLocaleDateString('en-IN') : '--'}</td>
            <td style="font-weight:700">₹${fmt(p.total)}</td>
        </tr>`).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Error loading purchases</td></tr>'; }
}

window.openSupplierModal = function (sup = null) {
    const isEdit = !!sup;
    openModal(`
        <h3>${isEdit ? 'Edit' : 'Add'} Supplier</h3>
        <form id="supplier-form">
            <div class="form-row">
                <div class="form-group"><label>Name *</label><input type="text" id="sf-name" required value="${sup?.name || ''}"/></div>
                <div class="form-group"><label>Phone</label><input type="text" id="sf-phone" value="${sup?.phone || ''}"/></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Email</label><input type="email" id="sf-email" value="${sup?.email || ''}"/></div>
                <div class="form-group"><label>GSTIN</label><input type="text" id="sf-gstin" value="${sup?.gstin || ''}"/></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Drug License</label><input type="text" id="sf-dl" value="${sup?.druglicense || ''}"/></div>
                <div class="form-group"><label>Address</label><input type="text" id="sf-address" value="${sup?.address || ''}"/></div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'}</button>
            </div>
        </form>
    `);
    document.getElementById('supplier-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('sf-name').value,
            phone: document.getElementById('sf-phone').value,
            email: document.getElementById('sf-email').value,
            gstin: document.getElementById('sf-gstin').value,
            drugLicense: document.getElementById('sf-dl').value,
            address: document.getElementById('sf-address').value,
        };
        try {
            if (isEdit) { await API.updateSupplier(sup.id, data); showToast('Supplier updated', 'success'); }
            else { await API.addSupplier(data); showToast('Supplier added', 'success'); }
            closeModal(); loadSupplierTable(); populateSupplierDropdown();
        } catch (e) { }
    });
};

window.editSupplier = async function (id) {
    try { const sups = await API.getSuppliers(); const s = sups.find(x => x.id === id); if (s) openSupplierModal(s); } catch (e) { }
};
window.deleteSupplier = async function (id) {
    if (!confirm('Delete this supplier?')) return;
    try { await API.deleteSupplier(id); showToast('Supplier deleted', 'info'); loadSupplierTable(); populateSupplierDropdown(); } catch (e) { }
};
