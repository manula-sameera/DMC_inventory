// ==================== BILL-BASED ENTRY SYSTEM ====================
// This file contains all the functions for bill-based entry of incoming, donations, and outgoing stock

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

async function showAddIncomingBillModal() {
    const modalBody = `
        <form id="incomingBillForm">
            <div class="bill-header-section">
                <h3>Bill Information</h3>
                <div class="form-group">
                    <label>Date Received *</label>
                    <input type="date" id="billDate" value="${getCurrentDate()}" required>
                </div>
                <div class="form-group">
                    <label>Supplier Name *</label>
                    <input type="text" id="supplierName" required list="supplierList" placeholder="Enter supplier name">
                    <datalist id="supplierList"></datalist>
                </div>
                <div class="form-group">
                    <label>Remarks</label>
                    <textarea id="billRemarks" rows="2" placeholder="General remarks for this bill"></textarea>
                </div>
            </div>
            
            <div class="bill-items-section">
                <h3>Items <span class="item-count" id="itemCount">(0 items)</span></h3>
                <div class="items-table-container">
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 40%">Item</th>
                                <th style="width: 20%">Quantity *</th>
                                <th style="width: 30%">Remarks</th>
                                <th style="width: 10%">Action</th>
                            </tr>
                        </thead>
                        <tbody id="billItemsBody"></tbody>
                    </table>
                </div>
                <button type="button" class="btn btn-secondary" onclick="addIncomingItemRow()">+ Add Item</button>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Bill</button>
            </div>
        </form>
    `;

    showModal('Add Incoming Bill (GRN)', modalBody);

    // Load suppliers for autocomplete
    loadSuppliersList();

    // Load items and setup handlers
    await ensureItemsLoaded();
    
    // Use setTimeout to ensure DOM is ready after innerHTML is set
    setTimeout(() => {
        // Add first item row
        addIncomingItemRow();

        // Form submit
        const form = document.getElementById('incomingBillForm');
        if (form) {
            form.addEventListener('submit', handleIncomingBillSubmit);
        }
    }, 0);
}

function addIncomingItemRow(item = null) {
    const tbody = document.getElementById('billItemsBody');
    const row = document.createElement('tr');
    const rowId = 'row_' + Date.now() + Math.random();
    row.id = rowId;

    const itemOptions = currentData.items
        .filter(i => i.Status === 'Active')
        .map(i => `<option value="${i.Item_ID}">${escapeHtml(i.Item_Name)} (${escapeHtml(i.Unit_Measure)})</option>`)
        .join('');

    row.innerHTML = `
        <td>
            <select class="item-select" required>
                <option value="">Select Item...</option>
                ${itemOptions}
            </select>
        </td>
        <td>
            <input type="number" class="item-quantity" min="1" value="${item ? item.Qty_Received : ''}" required>
        </td>
        <td>
            <input type="text" class="item-remarks" value="${item ? escapeHtml(item.Item_Remarks || '') : ''}" placeholder="Optional">
        </td>
        <td>
            <button type="button" class="btn-remove-item" onclick="removeItemRow('${rowId}')">×</button>
        </td>
    `;

    if (item) {
        row.querySelector('.item-select').value = item.Item_ID;
    }

    tbody.appendChild(row);
    updateItemCount();
}

function removeItemRow(rowId) {
    document.getElementById(rowId).remove();
    updateItemCount();
}

function updateItemCount() {
    const count = document.querySelectorAll('#billItemsBody tr').length;
    const countEl = document.getElementById('itemCount');
    if (countEl) {
        countEl.textContent = `(${count} item${count !== 1 ? 's' : ''})`;
    }
}

async function handleIncomingBillSubmit(e) {
    e.preventDefault();

    const billData = {
        Date_Received: document.getElementById('billDate').value,
        Supplier_Name: document.getElementById('supplierName').value.trim(),
        Remarks: document.getElementById('billRemarks').value.trim() || null,
        items: []
    };

    // Collect items
    const rows = document.querySelectorAll('#billItemsBody tr');
    if (rows.length === 0) {
        showNotification('Please add at least one item to the bill', 'error');
        return;
    }

    for (const row of rows) {
        const itemId = row.querySelector('.item-select').value;
        const quantity = parseInt(row.querySelector('.item-quantity').value);
        const remarks = row.querySelector('.item-remarks').value.trim() || null;

        if (!itemId || !quantity || quantity <= 0) {
            showNotification('Please fill all required item fields correctly', 'error');
            return;
        }

        billData.items.push({
            Item_ID: parseInt(itemId),
            Qty_Received: quantity,
            Item_Remarks: remarks
        });
    }

    try {
        const billId = await window.api.incoming.bills.add(billData);
        closeModal();
        loadIncomingStock();
        showNotification(`Bill created successfully! Bill ID: ${billId}`, 'success');
    } catch (error) {
        console.error('Error saving bill:', error);
        showNotification('Failed to save bill: ' + error.message, 'error');
    }
}

