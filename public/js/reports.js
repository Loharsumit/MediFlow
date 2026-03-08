/**
 * reports.js - MediFlow ERP v2.0
 * Reports with date filters
 */

window.renderReports = function () {
    const page = document.getElementById('page-reports');
    page.innerHTML = `
        <div class="page-header"><h3>Reports & Analytics</h3></div>

        <!-- Report Tabs -->
        <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm rpt-tab active" data-rpt="sales" onclick="switchReport('sales')">Sales Report</button>
            <button class="btn btn-ghost btn-sm rpt-tab" data-rpt="purchases" onclick="switchReport('purchases')">Purchase Report</button>
            <button class="btn btn-ghost btn-sm rpt-tab" data-rpt="stock" onclick="switchReport('stock')">Stock Report</button>
            <button class="btn btn-ghost btn-sm rpt-tab" data-rpt="expiry" onclick="switchReport('expiry')">Expiry Report</button>
            <button class="btn btn-ghost btn-sm rpt-tab" data-rpt="pnl" onclick="switchReport('pnl')">Profit & Loss</button>
        </div>

        <div id="rpt-content"></div>
    `;
    switchReport('sales');
};

window.switchReport = function (type) {
    document.querySelectorAll('.rpt-tab').forEach(t => {
        t.classList.toggle('btn-primary', t.dataset.rpt === type);
        t.classList.toggle('btn-ghost', t.dataset.rpt !== type);
        t.classList.toggle('active', t.dataset.rpt === type);
    });

    const cont = document.getElementById('rpt-content');

    if (type === 'sales') {
        cont.innerHTML = `
            <div class="toolbar">
                <input type="date" id="rpt-from"/>
                <input type="date" id="rpt-to"/>
                <button class="btn btn-primary btn-sm" onclick="genSalesReport()">Generate</button>
            </div>
            <div class="stats-grid" id="rpt-stats" style="margin-bottom:1rem"></div>
            <div class="table-wrap"><table>
                <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Payment</th><th>Subtotal</th><th>GST</th><th>Net Total</th></tr></thead>
                <tbody id="rpt-tbody"><tr><td colspan="7" class="table-empty">Select date range and click Generate</td></tr></tbody>
            </table></div>
        `;
    } else if (type === 'purchases') {
        cont.innerHTML = `
            <div class="toolbar">
                <input type="date" id="rpt-pfrom"/>
                <input type="date" id="rpt-pto"/>
                <button class="btn btn-primary btn-sm" onclick="genPurchaseReport()">Generate</button>
            </div>
            <div class="table-wrap"><table>
                <thead><tr><th>Purchase #</th><th>Date</th><th>Supplier Inv</th><th>Total</th></tr></thead>
                <tbody id="rpt-ptbody"><tr><td colspan="4" class="table-empty">Select date range and click Generate</td></tr></tbody>
            </table></div>
        `;
    } else if (type === 'stock') {
        cont.innerHTML = `
            <div class="toolbar"><button class="btn btn-primary btn-sm" onclick="genStockReport()">Load Stock Report</button></div>
            <div class="table-wrap"><table>
                <thead><tr><th>Name</th><th>Batch</th><th>Stock</th><th>Reorder</th><th>MRP</th><th>Status</th></tr></thead>
                <tbody id="rpt-stbody"><tr><td colspan="6" class="table-empty">Click to load</td></tr></tbody>
            </table></div>
        `;
    } else if (type === 'expiry') {
        cont.innerHTML = `
            <div class="toolbar">
                <input type="number" id="rpt-days" value="30" placeholder="Days" style="width:100px"/>
                <button class="btn btn-primary btn-sm" onclick="genExpiryReport()">Generate</button>
            </div>
            <div class="table-wrap"><table>
                <thead><tr><th>Name</th><th>Batch</th><th>Expiry</th><th>Stock</th><th>MRP</th></tr></thead>
                <tbody id="rpt-etbody"><tr><td colspan="5" class="table-empty">Click Generate</td></tr></tbody>
            </table></div>
        `;
    } else if (type === 'pnl') {
        cont.innerHTML = `
            <div class="toolbar">
                <input type="date" id="rpt-pnlf"/>
                <input type="date" id="rpt-pnlt"/>
                <button class="btn btn-primary btn-sm" onclick="genPnlReport()">Generate</button>
            </div>
            <div id="rpt-pnl-result" class="card" style="margin-top:1rem"><p style="color:var(--text-muted)">Select date range and click Generate</p></div>
        `;
    }
};

