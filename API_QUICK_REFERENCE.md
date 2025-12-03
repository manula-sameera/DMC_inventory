# Quick Reference: Bill-Based Entry API

## Incoming Stock (GRN)

### Get All Bills
```javascript
const bills = await window.api.incoming.bills.getAll();
// Returns: [{ Bill_ID, Bill_Number, Date_Received, Supplier_Name, Item_Count, Total_Quantity, ... }]
```

### Get Bill Details
```javascript
const bill = await window.api.incoming.bills.getDetails(billId);
// Returns: { Bill_ID, Bill_Number, Date_Received, Supplier_Name, Remarks, items: [...] }
```

### Add New Bill
```javascript
const billData = {
    Date_Received: '2023-12-03',
    Supplier_Name: 'ABC Suppliers',
    Remarks: 'Monthly order',  // Optional
    items: [
        { Item_ID: 1, Qty_Received: 100, Item_Remarks: 'Good quality' },
        { Item_ID: 2, Qty_Received: 50, Item_Remarks: null }
    ]
};
const billId = await window.api.incoming.bills.add(billData);
```

### Update Bill
```javascript
await window.api.incoming.bills.update(billId, billData);
```

### Delete Bill
```javascript
await window.api.incoming.bills.delete(billId);
```

---

## Donations

### Get All Bills
```javascript
const bills = await window.api.donations.bills.getAll();
```

### Get Bill Details
```javascript
const bill = await window.api.donations.bills.getDetails(billId);
```

### Add New Bill
```javascript
const billData = {
    Date_Received: '2023-12-03',
    Donor_Name: 'John Doe',
    Remarks: 'Corporate donation',
    items: [
        { Item_ID: 5, Qty_Received: 25, Item_Remarks: null },
        { Item_ID: 8, Qty_Received: 10, Item_Remarks: 'New items' }
    ]
};
const billId = await window.api.donations.bills.add(billData);
```

### Update Bill
```javascript
await window.api.donations.bills.update(billId, billData);
```

### Delete Bill
```javascript
await window.api.donations.bills.delete(billId);
```

---

## Outgoing Stock (Dispatch)

### Get All Bills
```javascript
const bills = await window.api.outgoing.bills.getAll();
// Returns bills with Center_Name, Officer_Name, Officer_NIC, Item_Count, Total_Quantity
```

### Get Bill Details
```javascript
const bill = await window.api.outgoing.bills.getDetails(billId);
```

### Add New Bill
```javascript
const billData = {
    Date_Issued: '2023-12-03',
    Center_ID: 1,
    Officer_Name: 'Jane Smith',
    Officer_NIC: '123456789V',
    Remarks: 'Monthly distribution',
    items: [
        { Item_ID: 1, Qty_Requested: 50, Qty_Issued: 50, Item_Remarks: null },
        { Item_ID: 2, Qty_Requested: 30, Qty_Issued: 25, Item_Remarks: 'Partial' }
    ]
};
const billId = await window.api.outgoing.bills.add(billData);
```

### Update Bill
```javascript
await window.api.outgoing.bills.update(billId, billData);
```

### Delete Bill
```javascript
await window.api.outgoing.bills.delete(billId);
```

---

## Bill Number Format

- **Incoming**: `GRN-YYYYMMDD-####` (e.g., GRN-20231203-0001)
- **Donations**: `DON-YYYYMMDD-####` (e.g., DON-20231203-0001)  
- **Outgoing**: `DSP-YYYYMMDD-####` (e.g., DSP-20231203-0001)

Auto-generated if not provided. Counter resets daily.

---

## Data Structure

### Bill Header (Common fields)
- `Bill_ID` - Auto-generated ID
- `Bill_Number` - Auto-generated or custom
- `Date_Received` / `Date_Issued` - Transaction date
- `Supplier_Name` / `Donor_Name` - Source name
- `Center_ID` - For outgoing only
- `Officer_Name`, `Officer_NIC` - For outgoing only
- `Remarks` - General remarks for the bill
- `Created_Date`, `Modified_Date` - Timestamps

### Bill Items (Common fields)
- Item ID (GRN_ID, Donation_ID, Dispatch_ID)
- `Bill_ID` - Links to bill header
- `Item_ID` - Links to ITEMS_MASTER
- `Qty_Received` / `Qty_Issued` - Quantity
- `Qty_Requested` - For outgoing only
- `Item_Remarks` - Remarks for specific item

---

## Legacy Methods (Backward Compatible)

These still work and return individual items with Bill_Number:

```javascript
await window.api.incoming.getAll();   // All incoming stock items
await window.api.donations.getAll();  // All donation items
await window.api.outgoing.getAll();   // All outgoing stock items
```

---

## UI Form Example

```html
<form id="billForm">
    <!-- Bill Header -->
    <input type="date" id="date" required>
    <input type="text" id="supplier" required>
    <textarea id="remarks"></textarea>
    
    <!-- Items Table -->
    <table id="itemsTable">
        <tr>
            <td><select class="item"><!-- items --></select></td>
            <td><input type="number" class="quantity" min="1" required></td>
            <td><input type="text" class="item-remarks"></td>
            <td><button type="button" onclick="removeRow()">Remove</button></td>
        </tr>
    </table>
    
    <button type="button" onclick="addItemRow()">+ Add Item</button>
    <button type="submit">Save Bill</button>
</form>
```

---

## Transaction Example

```javascript
// Wrap bill operations in try-catch
try {
    const billData = {
        Date_Received: document.getElementById('date').value,
        Supplier_Name: document.getElementById('supplier').value,
        Remarks: document.getElementById('remarks').value,
        items: []
    };
    
    // Collect items from table
    document.querySelectorAll('#itemsTable tr').forEach(row => {
        billData.items.push({
            Item_ID: parseInt(row.querySelector('.item').value),
            Qty_Received: parseInt(row.querySelector('.quantity').value),
            Item_Remarks: row.querySelector('.item-remarks').value || null
        });
    });
    
    // Save
    const billId = await window.api.incoming.bills.add(billData);
    alert(`Bill created: ${billId}`);
    
} catch (error) {
    console.error('Error:', error);
    alert('Failed to save bill: ' + error.message);
}
```

---

## Validation Tips

✅ **Before submitting:**
- Check at least one item is added
- Validate all quantities are positive numbers
- Ensure all required fields are filled
- Verify item IDs are valid

✅ **Best practices:**
- Use transactions (API methods handle this automatically)
- Show bill number after creation
- Allow editing bills before finalizing
- Display item count and total quantity in lists
- Provide search/filter by bill number or date

---

## Common Patterns

### Display Bills List
```javascript
const bills = await window.api.incoming.bills.getAll();
bills.forEach(bill => {
    console.log(`${bill.Bill_Number} - ${bill.Supplier_Name} (${bill.Item_Count} items)`);
});
```

### Edit Existing Bill
```javascript
// Load bill
const bill = await window.api.incoming.bills.getDetails(billId);

// Populate form
document.getElementById('supplier').value = bill.Supplier_Name;
bill.items.forEach(item => addItemRowWithData(item));

// Update on submit
await window.api.incoming.bills.update(billId, updatedBillData);
```

### Delete with Confirmation
```javascript
if (confirm('Delete this bill and all its items?')) {
    await window.api.incoming.bills.delete(billId);
    refreshList();
}
```
