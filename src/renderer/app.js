// Shared inline SVG icons (line-icon style)
const ICONS = {
    view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    remove: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
};

function actionBtn(cls, title, onclick, icon) {
    return `<button class="btn-icon ${cls}" title="${title}" onclick="${onclick}">${icon}</button>`;
}

function statusBadge(label, cls) {
    return `<span class="status-badge ${cls}"><span class="dot"></span>${escapeHtml(label)}</span>`;
}

// ==================== Pagination ====================
// Shared client-side pagination for data tables. Wraps an existing render*Table(rows)
// function: slices the full dataset to the current page and re-renders the pagination
// bar. Does NOT touch export/report code — those always query the full dataset fresh
// via IPC, independent of whatever page is on screen.
const PAGE_SIZE_DEFAULT = 15;
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100];
const paginationState = {};

function getPaginationState(tableKey) {
    if (!paginationState[tableKey]) {
        paginationState[tableKey] = { page: 1, pageSize: PAGE_SIZE_DEFAULT };
    }
    return paginationState[tableKey];
}

// Slice fullData to the current page, render the rows via renderRowsFn, and draw controls.
// Pass resetPage=true whenever fullData is a fresh load or a new search/filter result.
function renderPaginatedTable(tableKey, fullData, renderRowsFn, resetPage) {
    const state = getPaginationState(tableKey);
    if (resetPage) state.page = 1;

    const totalItems = fullData.length;
    const totalPages = Math.max(Math.ceil(totalItems / state.pageSize), 1);
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    const startIdx = (state.page - 1) * state.pageSize;
    const pageData = fullData.slice(startIdx, startIdx + state.pageSize);
    renderRowsFn(pageData);

    renderPaginationControls(tableKey, totalItems, () => renderPaginatedTable(tableKey, fullData, renderRowsFn, false));
}

function renderPaginationControls(tableKey, totalItems, onChange) {
    const el = document.getElementById(`${tableKey}-pagination`);
    if (!el) return;

    if (totalItems === 0) {
        el.innerHTML = '';
        return;
    }

    const state = getPaginationState(tableKey);
    const totalPages = Math.max(Math.ceil(totalItems / state.pageSize), 1);
    const start = (state.page - 1) * state.pageSize + 1;
    const end = Math.min(state.page * state.pageSize, totalItems);

    el.innerHTML = `
        <div class="pagination-info">Showing <b>${start}–${end}</b> of <b>${totalItems}</b></div>
        <div class="pagination-controls">
            <select class="pagination-size" title="Rows per page">
                ${PAGE_SIZE_OPTIONS.map(n => `<option value="${n}" ${n === state.pageSize ? 'selected' : ''}>${n} / page</option>`).join('')}
            </select>
            <button type="button" class="pagination-btn" data-action="first" ${state.page === 1 ? 'disabled' : ''} title="First page">&laquo;</button>
            <button type="button" class="pagination-btn" data-action="prev" ${state.page === 1 ? 'disabled' : ''} title="Previous page">&lsaquo;</button>
            <span class="pagination-page">${state.page} / ${totalPages}</span>
            <button type="button" class="pagination-btn" data-action="next" ${state.page === totalPages ? 'disabled' : ''} title="Next page">&rsaquo;</button>
            <button type="button" class="pagination-btn" data-action="last" ${state.page === totalPages ? 'disabled' : ''} title="Last page">&raquo;</button>
        </div>
    `;

    el.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            const action = btn.dataset.action;
            if (action === 'first') state.page = 1;
            else if (action === 'prev') state.page = Math.max(1, state.page - 1);
            else if (action === 'next') state.page = Math.min(totalPages, state.page + 1);
            else if (action === 'last') state.page = totalPages;
            onChange();
        });
    });

    const sizeSelect = el.querySelector('.pagination-size');
    if (sizeSelect) {
        sizeSelect.addEventListener('change', () => {
            state.pageSize = parseInt(sizeSelect.value, 10) || PAGE_SIZE_DEFAULT;
            state.page = 1;
            onChange();
        });
    }
}

// Application State
let currentData = {
    items: [],
    centers: [],
    gnDivisions: [],
    incoming: [],
    donations: [],
    outgoing: [],
    incomingBills: [],
    donationBills: [],
    outgoingBills: [],
    carePackageTemplates: [],
    carePackageIssues: [],
    currentStock: [],
    lowStock: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeSidebar();
    initializeTheme();
    initializeGlobalSearch();
    initializeEventListeners();
    loadDashboard();

    // Pre-load frequently used data in background to prevent UI blocking
    preloadCommonData();
});

// Pre-load common data asynchronously
async function preloadCommonData() {
    try {
        // Load items and centers in parallel for faster modal opening
        if (currentData.items.length === 0 || currentData.centers.length === 0 || currentData.gnDivisions.length === 0) {
            const [items, centers, gnDivisions] = await Promise.all([
                currentData.items.length === 0 ? window.api.items.getActive() : Promise.resolve(currentData.items),
                currentData.centers.length === 0 ? window.api.centers.getActive() : Promise.resolve(currentData.centers),
                currentData.gnDivisions.length === 0 ? window.api.gnDivisions.getActive() : Promise.resolve(currentData.gnDivisions)
            ]);
            
            if (currentData.items.length === 0) currentData.items = items || [];
            if (currentData.centers.length === 0) currentData.centers = centers || [];
            if (currentData.gnDivisions.length === 0) currentData.gnDivisions = gnDivisions || [];
        }
    } catch (error) {
        console.error('Error preloading data:', error);
        // Don't show notification, this is background loading
    }

    // Load app version for About section (safe fallback to existing content)
    try {
        const verEl = document.getElementById('app-version');
        if (verEl && window.api && window.api.app && window.api.app.getVersion) {
            const ver = await window.api.app.getVersion();
            if (ver) verEl.textContent = ver;
        }
    } catch (err) {
        console.error('Failed to load app version:', err);
    }
}

// Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageName = item.getAttribute('data-page');
            switchPage(pageName);
        });
    });
}

// Sidebar Toggle
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    const applyCollapsedUI = (collapsed) => {
        sidebar.classList.toggle('collapsed', collapsed);
        document.getElementById('collapseIconLeft').style.display = collapsed ? 'none' : '';
        document.getElementById('collapseIconRight').style.display = collapsed ? '' : 'none';
        sidebarToggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
        const status = document.getElementById('sidebarStatus');
        status.title = collapsed ? 'Offline · Local DB' : '';
    };

    sidebarToggle.addEventListener('click', () => {
        const collapsed = !sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', collapsed);
        applyCollapsedUI(collapsed);
    });

    // Restore sidebar state
    applyCollapsedUI(localStorage.getItem('sidebarCollapsed') === 'true');
}

// Theme Toggle
function initializeTheme() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const moonIcon = document.getElementById('themeIconMoon');
    const sunIcon = document.getElementById('themeIconSun');

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            moonIcon.style.display = '';
            sunIcon.style.display = 'none';
        } else {
            document.documentElement.removeAttribute('data-theme');
            moonIcon.style.display = 'none';
            sunIcon.style.display = '';
        }
    };

    themeToggleBtn.addEventListener('click', () => {
        const current = localStorage.getItem('dmc-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('dmc-theme', next);
        applyTheme(next);
        // Chart colors are resolved to hex at render time — re-render if visible
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav && activeNav.getAttribute('data-page') === 'analytics') {
            loadAnalytics();
        }
    });

    applyTheme(localStorage.getItem('dmc-theme') === 'dark' ? 'dark' : 'light');
}

// Global per-page search
function initializeGlobalSearch() {
    const input = document.getElementById('global-search');
    input.addEventListener('input', () => {
        const term = input.value.toLowerCase();
        const page = document.querySelector('.nav-item.active').getAttribute('data-page');
        applyGlobalSearch(page, term);
    });
}

function applyGlobalSearch(page, term) {
    switch (page) {
        case 'current-stock': {
            const filtered = currentData.currentStock.filter(item =>
                item.Item_Name.toLowerCase().includes(term) || item.Category.toLowerCase().includes(term));
            renderPaginatedTable('current-stock', filtered, renderCurrentStockTable, true);
            break;
        }
        case 'items': {
            const filtered = currentData.items.filter(i =>
                String(i.Item_ID).includes(term) || i.Item_Name.toLowerCase().includes(term) ||
                i.Category.toLowerCase().includes(term) || i.Unit_Measure.toLowerCase().includes(term));
            renderPaginatedTable('items', filtered, renderItemsTable, true);
            break;
        }
        case 'centers': {
            const filtered = currentData.centers.filter(c =>
                c.Center_Name.toLowerCase().includes(term) ||
                (c.GN_Division_Name || '').toLowerCase().includes(term) ||
                (c.Contact_Person || '').toLowerCase().includes(term));
            renderPaginatedTable('centers', filtered, renderCentersTable, true);
            break;
        }
        case 'gn-divisions': {
            const filtered = currentData.gnDivisions.filter(g =>
                g.GN_Division_Name.toLowerCase().includes(term) || (g.DS_Division || '').toLowerCase().includes(term));
            renderPaginatedTable('gn-divisions', filtered, renderGNDivisionsTable, true);
            break;
        }
        case 'incoming': {
            const filtered = currentData.incomingBills.filter(b =>
                (b.Bill_Number || '').toLowerCase().includes(term) || b.Supplier_Name.toLowerCase().includes(term) ||
                (b.Remarks || '').toLowerCase().includes(term));
            renderPaginatedTable('incoming-bills', filtered, renderIncomingBillsTable, true);
            break;
        }
        case 'donations': {
            const filtered = currentData.donationBills.filter(b =>
                (b.Bill_Number || '').toLowerCase().includes(term) || b.Donor_Name.toLowerCase().includes(term) ||
                (b.Remarks || '').toLowerCase().includes(term));
            renderPaginatedTable('donation-bills', filtered, renderDonationBillsTable, true);
            break;
        }
        case 'outgoing': {
            const filtered = currentData.outgoingBills.filter(b =>
                (b.Bill_Number || '').toLowerCase().includes(term) || b.Center_Name.toLowerCase().includes(term) ||
                b.Officer_Name.toLowerCase().includes(term) || b.Officer_NIC.toLowerCase().includes(term));
            renderPaginatedTable('outgoing-bills', filtered, renderOutgoingBillsTable, true);
            break;
        }
        default:
            break;
    }
}

function switchPage(pageName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');

    // Update title
    const titles = {
        'dashboard': { title: 'Dashboard', sub: 'Overview & low-stock alerts' },
        'current-stock': { title: 'Current Stock', sub: 'Live quantities across all items' },
        'analytics': { title: 'Analytics', sub: 'Summary cards & stock trends' },
        'incoming': { title: 'Incoming Stock', sub: 'Goods received notes (GRN)' },
        'donations': { title: 'Donations', sub: 'Donation bills received' },
        'outgoing': { title: 'Dispatch / Outgoing', sub: 'Dispatch bills to centers' },
        'care-packages': { title: 'Care Packages', sub: 'Templates & issued packages' },
        'items': { title: 'Items Master', sub: 'Item catalogue' },
        'centers': { title: 'Centers Master', sub: 'Protection centers' },
        'gn-divisions': { title: 'GN Divisions', sub: 'Grama Niladhari divisions' },
        'reports': { title: 'Reports', sub: 'Generate PDF & CSV reports' },
        'settings': { title: 'Settings', sub: 'Backup, restore & about' }
    };
    document.getElementById('page-title').textContent = titles[pageName].title;
    document.getElementById('page-subtitle').textContent = titles[pageName].sub;

    // Reset the global search box on navigation
    const searchInput = document.getElementById('global-search');
    if (searchInput) searchInput.value = '';

    // Load page data
    loadPageData(pageName);
}

