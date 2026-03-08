/**
 * api.js - MediFlow ERP v2.0
 * API Client with auth token management
 */

window.API = {
    token: localStorage.getItem('mediflow_token') || null,

    setToken(t) { this.token = t; if (t) localStorage.setItem('mediflow_token', t); else localStorage.removeItem('mediflow_token'); },

    async request(url, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        try {
            const res = await fetch(url, { headers, ...options });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'API Error');
            return data;
        } catch (err) {
            console.error('API Error:', err);
            if (typeof showToast === 'function') showToast(err.message, 'error');
            throw err;
        }
    },

    // Auth
    signup: (email, password, name) => API.request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
    login: (email, password) => API.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => API.request('/api/auth/logout', { method: 'POST' }),
    me: () => API.request('/api/auth/me'),

    // Dashboard
    getDashboard: () => API.request('/api/dashboard'),

    // Medicines
    getMedicines: (qs = '') => API.request(`/api/medicines${qs}`),
    getMedicine: (id) => API.request(`/api/medicines/${id}`),
    addMedicine: (d) => API.request('/api/medicines', { method: 'POST', body: JSON.stringify(d) }),
    updateMedicine: (id, d) => API.request(`/api/medicines/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    deleteMedicine: (id) => API.request(`/api/medicines/${id}`, { method: 'DELETE' }),

    // Customers
    getCustomers: (qs = '') => API.request(`/api/customers${qs}`),
    addCustomer: (d) => API.request('/api/customers', { method: 'POST', body: JSON.stringify(d) }),
    updateCustomer: (id, d) => API.request(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    deleteCustomer: (id) => API.request(`/api/customers/${id}`, { method: 'DELETE' }),

    // Suppliers
    getSuppliers: () => API.request('/api/suppliers'),
    addSupplier: (d) => API.request('/api/suppliers', { method: 'POST', body: JSON.stringify(d) }),
    updateSupplier: (id, d) => API.request(`/api/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    deleteSupplier: (id) => API.request(`/api/suppliers/${id}`, { method: 'DELETE' }),

    // Sales
    getSales: () => API.request('/api/sales'),
    addSale: (d) => API.request('/api/sales', { method: 'POST', body: JSON.stringify(d) }),

    // Purchases
    getPurchases: () => API.request('/api/purchases'),
    addPurchase: (d) => API.request('/api/purchases', { method: 'POST', body: JSON.stringify(d) }),

    // Reports
    getSalesReport: (f, t) => API.request(`/api/reports/sales?from=${f || ''}&to=${t || ''}`),
    getPurchaseReport: (f, t) => API.request(`/api/reports/purchases?from=${f || ''}&to=${t || ''}`),
    getStockReport: () => API.request('/api/reports/stock'),
    getExpiryReport: (d) => API.request(`/api/reports/expiry?days=${d}`),
    getProfitLoss: (f, t) => API.request(`/api/reports/profitloss?from=${f || ''}&to=${t || ''}`),

    // Settings
    getSettings: () => API.request('/api/settings'),
    saveSettings: (d) => API.request('/api/settings', { method: 'PUT', body: JSON.stringify(d) }),
};

// Toast helper
window.showToast = function (message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px">${icons[type] || icons.info}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 300ms'; setTimeout(() => toast.remove(), 300); }, 3000);
};

// Modal helpers
window.openModal = function (html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
};
window.closeModal = function () {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-content').innerHTML = '';
};

// Format currency
window.fmt = (v) => parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
