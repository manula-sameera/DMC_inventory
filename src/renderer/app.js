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
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    // Toggle sidebar collapse
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });

    // Hamburger menu to expand sidebar
    hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.remove('collapsed');
        localStorage.setItem('sidebarCollapsed', 'false');
    });

    // Restore sidebar state
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
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
        'dashboard': 'Dashboard',
        'current-stock': 'Current Stock',
        'incoming': 'Incoming Stock',
        'donations': 'Donations',
        'outgoing': 'Dispatch/Outgoing Stock',
        'care-packages': 'Care Packages',
        'items': 'Items Master',
        'centers': 'Centers Master',
        'gn-divisions': 'GN Divisions',
        'reports': 'Reports',
        'settings': 'Settings'
    };
    document.getElementById('page-title').textContent = titles[pageName];

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

    // Donation Bills
    document.getElementById('addDonationBillBtn').addEventListener('click', showAddDonationBillModal);

    // Outgoing Stock Bills
    document.getElementById('addOutgoingBillBtn').addEventListener('click', showAddOutgoingBillModal);

    // Settings
    document.getElementById('exportDbBtn').addEventListener('click', exportDatabase);
    document.getElementById('importDbBtn').addEventListener('click', importDatabase);

    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });

    // Stock search
    document.getElementById('stock-search').addEventListener('input', filterStockTable);
}