async function viewIncomingBillDetails(billId) {
    try {
        const bill = await window.api.incoming.bills.getDetails(billId);
        
        const itemsHtml = bill.items.map(item => `
            <tr>
                <td>${escapeHtml(item.Item_Name)}</td>
                <td><strong>${item.Qty_Received}</strong></td>
                <td>${escapeHtml(item.Unit_Measure)}</td>
                <td>${escapeHtml(item.Item_Remarks || '-')}</td>
            </tr>
        `).join('');

        const modalBody = `
            <div class="bill-details">
                <div class="detail-section">
                    <h3>Bill Information</h3>
                    <table class="details-table">
                        <tr><th>Bill Number:</th><td><strong>${escapeHtml(bill.Bill_Number)}</strong></td></tr>
                        <tr><th>Date:</th><td>${formatDate(bill.Date_Received)}</td></tr>
                        <tr><th>Supplier:</th><td>${escapeHtml(bill.Supplier_Name)}</td></tr>
                        <tr><th>Remarks:</th><td>${escapeHtml(bill.Remarks || 'N/A')}</td></tr>
                    </table>
                </div>
                <div class="detail-section">
                    <h3>Items (${bill.items.length})</h3>
                    <table class="items-detail-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Quantity</th>
                                <th>Unit</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                </div>
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="closeModal(); showEditIncomingBillModal(${billId})">Edit Bill</button>
                    <button class="btn btn-danger" onclick="deleteIncomingBill(${billId})">Delete Bill</button>
                </div>
            </div>
        `;

        showModal('Bill Details - ' + bill.Bill_Number, modalBody);
    } catch (error) {
        console.error('Error loading bill details:', error);
        showNotification('Failed to load bill details', 'error');
    }
}

async function showEditIncomingBillModal(billId) {
    try {
        const bill = await window.api.incoming.bills.getDetails(billId);
        
        const modalBody = `
            <form id="editIncomingBillForm">
                <input type="hidden" id="editBillId" value="${billId}">
                <div class="bill-header-section">
                    <h3>Bill Information</h3>
                    <div class="form-group">
                        <label>Bill Number</label>
                        <input type="text" value="${escapeHtml(bill.Bill_Number)}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Date Received *</label>
                        <input type="date" id="billDate" value="${bill.Date_Received.split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label>Supplier Name *</label>
                        <input type="text" id="supplierName" value="${escapeHtml(bill.Supplier_Name)}" required list="supplierList">
                        <datalist id="supplierList"></datalist>
                    </div>
                    <div class="form-group">
                        <label>Remarks</label>
                        <textarea id="billRemarks" rows="2">${escapeHtml(bill.Remarks || '')}</textarea>
                    </div>
                </div>
                
                <div class="bill-items-section">
                    <h3>Items <span class="item-count" id="itemCount">(0 items)</span></h3>
                    <div class="items-table-container">
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="width: 40%">Item</th>
                                    <th style="width: 20%">Quantity *</th>
                                    <th style="width: 30%">Remarks</th>
                                    <th style="width: 10%">Action</th>
                                </tr>
                            </thead>
                            <tbody id="billItemsBody"></tbody>
                        </table>
                    </div>
                    <button type="button" class="btn btn-secondary" onclick="addIncomingItemRow()">+ Add Item</button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Bill</button>
                </div>
            </form>
        `;

        showModal('Edit Incoming Bill', modalBody);

        // Load suppliers
        loadSuppliersList();

        // Load items and populate
        await ensureItemsLoaded();
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Add existing items
            bill.items.forEach(item => addIncomingItemRow(item));

            // Form submit
            const form = document.getElementById('editIncomingBillForm');
            if (form) {
                form.addEventListener('submit', handleIncomingBillUpdate);
            }
        }, 0);
    } catch (error) {
        console.error('Error loading bill for edit:', error);
        showNotification('Failed to load bill for editing', 'error');
    }
}

