const fs = require('fs');

const dashHtml = fs.readFileSync('public/stitch_desk_v2.html', 'utf8');
const posHtml = fs.readFileSync('public/stitch_pos_v2.html', 'utf8');
const invHtml = fs.readFileSync('public/stitch_inv_v2.html', 'utf8');

// Extract the dashboard body parts
const sidebarMatch = dashHtml.match(/<aside[^>]*>([\s\S]*?)<\/aside>/);
const headerMatch = dashHtml.match(/<header[^>]*>([\s\S]*?)<\/header>/);
const mainDashMatch = dashHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/);

// Extract the POS main content part
const mainPosMatch = posHtml.match(/<div class="flex-1 flex overflow-hidden">([\s\S]*?)<\/div>\s*<\/main>/);
const posContent = mainPosMatch ? mainPosMatch[1] : '';

// Extract the Inventory main content part
const mainInvMatch = invHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/);

const newIndex = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>MediFlow ERP</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
    <style type="text/tailwindcss">
        :root {
            --brand-primary: #1e40af;
            --brand-secondary: #0f172a;
            --accent-teal: #0d9488;
            --sidebar-width: 240px;
        }
    </style>
    <script>
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#1e40af",
                        "slate-accent": "#0f172a",
                        "teal-accent": "#0d9488",
                        "background-dark": "#020617",
                        "surface-dark": "#0f172a",
                    },
                    fontFamily: {
                        "sans": ["Inter", "sans-serif"]
                    }
                },
            },
        }
    </script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
        .dark body { background-color: #020617; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 10px; }
        
        .page-content { display: none; }
        .page-content.active { display: block; }
        
        /* Toast styles */
        #toast-container { position: fixed; top: 1rem; right: 1rem; z-index: 9999; }
        .toast { padding: 1rem; margin-bottom: 0.5rem; border-radius: 0.5rem; color: white; opacity: 0; transition: opacity 0.3s; }
        .toast.show { opacity: 1; }
        .toast.success { background-color: #059669; }
        .toast.error { background-color: #dc2626; }
        .toast.info { background-color: #2563eb; }
    </style>
</head>
<body class="text-slate-900 dark:text-slate-100 flex min-h-screen overflow-hidden">
    
    <!-- Login Overlay -->
    <div id="auth-overlay" class="fixed inset-0 bg-background-dark z-[100] flex items-center justify-center">
        <div class="bg-surface-dark p-8 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-md">
            <div class="flex items-center gap-3 justify-center mb-8">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-900/20">
                    <span class="material-symbols-outlined text-2xl">medical_services</span>
                </div>
                <h1 class="text-3xl font-bold text-white tracking-tight">MediFlow <span class="text-blue-500">ERP</span></h1>
            </div>
            <form id="login-form" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Username</label>
                    <input type="text" id="username" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" required value="admin">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Password</label>
                    <input type="password" id="password" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" required value="admin">
                </div>
                <div id="login-error" class="text-red-500 text-sm hidden">Invalid credentials</div>
                <button type="submit" class="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-6">
                    Secure Login
                </button>
            </form>
        </div>
    </div>

    <!-- Sidebar -->
    <aside class="hidden lg:flex w-[var(--sidebar-width)] flex-col bg-slate-accent border-r border-slate-800 fixed h-full z-30">
        ${sidebarMatch ? sidebarMatch[1] : ''}
    </aside>

    <div class="flex-1 lg:ml-[var(--sidebar-width)] flex flex-col h-screen max-w-full min-w-0">
        <!-- Header -->
        <header class="sticky top-0 z-20 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
            ${headerMatch ? headerMatch[1] : ''}
        </header>

        <!-- Main Content -->
        <main id="views-container" class="flex-1 overflow-y-auto overflow-x-hidden relative">
            
            <div id="dashboard-view" class="page-content active p-6">
                ${mainDashMatch ? mainDashMatch[1] : ''}
            </div>
            
            <div id="pos-view" class="page-content h-full">
                <div class="flex h-full w-full">
                    ${posContent}
                </div>
            </div>
            
            <div id="inventory-view" class="page-content p-6 max-w-[1440px] mx-auto">
                ${mainInvMatch ? mainInvMatch[1] : ''}
            </div>

            <!-- Placeholders for the rest -->
            <div id="purchases-view" class="page-content p-6">
                <h2 class="text-2xl font-bold mb-4">Purchases</h2>
                <div id="purchases-list" class="bg-surface-dark p-6 rounded-xl border border-slate-800"></div>
            </div>

            <div id="customers-view" class="page-content p-6">
                <h2 class="text-2xl font-bold mb-4">Customers</h2>
                <div id="customers-list" class="bg-surface-dark p-6 rounded-xl border border-slate-800"></div>
            </div>

            <div id="reports-view" class="page-content p-6">
                <h2 class="text-2xl font-bold mb-4">Reports</h2>
                <div id="reports-content" class="bg-surface-dark p-6 rounded-xl border border-slate-800"></div>
            </div>

            <div id="settings-view" class="page-content p-6">
                <h2 class="text-2xl font-bold mb-4">Settings</h2>
                <div class="bg-surface-dark p-6 rounded-xl border border-slate-800">
                    <form id="settings-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-bold text-slate-400">Store Name</label>
                            <input type="text" id="store-name" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white mt-1">
                        </div>
                        <button type="submit" class="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">Save Settings</button>
                    </form>
                </div>
            </div>

        </main>
    </div>

    <div id="toast-container"></div>

    <script src="js/api.js"></script>
    <script src="js/app.js"></script>
    <script src="js/inventory.js"></script>
    <script src="js/customers.js"></script>
    <script src="js/purchases.js"></script>
    <script src="js/reports.js"></script>
    <script src="js/settings.js"></script>
    <script src="js/pos.js"></script>
    
</body>
</html>`;

fs.writeFileSync('public/index_new.html', newIndex);
console.log('Successfully generated index_new.html');