function loadPageData(pageName) {
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'current-stock':
            loadCurrentStock();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'incoming':
            loadIncomingStock();
            break;
        case 'donations':
            loadDonations();
            break;
        case 'reports':
            loadReportsPage();
            break;
        case 'outgoing':
            loadOutgoingStock();
            break;
        case 'care-packages':
            loadCarePackages();
            break;
        case 'items':
            loadItems();
            break;
        case 'centers':
            loadCenters();
            break;
        case 'gn-divisions':
            loadGNDivisions();
            break;
    }
}

// Event Listeners
function initializeEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        const activePage = document.querySelector('.nav-item.active').getAttribute('data-page');
        loadPageData(activePage);
        showNotification('Data refreshed successfully', 'success');
    });

    // Items
    document.getElementById('addItemBtn').addEventListener('click', showAddItemModal);
    document.getElementById('bulkUploadItemsBtn').addEventListener('click', () => showBulkUploadModal('items'));

    // Centers
    document.getElementById('addCenterBtn').addEventListener('click', showAddCenterModal);
    document.getElementById('bulkUploadCentersBtn').addEventListener('click', () => showBulkUploadModal('centers'));

    // GN Divisions
    document.getElementById('addGNDivisionBtn').addEventListener('click', showAddGNDivisionModal);
    document.getElementById('bulkUploadGNBtn').addEventListener('click', () => showBulkUploadModal('gn'));

    // Care Package Templates
    document.getElementById('addCarePackageTemplateBtn').addEventListener('click', showAddCarePackageTemplateModal);
    
    // Care Package Issues
    document.getElementById('issueCarePackageBtn').addEventListener('click', showIssueCarePackageModal);

    // Care Package Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchCarePackageTab(tabName);
        });
    });

    // Incoming Stock Bills
    document.getElementById('addIncomingBillBtn').addEventListener('click', showAddIncomingBillModal);
    // Export Incoming CSV
    const exportIncomingBtn = document.getElementById('exportIncomingBtn');
    if (exportIncomingBtn) exportIncomingBtn.addEventListener('click', exportIncomingCsv);

    // Donation Bills
    document.getElementById('addDonationBillBtn').addEventListener('click', showAddDonationBillModal);
    // Export Donations CSV
    const exportDonationsBtn = document.getElementById('exportDonationsBtn');
    if (exportDonationsBtn) exportDonationsBtn.addEventListener('click', exportDonationsCsv);

    // Outgoing Stock Bills
    document.getElementById('addOutgoingBillBtn').addEventListener('click', showAddOutgoingBillModal);
    // Export Outgoing CSV
    const exportOutgoingBtn = document.getElementById('exportOutgoingBtn');
    if (exportOutgoingBtn) exportOutgoingBtn.addEventListener('click', exportOutgoingCsv);

    // Settings
    document.getElementById('exportDbBtn').addEventListener('click', exportDatabase);
    document.getElementById('importDbBtn').addEventListener('click', importDatabase);

    // Listen for menu event to open Reports
    if (window.api && window.api.appEvents && window.api.appEvents.onOpenReports) {
        window.api.appEvents.onOpenReports(() => {
            switchPage('reports');
            showNotification('Reports page opened from menu', 'info');
        });
    }

    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });

}

// Dashboard Functions
async function loadDashboard() {
    try {
        const [items, centers, incoming, donations, outgoing, stock, lowStock,
               incomingBills, donationBills, outgoingBills, carePackageIssues] = await Promise.all([
            window.api.items.getActive(),
            window.api.centers.getActive(),
            window.api.incoming.getAll(),
            window.api.donations.getAll(),
            window.api.outgoing.getAll(),
            window.api.stock.getCurrent(),
            window.api.stock.getLowStock(),
            window.api.incoming.bills.getAll(),
            window.api.donations.bills.getAll(),
            window.api.outgoing.bills.getAll(),
            window.api.carePackages.getAllIssues()
        ]);

        currentData = {
            ...currentData, items, centers, incoming, donations, outgoing,
            currentStock: stock, lowStock, incomingBills, donationBills, outgoingBills, carePackageIssues
        };

        // Update stats
        document.getElementById('total-items').textContent = items.length;
        document.getElementById('low-stock-count').textContent = lowStock.length;
        document.getElementById('total-centers').textContent = centers.length;
        document.getElementById('total-transactions').textContent =
            incoming.length + donations.length + outgoing.length;

        // Update low stock table
        renderLowStockTable(lowStock);
        renderRecentActivity(buildRecentActivity(incomingBills, donationBills, outgoingBills, carePackageIssues));
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

function renderLowStockTable(data) {
    const tbody = document.querySelector('#low-stock-table tbody');
    tbody.innerHTML = '';
    const pill = document.getElementById('low-stock-pill');
    if (pill) pill.textContent = `${data.length} item${data.length !== 1 ? 's' : ''} need attention`;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No low stock items</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = `
            <tr>
                <td class="name-cell">${escapeHtml(item.Item_Name)}</td>
                <td class="muted-cell">${escapeHtml(item.Category)}</td>
                <td class="qty-cell" style="color:var(--red)">${Number(item.Current_Quantity).toFixed(2)}</td>
                <td class="mono-cell" style="text-align:right">${item.Reorder_Level}</td>
                <td class="muted-cell">${escapeHtml(item.Unit_Measure)}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Build a merged, recency-sorted activity feed from bills and package issues
function buildRecentActivity(incomingBills, donationBills, outgoingBills, carePackageIssues) {
    const events = [];
    (incomingBills || []).forEach(b => events.push({
        type: 'in',
        text: `${b.Bill_Number} received from ${b.Supplier_Name}`,
        date: b.Created_Date || b.Date_Received
    }));
    (donationBills || []).forEach(b => events.push({
        type: 'gift',
        text: `Donation ${b.Bill_Number} from ${b.Donor_Name}`,
        date: b.Created_Date || b.Date_Received
    }));
    (outgoingBills || []).forEach(b => events.push({
        type: 'out',
        text: `Dispatch ${b.Bill_Number} to ${b.Center_Name} center`,
        date: b.Created_Date || b.Date_Issued
    }));
    (carePackageIssues || []).forEach(i => events.push({
        type: 'pkg',
        text: `Care packages issued × ${i.Packages_Issued} (${i.Package_Name})`,
        date: i.Created_Date || i.Date_Issued
    }));
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    return events.slice(0, 5);
}

function activityIcon(type) {
    const icons = {
        in: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></svg>',
        out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1"/><path d="M14 9h4l4 4v4a1 1 0 0 1-1 1h-1"/><circle cx="7" cy="18" r="2"/><path d="M10 18h4"/><circle cx="18" cy="18" r="2"/></svg>',
        gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/></svg>',
        pkg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 4 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/></svg>'
    };
    return icons[type] || icons.in;
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-GB');
}

function renderRecentActivity(events) {
    const el = document.getElementById('recent-activity-list');
    if (!el) return;
    if (!events.length) {
        el.innerHTML = '<div class="empty-hint">No recent activity</div>';
        return;
    }
    el.innerHTML = events.map(a => `
        <div class="activity-row">
            <span class="activity-icon ${a.type}">${activityIcon(a.type)}</span>
            <div class="activity-text">
                <div class="txt">${escapeHtml(a.text)}</div>
                <div class="time">${timeAgo(a.date)}</div>
            </div>
        </div>
    `).join('');
}

// ==================== Analytics ====================

const CHART_COLOR_VARS = ['--cat-1', '--cat-2', '--cat-3', '--cat-4', '--cat-5', '--cat-6', '--cat-7', '--cat-8'];

function chartColor(index) {
    const varName = CHART_COLOR_VARS[index % CHART_COLOR_VARS.length];
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function formatCompactNumber(n) {
    n = Number(n) || 0;
    const abs = Math.abs(n);
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// Round an axis max up to a clean step (1 / 2 / 5 x 10^n)
function niceMax(value) {
    if (value <= 0) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const residual = value / magnitude;
    let niceResidual;
    if (residual > 5) niceResidual = 10;
    else if (residual > 2) niceResidual = 5;
    else if (residual > 1) niceResidual = 2;
    else niceResidual = 1;
    return niceResidual * magnitude;
}

function truncateLabel(str, max) {
    str = String(str || '');
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

let chartTooltipEl = null;
function getChartTooltip() {
    if (!chartTooltipEl) chartTooltipEl = document.getElementById('chart-tooltip');
    return chartTooltipEl;
}

function showChartTooltip(evt, labelHtml, valueHtml) {
    const tip = getChartTooltip();
    if (!tip) return;
    tip.innerHTML = `<span class="tt-label">${labelHtml}</span><span class="tt-value">${valueHtml}</span>`;
    tip.classList.add('show');
    moveChartTooltip(evt);
}

function moveChartTooltip(evt) {
    const tip = getChartTooltip();
    if (!tip || !tip.classList.contains('show')) return;
    const x = evt.clientX, y = evt.clientY;
    const w = tip.offsetWidth || 120;
    tip.style.left = Math.min(x + 14, window.innerWidth - w - 12) + 'px';
    tip.style.top = Math.max(y - 36, 8) + 'px';
}

function hideChartTooltip() {
    const tip = getChartTooltip();
    if (tip) tip.classList.remove('show');
}

// Horizontal bar chart. data = [{label, value, color?}]
function renderHBarChart(containerId, data, opts = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!data.length) {
        el.innerHTML = '<div class="chart-empty">No data yet</div>';
        return;
    }

    const w = 480;
    const barH = 20;
    const gap = 13;
    const leftPad = opts.leftPad || 120;
    const rightPad = 44;
    const topPad = 4;
    const max = niceMax(Math.max(...data.map(d => d.value), 1));
    const plotW = w - leftPad - rightPad;
    const h = topPad * 2 + data.length * (barH + gap) - gap + 18;

    const gridTicks = 4;
    let gridSvg = '';
    for (let i = 0; i <= gridTicks; i++) {
        const gx = leftPad + (plotW * i) / gridTicks;
        const val = (max * i) / gridTicks;
        gridSvg += `<line class="chart-gridline" x1="${gx}" y1="${topPad}" x2="${gx}" y2="${h - 16}"/>`;
        gridSvg += `<text class="chart-axis-label" x="${gx}" y="${h - 4}" font-size="9.5" text-anchor="middle">${formatCompactNumber(val)}</text>`;
    }

    let bars = '';
    data.forEach((d, i) => {
        const y = topPad + i * (barH + gap);
        const bw = Math.max((d.value / max) * plotW, 2);
        const color = d.color || chartColor(i);
        const fullLabel = escapeHtml(String(d.label));
        const shortLabel = escapeHtml(truncateLabel(d.label, Math.floor(leftPad / 7)));
        const valueText = formatCompactNumber(d.value);
        bars += `
            <text class="chart-axis-label" x="${leftPad - 10}" y="${y + barH / 2 + 4}" font-size="11.5" text-anchor="end">${shortLabel}</text>
            <rect class="chart-bar" data-label="${fullLabel}" data-value="${valueText}"
                x="${leftPad}" y="${y}" width="${bw}" height="${barH}" rx="4" fill="${color}"></rect>
            <text class="chart-value-label" x="${leftPad + bw + 8}" y="${y + barH / 2 + 4}" font-size="11">${valueText}</text>
        `;
    });

    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMinYMin meet">${gridSvg}${bars}</svg>`;
    el.querySelectorAll('.chart-bar').forEach(bar => {
        bar.addEventListener('mousemove', (e) => showChartTooltip(e, bar.dataset.label, bar.dataset.value));
        bar.addEventListener('mouseleave', hideChartTooltip);
    });
}

// Multi-series line chart. months = ['Jan', ...]; series = [{name, color, values:[...]}]
function renderTrendChart(containerId, months, series) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const allValues = series.flatMap(s => s.values);
    if (!allValues.some(v => v > 0)) {
        el.innerHTML = '<div class="chart-empty">No data yet</div>';
        return;
    }

    const w = 480, h = 200, leftPad = 38, rightPad = 12, topPad = 12, bottomPad = 24;
    const plotW = w - leftPad - rightPad;
    const plotH = h - topPad - bottomPad;
    const max = niceMax(Math.max(...allValues, 1));
    const n = months.length;
    const stepX = n > 1 ? plotW / (n - 1) : 0;
    const yFor = v => topPad + plotH - (v / max) * plotH;
    const xFor = i => leftPad + i * stepX;

    let gridSvg = '';
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
        const val = (max * i) / ticks;
        const gy = yFor(val);
        gridSvg += `<line class="chart-gridline" x1="${leftPad}" y1="${gy}" x2="${w - rightPad}" y2="${gy}"/>`;
        gridSvg += `<text class="chart-axis-label" x="${leftPad - 8}" y="${gy + 3}" font-size="9" text-anchor="end">${formatCompactNumber(val)}</text>`;
    }
    let xLabels = '';
    months.forEach((m, i) => {
        xLabels += `<text class="chart-axis-label" x="${xFor(i)}" y="${h - 6}" font-size="10" text-anchor="middle">${escapeHtml(m)}</text>`;
    });

    let linesSvg = '';
    series.forEach(s => {
        const points = s.values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ');
        const areaPoints = `${xFor(0)},${yFor(0)} ${points} ${xFor(n - 1)},${yFor(0)}`;
        linesSvg += `<polygon class="chart-area" points="${areaPoints}" fill="${s.color}"></polygon>`;
        linesSvg += `<polyline class="chart-line" points="${points}" stroke="${s.color}"></polyline>`;
        s.values.forEach((v, i) => {
            linesSvg += `<circle class="chart-dot" data-series="${escapeHtml(s.name)}" data-label="${escapeHtml(months[i])}" data-value="${formatCompactNumber(v)}" cx="${xFor(i)}" cy="${yFor(v)}" r="4" fill="${s.color}"></circle>`;
        });
    });

    const legend = series.map(s =>
        `<span class="chart-legend-item"><span class="chart-legend-line" style="background:${s.color}"></span>${escapeHtml(s.name)}</span>`
    ).join('');

    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMinYMin meet">${gridSvg}${linesSvg}${xLabels}</svg>` +
        `<div class="chart-legend">${legend}</div>`;

    el.querySelectorAll('.chart-dot').forEach(dot => {
        dot.addEventListener('mousemove', (e) => showChartTooltip(e, `${dot.dataset.series} · ${dot.dataset.label}`, dot.dataset.value));
        dot.addEventListener('mouseleave', hideChartTooltip);
    });
}

