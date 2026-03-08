/**
 * settings.js - MediFlow ERP v2.0
 * Settings management
 */

window.renderSettings = async function () {
    const page = document.getElementById('page-settings');
    page.innerHTML = '<p style="color:var(--text-muted)">Loading settings...</p>';
    try {
        const settings = await API.getSettings();
        const get = (key) => {
            if (Array.isArray(settings)) { const s = settings.find(x => x.key === key); return s?.value || ''; }
            return settings[key] || '';
        };
        page.innerHTML = `
            <div class="page-header"><h3>Application Settings</h3></div>
            <div class="card" style="max-width:600px">
                <form id="settings-form">
                    <div class="form-group"><label>Store Name</label><input type="text" id="set-store" value="${get('storeName')}"/></div>
                    <div class="form-row">
                        <div class="form-group"><label>Phone</label><input type="text" id="set-phone" value="${get('phone')}"/></div>
                        <div class="form-group"><label>GSTIN</label><input type="text" id="set-gstin" value="${get('gstin')}"/></div>
                    </div>
                    <div class="form-group"><label>Address</label><textarea id="set-address" rows="2">${get('address')}</textarea></div>
                    <div class="form-row">
                        <div class="form-group"><label>Drug License No</label><input type="text" id="set-dl" value="${get('drugLicense')}"/></div>
                        <div class="form-group"><label>Invoice Prefix</label><input type="text" id="set-prefix" value="${get('invoicePrefix') || 'INV'}"/></div>
                    </div>
                    <div class="modal-actions" style="justify-content:flex-start">
                        <button type="submit" class="btn btn-primary"><span class="material-symbols-outlined">save</span> Save Settings</button>
                    </div>
                </form>
            </div>
        `;
        document.getElementById('settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                storeName: document.getElementById('set-store').value,
                phone: document.getElementById('set-phone').value,
                gstin: document.getElementById('set-gstin').value,
                address: document.getElementById('set-address').value,
                drugLicense: document.getElementById('set-dl').value,
                invoicePrefix: document.getElementById('set-prefix').value,
            };
            try { await API.saveSettings(data); showToast('Settings saved!', 'success'); } catch (e) { }
        });
    } catch (e) {
        page.innerHTML = '<div class="card"><p style="color:var(--danger)">Error loading settings</p></div>';
    }
};
