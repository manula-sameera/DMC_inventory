// Application State
let currentData = {
    items: [],
    centers: [],
    incoming: [],
    donations: [],
    outgoing: [],
    currentStock: [],
    lowStock: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeEventListeners();
    loadDashboard();
});

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
        'items': 'Items Master',
        'centers': 'Centers Master',
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
        case 'outgoing':
            loadOutgoingStock();
            break;
        case 'items':
            loadItems();
            break;
        case 'centers':
            loadCenters();
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

    // Centers
    document.getElementById('addCenterBtn').addEventListener('click', showAddCenterModal);

    // Incoming Stock
    document.getElementById('addIncomingBtn').addEventListener('click', showAddIncomingModal);

    // Donations
    document.getElementById('addDonationBtn').addEventListener('click', showAddDonationModal);

    // Outgoing Stock
    document.getElementById('addOutgoingBtn').addEventListener('click', showAddOutgoingModal);

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
                <td><strong>${item.Current_Quantity}</strong></td>
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No stock data available</td></tr>';
        return;
    }

    data.forEach(item => {
        const statusClass = item.Stock_Status === 'Low Stock' ? 'status-low' : 'status-ok';
        const row = `
            <tr>
                <td>${item.Item_ID}</td>
                <td>${escapeHtml(item.Item_Name)}</td>
                <td>${escapeHtml(item.Category)}</td>
                <td><strong>${item.Current_Quantity}</strong></td>
                <td>${escapeHtml(item.Unit_Measure)}</td>
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
                <td>${escapeHtml(center.District)}</td>
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

function showAddCenterModal() {
    const modalBody = `
        <form id="centerForm">
            <div class="form-group">
                <label>Center Name *</label>
                <input type="text" id="centerName" required>
            </div>
            <div class="form-group">
                <label>District *</label>
                <input type="text" id="district" required>
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
            await window.api.centers.add({
                Center_Name: document.getElementById('centerName').value,
                District: document.getElementById('district').value,
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

    const modalBody = `
        <form id="centerForm">
            <div class="form-group">
                <label>Center Name *</label>
                <input type="text" id="centerName" value="${escapeHtml(center.Center_Name)}" required>
            </div>
            <div class="form-group">
                <label>District *</label>
                <input type="text" id="district" value="${escapeHtml(center.District)}" required>
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
            await window.api.centers.update(centerId, {
                Center_Name: document.getElementById('centerName').value,
                District: document.getElementById('district').value,
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
async function loadIncomingStock() {
    try {
        const incoming = await window.api.incoming.getAll();
        currentData.incoming = incoming;
        renderIncomingTable(incoming);
    } catch (error) {
        console.error('Error loading incoming stock:', error);
        showNotification('Failed to load incoming stock', 'error');
    }
}

function renderIncomingTable(data) {
    const tbody = document.querySelector('#incoming-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No incoming stock records</td></tr>';
        return;
    }

    data.forEach(stock => {
        const row = `
            <tr>
                <td>${stock.GRN_ID}</td>
                <td>${formatDate(stock.Date_Received)}</td>
                <td>${escapeHtml(stock.Item_Name)}</td>
                <td>${escapeHtml(stock.Supplier_Name)}</td>
                <td><strong>${stock.Qty_Received}</strong></td>
                <td>${escapeHtml(stock.Unit_Measure)}</td>
                <td>${escapeHtml(stock.Remarks || '-')}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function showAddIncomingModal() {
    const itemsOptions = currentData.items
        .filter(i => i.Status === 'Active')
        .map(i => `<option value="${i.Item_ID}">${escapeHtml(i.Item_Name)} (${escapeHtml(i.Unit_Measure)})</option>`)
        .join('');

    const modalBody = `
        <form id="incomingForm">
            <div class="form-group">
                <label>Date Received *</label>
                <input type="date" id="dateReceived" value="${getCurrentDate()}" required>
            </div>
            <div class="form-group">
                <label>Item *</label>
                <select id="itemId" required>
                    <option value="">Select Item</option>
                    ${itemsOptions}
                </select>
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

    // Load items if not already loaded
    if (currentData.items.length === 0) {
        window.api.items.getActive().then(items => {
            currentData.items = items;
            const select = document.getElementById('itemId');
            select.innerHTML = '<option value="">Select Item</option>' + 
                items.map(i => `<option value="${i.Item_ID}">${escapeHtml(i.Item_Name)} (${escapeHtml(i.Unit_Measure)})</option>`).join('');
        });
    }

    document.getElementById('incomingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await window.api.incoming.add({
                Date_Received: document.getElementById('dateReceived').value,
                Item_ID: parseInt(document.getElementById('itemId').value),
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

// Donations Functions
async function loadDonations() {
    try {
        const donations = await window.api.donations.getAll();
        currentData.donations = donations;
        renderDonationsTable(donations);
    } catch (error) {
        console.error('Error loading donations:', error);
        showNotification('Failed to load donations', 'error');
    }
}

function renderDonationsTable(data) {
    const tbody = document.querySelector('#donations-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No donation records</td></tr>';
        return;
    }

    data.forEach(donation => {
        const row = `
            <tr>
                <td>${donation.Donation_ID}</td>
                <td>${formatDate(donation.Date_Received)}</td>
                <td>${escapeHtml(donation.Item_Name)}</td>
                <td>${escapeHtml(donation.Donor_Name)}</td>
                <td><strong>${donation.Qty_Received}</strong></td>
                <td>${escapeHtml(donation.Unit_Measure)}</td>
                <td>${escapeHtml(donation.Remarks || '-')}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function showAddDonationModal() {
    const itemsOptions = currentData.items
        .filter(i => i.Status === 'Active')
        .map(i => `<option value="${i.Item_ID}">${escapeHtml(i.Item_Name)} (${escapeHtml(i.Unit_Measure)})</option>`)
        .join('');

    const modalBody = `
        <form id="donationForm">
            <div class="form-group">
                <label>Date Received *</label>
                <input type="date" id="dateReceived" value="${getCurrentDate()}" required>
            </div>
            <div class="form-group">
                <label>Item *</label>
                <select id="itemId" required>
                    <option value="">Select Item</option>
                    ${itemsOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Donor Name *</label>
                <input type="text" id="donorName" required>
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
                <button type="submit" class="btn btn-primary">Add Donation</button>
            </div>
        </form>
    `;

    showModal('Add Donation Record', modalBody);

    // Load items if not already loaded
    if (currentData.items.length === 0) {
        window.api.items.getActive().then(items => {
            currentData.items = items;
            const select = document.getElementById('itemId');
            select.innerHTML = '<option value="">Select Item</option>' + 
                items.map(i => `<option value="${i.Item_ID}">${escapeHtml(i.Item_Name)} (${escapeHtml(i.Unit_Measure)})</option>`).join('');
        });
    }

    document.getElementById('donationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await window.api.donations.add({
                Date_Received: document.getElementById('dateReceived').value,
                Item_ID: parseInt(document.getElementById('itemId').value),
                Donor_Name: document.getElementById('donorName').value,
                Qty_Received: parseInt(document.getElementById('qtyReceived').value),
                Remarks: document.getElementById('remarks').value || null
            });
            closeModal();
            loadDonations();
            showNotification('Donation added successfully', 'success');
        } catch (error) {
            showNotification('Failed to add donation: ' + error.message, 'error');
        }
    });
}

// Outgoing Stock Functions
async function loadOutgoingStock() {
    try {
        const outgoing = await window.api.outgoing.getAll();
        currentData.outgoing = outgoing;
        renderOutgoingTable(outgoing);
    } catch (error) {
        console.error('Error loading outgoing stock:', error);
        showNotification('Failed to load outgoing stock', 'error');
    }
}

function renderOutgoingTable(data) {
    const tbody = document.querySelector('#outgoing-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No dispatch records</td></tr>';
        return;
    }

    data.forEach(stock => {
        const row = `
            <tr>
                <td>${stock.Dispatch_ID}</td>
                <td>${formatDate(stock.Date_Issued)}</td>
                <td>${escapeHtml(stock.Center_Name)} - ${escapeHtml(stock.District)}</td>
                <td>${escapeHtml(stock.Item_Name)}</td>
                <td>${stock.Qty_Requested}</td>
                <td><strong>${stock.Qty_Issued}</strong></td>
                <td>${escapeHtml(stock.Officer_Name)}</td>
                <td>${escapeHtml(stock.Officer_NIC)}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function showAddOutgoingModal() {
    const itemsOptions = currentData.items
        .filter(i => i.Status === 'Active')
        .map(i => `<option value="${i.Item_ID}">${escapeHtml(i.Item_Name)} (${escapeHtml(i.Unit_Measure)})</option>`)
        .join('');

    const centersOptions = currentData.centers
        .filter(c => c.Status === 'Active')
        .map(c => `<option value="${c.Center_ID}">${escapeHtml(c.Center_Name)} - ${escapeHtml(c.District)}</option>`)
        .join('');

    const modalBody = `
        <form id="outgoingForm">
            <div class="form-group">
                <label>Date Issued *</label>
                <input type="date" id="dateIssued" value="${getCurrentDate()}" required>
            </div>
            <div class="form-group">
                <label>Center *</label>
                <select id="centerId" required>
                    <option value="">Select Center</option>
                    ${centersOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Item *</label>
                <select id="itemId" required>
                    <option value="">Select Item</option>
                    ${itemsOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Quantity Requested *</label>
                <input type="number" id="qtyRequested" min="1" required>
            </div>
            <div class="form-group">
                <label>Quantity Issued *</label>
                <input type="number" id="qtyIssued" min="0" required>
            </div>
            <div class="form-group">
                <label>Officer Name *</label>
                <input type="text" id="officerName" required>
            </div>
            <div class="form-group">
                <label>Officer NIC *</label>
                <input type="text" id="officerNIC" required>
            </div>
            <div class="form-group">
                <label>Remarks</label>
                <textarea id="remarks"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Dispatch Stock</button>
            </div>
        </form>
    `;

    showModal('Dispatch Stock', modalBody);

    // Load items and centers if not already loaded
    if (currentData.items.length === 0 || currentData.centers.length === 0) {
        Promise.all([
            window.api.items.getActive(),
            window.api.centers.getActive()
        ]).then(([items, centers]) => {
            currentData.items = items;
            currentData.centers = centers;
            
            const itemSelect = document.getElementById('itemId');
            itemSelect.innerHTML = '<option value="">Select Item</option>' + 
                items.map(i => `<option value="${i.Item_ID}">${escapeHtml(i.Item_Name)} (${escapeHtml(i.Unit_Measure)})</option>`).join('');
            
            const centerSelect = document.getElementById('centerId');
            centerSelect.innerHTML = '<option value="">Select Center</option>' + 
                centers.map(c => `<option value="${c.Center_ID}">${escapeHtml(c.Center_Name)} - ${escapeHtml(c.District)}</option>`).join('');
        });
    }

    document.getElementById('outgoingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await window.api.outgoing.add({
                Date_Issued: document.getElementById('dateIssued').value,
                Center_ID: parseInt(document.getElementById('centerId').value),
                Item_ID: parseInt(document.getElementById('itemId').value),
                Qty_Requested: parseInt(document.getElementById('qtyRequested').value),
                Qty_Issued: parseInt(document.getElementById('qtyIssued').value),
                Officer_Name: document.getElementById('officerName').value,
                Officer_NIC: document.getElementById('officerNIC').value,
                Remarks: document.getElementById('remarks').value || null
            });
            closeModal();
            loadOutgoingStock();
            showNotification('Stock dispatched successfully', 'success');
        } catch (error) {
            showNotification('Failed to dispatch stock: ' + error.message, 'error');
        }
    });
}

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
function showModal(title, body) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
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