async function handleIncomingBillUpdate(e) {
    e.preventDefault();

    const billId = parseInt(document.getElementById('editBillId').value);
    const billData = {
        Date_Received: document.getElementById('billDate').value,
        Supplier_Name: document.getElementById('supplierName').value.trim(),
        Remarks: document.getElementById('billRemarks').value.trim() || null,
        items: []
    };

    // Collect items
    const rows = document.querySelectorAll('#billItemsBody tr');
    if (rows.length === 0) {
        showNotification('Please add at least one item to the bill', 'error');
        return;
    }

    for (const row of rows) {
        const itemId = row.querySelector('.item-select').value;
        const quantity = parseInt(row.querySelector('.item-quantity').value);
        const remarks = row.querySelector('.item-remarks').value.trim() || null;

        if (!itemId || !quantity || quantity <= 0) {
            showNotification('Please fill all required item fields correctly', 'error');
            return;
        }

        billData.items.push({
            Item_ID: parseInt(itemId),
            Qty_Received: quantity,
            Item_Remarks: remarks
        });
    }

    try {
        await window.api.incoming.bills.update(billId, billData);
        closeModal();
        loadIncomingStock();
        showNotification('Bill updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating bill:', error);
        showNotification('Failed to update bill: ' + error.message, 'error');
    }
}

async function deleteIncomingBill(billId) {
    if (!confirm('Are you sure you want to delete this bill? This will remove all items from stock.')) {
        return;
    }

    try {
        await window.api.incoming.bills.delete(billId);
        closeModal(); // Close details modal if open
        loadIncomingStock();
        showNotification('Bill deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting bill:', error);
        showNotification('Failed to delete bill: ' + error.message, 'error');
    }
}

