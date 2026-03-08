/**
 * inventory.js - MediFlow ERP v2.0
 * Inventory CRUD with search, add, edit, delete
 */

window.renderInventory = async function () {
    const page = document.getElementById('page-inventory');
    page.innerHTML = `
        <div class="page-header">
            <h3>Medicine Inventory</h3>
            <button class="btn btn-primary" onclick="openMedicineModal()">
                <span class="material-symbols-outlined">add</span> Add Medicine
            </button>
        </div>
        <div class="toolbar">
            <input type="text" id="inv-search" placeholder="Search medicines by name, batch, company..." oninput="loadInventoryTable()"/>
        </div>
        <div class="table-responsive"><div class="table-wrap">
            <table>
                <thead><tr>
                    <th>Name</th><th>Company</th><th>Batch</th><th>Expiry</th>
                    <th>Stock</th><th>MRP (₹)</th><th>GST</th><th>Actions</th>
                </tr></thead>
                <tbody id="inv-tbody"><tr><td colspan="8" class="table-empty">Loading...</td></tr></tbody>
            </table>
        </div></div>
    `;
    loadInventoryTable();
};

window.loadInventoryTable = async function () {
    const tbody = document.getElementById('inv-tbody');
    const search = document.getElementById('inv-search')?.value || '';
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    try {
        const meds = await API.getMedicines(qs);
        if (!meds.length) { tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No medicines found</td></tr>'; return; }
        tbody.innerHTML = meds.map(m => {
            const stockClass = m.stock === 0 ? 'text-red' : m.stock <= (m.reorderlevel || 10) ? 'text-amber' : 'text-green';
            return `<tr>
                <td class="text-bold">${m.name}</td>
                <td>${m.company || '--'}</td>
                <td>${m.batch}</td>
                <td>${m.expirydate || '--'}</td>
                <td class="${stockClass}" style="font-weight:700">${m.stock}</td>
                <td>₹${fmt(m.mrp)}</td>
                <td>${m.gstrate || 12}%</td>
                <td>
                    <button class="btn-icon" onclick="editMedicine(${m.id})" title="Edit"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button>
                    <button class="btn-icon" onclick="deleteMedicine(${m.id})" title="Delete"><span class="material-symbols-outlined" style="font-size:18px;color:var(--danger)">delete</span></button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Error loading inventory</td></tr>'; }
};

window.openMedicineModal = function (med = null) {
    const isEdit = !!med;
    openModal(`
        <h3>${isEdit ? 'Edit' : 'Add'} Medicine</h3>
        <form id="medicine-form">
            <div class="form-row">
                <div class="form-group"><label>Name *</label><input type="text" id="med-name" required value="${med?.name || ''}"/></div>
                <div class="form-group"><label>Company</label><input type="text" id="med-company" value="${med?.company || ''}"/></div>
            </div>
            <div class="form-row-3">
                <div class="form-group"><label>Batch *</label><input type="text" id="med-batch" required value="${med?.batch || ''}"/></div>
                <div class="form-group"><label>HSN Code</label><input type="text" id="med-hsn" value="${med?.hsn || ''}"/></div>
                <div class="form-group"><label>Category</label><input type="text" id="med-category" value="${med?.category || 'General'}"/></div>
            </div>
            <div class="form-row-3">
                <div class="form-group"><label>MRP (₹)</label><input type="number" step="0.01" id="med-mrp" value="${med?.mrp || 0}"/></div>
                <div class="form-group"><label>Purchase Price</label><input type="number" step="0.01" id="med-pp" value="${med?.purchaseprice || 0}"/></div>
                <div class="form-group"><label>Stock</label><input type="number" id="med-stock" value="${med?.stock || 0}"/></div>
            </div>
            <div class="form-row-3">
                <div class="form-group"><label>Expiry Date</label><input type="date" id="med-expiry" value="${med?.expirydate || ''}"/></div>
                <div class="form-group"><label>GST Rate (%)</label><input type="number" id="med-gst" value="${med?.gstrate || 12}"/></div>
                <div class="form-group"><label>Reorder Level</label><input type="number" id="med-reorder" value="${med?.reorderlevel || 10}"/></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Rack No</label><input type="text" id="med-rack" value="${med?.rackno || ''}"/></div>
                <div class="form-group"><label>Schedule</label>
                    <select id="med-schedule">
                        <option value="None" ${(!med?.schedule || med?.schedule === 'None') ? 'selected' : ''}>None</option>
                        <option value="H" ${med?.schedule === 'H' ? 'selected' : ''}>H</option>
                        <option value="H1" ${med?.schedule === 'H1' ? 'selected' : ''}>H1</option>
                        <option value="X" ${med?.schedule === 'X' ? 'selected' : ''}>X</option>
                    </select>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Medicine</button>
            </div>
        </form>
    `);
    document.getElementById('medicine-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('med-name').value,
            company: document.getElementById('med-company').value,
            batch: document.getElementById('med-batch').value,
            hsn: document.getElementById('med-hsn').value,
            category: document.getElementById('med-category').value,
            mrp: parseFloat(document.getElementById('med-mrp').value),
            purchasePrice: parseFloat(document.getElementById('med-pp').value),
            stock: parseInt(document.getElementById('med-stock').value),
            expiryDate: document.getElementById('med-expiry').value,
            gstRate: parseInt(document.getElementById('med-gst').value),
            reorderLevel: parseInt(document.getElementById('med-reorder').value),
            rackNo: document.getElementById('med-rack').value,
            schedule: document.getElementById('med-schedule').value,
        };
        try {
            if (isEdit) { await API.updateMedicine(med.id, data); showToast('Medicine updated', 'success'); }
            else { await API.addMedicine(data); showToast('Medicine added', 'success'); }
            closeModal(); loadInventoryTable();
        } catch (e) { /* toast shown by API */ }
    });
};

window.editMedicine = async function (id) {
    try { const m = await API.getMedicine(id); openMedicineModal(m); } catch (e) { }
};

window.deleteMedicine = async function (id) {
    if (!confirm('Delete this medicine?')) return;
    try { await API.deleteMedicine(id); showToast('Medicine deleted', 'info'); loadInventoryTable(); } catch (e) { }
};
