/**
 * customers.js - MediFlow ERP v2.0
 * Customer CRUD
 */

window.renderCustomers = async function () {
    const page = document.getElementById('page-customers');
    page.innerHTML = `
        <div class="page-header">
            <h3>Customer Management</h3>
            <button class="btn btn-primary" onclick="openCustomerModal()">
                <span class="material-symbols-outlined">person_add</span> Add Customer
            </button>
        </div>
        <div class="toolbar">
            <input type="text" id="cust-search" placeholder="Search customers..." oninput="loadCustomerTable()"/>
        </div>
        <div class="table-responsive"><div class="table-wrap">
            <table>
                <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Total Purchases</th><th>Balance</th><th>Actions</th></tr></thead>
                <tbody id="cust-tbody"><tr><td colspan="6" class="table-empty">Loading...</td></tr></tbody>
            </table>
        </div></div>
    `;
    loadCustomerTable();
};

window.loadCustomerTable = async function () {
    const tbody = document.getElementById('cust-tbody');
    const q = document.getElementById('cust-search')?.value || '';
    const qs = q ? `?search=${encodeURIComponent(q)}` : '';
    try {
        const custs = await API.getCustomers(qs);
        if (!custs.length) { tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No customers found</td></tr>'; return; }
        tbody.innerHTML = custs.map(c => `<tr>
            <td class="text-bold">${c.name}</td>
            <td>${c.phone || '--'}</td>
            <td>${c.email || '--'}</td>
            <td>₹${fmt(c.totalpurchases)}</td>
            <td class="${parseFloat(c.balance || 0) > 0 ? 'text-red' : 'text-green'}" style="font-weight:700">₹${fmt(c.balance)}</td>
            <td>
                <button class="btn-icon" onclick="editCustomer(${c.id})" title="Edit"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button>
                <button class="btn-icon" onclick="deleteCustomer(${c.id})" title="Delete"><span class="material-symbols-outlined" style="font-size:18px;color:var(--danger)">delete</span></button>
            </td>
        </tr>`).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Error loading customers</td></tr>'; }
};

window.openCustomerModal = function (cust = null) {
    const isEdit = !!cust;
    openModal(`
        <h3>${isEdit ? 'Edit' : 'Add'} Customer</h3>
        <form id="customer-form">
            <div class="form-row">
                <div class="form-group"><label>Name *</label><input type="text" id="cf-name" required value="${cust?.name || ''}"/></div>
                <div class="form-group"><label>Phone</label><input type="text" id="cf-phone" value="${cust?.phone || ''}"/></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Email</label><input type="email" id="cf-email" value="${cust?.email || ''}"/></div>
                <div class="form-group"><label>Doctor</label><input type="text" id="cf-doctor" value="${cust?.doctor || ''}"/></div>
            </div>
            <div class="form-group"><label>Address</label><textarea id="cf-address" rows="2">${cust?.address || ''}</textarea></div>
            <div class="modal-actions">
                <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'}</button>
            </div>
        </form>
    `);
    document.getElementById('customer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('cf-name').value,
            phone: document.getElementById('cf-phone').value,
            email: document.getElementById('cf-email').value,
            doctor: document.getElementById('cf-doctor').value,
            address: document.getElementById('cf-address').value,
        };
        try {
            if (isEdit) { await API.updateCustomer(cust.id, data); showToast('Customer updated', 'success'); }
            else { await API.addCustomer(data); showToast('Customer added', 'success'); }
            closeModal(); loadCustomerTable();
        } catch (e) { }
    });
};

window.editCustomer = async function (id) {
    try {
        const custs = await API.getCustomers();
        const c = custs.find(x => x.id === id);
        if (c) openCustomerModal(c);
    } catch (e) { }
};

window.deleteCustomer = async function (id) {
    if (!confirm('Delete this customer?')) return;
    try { await API.deleteCustomer(id); showToast('Customer deleted', 'info'); loadCustomerTable(); } catch (e) { }
};