async function loadSuppliersList() {
    try {
        const bills = await window.api.incoming.bills.getAll();
        const suppliers = [...new Set(bills.map(b => b.Supplier_Name))];
        const datalist = document.getElementById('supplierList');
        if (datalist) {
            datalist.innerHTML = suppliers.map(s => `<option value="${escapeHtml(s)}">`).join('');
        }
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

// ==================== DONATION BILLS ====================

async function loadDonations() {
    try {
        const bills = await window.api.donations.bills.getAll();
        currentData.donationBills = bills;
        renderDonationBillsTable(bills);
    } catch (error) {
        console.error('Error loading donation bills:', error);
        showNotification('Failed to load donation bills', 'error');
    }
}

function renderDonationBillsTable(data) {
    const tbody = document.querySelector('#donation-bills-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No donation bills found</td></tr>';
        return;
    }

    data.forEach(bill => {
        const row = `
            <tr>
                <td><strong>${escapeHtml(bill.Bill_Number || 'N/A')}</strong></td>
                <td>${formatDate(bill.Date_Received)}</td>
                <td>${escapeHtml(bill.Donor_Name)}</td>
                <td><span class="badge">${bill.Item_Count || 0} items</span></td>
                <td><strong>${bill.Total_Quantity || 0}</strong></td>
                <td>${escapeHtml(bill.Remarks || '-')}</td>
                <td class="actions">
                    <button class="btn-icon btn-view" onclick="viewDonationBillDetails(${bill.Bill_ID})" title="View">👁️</button>
                    <button class="btn-icon btn-edit" onclick="showEditDonationBillModal(${bill.Bill_ID})" title="Edit">✏️</button>
                    <button class="btn-icon btn-delete" onclick="deleteDonationBill(${bill.Bill_ID})" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function showAddDonationBillModal() {
    const modalBody = `
        <form id="donationBillForm">
            <div class="bill-header-section">
                <h3>Bill Information</h3>
                <div class="form-group">
                    <label>Date Received *</label>
                    <input type="date" id="billDate" value="${getCurrentDate()}" required>
                </div>
                <div class="form-group">
                    <label>Donor Name *</label>
                    <input type="text" id="donorName" required list="donorList" placeholder="Enter donor name">
                    <datalist id="donorList"></datalist>
                </div>
                <div class="form-group">
                    <label>Remarks</label>
                    <textarea id="billRemarks" rows="2" placeholder="General remarks for this donation"></textarea>
                </div>
            </div>
            
            <div class="bill-items-section">
                <h3>Items <span class="item-count" id="itemCount">(0 items)</span></h3>
                <div class="items-table-container">
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 40%">Item</th>
                                <th style="width: 20%">Quantity *</th>
                                <th style="width: 30%">Remarks</th>
                                <th style="width: 10%">Action</th>
                            </tr>
                        </thead>
                        <tbody id="billItemsBody"></tbody>
                    </table>
                </div>
                <button type="button" class="btn btn-secondary" onclick="addDonationItemRow()">+ Add Item</button>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Bill</button>
            </div>
        </form>
    `;

    showModal('Add Donation Bill', modalBody);

    // Load donors for autocomplete
    loadDonorsList();

    // Load items and setup handlers
    await ensureItemsLoaded();
    
    // Use setTimeout to ensure DOM is ready after innerHTML is set
    setTimeout(() => {
        // Add first item row
        addDonationItemRow();

        // Form submit
        const form = document.getElementById('donationBillForm');
        if (form) {
            form.addEventListener('submit', handleDonationBillSubmit);
        }
    }, 0);
}

function addDonationItemRow(item = null) {
    const tbody = document.getElementById('billItemsBody');
    const row = document.createElement('tr');
    const rowId = 'row_' + Date.now() + Math.random();
    row.id = rowId;

    const itemOptions = currentData.items
        .filter(i => i.Status === 'Active')
        .map(i => `<option value="${i.Item_ID}">${escapeHtml(i.Item_Name)} (${escapeHtml(i.Unit_Measure)})</option>`)
        .join('');

    row.innerHTML = `
        <td>
            <select class="item-select" required>
                <option value="">Select Item...</option>
                ${itemOptions}
            </select>
        </td>
        <td>
            <input type="number" class="item-quantity" min="1" value="${item ? item.Qty_Received : ''}" required>
        </td>
        <td>
            <input type="text" class="item-remarks" value="${item ? escapeHtml(item.Item_Remarks || '') : ''}" placeholder="Optional">
        </td>
        <td>
            <button type="button" class="btn-remove-item" onclick="removeItemRow('${rowId}')">×</button>
        </td>
    `;

    if (item) {
        row.querySelector('.item-select').value = item.Item_ID;
    }

    tbody.appendChild(row);
    updateItemCount();
}

async function handleDonationBillSubmit(e) {
    e.preventDefault();

    const billData = {
        Date_Received: document.getElementById('billDate').value,
        Donor_Name: document.getElementById('donorName').value.trim(),
        Remarks: document.getElementById('billRemarks').value.trim() || null,
        items: []
    };

    // Collect items
    const rows = document.querySelectorAll('#billItemsBody tr');
    if (rows.length === 0) {
        showNotification('Please add at least one item to the bill', 'error');
        return;
    }

    for (const row of rows) {
        const itemId = row.querySelector('.item-select').value;
        const quantity = parseInt(row.querySelector('.item-quantity').value);
        const remarks = row.querySelector('.item-remarks').value.trim() || null;

        if (!itemId || !quantity || quantity <= 0) {
            showNotification('Please fill all required item fields correctly', 'error');
            return;
        }

        billData.items.push({
            Item_ID: parseInt(itemId),
            Qty_Received: quantity,
            Item_Remarks: remarks
        });
    }

    try {
        const billId = await window.api.donations.bills.add(billData);
        closeModal();
        loadDonations();
        showNotification(`Donation bill created successfully! Bill ID: ${billId}`, 'success');
    } catch (error) {
        console.error('Error saving donation bill:', error);
        showNotification('Failed to save donation bill: ' + error.message, 'error');
    }
}

async function viewDonationBillDetails(billId) {
    try {
        const bill = await window.api.donations.bills.getDetails(billId);
        
        const itemsHtml = bill.items.map(item => `
            <tr>
                <td>${escapeHtml(item.Item_Name)}</td>
                <td><strong>${item.Qty_Received}</strong></td>
                <td>${escapeHtml(item.Unit_Measure)}</td>
                <td>${escapeHtml(item.Item_Remarks || '-')}</td>
            </tr>
        `).join('');

        const modalBody = `
            <div class="bill-details">
                <div class="detail-section">
                    <h3>Bill Information</h3>
                    <table class="details-table">
                        <tr><th>Bill Number:</th><td><strong>${escapeHtml(bill.Bill_Number)}</strong></td></tr>
                        <tr><th>Date:</th><td>${formatDate(bill.Date_Received)}</td></tr>
                        <tr><th>Donor:</th><td>${escapeHtml(bill.Donor_Name)}</td></tr>
                        <tr><th>Remarks:</th><td>${escapeHtml(bill.Remarks || 'N/A')}</td></tr>
                    </table>
                </div>
                <div class="detail-section">
                    <h3>Items (${bill.items.length})</h3>
                    <table class="items-detail-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Quantity</th>
                                <th>Unit</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                </div>
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="closeModal(); showEditDonationBillModal(${billId})">Edit Bill</button>
                    <button class="btn btn-danger" onclick="deleteDonationBill(${billId})">Delete Bill</button>
                </div>
            </div>
        `;

        showModal('Donation Bill Details - ' + bill.Bill_Number, modalBody);
    } catch (error) {
        console.error('Error loading donation bill details:', error);
        showNotification('Failed to load bill details', 'error');
    }
}

async function showEditDonationBillModal(billId) {
    try {
        const bill = await window.api.donations.bills.getDetails(billId);
        
        const modalBody = `
            <form id="editDonationBillForm">
                <input type="hidden" id="editBillId" value="${billId}">
                <div class="bill-header-section">
                    <h3>Bill Information</h3>
                    <div class="form-group">
                        <label>Bill Number</label>
                        <input type="text" value="${escapeHtml(bill.Bill_Number)}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Date Received *</label>
                        <input type="date" id="billDate" value="${bill.Date_Received.split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label>Donor Name *</label>
                        <input type="text" id="donorName" value="${escapeHtml(bill.Donor_Name)}" required list="donorList">
                        <datalist id="donorList"></datalist>
                    </div>
                    <div class="form-group">
                        <label>Remarks</label>
                        <textarea id="billRemarks" rows="2">${escapeHtml(bill.Remarks || '')}</textarea>
                    </div>
                </div>
                
                <div class="bill-items-section">
                    <h3>Items <span class="item-count" id="itemCount">(0 items)</span></h3>
                    <div class="items-table-container">
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="width: 40%">Item</th>
                                    <th style="width: 20%">Quantity *</th>
                                    <th style="width: 30%">Remarks</th>
                                    <th style="width: 10%">Action</th>
                                </tr>
                            </thead>
                            <tbody id="billItemsBody"></tbody>
                        </table>
                    </div>
                    <button type="button" class="btn btn-secondary" onclick="addDonationItemRow()">+ Add Item</button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Bill</button>
                </div>
            </form>
        `;

        showModal('Edit Donation Bill', modalBody);

        // Load donors
        loadDonorsList();

        // Load items and populate
        await ensureItemsLoaded();
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Add existing items
            bill.items.forEach(item => addDonationItemRow(item));

            // Form submit
            const form = document.getElementById('editDonationBillForm');
            if (form) {
                form.addEventListener('submit', handleDonationBillUpdate);
            }
        }, 0);
    } catch (error) {
        console.error('Error loading bill for edit:', error);
        showNotification('Failed to load bill for editing', 'error');
    }
}

async function handleDonationBillUpdate(e) {
    e.preventDefault();

    const billId = parseInt(document.getElementById('editBillId').value);
    const billData = {
        Date_Received: document.getElementById('billDate').value,
        Donor_Name: document.getElementById('donorName').value.trim(),
        Remarks: document.getElementById('billRemarks').value.trim() || null,
        items: []
    };

    // Collect items
    const rows = document.querySelectorAll('#billItemsBody tr');
    if (rows.length === 0) {
        showNotification('Please add at least one item to the bill', 'error');
        return;
    }

    for (const row of rows) {
        const itemId = row.querySelector('.item-select').value;
        const quantity = parseInt(row.querySelector('.item-quantity').value);
        const remarks = row.querySelector('.item-remarks').value.trim() || null;

        if (!itemId || !quantity || quantity <= 0) {
            showNotification('Please fill all required item fields correctly', 'error');
            return;
        }

        billData.items.push({
            Item_ID: parseInt(itemId),
            Qty_Received: quantity,
            Item_Remarks: remarks
        });
    }

    try {
        await window.api.donations.bills.update(billId, billData);
        closeModal();
        loadDonations();
        showNotification('Donation bill updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating donation bill:', error);
        showNotification('Failed to update donation bill: ' + error.message, 'error');
    }
}

async function deleteDonationBill(billId) {
    if (!confirm('Are you sure you want to delete this donation bill? This will remove all items from stock.')) {
        return;
    }

    try {
        await window.api.donations.bills.delete(billId);
        closeModal(); // Close details modal if open
        loadDonations();
        showNotification('Donation bill deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting donation bill:', error);
        showNotification('Failed to delete donation bill: ' + error.message, 'error');
    }
}

async function loadDonorsList() {
    try {
        const bills = await window.api.donations.bills.getAll();
        const donors = [...new Set(bills.map(b => b.Donor_Name))];
        const datalist = document.getElementById('donorList');
        if (datalist) {
            datalist.innerHTML = donors.map(d => `<option value="${escapeHtml(d)}">`).join('');
        }
    } catch (error) {
        console.error('Error loading donors:', error);
    }
}

// ==================== OUTGOING STOCK BILLS ====================

async function loadOutgoingStock() {
    try {
        const bills = await window.api.outgoing.bills.getAll();
        currentData.outgoingBills = bills;
        renderOutgoingBillsTable(bills);
    } catch (error) {
        console.error('Error loading outgoing bills:', error);
        showNotification('Failed to load outgoing bills', 'error');
    }
}

function renderOutgoingBillsTable(data) {
    const tbody = document.querySelector('#outgoing-bills-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No outgoing bills found</td></tr>';
        return;
    }

    data.forEach(bill => {
        const row = `
            <tr>
                <td><strong>${escapeHtml(bill.Bill_Number || 'N/A')}</strong></td>
                <td>${formatDate(bill.Date_Issued)}</td>
                <td>${escapeHtml(bill.Center_Name)}</td>
                <td>${escapeHtml(bill.Officer_Name)}</td>
                <td>${escapeHtml(bill.Officer_NIC)}</td>
                <td><span class="badge">${bill.Item_Count || 0} items</span></td>
                <td><strong>${bill.Total_Quantity || 0}</strong></td>
                <td class="actions">
                    <button class="btn-icon btn-view" onclick="viewOutgoingBillDetails(${bill.Bill_ID})" title="View">👁️</button>
                    <button class="btn-icon btn-edit" onclick="showEditOutgoingBillModal(${bill.Bill_ID})" title="Edit">✏️</button>
                    <button class="btn-icon btn-delete" onclick="deleteOutgoingBill(${bill.Bill_ID})" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function showAddOutgoingBillModal() {
    const modalBody = `
        <form id="outgoingBillForm">
            <div class="bill-header-section">
                <h3>Bill Information</h3>
                <div class="form-group">
                    <label>Date Issued *</label>
                    <input type="date" id="billDate" value="${getCurrentDate()}" required>
                </div>
                <div class="form-group">
                    <label>Center *</label>
                    <div id="centerIdContainer"></div>
                </div>
                <div class="form-group">
                    <label>Officer Name *</label>
                    <input type="text" id="officerName" required placeholder="Receiving officer name">
                </div>
                <div class="form-group">
                    <label>Officer NIC *</label>
                    <input type="text" id="officerNIC" required placeholder="Officer NIC number">
                </div>
                <div class="form-group">
                    <label>Remarks</label>
                    <textarea id="billRemarks" rows="2" placeholder="General remarks for this dispatch"></textarea>
                </div>
            </div>
            
            <div class="bill-items-section">
                <h3>Items <span class="item-count" id="itemCount">(0 items)</span></h3>
                <div class="items-table-container">
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 30%">Item</th>
                                <th style="width: 17%">Requested *</th>
                                <th style="width: 17%">Issued *</th>
                                <th style="width: 26%">Remarks</th>
                                <th style="width: 10%">Action</th>
                            </tr>
                        </thead>
                        <tbody id="billItemsBody"></tbody>
                    </table>
                </div>
                <button type="button" class="btn btn-secondary" onclick="addOutgoingItemRow()">+ Add Item</button>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Bill</button>
            </div>
        </form>
    `;

    showModal('Add Dispatch Bill', modalBody);

    // Load centers and items
    await Promise.all([ensureCentersLoaded(), ensureItemsLoaded()]);
    
    // Use setTimeout to ensure DOM is ready after innerHTML is set
    setTimeout(() => {
        // Setup center select
        const centerOptions = currentData.centers
            .filter(c => c.Status === 'Active')
            .map(c => ({ 
                value: c.Center_ID.toString(), 
                text: `${c.Center_Name} (${c.District})` 
            }));

        const centerSelect = new SearchableSelect('centerIdContainer', centerOptions, 'Search centers...');
        window.currentCenterSelect = centerSelect;

        // Add first item row
        addOutgoingItemRow();

        // Form submit
        const form = document.getElementById('outgoingBillForm');
        if (form) {
            form.addEventListener('submit', handleOutgoingBillSubmit);
        }
    }, 0);
}

function addOutgoingItemRow(item = null) {
    const tbody = document.getElementById('billItemsBody');
    const row = document.createElement('tr');
    const rowId = 'row_' + Date.now() + Math.random();
    row.id = rowId;

    const itemOptions = currentData.items
        .filter(i => i.Status === 'Active')
        .map(i => `<option value="${i.Item_ID}">${escapeHtml(i.Item_Name)} (${escapeHtml(i.Unit_Measure)})</option>`)
        .join('');

    row.innerHTML = `
        <td>
            <select class="item-select" required>
                <option value="">Select Item...</option>
                ${itemOptions}
            </select>
        </td>
        <td>
            <input type="number" class="item-requested" min="1" value="${item ? item.Qty_Requested : ''}" required>
        </td>
        <td>
            <input type="number" class="item-issued" min="0" value="${item ? item.Qty_Issued : ''}" required>
        </td>
        <td>
            <input type="text" class="item-remarks" value="${item ? escapeHtml(item.Item_Remarks || '') : ''}" placeholder="Optional">
        </td>
        <td>
            <button type="button" class="btn-remove-item" onclick="removeItemRow('${rowId}')">×</button>
        </td>
    `;

    if (item) {
        row.querySelector('.item-select').value = item.Item_ID;
    }

    tbody.appendChild(row);
    updateItemCount();
}

async function handleOutgoingBillSubmit(e) {
    e.preventDefault();

    const centerId = window.currentCenterSelect ? window.currentCenterSelect.getValue() : '';
    if (!centerId) {
        showNotification('Please select a center', 'error');
        return;
    }

    const billData = {
        Date_Issued: document.getElementById('billDate').value,
        Center_ID: parseInt(centerId),
        Officer_Name: document.getElementById('officerName').value.trim(),
        Officer_NIC: document.getElementById('officerNIC').value.trim(),
        Remarks: document.getElementById('billRemarks').value.trim() || null,
        items: []
    };

    // Collect items
    const rows = document.querySelectorAll('#billItemsBody tr');
    if (rows.length === 0) {
        showNotification('Please add at least one item to the bill', 'error');
        return;
    }

    for (const row of rows) {
        const itemId = row.querySelector('.item-select').value;
        const requested = parseInt(row.querySelector('.item-requested').value);
        const issued = parseInt(row.querySelector('.item-issued').value);
        const remarks = row.querySelector('.item-remarks').value.trim() || null;

        if (!itemId || !requested || requested <= 0 || issued < 0) {
            showNotification('Please fill all required item fields correctly', 'error');
            return;
        }

        if (issued > requested) {
            showNotification('Issued quantity cannot exceed requested quantity', 'error');
            return;
        }

        billData.items.push({
            Item_ID: parseInt(itemId),
            Qty_Requested: requested,
            Qty_Issued: issued,
            Item_Remarks: remarks
        });
    }

    try {
        const billId = await window.api.outgoing.bills.add(billData);
        closeModal();
        loadOutgoingStock();
        showNotification(`Dispatch bill created successfully! Bill ID: ${billId}`, 'success');
    } catch (error) {
        console.error('Error saving dispatch bill:', error);
        showNotification('Failed to save dispatch bill: ' + error.message, 'error');
    }
}

async function viewOutgoingBillDetails(billId) {
    try {
        const bill = await window.api.outgoing.bills.getDetails(billId);
        
        const itemsHtml = bill.items.map(item => `
            <tr>
                <td>${escapeHtml(item.Item_Name)}</td>
                <td><strong>${item.Qty_Requested}</strong></td>
                <td><strong>${item.Qty_Issued}</strong></td>
                <td>${escapeHtml(item.Unit_Measure)}</td>
                <td>${escapeHtml(item.Item_Remarks || '-')}</td>
            </tr>
        `).join('');

        const modalBody = `
            <div class="bill-details">
                <div class="detail-section">
                    <h3>Bill Information</h3>
                    <table class="details-table">
                        <tr><th>Bill Number:</th><td><strong>${escapeHtml(bill.Bill_Number)}</strong></td></tr>
                        <tr><th>Date:</th><td>${formatDate(bill.Date_Issued)}</td></tr>
                        <tr><th>Center:</th><td>${escapeHtml(bill.Center_Name)} (${escapeHtml(bill.District)})</td></tr>
                        <tr><th>Officer:</th><td>${escapeHtml(bill.Officer_Name)}</td></tr>
                        <tr><th>Officer NIC:</th><td>${escapeHtml(bill.Officer_NIC)}</td></tr>
                        <tr><th>Remarks:</th><td>${escapeHtml(bill.Remarks || 'N/A')}</td></tr>
                    </table>
                </div>
                <div class="detail-section">
                    <h3>Items (${bill.items.length})</h3>
                    <table class="items-detail-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Requested</th>
                                <th>Issued</th>
                                <th>Unit</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                </div>
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="closeModal(); showEditOutgoingBillModal(${billId})">Edit Bill</button>
                    <button class="btn btn-danger" onclick="deleteOutgoingBill(${billId})">Delete Bill</button>
                </div>
            </div>
        `;

        showModal('Dispatch Bill Details - ' + bill.Bill_Number, modalBody);
    } catch (error) {
        console.error('Error loading dispatch bill details:', error);
        showNotification('Failed to load bill details', 'error');
    }
}

async function showEditOutgoingBillModal(billId) {
    try {
        const bill = await window.api.outgoing.bills.getDetails(billId);
        
        const modalBody = `
            <form id="editOutgoingBillForm">
                <input type="hidden" id="editBillId" value="${billId}">
                <div class="bill-header-section">
                    <h3>Bill Information</h3>
                    <div class="form-group">
                        <label>Bill Number</label>
                        <input type="text" value="${escapeHtml(bill.Bill_Number)}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Date Issued *</label>
                        <input type="date" id="billDate" value="${bill.Date_Issued.split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label>Center *</label>
                        <div id="centerIdContainer"></div>
                    </div>
                    <div class="form-group">
                        <label>Officer Name *</label>
                        <input type="text" id="officerName" value="${escapeHtml(bill.Officer_Name)}" required>
                    </div>
                    <div class="form-group">
                        <label>Officer NIC *</label>
                        <input type="text" id="officerNIC" value="${escapeHtml(bill.Officer_NIC)}" required>
                    </div>
                    <div class="form-group">
                        <label>Remarks</label>
                        <textarea id="billRemarks" rows="2">${escapeHtml(bill.Remarks || '')}</textarea>
                    </div>
                </div>
                
                <div class="bill-items-section">
                    <h3>Items <span class="item-count" id="itemCount">(0 items)</span></h3>
                    <div class="items-table-container">
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="width: 30%">Item</th>
                                    <th style="width: 17%">Requested *</th>
                                    <th style="width: 17%">Issued *</th>
                                    <th style="width: 26%">Remarks</th>
                                    <th style="width: 10%">Action</th>
                                </tr>
                            </thead>
                            <tbody id="billItemsBody"></tbody>
                        </table>
                    </div>
                    <button type="button" class="btn btn-secondary" onclick="addOutgoingItemRow()">+ Add Item</button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Bill</button>
                </div>
            </form>
        `;

        showModal('Edit Dispatch Bill', modalBody);

        // Load centers and items
        await Promise.all([ensureCentersLoaded(), ensureItemsLoaded()]);
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Setup center select
            const centerOptions = currentData.centers.map(c => ({ 
                value: c.Center_ID.toString(), 
                text: `${c.Center_Name} (${c.District})${c.Status === 'Inactive' ? ' [Inactive]' : ''}` 
            }));

            const centerSelect = new SearchableSelect('centerIdContainer', centerOptions, 'Search centers...');
            centerSelect.setValue(bill.Center_ID.toString());
            window.currentCenterSelect = centerSelect;

            // Add existing items
            bill.items.forEach(item => addOutgoingItemRow(item));

            // Form submit
            const form = document.getElementById('editOutgoingBillForm');
            if (form) {
                form.addEventListener('submit', handleOutgoingBillUpdate);
            }
        }, 0);
    } catch (error) {
        console.error('Error loading bill for edit:', error);
        showNotification('Failed to load bill for editing', 'error');
    }
}

async function handleOutgoingBillUpdate(e) {
    e.preventDefault();

    const billId = parseInt(document.getElementById('editBillId').value);
    const centerId = window.currentCenterSelect ? window.currentCenterSelect.getValue() : '';
    if (!centerId) {
        showNotification('Please select a center', 'error');
        return;
    }

    const billData = {
        Date_Issued: document.getElementById('billDate').value,
        Center_ID: parseInt(centerId),
        Officer_Name: document.getElementById('officerName').value.trim(),
        Officer_NIC: document.getElementById('officerNIC').value.trim(),
        Remarks: document.getElementById('billRemarks').value.trim() || null,
        items: []
    };

    // Collect items
    const rows = document.querySelectorAll('#billItemsBody tr');
    if (rows.length === 0) {
        showNotification('Please add at least one item to the bill', 'error');
        return;
    }

    for (const row of rows) {
        const itemId = row.querySelector('.item-select').value;
        const requested = parseInt(row.querySelector('.item-requested').value);
        const issued = parseInt(row.querySelector('.item-issued').value);
        const remarks = row.querySelector('.item-remarks').value.trim() || null;

        if (!itemId || !requested || requested <= 0 || issued < 0) {
            showNotification('Please fill all required item fields correctly', 'error');
            return;
        }

        if (issued > requested) {
            showNotification('Issued quantity cannot exceed requested quantity', 'error');
            return;
        }

        billData.items.push({
            Item_ID: parseInt(itemId),
            Qty_Requested: requested,
            Qty_Issued: issued,
            Item_Remarks: remarks
        });
    }

    try {
        await window.api.outgoing.bills.update(billId, billData);
        closeModal();
        loadOutgoingStock();
        showNotification('Dispatch bill updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating dispatch bill:', error);
        showNotification('Failed to update dispatch bill: ' + error.message, 'error');
    }
}

async function deleteOutgoingBill(billId) {
    if (!confirm('Are you sure you want to delete this dispatch bill? This will add items back to stock.')) {
        return;
    }

    try {
        await window.api.outgoing.bills.delete(billId);
        closeModal(); // Close details modal if open
        loadOutgoingStock();
        showNotification('Dispatch bill deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting dispatch bill:', error);
        showNotification('Failed to delete dispatch bill: ' + error.message, 'error');
    }
}

// ==================== HELPER FUNCTIONS ====================

async function ensureItemsLoaded() {
    if (currentData.items.length === 0) {
        currentData.items = await window.api.items.getActive();
    }
}

async function ensureCentersLoaded() {
    if (currentData.centers.length === 0) {
        currentData.centers = await window.api.centers.getActive();
    }
}