function sumBillQty(bills) {
    return (bills || []).reduce((a, b) => a + (Number(b.Total_Quantity) || 0), 0);
}

function lastNMonths(n) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-US', { month: 'short' }) });
    }
    return out;
}

function bucketByMonth(bills, months, dateField) {
    const totals = months.map(() => 0);
    (bills || []).forEach(b => {
        const raw = b[dateField];
        if (!raw) return;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return;
        const idx = months.findIndex(m => m.year === d.getFullYear() && m.month === d.getMonth());
        if (idx !== -1) totals[idx] += Number(b.Total_Quantity) || 0;
    });
    return totals;
}

async function loadAnalytics() {
    try {
        const [stock, incomingBills, donationBills, outgoingBills] = await Promise.all([
            window.api.stock.getCurrent(),
            window.api.incoming.bills.getAll(),
            window.api.donations.bills.getAll(),
            window.api.outgoing.bills.getAll()
        ]);
        currentData.currentStock = stock;
        currentData.incomingBills = incomingBills;
        currentData.donationBills = donationBills;
        currentData.outgoingBills = outgoingBills;

        // Summary cards
        const totalStock = stock.reduce((a, i) => a + Math.max(Number(i.Current_Quantity) || 0, 0), 0);
        const categories = new Set(stock.map(i => i.Category)).size;
        const totalReceived = sumBillQty(incomingBills) + sumBillQty(donationBills);
        const totalDispatched = sumBillQty(outgoingBills);
        document.getElementById('an-total-stock').textContent = formatCompactNumber(totalStock);
        document.getElementById('an-categories').textContent = categories;
        document.getElementById('an-total-received').textContent = formatCompactNumber(totalReceived);
        document.getElementById('an-total-dispatched').textContent = formatCompactNumber(totalDispatched);

        // Stock by Category
        const byCategory = {};
        stock.forEach(i => {
            const cat = i.Category || 'Uncategorized';
            byCategory[cat] = (byCategory[cat] || 0) + Math.max(Number(i.Current_Quantity) || 0, 0);
        });
        const categoryData = Object.entries(byCategory)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value);
        renderHBarChart('chart-category', categoryData, { leftPad: 110 });

        // Top Items by Movement (incoming + outgoing quantity)
        const topItems = stock
            .map(i => ({ label: i.Item_Name, value: (Number(i.Total_Incoming) || 0) + (Number(i.Total_Outgoing) || 0) }))
            .filter(i => i.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
        renderHBarChart('chart-top-items', topItems, { leftPad: 130 });

        // Dispatch by Center
        const byCenter = {};
        (outgoingBills || []).forEach(b => {
            const c = b.Center_Name || 'Unknown';
            byCenter[c] = (byCenter[c] || 0) + (Number(b.Total_Quantity) || 0);
        });
        const centerData = Object.entries(byCenter)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
        renderHBarChart('chart-centers', centerData, { leftPad: 150 });

        // Incoming vs Donations vs Outgoing — last 6 months
        const months = lastNMonths(6);
        const incomingSeries = bucketByMonth(incomingBills, months, 'Date_Received');
        const donationSeries = bucketByMonth(donationBills, months, 'Date_Received');
        const outgoingSeries = bucketByMonth(outgoingBills, months, 'Date_Issued');
        renderTrendChart('chart-trend', months.map(m => m.label), [
            { name: 'Incoming', color: chartColor(1), values: incomingSeries },
            { name: 'Donations', color: chartColor(6), values: donationSeries },
            { name: 'Outgoing', color: chartColor(0), values: outgoingSeries }
        ]);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showNotification('Failed to load analytics', 'error');
    }
}

// Current Stock Functions
async function loadCurrentStock() {
    try {
        const stock = await window.api.stock.getCurrent();
        currentData.currentStock = stock;
        renderPaginatedTable('current-stock', stock, renderCurrentStockTable, true);
    } catch (error) {
        console.error('Error loading current stock:', error);
        showNotification('Failed to load current stock', 'error');
    }
}

function renderCurrentStockTable(data) {
    const tbody = document.querySelector('#current-stock-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No stock data available</td></tr>';
        return;
    }

    data.forEach(item => {
        const statusClass = item.Stock_Status === 'Low Stock' ? 'status-low' : 'status-ok';
        const row = `
            <tr>
                <td class="mono-cell">${item.Item_ID}</td>
                <td class="name-cell">${escapeHtml(item.Item_Name)}</td>
                <td class="muted-cell">${escapeHtml(item.Category)}</td>
                <td class="qty-cell">${Number(item.Current_Quantity).toFixed(2)}</td>
                <td class="muted-cell">${escapeHtml(item.Unit_Measure)}</td>
                <td class="mono-cell" style="text-align:right;color:var(--green)">${item.Total_Incoming || 0}</td>
                <td class="mono-cell" style="text-align:right">${item.Total_Outgoing || 0}</td>
                <td class="mono-cell" style="text-align:right">${item.Reorder_Level}</td>
                <td>${statusBadge(item.Stock_Status, statusClass)}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}


// Items Functions
async function loadItems() {
    try {
        const items = await window.api.items.getAll();
        currentData.items = items;
        renderPaginatedTable('items', items, renderItemsTable, true);
    } catch (error) {
        console.error('Error loading items:', error);
        showNotification('Failed to load items', 'error');
    }
}

function renderItemsTable(data) {
    const tbody = document.querySelector('#items-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No items found</td></tr>';
        return;
    }

    data.forEach(item => {
        const statusClass = item.Status === 'Active' ? 'status-active' : 'status-inactive';
        const row = `
            <tr>
                <td class="mono-cell">${item.Item_ID}</td>
                <td class="name-cell">${escapeHtml(item.Item_Name)}</td>
                <td class="muted-cell">${escapeHtml(item.Unit_Measure)}</td>
                <td><span class="chip">${escapeHtml(item.Category)}</span></td>
                <td class="mono-cell" style="text-align:right">${item.Reorder_Level}</td>
                <td>${statusBadge(item.Status, statusClass)}</td>
                <td class="actions"><div class="actions-row">
                    ${actionBtn('btn-edit', 'Edit', `editItem(${item.Item_ID})`, ICONS.edit)}
                    ${item.Status === 'Active' ? actionBtn('btn-delete', 'Delete', `deleteItem(${item.Item_ID})`, ICONS.delete) : ''}
                </div></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function showAddItemModal() {
    const modalBody = `
        <form id="itemForm">
            <div class="form-group">
                <label>Item Name *</label>
                <input type="text" id="itemName" required>
            </div>
            <div class="form-group">
                <label>Unit of Measure *</label>
                <input type="text" id="unitMeasure" placeholder="e.g., KG, Liter, Pieces" required>
            </div>
            <div class="form-group">
                <label>Category *</label>
                <input type="text" id="category" placeholder="e.g., Food, Medical, Clothing" required>
            </div>
            <div class="form-group">
                <label>Reorder Level</label>
                <input type="number" id="reorderLevel" value="0" min="0">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Item</button>
            </div>
        </form>
    `;

    showModal('Add New Item', modalBody);

    document.getElementById('itemForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await window.api.items.add({
                Item_Name: document.getElementById('itemName').value,
                Unit_Measure: document.getElementById('unitMeasure').value,
                Category: document.getElementById('category').value,
                Reorder_Level: parseInt(document.getElementById('reorderLevel').value)
            });
            closeModal();
            loadItems();
            showNotification('Item added successfully', 'success');
        } catch (error) {
            showNotification('Failed to add item: ' + error.message, 'error');
        }
    });
}

async function editItem(itemId) {
    const item = currentData.items.find(i => i.Item_ID === itemId);
    if (!item) return;

    const modalBody = `
        <form id="itemForm">
            <div class="form-group">
                <label>Item Name *</label>
                <input type="text" id="itemName" value="${escapeHtml(item.Item_Name)}" required>
            </div>
            <div class="form-group">
                <label>Unit of Measure *</label>
                <input type="text" id="unitMeasure" value="${escapeHtml(item.Unit_Measure)}" required>
            </div>
            <div class="form-group">
                <label>Category *</label>
                <input type="text" id="category" value="${escapeHtml(item.Category)}" required>
            </div>
            <div class="form-group">
                <label>Reorder Level</label>
                <input type="number" id="reorderLevel" value="${item.Reorder_Level}" min="0">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Update Item</button>
            </div>
        </form>
    `;

    showModal('Edit Item', modalBody);

    document.getElementById('itemForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await window.api.items.update(itemId, {
                Item_Name: document.getElementById('itemName').value,
                Unit_Measure: document.getElementById('unitMeasure').value,
                Category: document.getElementById('category').value,
                Reorder_Level: parseInt(document.getElementById('reorderLevel').value)
            });
            closeModal();
            loadItems();
            showNotification('Item updated successfully', 'success');
        } catch (error) {
            showNotification('Failed to update item: ' + error.message, 'error');
        }
    });
}

