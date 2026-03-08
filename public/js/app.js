/**
 * app.js - MediFlow ERP v2.0
 * Auth, Navigation, Dashboard
 */

document.addEventListener('DOMContentLoaded', () => {
    const authOverlay = document.getElementById('auth-overlay');
    const appShell = document.getElementById('app-shell');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // ═══ AUTH TOGGLE ═══
    document.getElementById('show-signup').addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    });
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // ═══ SIGNUP ═══
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('signup-error');
        errEl.classList.add('hidden');
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        try {
            await API.signup(email, password, name);
            showToast('Account created! You can now sign in.', 'success');
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        }
    });

    // ═══ LOGIN ═══
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('login-error');
        errEl.classList.add('hidden');
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        try {
            const result = await API.login(email, password);
            API.setToken(result.session.access_token);
            enterApp(result.user);
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        }
    });

    // ═══ AUTO-LOGIN (if token exists) ═══
    if (API.token) {
        API.me().then(res => enterApp(res.user)).catch(() => { API.setToken(null); });
    }

    // ═══ ENTER APP ═══
    function enterApp(user) {
        authOverlay.classList.add('hidden');
        appShell.classList.remove('hidden');
        const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin';
        document.getElementById('user-display-name').textContent = displayName;
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        navigateTo('dashboard');
    }

    // ═══ LOGOUT ═══
    document.getElementById('btn-logout').addEventListener('click', async () => {
        try { await API.logout(); } catch (e) { /* ignore */ }
        API.setToken(null);
        authOverlay.classList.remove('hidden');
        appShell.classList.add('hidden');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });

    // ═══ NAVIGATION ═══
    const navItems = document.querySelectorAll('.nav-item');
    const titles = { dashboard: 'Dashboard', pos: 'Point of Sale', inventory: 'Inventory Management', customers: 'Customer Management', purchases: 'Purchase Management', reports: 'Reports & Analytics', settings: 'Settings' };

    window.navigateTo = function (page) {
        navItems.forEach(n => n.classList.toggle('active', n.dataset.page === page));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page-${page}`);
        if (target) target.classList.add('active');
        document.getElementById('page-title').textContent = titles[page] || page;

        // Trigger render for each page
        if (page === 'dashboard') renderDashboard();
        if (page === 'inventory' && typeof renderInventory === 'function') renderInventory();
        if (page === 'customers' && typeof renderCustomers === 'function') renderCustomers();
        if (page === 'purchases' && typeof renderPurchases === 'function') renderPurchases();
        if (page === 'reports' && typeof renderReports === 'function') renderReports();
        if (page === 'settings' && typeof renderSettings === 'function') renderSettings();
        if (page === 'pos' && typeof renderPOS === 'function') renderPOS();
    };

    navItems.forEach(n => n.addEventListener('click', (e) => { e.preventDefault(); navigateTo(n.dataset.page); }));

    // Mobile menu
    document.getElementById('btn-menu')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

    // ═══ DASHBOARD ═══
    async function renderDashboard() {
        const page = document.getElementById('page-dashboard');
        page.innerHTML = '<p style="color:var(--text-muted)">Loading dashboard...</p>';
        try {
            const d = await API.getDashboard();
            page.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon blue"><span class="material-symbols-outlined">payments</span></div>
                        <div><div class="stat-value">₹${fmt(d.totalSalesRevenue)}</div><div class="stat-label">Today's Sales (${d.salesCount} invoices)</div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon green"><span class="material-symbols-outlined">shopping_cart</span></div>
                        <div><div class="stat-value">₹${fmt(d.totalPurchaseValue)}</div><div class="stat-label">Today's Purchases (${d.purchaseCount})</div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon amber"><span class="material-symbols-outlined">inventory</span></div>
                        <div><div class="stat-value">${d.lowStockCount}</div><div class="stat-label">Low Stock Items</div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon red"><span class="material-symbols-outlined">schedule</span></div>
                        <div><div class="stat-value">${d.expiringCount}</div><div class="stat-label">Expiring Soon (30 days)</div></div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                    <div class="card">
                        <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:1rem">Recent Sales</h3>
                        <div id="dash-recent-sales"></div>
                    </div>
                    <div class="card">
                        <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:1rem">Low Stock Alerts</h3>
                        <div id="dash-low-stock"></div>
                    </div>
                </div>
            `;

            // Recent sales
            const salesDiv = document.getElementById('dash-recent-sales');
            if (!d.recentSales || d.recentSales.length === 0) {
                salesDiv.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No recent sales</p>';
            } else {
                salesDiv.innerHTML = d.recentSales.map(s => `
                    <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border);font-size:0.85rem">
                        <div><span class="text-bold">${s.invoiceno || s.invoiceNo || '--'}</span><br><span style="color:var(--text-muted);font-size:0.75rem">${s.customername || s.customerName || 'Walk-in'}</span></div>
                        <div style="text-align:right"><span class="text-bold">₹${fmt(s.nettotal || s.netTotal)}</span><br><span style="color:var(--text-muted);font-size:0.75rem">${s.paymentmode || s.paymentMode || 'Cash'}</span></div>
                    </div>
                `).join('');
            }

            // Low stock
            const stockDiv = document.getElementById('dash-low-stock');
            if (!d.lowStockItems || d.lowStockItems.length === 0) {
                stockDiv.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">All items are well stocked!</p>';
            } else {
                stockDiv.innerHTML = d.lowStockItems.map(m => `
                    <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border);font-size:0.85rem">
                        <span>${m.name}</span>
                        <span class="${m.stock === 0 ? 'text-red' : 'text-amber'}" style="font-weight:700">${m.stock} left</span>
                    </div>
                `).join('');
            }
        } catch (err) {
            page.innerHTML = `<div class="card"><p style="color:var(--danger)">Failed to load dashboard: ${err.message}</p></div>`;
        }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        const map = { F1: 'dashboard', F2: 'pos', F3: 'inventory', F4: 'customers', F5: 'purchases', F6: 'reports', F7: 'settings' };
        if (map[e.key] && !authOverlay.classList.contains('hidden') === false) {
            e.preventDefault();
            navigateTo(map[e.key]);
        }
    });
});