window.genSalesReport = async function () {
    const from = document.getElementById('rpt-from').value;
    const to = document.getElementById('rpt-to').value;
    const tbody = document.getElementById('rpt-tbody');
    const stats = document.getElementById('rpt-stats');
    try {
        const d = await API.getSalesReport(from, to);
        stats.innerHTML = `
            <div class="stat-card"><div class="stat-icon blue"><span class="material-symbols-outlined">receipt</span></div><div><div class="stat-value">${d.count}</div><div class="stat-label">Total Invoices</div></div></div>
            <div class="stat-card"><div class="stat-icon green"><span class="material-symbols-outlined">payments</span></div><div><div class="stat-value">₹${fmt(d.totalRevenue)}</div><div class="stat-label">Total Revenue</div></div></div>
            <div class="stat-card"><div class="stat-icon amber"><span class="material-symbols-outlined">account_balance</span></div><div><div class="stat-value">₹${fmt(d.totalGst)}</div><div class="stat-label">Total GST</div></div></div>
        `;
        if (!d.sales || !d.sales.length) { tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No sales in this range</td></tr>'; return; }
        tbody.innerHTML = d.sales.map(s => `<tr>
            <td class="text-bold">${s.invoiceno || s.invoiceNo}</td>
            <td>${new Date(s.date).toLocaleDateString('en-IN')}</td>
            <td>${s.customername || s.customerName || 'Walk-in'}</td>
            <td><span class="badge badge-${(s.paymentmode || s.paymentMode) === 'Cash' ? 'green' : 'blue'}">${s.paymentmode || s.paymentMode || 'Cash'}</span></td>
            <td>₹${fmt(s.subtotal)}</td>
            <td>₹${fmt(parseFloat(s.cgst || 0) + parseFloat(s.sgst || 0))}</td>
            <td class="text-bold">₹${fmt(s.nettotal || s.netTotal)}</td>
        </tr>`).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Error loading report</td></tr>'; }
};

window.genPurchaseReport = async function () {
    const from = document.getElementById('rpt-pfrom').value;
    const to = document.getElementById('rpt-pto').value;
    const tbody = document.getElementById('rpt-ptbody');
    try {
        const d = await API.getPurchaseReport(from, to);
        if (!d.purchases || !d.purchases.length) { tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No purchases in this range</td></tr>'; return; }
        tbody.innerHTML = d.purchases.map(p => `<tr>
            <td class="text-bold">${p.purchaseno || '--'}</td>
            <td>${p.date ? new Date(p.date).toLocaleDateString('en-IN') : '--'}</td>
            <td>${p.supplierinvno || '--'}</td>
            <td class="text-bold">₹${fmt(p.total)}</td>
        </tr>`).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Error loading report</td></tr>'; }
};

window.genStockReport = async function () {
    const tbody = document.getElementById('rpt-stbody');
    try {
        const d = await API.getStockReport();
        if (!d.length) { tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No stock data</td></tr>'; return; }
        tbody.innerHTML = d.map(m => {
            const status = m.stock === 0 ? 'Out' : m.stock <= (m.reorderlevel || 10) ? 'Low' : 'OK';
            const cls = status === 'Out' ? 'red' : status === 'Low' ? 'amber' : 'green';
            return `<tr>
                <td class="text-bold">${m.name}</td><td>${m.batch}</td>
                <td class="text-${cls}" style="font-weight:700">${m.stock}</td>
                <td>${m.reorderlevel || 10}</td><td>₹${fmt(m.mrp)}</td>
                <td><span class="badge badge-${cls}">${status}</span></td>
            </tr>`;
        }).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Error</td></tr>'; }
};

window.genExpiryReport = async function () {
    const days = document.getElementById('rpt-days').value;
    const tbody = document.getElementById('rpt-etbody');
    try {
        const d = await API.getExpiryReport(days);
        if (!d.length) { tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No expiring items</td></tr>'; return; }
        tbody.innerHTML = d.map(m => `<tr>
            <td class="text-bold">${m.name}</td><td>${m.batch}</td>
            <td class="text-amber">${m.expirydate || m.expiryDate || '--'}</td>
            <td>${m.stock}</td><td>₹${fmt(m.mrp)}</td>
        </tr>`).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Error</td></tr>'; }
};

window.genPnlReport = async function () {
    const from = document.getElementById('rpt-pnlf').value;
    const to = document.getElementById('rpt-pnlt').value;
    const result = document.getElementById('rpt-pnl-result');
    try {
        const d = await API.getProfitLoss(from, to);
        const profit = (d.totalSales || 0) - (d.totalPurchases || 0);
        result.innerHTML = `
            <div class="stats-grid" style="margin-bottom:0">
                <div class="stat-card"><div class="stat-icon green"><span class="material-symbols-outlined">trending_up</span></div><div><div class="stat-value">₹${fmt(d.totalSales)}</div><div class="stat-label">Total Sales</div></div></div>
                <div class="stat-card"><div class="stat-icon red"><span class="material-symbols-outlined">trending_down</span></div><div><div class="stat-value">₹${fmt(d.totalPurchases)}</div><div class="stat-label">Total Purchases</div></div></div>
                <div class="stat-card"><div class="stat-icon ${profit >= 0 ? 'green' : 'red'}"><span class="material-symbols-outlined">${profit >= 0 ? 'savings' : 'money_off'}</span></div><div><div class="stat-value ${profit >= 0 ? 'text-green' : 'text-red'}">₹${fmt(Math.abs(profit))}</div><div class="stat-label">${profit >= 0 ? 'Net Profit' : 'Net Loss'}</div></div></div>
            </div>
        `;
    } catch (e) { result.innerHTML = '<p style="color:var(--danger)">Error generating report</p>'; }
};