async function deleteItem(itemId) {
    showConfirm('Are you sure you want to delete this item?', async () => {
        try {
            await window.api.items.delete(itemId);
            loadItems();
            showNotification('Item deleted successfully', 'success');
        } catch (error) {
            showNotification('Failed to delete item: ' + error.message, 'error');
        }
    });
}

// Centers Functions
async function loadCenters() {
    try {
        const centers = await window.api.centers.getAll();
        currentData.centers = centers;
        renderPaginatedTable('centers', centers, renderCentersTable, true);
    } catch (error) {
        console.error('Error loading centers:', error);
        showNotification('Failed to load centers', 'error');
    }
}

function renderCentersTable(data) {
    const tbody = document.querySelector('#centers-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No centers found</td></tr>';
        return;
    }

    data.forEach(center => {
        const statusClass = center.Status === 'Active' ? 'status-active' : 'status-inactive';
        const row = `
            <tr>
                <td class="mono-cell">${center.Center_ID}</td>
                <td class="name-cell">${escapeHtml(center.Center_Name)}</td>
                <td class="muted-cell">${escapeHtml(center.GN_Division_Name || '-')}</td>
                <td>${escapeHtml(center.Contact_Person || '-')}</td>
                <td class="mono-cell">${escapeHtml(center.Contact_Phone || '-')}</td>
                <td>${statusBadge(center.Status, statusClass)}</td>
                <td class="actions"><div class="actions-row">
                    ${actionBtn('btn-edit', 'Edit', `editCenter(${center.Center_ID})`, ICONS.edit)}
                    ${center.Status === 'Active' ? actionBtn('btn-delete', 'Delete', `deleteCenter(${center.Center_ID})`, ICONS.delete) : ''}
                </div></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function showAddCenterModal() {
    const gnDivisions = await window.api.gnDivisions.getActive();
    
    const modalBody = `
        <form id="centerForm">
            <div class="form-group">
                <label>Center Name *</label>
                <input type="text" id="centerName" required>
            </div>
            <div class="form-group">
                <label>GN Division</label>
                <select id="gnDivisionSelect" class="form-control">
                    <option value="">Select GN Division...</option>
                    ${gnDivisions.map(gn => `<option value="${gn.GN_ID}">${escapeHtml(gn.GN_Division_Name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Contact Person</label>
                <input type="text" id="contactPerson">
            </div>
            <div class="form-group">
                <label>Contact Phone</label>
                <input type="text" id="contactPhone">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Center</button>
            </div>
        </form>
    `;

    showModal('Add New Center', modalBody);

    document.getElementById('centerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const gnId = document.getElementById('gnDivisionSelect').value;
            await window.api.centers.add({
                Center_Name: document.getElementById('centerName').value,
                GN_ID: gnId ? parseInt(gnId) : null,
                Contact_Person: document.getElementById('contactPerson').value || null,
                Contact_Phone: document.getElementById('contactPhone').value || null
            });
            closeModal();
            loadCenters();
            showNotification('Center added successfully', 'success');
        } catch (error) {
            showNotification('Failed to add center: ' + error.message, 'error');
        }
    });
}

async function editCenter(centerId) {
    const center = currentData.centers.find(c => c.Center_ID === centerId);
    if (!center) return;
    
    const gnDivisions = await window.api.gnDivisions.getActive();

    const modalBody = `
        <form id="centerForm">
            <div class="form-group">
                <label>Center Name *</label>
                <input type="text" id="centerName" value="${escapeHtml(center.Center_Name)}" required>
            </div>
            <div class="form-group">
                <label>GN Division</label>
                <select id="gnDivisionSelect" class="form-control">
                    <option value="">Select GN Division...</option>
                    ${gnDivisions.map(gn => `<option value="${gn.GN_ID}" ${gn.GN_ID === center.GN_ID ? 'selected' : ''}>${escapeHtml(gn.GN_Division_Name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Contact Person</label>
                <input type="text" id="contactPerson" value="${escapeHtml(center.Contact_Person || '')}">
            </div>
            <div class="form-group">
                <label>Contact Phone</label>
                <input type="text" id="contactPhone" value="${escapeHtml(center.Contact_Phone || '')}">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Update Center</button>
            </div>
        </form>
    `;

    showModal('Edit Center', modalBody);

    document.getElementById('centerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const gnId = document.getElementById('gnDivisionSelect').value;
            await window.api.centers.update(centerId, {
                Center_Name: document.getElementById('centerName').value,
                GN_ID: gnId ? parseInt(gnId) : null,
                Contact_Person: document.getElementById('contactPerson').value || null,
                Contact_Phone: document.getElementById('contactPhone').value || null
            });
            closeModal();
            loadCenters();
            showNotification('Center updated successfully', 'success');
        } catch (error) {
            showNotification('Failed to update center: ' + error.message, 'error');
        }
    });
}

async function deleteCenter(centerId) {
    showConfirm('Are you sure you want to delete this center?', async () => {
        try {
            await window.api.centers.delete(centerId);
            loadCenters();
            showNotification('Center deleted successfully', 'success');
        } catch (error) {
            showNotification('Failed to delete center: ' + error.message, 'error');
        }
    });
}

// ==================== INCOMING / DONATIONS / OUTGOING - Handled by bill-functions.js ====================
// All bill-based CRUD (load*, render*Table, add/edit/delete modals) for incoming, donation
// and outgoing bills lives in bill-functions.js.

// Database Import/Export
async function exportDatabase() {
    try {
        const result = await window.api.database.export();
        if (result.success) {
            showNotification('Database exported successfully', 'success');
        } else if (!result.canceled) {
            showNotification('Failed to export database', 'error');
        }
    } catch (error) {
        showNotification('Failed to export database: ' + error.message, 'error');
    }
}

async function importDatabase() {
    showConfirm('Warning: Importing a database will replace all current data. Continue?', async () => {
        try {
            const result = await window.api.database.import();
            if (result.success) {
                showNotification('Database imported successfully. Page will reload.', 'success');
            } else if (!result.canceled) {
                showNotification('Failed to import database', 'error');
            }
        } catch (error) {
            showNotification('Failed to import database: ' + error.message, 'error');
        }
    });
}

// Modal Functions
function showModal(title, body, wide = false) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    const modalContent = document.querySelector('.modal-content');
    
    // Add or remove wide class based on parameter
    if (wide) {
        modalContent.classList.add('modal-wide');
    } else {
        modalContent.classList.remove('modal-wide');
    }
    
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    // Remove wide class when closing
    document.querySelector('.modal-content').classList.remove('modal-wide');
    
    // Clean up any SearchableSelect instances to prevent event listener leaks
    const modalBody = document.getElementById('modal-body');
    if (modalBody) {
        // Find all rows with searchable selects and destroy them
        const rows = modalBody.querySelectorAll('[data-select-id]');
        rows.forEach(row => {
            if (row.searchableSelect && typeof row.searchableSelect.destroy === 'function') {
                row.searchableSelect.destroy();
            }
        });
        // Clear modal content after a short delay to prevent focus issues
        setTimeout(() => {
            modalBody.innerHTML = '';
        }, 100);
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create toast notification instead of blocking alert
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Non-blocking confirmation dialog
function showConfirm(message, onConfirm, onCancel = null) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-dialog">
            <div class="confirm-message">${escapeHtml(message)}</div>
            <div class="confirm-buttons">
                <button class="btn btn-secondary confirm-cancel">Cancel</button>
                <button class="btn btn-danger confirm-ok">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);
    
    const handleConfirm = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
        if (onConfirm) onConfirm();
    };
    
    const handleCancel = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
        if (onCancel) onCancel();
    };
    
    overlay.querySelector('.confirm-ok').addEventListener('click', handleConfirm);
    overlay.querySelector('.confirm-cancel').addEventListener('click', handleCancel);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) handleCancel();
    });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

function isValidDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return false;
    
    // Check format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    // Parse and validate the date
    const date = new Date(dateString + 'T00:00:00');
    
    // Check if date is valid
    if (isNaN(date.getTime())) return false;
    
    // Verify the date components match (prevents invalid dates like 2025-02-30)
    const [year, month, day] = dateString.split('-').map(Number);
    if (date.getFullYear() !== year || 
        date.getMonth() + 1 !== month || 
        date.getDate() !== day) {
        return false;
    }
    
    // Optional: Check reasonable date range (1900-2100)
    if (year < 1900 || year > 2100) return false;
    
    return true;
}

function validateDateInput(dateInput, fieldName = 'Date') {
    const dateValue = dateInput.value;
    
    if (!dateValue) {
        showNotification(`${fieldName} is required`, 'error');
        dateInput.focus();
        return false;
    }
    
    if (!isValidDate(dateValue)) {
        showNotification(`Invalid ${fieldName}. Please enter a valid date`, 'error');
        dateInput.focus();
        return false;
    }
    
    return true;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Searchable Select Component
class SearchableSelect {
    constructor(containerId, options, placeholder = 'Search...') {
        this.containerId = containerId;
        this.options = options;
        this.placeholder = placeholder;
        this.selectedValue = '';
        this.selectedText = '';
        this.optionsRendered = false;
        this.render();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="searchable-select">
                <input 
                    type="text" 
                    class="searchable-select-input" 
                    placeholder="${this.placeholder}"
                    autocomplete="off"
                    style="pointer-events: auto; user-select: text;"
                />
                <div class="searchable-select-dropdown"></div>
            </div>
        `;

        this.input = container.querySelector('.searchable-select-input');
        this.dropdown = container.querySelector('.searchable-select-dropdown');

        // Ensure input is immediately responsive
        if (this.input) {
            this.input.style.pointerEvents = 'auto';
            this.input.style.userSelect = 'text';
            
            this.input.addEventListener('focus', () => this.showDropdown());
            this.input.addEventListener('input', (e) => this.filterOptions(e.target.value));
            this.input.addEventListener('blur', () => {
                setTimeout(() => this.hideDropdown(), 200);
            });
        }

        // Store the click handler so we can remove it later
        this.clickHandler = (e) => {
            if (!container.contains(e.target)) {
                this.hideDropdown();
            }
        };
        document.addEventListener('click', this.clickHandler);
    }

    showDropdown() {
        // Only render options when dropdown opens - prevents freezing on modal open
        if (!this.optionsRendered) {
            // Render initial empty state immediately
            this.dropdown.innerHTML = '<div class="searchable-select-option no-results">Start typing to search...</div>';
            this.dropdown.classList.add('active');
            this.optionsRendered = true;
        } else {
            requestAnimationFrame(() => {
                this.renderOptions(this.options);
                this.dropdown.classList.add('active');
            });
        }
    }

    hideDropdown() {
        this.dropdown.classList.remove('active');
    }

    filterOptions(searchTerm) {
        // Lazy load options on first input
        if (!this.dropdown.classList.contains('active')) {
            this.dropdown.classList.add('active');
        }
        
        const filtered = this.options.filter(opt => 
            opt.text.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderOptions(filtered);
    }

    renderOptions(options) {
        if (options.length === 0) {
            this.dropdown.innerHTML = '<div class="searchable-select-option no-results">No results found</div>';
            return;
        }

        // Limit initial rendering to first 100 options for performance
        const maxInitialRender = 100;
        const optionsToRender = options.length > maxInitialRender ? options.slice(0, maxInitialRender) : options;
        
        this.dropdown.innerHTML = optionsToRender.map(opt => `
            <div class="searchable-select-option ${opt.value === this.selectedValue ? 'selected' : ''}" 
                 data-value="${opt.value}">
                ${escapeHtml(opt.text)}
            </div>
        `).join('');

        if (options.length > maxInitialRender) {
            this.dropdown.innerHTML += `<div class="searchable-select-option no-results">Showing ${maxInitialRender} of ${options.length} - type to search</div>`;
        }

        this.dropdown.querySelectorAll('.searchable-select-option').forEach(option => {
            if (!option.classList.contains('no-results')) {
                option.addEventListener('click', () => {
                    this.selectOption(option.dataset.value, option.textContent.trim());
                });
            }
        });
    }

    selectOption(value, text) {
        this.selectedValue = value;
        this.selectedText = text;
        this.input.value = text;
        this.hideDropdown();
    }

    getValue() {
        return this.selectedValue;
    }

    setValue(value) {
        const option = this.options.find(opt => opt.value === value);
        if (option) {
            this.selectedValue = value;
            this.selectedText = option.text;
            this.input.value = option.text;
        }
    }

    updateOptions(newOptions) {
        this.options = newOptions;
        if (this.dropdown.classList.contains('active')) {
            this.renderOptions(newOptions);
        }
    }

    reset() {
        this.selectedValue = '';
        this.selectedText = '';
        this.input.value = '';
    }
    
    destroy() {
        // Remove global event listener to prevent memory leaks
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler);
        }
    }
}

// Reports Functions
async function loadReportsPage() {
    try {
        // Load items for selection
        const items = await window.api.items.getActive();
        currentData.items = items;

        // Populate items list
        const itemsList = document.getElementById('itemsList');
        itemsList.innerHTML = items.map(item => `
            <label style="display: block; padding: 5px;">
                <input type="checkbox" class="item-checkbox" value="${item.Item_ID}">
                ${escapeHtml(item.Item_Name)} (${escapeHtml(item.Unit_Measure)})
            </label>
        `).join('');

        // Setup event listeners
        setupReportsEventListeners();
    } catch (error) {
        console.error('Error loading reports page:', error);
        showNotification('Failed to load reports page', 'error');
    }
}

function setupReportsEventListeners() {
    const reportType = document.getElementById('reportType');
    const selectAllItems = document.getElementById('selectAllItems');
    const itemSelectionSection = document.getElementById('itemSelectionSection');
    const dateRangeSection = document.getElementById('dateRangeSection');
    const centerSelectionSection = document.getElementById('centerSelectionSection');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const includeSummaryCsv = document.getElementById('includeSummaryCsv');

    // Load centers for center-wise report
    loadCentersForReport();

    // Report type change
    reportType.addEventListener('change', () => {
        const type = reportType.value;
        const selectAllItemsGroup = selectAllItems.closest('.form-group');
        
        if (type === 'current-stock') {
            dateRangeSection.style.display = 'none';
            centerSelectionSection.style.display = 'none';
            selectAllItemsGroup.style.display = 'block';
            itemSelectionSection.style.display = 'none';
        } else if (type === 'center-wise-items') {
            dateRangeSection.style.display = 'block';
            centerSelectionSection.style.display = 'block';
            selectAllItemsGroup.style.display = 'none';
            itemSelectionSection.style.display = 'none';
            selectAllItems.checked = true;
            // Set default dates
            const today = new Date().toISOString().split('T')[0];
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            document.getElementById('reportDateFrom').value = monthAgo;
            document.getElementById('reportDateTo').value = today;
        } else {
            dateRangeSection.style.display = 'block';
            centerSelectionSection.style.display = 'none';
            selectAllItemsGroup.style.display = 'block';
            selectAllItems.checked = true;
            itemSelectionSection.style.display = 'none';
            // Set default dates
            const today = new Date().toISOString().split('T')[0];
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            document.getElementById('reportDateFrom').value = monthAgo;
            document.getElementById('reportDateTo').value = today;
        }
    });

    // Select all items checkbox
    selectAllItems.addEventListener('change', () => {
        const isChecked = selectAllItems.checked;
        itemSelectionSection.style.display = isChecked ? 'none' : 'block';
        
        if (!isChecked) {
            // Check all items by default when opening
            document.querySelectorAll('.item-checkbox').forEach(cb => cb.checked = true);
        }
    });

    // Generate report button
    generateReportBtn.addEventListener('click', generateReport);
    // Export CSV button
    exportCsvBtn.addEventListener('click', exportCsvReport);
}

async function generateReport() {
    try {
        const reportType = document.getElementById('reportType').value;
        const selectAllItems = document.getElementById('selectAllItems').checked;
        
        let selectedItemIds = null;
        if (!selectAllItems && reportType !== 'center-wise-items') {
            selectedItemIds = Array.from(document.querySelectorAll('.item-checkbox:checked'))
                .map(cb => parseInt(cb.value));
            
            if (selectedItemIds.length === 0) {
                showNotification('Please select at least one item', 'error');
                return;
            }
        }

        const dateFrom = document.getElementById('reportDateFrom').value;
        const dateTo = document.getElementById('reportDateTo').value;

        // Validate center selection for center-wise report
        let centerId = null;
        if (reportType === 'center-wise-items') {
            centerId = document.getElementById('reportCenter').value;
            if (!centerId) {
                showNotification('Please select a center', 'error');
                return;
            }
        }

        // Validate date range for time-based reports
        if (reportType !== 'current-stock') {
            if (!dateFrom || !dateTo) {
                showNotification('Please select date range', 'error');
                return;
            }
            if (dateFrom > dateTo) {
                showNotification('From date cannot be after To date', 'error');
                return;
            }
        }

        showNotification('Generating PDF report...', 'info');

        const result = await window.api.reports.generatePDF({
            reportType,
            selectedItemIds,
            dateFrom,
            dateTo,
            centerId
        });

        if (result.success) {
            showNotification('Report generated successfully! File saved to: ' + result.path, 'success');
        } else {
            showNotification('Failed to generate report: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showNotification('Failed to generate report', 'error');
    }
}

// Export CSV report
async function exportCsvReport() {
    try {
        const reportType = document.getElementById('reportType').value;
        const selectAllItems = document.getElementById('selectAllItems').checked;
        
        let selectedItemIds = null;
        if (!selectAllItems && reportType !== 'center-wise-items') {
            selectedItemIds = Array.from(document.querySelectorAll('.item-checkbox:checked'))
                .map(cb => parseInt(cb.value));
            
            if (selectedItemIds.length === 0) {
                showNotification('Please select at least one item', 'error');
                return;
            }
        }

        const dateFrom = document.getElementById('reportDateFrom').value;
        const dateTo = document.getElementById('reportDateTo').value;

        // Validate center selection for center-wise report
        let centerId = null;
        if (reportType === 'center-wise-items') {
            centerId = document.getElementById('reportCenter').value;
            if (!centerId) {
                showNotification('Please select a center', 'error');
                return;
            }
        }

        // Validate date range for time-based reports
        if (reportType !== 'current-stock') {
            if (!dateFrom || !dateTo) {
                showNotification('Please select date range', 'error');
                return;
            }
            if (dateFrom > dateTo) {
                showNotification('From date cannot be after To date', 'error');
                return;
            }
        }

        const includeSummary = document.getElementById('includeSummaryCsv').checked;

        showNotification('Exporting CSV...', 'info');

        const result = await window.api.reports.exportCSV({
            reportType,
            selectedItemIds,
            dateFrom,
            dateTo,
            centerId,
            includeSummary
        });

        if (result.success) {
            showNotification('CSV export successful', 'success');
            if (result.paths) {
                // If paths is an object with multiple files
                if (typeof result.paths === 'string') {
                    showNotification('CSV saved to: ' + result.paths, 'success');
                } else if (result.paths.data || result.paths.summary || result.paths.donors || result.paths.top || result.paths.items) {
                    const parts = [];
                    if (result.paths.data) parts.push('Data: ' + result.paths.data);
                    if (result.paths.summary) parts.push('Summary: ' + result.paths.summary);
                    if (result.paths.donors) parts.push('Donors: ' + result.paths.donors);
                    if (result.paths.top) parts.push('Top Items: ' + result.paths.top);
                    if (result.paths.items) parts.push('Items Summary: ' + result.paths.items);
                    showNotification(parts.join('\n'), 'success');
                } else {
                    showNotification('CSV saved', 'success');
                }
            }
        } else if (result.canceled) {
            showNotification('CSV export canceled', 'info');
        } else {
            showNotification('Failed to export CSV: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showNotification('Failed to export CSV', 'error');
    }
}

// Export current incoming bills as CSV
async function exportIncomingCsv() {
    try {
        const includeSummary = document.getElementById('includeSummaryIncoming').checked;
        showNotification('Exporting Incoming CSV...', 'info');

        const result = await window.api.reports.exportCSV({
            reportType: 'incoming',
            includeSummary
        });

        if (result.success) {
            showNotification('Incoming CSV export successful', 'success');
        } else if (result.canceled) {
            showNotification('Incoming CSV export canceled', 'info');
        } else {
            showNotification('Failed to export incoming CSV: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error exporting incoming CSV:', error);
        showNotification('Failed to export incoming CSV', 'error');
    }
}

// Export current donations bills as CSV
async function exportDonationsCsv() {
    try {
        const includeSummary = document.getElementById('includeSummaryDonations').checked;
        showNotification('Exporting Donations CSV...', 'info');

        const result = await window.api.reports.exportCSV({
            reportType: 'donations',
            includeSummary
        });

        if (result.success) {
            showNotification('Donations CSV export successful', 'success');
        } else if (result.canceled) {
            showNotification('Donations CSV export canceled', 'info');
        } else {
            showNotification('Failed to export donations CSV: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error exporting donations CSV:', error);
        showNotification('Failed to export donations CSV', 'error');
    }
}

// Export current outgoing bills as CSV
async function exportOutgoingCsv() {
    try {
        const includeSummary = document.getElementById('includeSummaryOutgoing').checked;
        showNotification('Exporting Outgoing CSV...', 'info');

        const result = await window.api.reports.exportCSV({
            reportType: 'outgoing',
            includeSummary
        });

        if (result.success) {
            showNotification('Outgoing CSV export successful', 'success');
        } else if (result.canceled) {
            showNotification('Outgoing CSV export canceled', 'info');
        } else {
            showNotification('Failed to export outgoing CSV: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error exporting outgoing CSV:', error);
        showNotification('Failed to export outgoing CSV', 'error');
    }
}

async function loadCentersForReport() {
    try {
        const centers = await window.api.centers.getAll();
        const centerSelect = document.getElementById('reportCenter');
        
        // Clear existing options except the first one
        centerSelect.innerHTML = '<option value="">-- Select Center --</option>';
        
        // Add active centers
        centers
            .filter(center => center.Status === 'Active')
            .forEach(center => {
                const option = document.createElement('option');
                option.value = center.Center_ID;
                option.textContent = center.Center_Name;
                centerSelect.appendChild(option);
            });
    } catch (error) {
        console.error('Error loading centers for report:', error);
    }
}

// GN Divisions Functions
async function loadGNDivisions() {
    try {
        const gnDivisions = await window.api.gnDivisions.getAll();
        currentData.gnDivisions = gnDivisions;
        renderPaginatedTable('gn-divisions', gnDivisions, renderGNDivisionsTable, true);
    } catch (error) {
        console.error('Error loading GN divisions:', error);
        showNotification('Failed to load GN divisions', 'error');
    }
}

function renderGNDivisionsTable(data) {
    const tbody = document.querySelector('#gn-divisions-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No GN divisions found</td></tr>';
        return;
    }

    data.forEach(gn => {
        const statusClass = gn.Status === 'Active' ? 'status-active' : 'status-inactive';
        const row = `
            <tr>
                <td class="mono-cell">${gn.GN_ID}</td>
                <td class="name-cell">${escapeHtml(gn.GN_Division_Name)}</td>
                <td class="muted-cell">${escapeHtml(gn.DS_Division || '-')}</td>
                <td>${statusBadge(gn.Status, statusClass)}</td>
                <td class="actions"><div class="actions-row">
                    ${actionBtn('btn-edit', 'Edit', `editGNDivision(${gn.GN_ID})`, ICONS.edit)}
                    ${gn.Status === 'Active' ? actionBtn('btn-delete', 'Delete', `deleteGNDivision(${gn.GN_ID})`, ICONS.delete) : ''}
                </div></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function showAddGNDivisionModal() {
    const modalBody = `
        <form id="gnDivisionForm">
            <div class="form-group">
                <label>GN Division Name *</label>
                <input type="text" id="gnDivisionName" class="form-control" required>
            </div>
            <div class="form-group">
                <label>DS Division</label>
                <input type="text" id="dsDivision" class="form-control">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Add GN Division</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;

    showModal('Add GN Division', modalBody);

    document.getElementById('gnDivisionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const gnData = {
            GN_Division_Name: document.getElementById('gnDivisionName').value,
            DS_Division: document.getElementById('dsDivision').value
        };

        try {
            await window.api.gnDivisions.add(gnData);
            showNotification('GN Division added successfully', 'success');
            closeModal();
            loadGNDivisions();
        } catch (error) {
            console.error('Error adding GN division:', error);
            showNotification('Failed to add GN division', 'error');
        }
    });
}

async function editGNDivision(gnId) {
    const gn = currentData.gnDivisions.find(g => g.GN_ID === gnId);
    if (!gn) return;

    const modalBody = `
        <form id="gnDivisionForm">
            <div class="form-group">
                <label>GN Division Name *</label>
                <input type="text" id="gnDivisionName" class="form-control" value="${escapeHtml(gn.GN_Division_Name)}" required>
            </div>
            <div class="form-group">
                <label>DS Division</label>
                <input type="text" id="dsDivision" class="form-control" value="${escapeHtml(gn.DS_Division || '')}">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update GN Division</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;

    showModal('Edit GN Division', modalBody);

    document.getElementById('gnDivisionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const gnData = {
            GN_Division_Name: document.getElementById('gnDivisionName').value,
            DS_Division: document.getElementById('dsDivision').value
        };

        try {
            await window.api.gnDivisions.update(gnId, gnData);
            showNotification('GN Division updated successfully', 'success');
            closeModal();
            loadGNDivisions();
        } catch (error) {
            console.error('Error updating GN division:', error);
            showNotification('Failed to update GN division', 'error');
        }
    });
}

async function deleteGNDivision(gnId) {
    showConfirm('Are you sure you want to delete this GN division?', async () => {
        try {
            await window.api.gnDivisions.delete(gnId);
            showNotification('GN Division deleted successfully', 'success');
            loadGNDivisions();
        } catch (error) {
            console.error('Error deleting GN division:', error);
            showNotification('Failed to delete GN division', 'error');
        }
    });
}

// Care Packages Functions
async function loadCarePackages() {
    try {
        const [templates, issues] = await Promise.all([
            window.api.carePackages.getAllTemplates(),
            window.api.carePackages.getAllIssues()
        ]);
        currentData.carePackageTemplates = templates;
        currentData.carePackageIssues = issues;
        renderPaginatedTable('care-package-templates', templates, renderCarePackageTemplatesTable, true);
        renderPaginatedTable('care-package-issues', issues, renderCarePackageIssuesTable, true);
    } catch (error) {
        console.error('Error loading care packages:', error);
        showNotification('Failed to load care packages', 'error');
    }
}

function switchCarePackageTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function renderCarePackageTemplatesTable(data) {
    const tbody = document.querySelector('#care-package-templates-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No care package templates found</td></tr>';
        return;
    }

    data.forEach(async (template) => {
        const itemsCount = await window.api.carePackages.getTemplateItems(template.Template_ID);
        const statusClass = template.Status === 'Active' ? 'status-active' : 'status-inactive';
        const row = `
            <tr>
                <td class="mono-cell">${template.Template_ID}</td>
                <td class="name-cell">${escapeHtml(template.Package_Name)}</td>
                <td class="muted-cell">${escapeHtml(template.Description || '-')}</td>
                <td class="qty-cell">${itemsCount.length}</td>
                <td>${statusBadge(template.Status, statusClass)}</td>
                <td class="actions"><div class="actions-row">
                    ${actionBtn('btn-view', 'View', `viewCarePackageTemplate(${template.Template_ID})`, ICONS.view)}
                    ${actionBtn('btn-edit', 'Edit', `editCarePackageTemplate(${template.Template_ID})`, ICONS.edit)}
                    ${template.Status === 'Active' ? actionBtn('btn-delete', 'Delete', `deleteCarePackageTemplate(${template.Template_ID})`, ICONS.delete) : ''}
                </div></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function renderCarePackageIssuesTable(data) {
    const tbody = document.querySelector('#care-package-issues-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">No care package issues found</td></tr>';
        return;
    }

    data.forEach(issue => {
        const recipient = issue.Recipient_Type === 'Center' ? issue.Center_Name : issue.GN_Division_Name;
        const row = `
            <tr>
                <td class="mono-cell">${issue.Issue_ID}</td>
                <td class="mono-cell" style="color:var(--ink-4)">${issue.Date_Issued}</td>
                <td class="name-cell">${escapeHtml(issue.Package_Name)}</td>
                <td class="qty-cell">${issue.Packages_Issued}</td>
                <td class="muted-cell">${issue.Recipient_Type}</td>
                <td>${escapeHtml(recipient)}</td>
                <td>${escapeHtml(issue.Officer_Name)}</td>
                <td class="mono-cell">${escapeHtml(issue.Officer_NIC)}</td>
                <td class="muted-cell">${escapeHtml(issue.Remarks || '-')}</td>
                <td class="actions"><div class="actions-row">
                    ${actionBtn('btn-view', 'View', `viewCarePackageIssue(${issue.Issue_ID})`, ICONS.view)}
                    ${actionBtn('btn-edit', 'Edit', `editCarePackageIssue(${issue.Issue_ID})`, ICONS.edit)}
                    ${actionBtn('btn-delete', 'Delete', `deleteCarePackageIssue(${issue.Issue_ID})`, ICONS.delete)}
                </div></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function showAddCarePackageTemplateModal() {
    const modalBody = `
        <form id="carePackageTemplateForm">
            <div class="form-group">
                <label>Package Name *</label>
                <input type="text" id="packageName" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="packageDescription" class="form-control" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="copyFromExisting"> Copy items from existing package
                </label>
                <select id="copyFromTemplate" class="form-control" style="display:none;">
                    <option value="">Select a package to copy from...</option>
                </select>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Create Template</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;

    showModal('Create Care Package Template', modalBody, true);

    // Populate copy from dropdown
    const copyCheckbox = document.getElementById('copyFromExisting');
    const copySelect = document.getElementById('copyFromTemplate');
    
    copyCheckbox.addEventListener('change', () => {
        copySelect.style.display = copyCheckbox.checked ? 'block' : 'none';
        if (copyCheckbox.checked) {
            // Load active templates
            currentData.carePackageTemplates.filter(t => t.Status === 'Active').forEach(template => {
                const option = document.createElement('option');
                option.value = template.Template_ID;
                option.textContent = template.Package_Name;
                copySelect.appendChild(option);
            });
        }
    });

    document.getElementById('carePackageTemplateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const templateData = {
            Package_Name: document.getElementById('packageName').value,
            Description: document.getElementById('packageDescription').value
        };

        try {
            const result = await window.api.carePackages.addTemplate(templateData);
            const newTemplateId = result.lastInsertRowid;
            
            // If copying from existing, copy items
            if (copyCheckbox.checked && copySelect.value) {
                await window.api.carePackages.copyTemplateItems(
                    parseInt(copySelect.value),
                    newTemplateId
                );
            }
            
            showNotification('Care package template created successfully', 'success');
            closeModal();
            
            // Reload templates first
            await loadCarePackages();
            
            // If not copying, show add items modal
            if (!copyCheckbox.checked) {
                setTimeout(() => editCarePackageTemplate(newTemplateId), 100);
            }
        } catch (error) {
            console.error('Error creating care package template:', error);
            showNotification('Failed to create care package template', 'error');
        }
    });
}

async function viewCarePackageTemplate(templateId) {
    const template = currentData.carePackageTemplates.find(t => t.Template_ID === templateId);
    if (!template) return;

    const items = await window.api.carePackages.getTemplateItems(templateId);

    let itemsHtml = '<table class="table"><thead><tr><th>Item</th><th>Quantity</th><th>Unit</th><th>Remarks</th></tr></thead><tbody>';
    
    if (items.length === 0) {
        itemsHtml += '<tr><td colspan="4" class="text-center">No items in this package</td></tr>';
    } else {
        items.forEach(item => {
            itemsHtml += `
                <tr>
                    <td>${escapeHtml(item.Item_Name)}</td>
                    <td>${item.Quantity_Per_Package}</td>
                    <td>${escapeHtml(item.Unit_Measure)}</td>
                    <td>${escapeHtml(item.Item_Remarks || '-')}</td>
                </tr>
            `;
        });
    }
    itemsHtml += '</tbody></table>';

    const modalBody = `
        <div>
            <p><strong>Package Name:</strong> ${escapeHtml(template.Package_Name)}</p>
            <p><strong>Description:</strong> ${escapeHtml(template.Description || '-')}</p>
            <p><strong>Status:</strong> ${template.Status}</p>
            <h4>Items in Package:</h4>
            ${itemsHtml}
            <div class="form-actions">
                <button type="button" class="btn btn-primary" onclick="exportCarePackageTemplatePDF(${template.Template_ID})">Export PDF</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
            </div>
        </div>
    `;

    showModal('Care Package Template Details', modalBody);
}

async function exportCarePackageTemplatePDF(templateId) {
    try {
        showNotification('Generating Care Package Template PDF...', 'info');
        const result = await window.api.carePackages.exportTemplatePDF(templateId);
        if (result.success) {
            showNotification('Template PDF generated successfully! File saved to: ' + result.path, 'success');
        } else if (!result.canceled) {
            showNotification('Failed to generate template PDF: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error exporting care package template PDF:', error);
        showNotification('Failed to generate template PDF', 'error');
    }
}

async function editCarePackageTemplate(templateId) {
    const template = currentData.carePackageTemplates.find(t => t.Template_ID === templateId);
    if (!template) return;

    const items = await window.api.carePackages.getTemplateItems(templateId);
    const allItems = await window.api.items.getActive();

    let itemsHtml = '<div id="templateItemsList">';
    items.forEach((item, index) => {
        itemsHtml += `
            <div class="template-item-row" data-item-id="${item.Template_Item_ID}">
                <input type="text" value="${escapeHtml(item.Item_Name)}" readonly class="form-control" style="flex:2;">
                <input type="number" value="${item.Quantity_Per_Package}" class="form-control item-qty" style="flex:1;" min="0.01" step="0.01" required>
                <input type="text" value="${escapeHtml(item.Item_Remarks || '')}" class="form-control item-remarks" style="flex:2;" placeholder="Remarks">
                <button type="button" class="btn-remove-item" onclick="removeTemplateItem(${item.Template_Item_ID})">${ICONS.remove}</button>
            </div>
        `;
    });
    itemsHtml += '</div>';

    const modalBody = `
        <form id="editTemplateForm">
            <div class="form-group">
                <label>Package Name *</label>
                <input type="text" id="packageName" class="form-control" value="${escapeHtml(template.Package_Name)}" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="packageDescription" class="form-control" rows="2">${escapeHtml(template.Description || '')}</textarea>
            </div>
            <h4>Package Items</h4>
            <div class="form-group">
                <label>Add Item</label>
                <div style="display:flex; gap:10px;">
                    <div id="addItemContainer" style="flex:2;"></div>
                    <input type="number" id="addItemQty" class="form-control" placeholder="Qty" style="flex:1;" min="0.01" step="0.01">
                    <input type="text" id="addItemRemarks" class="form-control" placeholder="Remarks" style="flex:2;">
                    <button type="button" class="btn btn-secondary" onclick="addTemplateItemRow(${templateId})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>Add</button>
                </div>
            </div>
            ${itemsHtml}
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update Template</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
        <style>
            .template-item-row {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
                align-items: center;
            }
        </style>
    `;

    showModal('Edit Care Package Template', modalBody, true);

    // Initialize searchable select for items
    const itemOptions = allItems.map(i => ({ 
        value: i.Item_ID.toString(), 
        text: `${escapeHtml(i.Item_Name)} (${escapeHtml(i.Unit_Measure)})` 
    }));
    const itemSelect = new SearchableSelect('addItemContainer', itemOptions, 'Search items...');
    window.currentItemSelect = itemSelect;

    document.getElementById('editTemplateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const templateData = {
            Package_Name: document.getElementById('packageName').value,
            Description: document.getElementById('packageDescription').value
        };

        try {
            await window.api.carePackages.updateTemplate(templateId, templateData);
            
            // Update all item quantities and remarks
            const itemRows = document.querySelectorAll('.template-item-row');
            for (const row of itemRows) {
                const itemId = row.getAttribute('data-item-id');
                const qty = row.querySelector('.item-qty').value;
                const remarks = row.querySelector('.item-remarks').value;
                
                await window.api.carePackages.updateTemplateItem(parseInt(itemId), {
                    Quantity_Per_Package: parseFloat(qty),
                    Item_Remarks: remarks
                });
            }
            
            showNotification('Care package template updated successfully', 'success');
            closeModal();
            loadCarePackages();
        } catch (error) {
            console.error('Error updating care package template:', error);
            showNotification('Failed to update care package template', 'error');
        }
    });
}

async function addTemplateItemRow(templateId) {
    const itemSelect = window.currentItemSelect;
    const qtyInput = document.getElementById('addItemQty');
    const remarksInput = document.getElementById('addItemRemarks');
    
    const itemId = parseInt(itemSelect.getValue());
    const qty = parseFloat(qtyInput.value);
    const remarks = remarksInput.value || '';
    
    if (!itemId || isNaN(itemId)) {
        showNotification('Please select an item', 'error');
        return;
    }
    
    if (!qty || isNaN(qty) || qty < 0.01) {
        showNotification('Please enter a valid quantity (minimum 0.01)', 'error');
        return;
    }
    
    try {
        const itemData = {
            Template_ID: templateId,
            Item_ID: itemId,
            Quantity_Per_Package: qty,
            Item_Remarks: remarks
        };
        
        console.log('Adding item to template:', itemData);
        const result = await window.api.carePackages.addTemplateItem(itemData);
        console.log('Item added successfully:', result);
        
        showNotification('Item added to package successfully', 'success');
        
        // Refresh the modal
        closeModal();
        setTimeout(() => editCarePackageTemplate(templateId), 100);
    } catch (error) {
        console.error('Error adding template item:', error);
        showNotification('Failed to add item to template: ' + error.message, 'error');
    }
}

async function removeTemplateItem(templateItemId) {
    showConfirm('Remove this item from the package?', async () => {
        try {
            await window.api.carePackages.deleteTemplateItem(templateItemId);
            document.querySelector(`[data-item-id="${templateItemId}"]`).remove();
            showNotification('Item removed from package', 'success');
        } catch (error) {
            console.error('Error removing template item:', error);
            showNotification('Failed to remove item', 'error');
        }
    });
}

async function deleteCarePackageTemplate(templateId) {
    showConfirm('Are you sure you want to delete this care package template?', async () => {
        try {
            await window.api.carePackages.deleteTemplate(templateId);
            showNotification('Care package template deleted successfully', 'success');
            loadCarePackages();
        } catch (error) {
            console.error('Error deleting care package template:', error);
            showNotification('Failed to delete care package template', 'error');
        }
    });
}

async function showIssueCarePackageModal() {
    const templates = await window.api.carePackages.getActiveTemplates();
    const centers = await window.api.centers.getActive();
    const gnDivisions = await window.api.gnDivisions.getActive();

    const modalBody = `
        <form id="issueCarePackageForm">
            <div class="form-group">
                <label>Care Package Template *</label>
                <select id="issueTemplateId" class="form-control" required>
                    <option value="">Select a package...</option>
                    ${templates.map(t => `<option value="${t.Template_ID}">${escapeHtml(t.Package_Name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Number of Packages *</label>
                <input type="number" id="packagesIssued" class="form-control" min="0.01" step="0.01" required>
            </div>
            <div class="form-group">
                <label>Date Issued *</label>
                <input type="date" id="dateIssued" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label>Recipient Type *</label>
                <select id="recipientType" class="form-control" required>
                    <option value="">Select type...</option>
                    <option value="Center">Center</option>
                    <option value="GN Division">GN Division</option>
                </select>
            </div>
            <div class="form-group" id="centerSelectGroup" style="display:none;">
                <label>Center *</label>
                <select id="issueCenterId" class="form-control">
                    <option value="">Select a center...</option>
                    ${centers.map(c => `<option value="${c.Center_ID}">${escapeHtml(c.Center_Name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" id="gnSelectGroup" style="display:none;">
                <label>GN Division *</label>
                <select id="issueGNId" class="form-control">
                    <option value="">Select a GN division...</option>
                    ${gnDivisions.map(gn => `<option value="${gn.GN_ID}">${escapeHtml(gn.GN_Division_Name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Officer Name *</label>
                <input type="text" id="issueOfficerName" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Officer NIC *</label>
                <input type="text" id="issueOfficerNIC" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Remarks</label>
                <textarea id="issueRemarks" class="form-control" rows="2"></textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Issue Packages</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;

    showModal('Issue Care Packages', modalBody, true);

    // Show/hide recipient fields based on type
    document.getElementById('recipientType').addEventListener('change', (e) => {
        const type = e.target.value;
        document.getElementById('centerSelectGroup').style.display = type === 'Center' ? 'block' : 'none';
        document.getElementById('gnSelectGroup').style.display = type === 'GN Division' ? 'block' : 'none';
    });

    document.getElementById('issueCarePackageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const recipientType = document.getElementById('recipientType').value;
        const centerId = document.getElementById('issueCenterId').value;
        const gnId = document.getElementById('issueGNId').value;
        
        if (recipientType === 'Center' && !centerId) {
            showNotification('Please select a center', 'error');
            return;
        }
        if (recipientType === 'GN Division' && !gnId) {
            showNotification('Please select a GN division', 'error');
            return;
        }
        
        const issueData = {
            Template_ID: parseInt(document.getElementById('issueTemplateId').value),
            Date_Issued: document.getElementById('dateIssued').value,
            Packages_Issued: parseInt(document.getElementById('packagesIssued').value),
            Recipient_Type: recipientType,
            Center_ID: centerId ? parseInt(centerId) : null,
            GN_ID: gnId ? parseInt(gnId) : null,
            Officer_Name: document.getElementById('issueOfficerName').value,
            Officer_NIC: document.getElementById('issueOfficerNIC').value,
            Remarks: document.getElementById('issueRemarks').value
        };

        try {
            await window.api.carePackages.addIssue(issueData);
            showNotification('Care packages issued successfully', 'success');
            closeModal();
            loadCarePackages();
            // Switch to issues tab
            switchCarePackageTab('issues');
        } catch (error) {
            console.error('Error issuing care packages:', error);
            showNotification('Failed to issue care packages', 'error');
        }
    });
}

async function viewCarePackageIssue(issueId) {
    const issue = currentData.carePackageIssues.find(i => i.Issue_ID === issueId);
    if (!issue) return;

    const items = await window.api.carePackages.getTemplateItems(issue.Template_ID);
    const recipient = issue.Recipient_Type === 'Center' ? issue.Center_Name : issue.GN_Division_Name;

    let itemsHtml = '<table class="table"><thead><tr><th>Item</th><th>Qty per Package</th><th>Total Issued</th><th>Unit</th></tr></thead><tbody>';
    
    items.forEach(item => {
        const totalQty = item.Quantity_Per_Package * issue.Packages_Issued;
        itemsHtml += `
            <tr>
                <td>${escapeHtml(item.Item_Name)}</td>
                <td>${item.Quantity_Per_Package}</td>
                <td><strong>${totalQty}</strong></td>
                <td>${escapeHtml(item.Unit_Measure)}</td>
            </tr>
        `;
    });
    itemsHtml += '</tbody></table>';

    const modalBody = `
        <div>
            <p><strong>Package:</strong> ${escapeHtml(issue.Package_Name)}</p>
            <p><strong>Packages Issued:</strong> ${issue.Packages_Issued}</p>
            <p><strong>Date Issued:</strong> ${issue.Date_Issued}</p>
            <p><strong>Recipient Type:</strong> ${issue.Recipient_Type}</p>
            <p><strong>Recipient:</strong> ${escapeHtml(recipient)}</p>
            <p><strong>Officer:</strong> ${escapeHtml(issue.Officer_Name)} (${escapeHtml(issue.Officer_NIC)})</p>
            <p><strong>Remarks:</strong> ${escapeHtml(issue.Remarks || '-')}</p>
            <h4>Items Issued:</h4>
            ${itemsHtml}
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
            </div>
        </div>
    `;

    showModal('Care Package Issue Details', modalBody);
}

async function editCarePackageIssue(issueId) {
    const issue = currentData.carePackageIssues.find(i => i.Issue_ID === issueId);
    if (!issue) return;

    const templates = await window.api.carePackages.getActiveTemplates();
    const centers = await window.api.centers.getActive();
    const gnDivisions = await window.api.gnDivisions.getActive();

    const modalBody = `
        <form id="editIssueCarePackageForm">
            <div class="form-group">
                <label>Care Package Template *</label>
                <select id="issueTemplateId" class="form-control" required>
                    ${templates.map(t => `<option value="${t.Template_ID}" ${t.Template_ID === issue.Template_ID ? 'selected' : ''}>${escapeHtml(t.Package_Name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Number of Packages *</label>
                <input type="number" id="packagesIssued" class="form-control" value="${issue.Packages_Issued}" min="0.01" step="0.01" required>
            </div>
            <div class="form-group">
                <label>Date Issued *</label>
                <input type="date" id="dateIssued" class="form-control" value="${issue.Date_Issued}" required>
            </div>
            <div class="form-group">
                <label>Recipient Type *</label>
                <select id="recipientType" class="form-control" required>
                    <option value="Center" ${issue.Recipient_Type === 'Center' ? 'selected' : ''}>Center</option>
                    <option value="GN Division" ${issue.Recipient_Type === 'GN Division' ? 'selected' : ''}>GN Division</option>
                </select>
            </div>
            <div class="form-group" id="centerSelectGroup" style="display:${issue.Recipient_Type === 'Center' ? 'block' : 'none'};">
                <label>Center *</label>
                <select id="issueCenterId" class="form-control">
                    <option value="">Select a center...</option>
                    ${centers.map(c => `<option value="${c.Center_ID}" ${c.Center_ID === issue.Center_ID ? 'selected' : ''}>${escapeHtml(c.Center_Name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" id="gnSelectGroup" style="display:${issue.Recipient_Type === 'GN Division' ? 'block' : 'none'};">
                <label>GN Division *</label>
                <select id="issueGNId" class="form-control">
                    <option value="">Select a GN division...</option>
                    ${gnDivisions.map(gn => `<option value="${gn.GN_ID}" ${gn.GN_ID === issue.GN_ID ? 'selected' : ''}>${escapeHtml(gn.GN_Division_Name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Officer Name *</label>
                <input type="text" id="issueOfficerName" class="form-control" value="${escapeHtml(issue.Officer_Name)}" required>
            </div>
            <div class="form-group">
                <label>Officer NIC *</label>
                <input type="text" id="issueOfficerNIC" class="form-control" value="${escapeHtml(issue.Officer_NIC)}" required>
            </div>
            <div class="form-group">
                <label>Remarks</label>
                <textarea id="issueRemarks" class="form-control" rows="2">${escapeHtml(issue.Remarks || '')}</textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Update Issue</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;

    showModal('Edit Care Package Issue', modalBody, true);

    // Show/hide recipient fields based on type
    document.getElementById('recipientType').addEventListener('change', (e) => {
        const type = e.target.value;
        document.getElementById('centerSelectGroup').style.display = type === 'Center' ? 'block' : 'none';
        document.getElementById('gnSelectGroup').style.display = type === 'GN Division' ? 'block' : 'none';
    });

    document.getElementById('editIssueCarePackageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const recipientType = document.getElementById('recipientType').value;
        const centerId = document.getElementById('issueCenterId').value;
        const gnId = document.getElementById('issueGNId').value;
        
        if (recipientType === 'Center' && !centerId) {
            showNotification('Please select a center', 'error');
            return;
        }
        if (recipientType === 'GN Division' && !gnId) {
            showNotification('Please select a GN division', 'error');
            return;
        }
        
        const issueData = {
            Template_ID: parseInt(document.getElementById('issueTemplateId').value),
            Date_Issued: document.getElementById('dateIssued').value,
            Packages_Issued: parseFloat(document.getElementById('packagesIssued').value),
            Recipient_Type: recipientType,
            Center_ID: centerId ? parseInt(centerId) : null,
            GN_ID: gnId ? parseInt(gnId) : null,
            Officer_Name: document.getElementById('issueOfficerName').value,
            Officer_NIC: document.getElementById('issueOfficerNIC').value,
            Remarks: document.getElementById('issueRemarks').value
        };

        try {
            await window.api.carePackages.updateIssue(issueId, issueData);
            showNotification('Care package issue updated successfully', 'success');
            closeModal();
            loadCarePackages();
        } catch (error) {
            console.error('Error updating care package issue:', error);
            showNotification('Failed to update care package issue', 'error');
        }
    });
}

async function deleteCarePackageIssue(issueId) {
    showConfirm('Are you sure you want to delete this care package issue? This will affect stock calculations.', async () => {
        try {
            await window.api.carePackages.deleteIssue(issueId);
            showNotification('Care package issue deleted successfully', 'success');
            loadCarePackages();
        } catch (error) {
            console.error('Error deleting care package issue:', error);
            showNotification('Failed to delete care package issue', 'error');
        }
    });
}

// Make care package functions globally accessible for onclick handlers
window.viewCarePackageTemplate = viewCarePackageTemplate;
window.editCarePackageTemplate = editCarePackageTemplate;
window.deleteCarePackageTemplate = deleteCarePackageTemplate;
window.addTemplateItemRow = addTemplateItemRow;
window.removeTemplateItem = removeTemplateItem;
window.viewCarePackageIssue = viewCarePackageIssue;
window.editCarePackageIssue = editCarePackageIssue;

// ============ CSV BULK UPLOAD FUNCTIONALITY ============

// Show bulk upload modal
function showBulkUploadModal(type) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    const typeConfig = {
        items: {
            title: 'Bulk Upload Items',
            csvFormat: 'Item_Name,Unit_Measure,Category,Reorder_Level,Status',
            example: 'Rice,Kg,Food,100,Active\nDal,Kg,Food,50,Active\nSugar,Kg,Food,75,Active',
            description: 'Upload items in CSV format. Required columns: Item_Name, Unit_Measure, Category. Optional: Reorder_Level (default: 0), Status (default: Active)'
        },
        centers: {
            title: 'Bulk Upload Centers',
            csvFormat: 'Center_Name,GN_Division_Name,Contact_Person,Contact_Phone,Status',
            example: 'Center A,GN Division 1,John Doe,0771234567,Active\nCenter B,GN Division 2,Jane Smith,0777654321,Active',
            description: 'Upload centers in CSV format. Required columns: Center_Name. Optional: GN_Division_Name (must exist in GN Divisions), Contact_Person, Contact_Phone, Status (default: Active)'
        },
        gn: {
            title: 'Bulk Upload GN Divisions',
            csvFormat: 'GN_Division_Name,DS_Division,Status',
            example: 'GN Division 1,Aranayake,Active\nGN Division 2,Aranayake,Active\nGN Division 3,Aranayake,Active',
            description: 'Upload GN Divisions in CSV format. Required columns: GN_Division_Name. Optional: DS_Division, Status (default: Active)'
        }
    };

    const config = typeConfig[type];
    
    modalTitle.textContent = config.title;
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4>CSV Format Guidelines</h4>
            <p>${config.description}</p>
            <p><strong>CSV Header (first line):</strong></p>
            <code style="display: block; background: #f4f4f4; padding: 10px; margin: 10px 0; border-radius: 4px; font-size: 12px; white-space: pre-wrap; word-break: break-all;">${config.csvFormat}</code>
            <p><strong>Example:</strong></p>
            <code style="display: block; background: #f4f4f4; padding: 10px; margin: 10px 0; border-radius: 4px; font-size: 12px; white-space: pre-wrap; word-break: break-all;">${config.csvFormat}\n${config.example}</code>
            <p style="color: #666; font-size: 13px;"><strong>Important:</strong> File must be saved as CSV with UTF-8 encoding to support Sinhala/Tamil text.</p>
        </div>
        <div class="form-group">
            <label>Select CSV File</label>
            <input type="file" id="csvFileInput" accept=".csv" class="form-control" style="padding: 8px;">
        </div>
        <div id="uploadPreview" style="margin-top: 20px; display: none;">
            <h4>Preview (first 5 rows)</h4>
            <div id="previewContent" style="max-height: 300px; overflow: auto; background: #f9f9f9; padding: 10px; border-radius: 4px; font-size: 12px;"></div>
        </div>
        <div id="uploadProgress" style="display: none; margin-top: 20px;">
            <div class="progress-bar" style="width: 100%; background: #e0e0e0; border-radius: 4px; overflow: hidden; height: 24px;">
                <div id="progressFill" style="width: 0%; background: #4CAF50; height: 100%; transition: width 0.3s; text-align: center; line-height: 24px; color: white; font-size: 12px;"></div>
            </div>
            <p id="uploadStatus" style="margin-top: 10px; font-size: 13px;"></p>
        </div>
        <div class="form-actions">
            <button type="button" id="cancelBtn" class="btn btn-secondary">Cancel</button>
            <button type="button" id="uploadBtn" class="btn btn-primary" disabled>Upload</button>
        </div>
    `;

    modal.style.display = 'flex';

    // File input handler
    const fileInput = document.getElementById('csvFileInput');
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await previewCSV(file, type);
            document.getElementById('uploadBtn').disabled = false;
        }
    });

    // Upload button handler
    document.getElementById('uploadBtn').addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (file) {
            await processBulkUpload(file, type);
        }
    });

    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
}

// Preview CSV file
async function previewCSV(file, type) {
    try {
        const text = await readFileAsUTF8(file);
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            showNotification('CSV file must contain at least a header row and one data row', 'error');
            return;
        }

        const preview = lines.slice(0, 6).join('\n'); // Header + 5 rows
        document.getElementById('previewContent').textContent = preview;
        document.getElementById('uploadPreview').style.display = 'block';
    } catch (error) {
        console.error('Error previewing CSV:', error);
        showNotification('Error reading CSV file', 'error');
    }
}

// Read file as UTF-8
function readFileAsUTF8(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file, 'UTF-8'); // Explicitly read as UTF-8
    });
}

// Parse CSV with UTF-8 support
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index].trim();
            });
            rows.push(row);
        }
    }

    return { headers, rows };
}

// Parse a single CSV line (handles quoted fields)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// Process bulk upload
async function processBulkUpload(file, type) {
    const uploadBtn = document.getElementById('uploadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const progressDiv = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const statusText = document.getElementById('uploadStatus');

    uploadBtn.disabled = true;
    cancelBtn.disabled = true;
    progressDiv.style.display = 'block';
    progressFill.style.width = '0%';
    progressFill.textContent = '0%';
    statusText.textContent = 'Reading CSV file...';

    try {
        const text = await readFileAsUTF8(file);
        const { headers, rows } = parseCSV(text);

        if (rows.length === 0) {
            throw new Error('No data rows found in CSV');
        }

        statusText.textContent = `Processing ${rows.length} records...`;
        progressFill.style.width = '30%';
        progressFill.textContent = '30%';

        // Send to main process for bulk insert
        const result = await window.api.bulkUpload[type](rows);

        progressFill.style.width = '100%';
        progressFill.textContent = '100%';
        statusText.textContent = `Success! Imported ${result.success} records. ${result.failed > 0 ? `Failed: ${result.failed}` : ''}`;
        
        if (result.errors && result.errors.length > 0) {
            console.error('Upload errors:', result.errors);
            statusText.textContent += '\nSome records failed. Check console for details.';
        }

        showNotification(`Bulk upload completed: ${result.success} records imported`, 'success');
        
        // Re-enable cancel button to allow closing
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Close';
        
        setTimeout(() => {
            closeModal();
            // Refresh the appropriate page
            const pageMap = { items: 'items', centers: 'centers', gn: 'gn-divisions' };
            loadPageData(pageMap[type]);
        }, 2000);

    } catch (error) {
        console.error('Error processing bulk upload:', error);
        progressFill.style.background = '#f44336';
        progressFill.style.width = '100%';
        progressFill.textContent = 'Error';
        statusText.textContent = `Upload failed: ${error.message}`;
        showNotification(`Upload failed: ${error.message}`, 'error');
        uploadBtn.disabled = false;
        cancelBtn.disabled = false;
    }
}
window.deleteCarePackageIssue = deleteCarePackageIssue;