// Dashboard Functions
async function loadDashboard() {
    try {
        const [items, centers, incoming, donations, outgoing, stock, lowStock] = await Promise.all([
            window.api.items.getActive(),
            window.api.centers.getActive(),
            window.api.incoming.getAll(),
            window.api.donations.getAll(),
            window.api.outgoing.getAll(),
            window.api.stock.getCurrent(),
            window.api.stock.getLowStock()
        ]);

        currentData = { items, centers, incoming, donations, outgoing, currentStock: stock, lowStock };

        // Update stats
        document.getElementById('total-items').textContent = items.length;
        document.getElementById('low-stock-count').textContent = lowStock.length;
        document.getElementById('total-centers').textContent = centers.length;
        document.getElementById('total-transactions').textContent = 
            incoming.length + donations.length + outgoing.length;

        // Update low stock table
        renderLowStockTable(lowStock);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

function renderLowStockTable(data) {
    const tbody = document.querySelector('#low-stock-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No low stock items</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = `
            <tr>
                <td>${escapeHtml(item.Item_Name)}</td>
                <td>${escapeHtml(item.Category)}</td>
                <td><strong>${Number(item.Current_Quantity).toFixed(2)}</strong></td>
                <td>${item.Reorder_Level}</td>
                <td>${escapeHtml(item.Unit_Measure)}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Current Stock Functions
async function loadCurrentStock() {
    try {
        const stock = await window.api.stock.getCurrent();
        currentData.currentStock = stock;
        renderCurrentStockTable(stock);
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
                <td>${item.Item_ID}</td>
                <td>${escapeHtml(item.Item_Name)}</td>
                <td>${escapeHtml(item.Category)}</td>
                <td><strong>${Number(item.Current_Quantity).toFixed(2)}</strong></td>
                <td>${escapeHtml(item.Unit_Measure)}</td>
                <td>${item.Total_Incoming || 0}</td>
                <td>${item.Total_Outgoing || 0}</td>
                <td>${item.Reorder_Level}</td>
                <td><span class="status-badge ${statusClass}">${item.Stock_Status}</span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function filterStockTable() {
    const searchTerm = document.getElementById('stock-search').value.toLowerCase();
    const filtered = currentData.currentStock.filter(item =>
        item.Item_Name.toLowerCase().includes(searchTerm) ||
        item.Category.toLowerCase().includes(searchTerm)
    );
    renderCurrentStockTable(filtered);
}

// Items Functions
async function loadItems() {
    try {
        const items = await window.api.items.getAll();
        currentData.items = items;
        renderItemsTable(items);
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
                <td>${item.Item_ID}</td>
                <td>${escapeHtml(item.Item_Name)}</td>
                <td>${escapeHtml(item.Unit_Measure)}</td>
                <td>${escapeHtml(item.Category)}</td>
                <td>${item.Reorder_Level}</td>
                <td><span class="status-badge ${statusClass}">${item.Status}</span></td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="editItem(${item.Item_ID})">Edit</button>
                    ${item.Status === 'Active' ? 
                        `<button class="btn btn-small btn-danger" onclick="deleteItem(${item.Item_ID})">Delete</button>` : ''}
                </td>
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
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        await window.api.items.delete(itemId);
        loadItems();
        showNotification('Item deleted successfully', 'success');
    } catch (error) {
        showNotification('Failed to delete item: ' + error.message, 'error');
    }
}

// Centers Functions
async function loadCenters() {
    try {
        const centers = await window.api.centers.getAll();
        currentData.centers = centers;
        renderCentersTable(centers);
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
                <td>${center.Center_ID}</td>
                <td>${escapeHtml(center.Center_Name)}</td>
                <td>${escapeHtml(center.GN_Division_Name || '-')}</td>
                <td>${escapeHtml(center.Contact_Person || '-')}</td>
                <td>${escapeHtml(center.Contact_Phone || '-')}</td>
                <td><span class="status-badge ${statusClass}">${center.Status}</span></td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="editCenter(${center.Center_ID})">Edit</button>
                    ${center.Status === 'Active' ? 
                        `<button class="btn btn-small btn-danger" onclick="deleteCenter(${center.Center_ID})">Delete</button>` : ''}
                </td>
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
    if (!confirm('Are you sure you want to delete this center?')) return;

    try {
        await window.api.centers.delete(centerId);
        loadCenters();
        showNotification('Center deleted successfully', 'success');
    } catch (error) {
        showNotification('Failed to delete center: ' + error.message, 'error');
    }
}

// Incoming Stock Functions
// ==================== INCOMING STOCK BILLS ====================

async function loadIncomingStock() {
    try {
        const bills = await window.api.incoming.bills.getAll();
        currentData.incomingBills = bills;
        renderIncomingBillsTable(bills);
    } catch (error) {
        console.error('Error loading incoming bills:', error);
        showNotification('Failed to load incoming bills', 'error');
    }
}

function renderIncomingBillsTable(data) {
    const tbody = document.querySelector('#incoming-bills-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No incoming bills found</td></tr>';
        return;
    }

    data.forEach(bill => {
        const row = `
            <tr>
                <td><strong>${escapeHtml(bill.Bill_Number || 'N/A')}</strong></td>
                <td>${formatDate(bill.Date_Received)}</td>
                <td>${escapeHtml(bill.Supplier_Name)}</td>
                <td><span class="badge">${bill.Item_Count || 0} items</span></td>
                <td><strong>${bill.Total_Quantity || 0}</strong></td>
                <td>${escapeHtml(bill.Remarks || '-')}</td>
                <td class="actions">
                    <button class="btn-icon btn-view" onclick="viewIncomingBillDetails(${bill.Bill_ID})" title="View">👁️</button>
                    <button class="btn-icon btn-edit" onclick="showEditIncomingBillModal(${bill.Bill_ID})" title="Edit">✏️</button>
                    <button class="btn-icon btn-delete" onclick="deleteIncomingBill(${bill.Bill_ID})" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function showAddIncomingModal() {
    const modalBody = `
        <form id="incomingForm">
            <div class="form-group">
                <label>Date Received *</label>
                <input type="date" id="dateReceived" value="${getCurrentDate()}" required>
            </div>
            <div class="form-group">
                <label>Item *</label>
                <div id="itemIdContainer"><div class="loading-indicator">Loading items...</div></div>
            </div>
            <div class="form-group">
                <label>Supplier Name *</label>
                <input type="text" id="supplierName" required>
            </div>
            <div class="form-group">
                <label>Quantity Received *</label>
                <input type="number" id="qtyReceived" min="1" required>
            </div>
            <div class="form-group">
                <label>Remarks</label>
                <textarea id="remarks"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Record</button>
            </div>
        </form>
    `;

    showModal('Add Incoming Stock', modalBody);

    // Load items asynchronously without blocking UI
    try {
        if (currentData.items.length === 0) {
            currentData.items = await window.api.items.getActive();
        }
        
        const itemOptions = currentData.items
            .filter(i => i.Status === 'Active')
            .map(i => ({ 
                value: i.Item_ID.toString(), 
                text: `${i.Item_Name} (${i.Unit_Measure})` 
            }));

        const itemSelect = new SearchableSelect('itemIdContainer', itemOptions, 'Search items...');
        window.currentItemSelect = itemSelect;
    } catch (error) {
        console.error('Error loading items:', error);
        document.getElementById('itemIdContainer').innerHTML = '<div class="error-message">Failed to load items</div>';
    }

    // Add form submit handler immediately
    document.getElementById('incomingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const itemId = window.currentItemSelect ? window.currentItemSelect.getValue() : '';
        if (!itemId) {
            showNotification('Please select an item', 'error');
            return;
        }
        try {
            await window.api.incoming.add({
                Date_Received: document.getElementById('dateReceived').value,
                Item_ID: parseInt(itemId),
                Supplier_Name: document.getElementById('supplierName').value,
                Qty_Received: parseInt(document.getElementById('qtyReceived').value),
                Remarks: document.getElementById('remarks').value || null
            });
            closeModal();
            loadIncomingStock();
            showNotification('Incoming stock added successfully', 'success');
        } catch (error) {
            showNotification('Failed to add incoming stock: ' + error.message, 'error');
        }
    });
}

async function showEditIncomingModal(grnId) {
    const stock = currentData.incoming.find(s => s.GRN_ID === grnId);
    if (!stock) {
        showNotification('Record not found', 'error');
        return;
    }

    const modalBody = `
        <form id="editIncomingForm">
            <div class="form-group">
                <label>Date Received *</label>
                <input type="date" id="dateReceived" value="${stock.Date_Received.split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label>Item *</label>
                <div id="itemIdContainer"></div>
            </div>
            <div class="form-group">
                <label>Supplier Name *</label>
                <input type="text" id="supplierName" value="${escapeHtml(stock.Supplier_Name)}" required>
            </div>
            <div class="form-group">
                <label>Quantity Received *</label>
                <input type="number" id="qtyReceived" value="${stock.Qty_Received}" min="1" required>
            </div>
            <div class="form-group">
                <label>Remarks</label>
                <textarea id="remarks">${escapeHtml(stock.Remarks || '')}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Update Record</button>
            </div>
        </form>
    `;

    showModal('Edit Incoming Stock', modalBody);

    // Load all items for editing (not just active ones)
    try {
        const items = await window.api.items.getAll();
        const itemOptions = items.map(i => ({ 
            value: i.Item_ID.toString(), 
            text: `${i.Item_Name} (${i.Unit_Measure})${i.Status === 'Inactive' ? ' [Inactive]' : ''}` 
        }));

        const itemSelect = new SearchableSelect('itemIdContainer', itemOptions, 'Search items...');
        itemSelect.setValue(stock.Item_ID.toString());
        window.currentItemSelect = itemSelect;
    } catch (error) {
        console.error('Error loading items:', error);
    }

    document.getElementById('editIncomingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const itemId = window.currentItemSelect ? window.currentItemSelect.getValue() : '';
        if (!itemId) {
            showNotification('Please select an item', 'error');
            return;
        }
        try {
            await window.api.incoming.update(grnId, {
                Date_Received: document.getElementById('dateReceived').value,
                Item_ID: parseInt(itemId),
                Supplier_Name: document.getElementById('supplierName').value,
                Qty_Received: parseInt(document.getElementById('qtyReceived').value),
                Remarks: document.getElementById('remarks').value || null
            });
            closeModal();
            loadIncomingStock();
            showNotification('Incoming stock updated successfully', 'success');
        } catch (error) {
            showNotification('Failed to update incoming stock: ' + error.message, 'error');
        }
    });
}

async function deleteIncomingStock(grnId) {
    if (!confirm('Are you sure you want to delete this incoming stock record?')) {
        return;
    }
    try {
        await window.api.incoming.delete(grnId);
        loadIncomingStock();
        showNotification('Incoming stock deleted successfully', 'success');
    } catch (error) {
        showNotification('Failed to delete incoming stock: ' + error.message, 'error');
    }
}

// ==================== DONATIONS & OUTGOING - Handled by bill-functions.js ====================
// All donation and outgoing stock functions are now in bill-functions.js
// This includes:
// - loadDonations(), loadOutgoingStock()
// - All modal and CRUD operations for donations and outgoing bills

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
    if (!confirm('Warning: Importing a database will replace all current data. Continue?')) {
        return;
    }

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
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Simple console notification for now
    // Can be enhanced with a toast notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(message);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
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

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                this.hideDropdown();
            }
        });
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
    const generateReportBtn = document.getElementById('generateReportBtn');

    // Report type change
    reportType.addEventListener('change', () => {
        const type = reportType.value;
        if (type === 'current-stock') {
            dateRangeSection.style.display = 'none';
        } else {
            dateRangeSection.style.display = 'block';
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
}

async function generateReport() {
    try {
        const reportType = document.getElementById('reportType').value;
        const selectAllItems = document.getElementById('selectAllItems').checked;
        
        let selectedItemIds = null;
        if (!selectAllItems) {
            selectedItemIds = Array.from(document.querySelectorAll('.item-checkbox:checked'))
                .map(cb => parseInt(cb.value));
            
            if (selectedItemIds.length === 0) {
                showNotification('Please select at least one item', 'error');
                return;
            }
        }

        const dateFrom = document.getElementById('reportDateFrom').value;
        const dateTo = document.getElementById('reportDateTo').value;

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
            dateTo
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

// GN Divisions Functions
async function loadGNDivisions() {
    try {
        const gnDivisions = await window.api.gnDivisions.getAll();
        currentData.gnDivisions = gnDivisions;
        renderGNDivisionsTable(gnDivisions);
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
                <td>${gn.GN_ID}</td>
                <td>${escapeHtml(gn.GN_Division_Name)}</td>
                <td>${escapeHtml(gn.DS_Division || '-')}</td>
                <td><span class="status-badge ${statusClass}">${gn.Status}</span></td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="editGNDivision(${gn.GN_ID})">Edit</button>
                    ${gn.Status === 'Active' ? 
                        `<button class="btn btn-small btn-danger" onclick="deleteGNDivision(${gn.GN_ID})">Delete</button>` : ''}
                </td>
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
    if (!confirm('Are you sure you want to delete this GN division?')) return;

    try {
        await window.api.gnDivisions.delete(gnId);
        showNotification('GN Division deleted successfully', 'success');
        loadGNDivisions();
    } catch (error) {
        console.error('Error deleting GN division:', error);
        showNotification('Failed to delete GN division', 'error');
    }
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
        renderCarePackageTemplatesTable(templates);
        renderCarePackageIssuesTable(issues);
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
                <td>${template.Template_ID}</td>
                <td>${escapeHtml(template.Package_Name)}</td>
                <td>${escapeHtml(template.Description || '-')}</td>
                <td>${itemsCount.length}</td>
                <td><span class="status-badge ${statusClass}">${template.Status}</span></td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="viewCarePackageTemplate(${template.Template_ID})">View</button>
                    <button class="btn btn-small btn-secondary" onclick="editCarePackageTemplate(${template.Template_ID})">Edit</button>
                    ${template.Status === 'Active' ? 
                        `<button class="btn btn-small btn-danger" onclick="deleteCarePackageTemplate(${template.Template_ID})">Delete</button>` : ''}
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function renderCarePackageIssuesTable(data) {
    const tbody = document.querySelector('#care-package-issues-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No care package issues found</td></tr>';
        return;
    }

    data.forEach(issue => {
        const recipient = issue.Recipient_Type === 'Center' ? issue.Center_Name : issue.GN_Division_Name;
        const row = `
            <tr>
                <td>${issue.Issue_ID}</td>
                <td>${issue.Date_Issued}</td>
                <td>${escapeHtml(issue.Package_Name)}</td>
                <td>${issue.Packages_Issued}</td>
                <td>${issue.Recipient_Type}</td>
                <td>${escapeHtml(recipient)}</td>
                <td>${escapeHtml(issue.Officer_Name)}</td>
                <td>${escapeHtml(issue.Officer_NIC)}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="viewCarePackageIssue(${issue.Issue_ID})">View</button>
                    <button class="btn btn-small btn-secondary" onclick="editCarePackageIssue(${issue.Issue_ID})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteCarePackageIssue(${issue.Issue_ID})">Delete</button>
                </td>
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
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
            </div>
        </div>
    `;

    showModal('Care Package Template Details', modalBody);
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
                <button type="button" class="btn btn-danger btn-small" onclick="removeTemplateItem(${item.Template_Item_ID})">✕</button>
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
                    <select id="addItemSelect" class="form-control" style="flex:2;">
                        <option value="">Select an item...</option>
                        ${allItems.map(item => `<option value="${item.Item_ID}">${escapeHtml(item.Item_Name)} (${escapeHtml(item.Unit_Measure)})</option>`).join('')}
                    </select>
                    <input type="number" id="addItemQty" class="form-control" placeholder="Qty" style="flex:1;" min="0.01" step="0.01">
                    <input type="text" id="addItemRemarks" class="form-control" placeholder="Remarks" style="flex:2;">
                    <button type="button" class="btn btn-secondary" onclick="addTemplateItemRow(${templateId})">➕ Add</button>
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
    const itemSelect = document.getElementById('addItemSelect');
    const qtyInput = document.getElementById('addItemQty');
    const remarksInput = document.getElementById('addItemRemarks');
    
    const itemId = parseInt(itemSelect.value);
    const qty = parseFloat(qtyInput.value);
    const remarks = remarksInput.value || '';
    
    if (!itemId || isNaN(itemId)) {
        showNotification('Please select an item', 'error');
        return;
    }
    
    if (!qty || isNaN(qty) || qty < 1) {
        showNotification('Please enter a valid quantity', 'error');
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
    if (!confirm('Remove this item from the package?')) return;
    
    try {
        await window.api.carePackages.deleteTemplateItem(templateItemId);
        document.querySelector(`[data-item-id="${templateItemId}"]`).remove();
        showNotification('Item removed from package', 'success');
    } catch (error) {
        console.error('Error removing template item:', error);
        showNotification('Failed to remove item', 'error');
    }
}

async function deleteCarePackageTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this care package template?')) return;

    try {
        await window.api.carePackages.deleteTemplate(templateId);
        showNotification('Care package template deleted successfully', 'success');
        loadCarePackages();
    } catch (error) {
        console.error('Error deleting care package template:', error);
        showNotification('Failed to delete care package template', 'error');
    }
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
    if (!confirm('Are you sure you want to delete this care package issue? This will affect stock calculations.')) return;

    try {
        await window.api.carePackages.deleteIssue(issueId);
        showNotification('Care package issue deleted successfully', 'success');
        loadCarePackages();
    } catch (error) {
        console.error('Error deleting care package issue:', error);
        showNotification('Failed to delete care package issue', 'error');
    }
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

