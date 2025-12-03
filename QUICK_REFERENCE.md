# Quick Reference - Bill-Based Entry System

## For Developers

### Key Files
- `src/renderer/bill-functions.js` - All bill logic (25 functions)
- `src/renderer/styles.css` - Bill styles (lines 681-971)
- `src/renderer/index.html` - Script include (line 375)
- `src/renderer/app.js` - currentData update (lines 1-12)

### API Endpoints
```javascript
// Incoming Stock
window.api.incoming.bills.getAll()
window.api.incoming.bills.getDetails(billId)
window.api.incoming.bills.add(billData)
window.api.incoming.bills.update(billId, billData)
window.api.incoming.bills.delete(billId)

// Donations (same pattern)
window.api.donations.bills.*

// Outgoing (same pattern)
window.api.outgoing.bills.*
```

### Bill Data Structure
```javascript
// Add/Update
{
  Date_Received: "2024-01-15",
  Supplier_Name: "ABC Supplies",
  Remarks: "Urgent",
  items: [
    { Item_ID: 1, Qty_Received: 100, Item_Remarks: null },
    { Item_ID: 2, Qty_Received: 50, Item_Remarks: "Check quality" }
  ]
}

// Response (getAll)
{
  Bill_ID: 1,
  Bill_Number: "GRN-20240115-0001",
  Supplier_Name: "ABC Supplies",
  Item_Count: 2,
  Total_Quantity: 150
}

// Response (getDetails)
{
  Bill_ID: 1,
  Bill_Number: "GRN-20240115-0001",
  items: [
    { Item_ID: 1, Item_Name: "Item A", Qty_Received: 100, ... }
  ]
}
```

### Key Functions
```javascript
// Incoming
loadIncomingStock()                  // Load all bills
showAddIncomingBillModal()           // Show add form
viewIncomingBillDetails(billId)      // Show details
showEditIncomingBillModal(billId)    // Show edit form
deleteIncomingBill(billId)           // Delete bill

// Helpers
addIncomingItemRow(item = null)      // Add item row
removeItemRow(rowId)                 // Remove item row
updateItemCount()                    // Update counter
ensureItemsLoaded()                  // Load items if needed
```

## For Testers

### Quick Test (5 minutes)
1. **Add Bill:** Incoming Stock → Add Bill → Fill form → Add 2 items → Save
2. **View:** Click 👁️ icon → Verify details correct
3. **Edit:** Click ✏️ icon → Change quantity → Save
4. **Delete:** Click 🗑️ icon → Confirm
5. **Verify Stock:** Check Current Stock page for changes

### Essential Tests
- [ ] Add bill with 1 item
- [ ] Add bill with 10 items
- [ ] Edit bill (add/remove items)
- [ ] Delete bill
- [ ] View bill details
- [ ] Check stock accuracy
- [ ] Test validation (empty bill, negative qty)
- [ ] Test on mobile (resize browser)

### Expected Bill Numbers
- Incoming: `GRN-20240115-0001`
- Donations: `DON-20240115-0001`
- Outgoing: `DSP-20240115-0001`

### Common Issues
| Issue | Check |
|-------|-------|
| Modal doesn't open | Console errors, bill-functions.js loaded |
| Items don't load | Items table has active items |
| Bill doesn't save | Required fields filled, at least 1 item |
| Stock wrong | Check triggers in schema.sql |

## For Users

### How to Add a Bill

#### Incoming Stock
1. Click **Incoming Stock** in sidebar
2. Click **Add Bill** button
3. Fill form:
   - **Date:** Select date (defaults to today)
   - **Supplier:** Type supplier name
   - **Remarks:** Optional notes
4. Add items:
   - Click **+ Add Item**
   - Select item from dropdown (searchable - type to search)
   - Enter quantity
   - Optional remarks per item
   - Repeat for more items
5. Click **Save Bill**

#### Donations
Same as above but with **Donor Name** instead of Supplier

#### Outgoing Stock (Dispatch)
1. Click **Outgoing Stock** in sidebar
2. Click **Add Bill** button
3. Fill form:
   - **Date:** Select date
   - **Center:** Select from dropdown (searchable)
   - **Officer Name:** Receiving officer's name
   - **Officer NIC:** Officer's NIC number
   - **Remarks:** Optional
4. Add items:
   - Click **+ Add Item**
   - Select item
   - Enter **Quantity Requested** (what was asked for)
   - Enter **Quantity Issued** (what was actually given)
   - Issued must be ≤ Requested
5. Click **Save Bill**

### How to View a Bill
1. Find the bill in the table
2. Click the **eye icon (👁️)**
3. See bill details with all items
4. Click **Edit Bill** or **Delete Bill** if needed

### How to Edit a Bill
1. Click **pencil icon (✏️)** on bill row
   OR click **Edit Bill** in details view
2. Modify:
   - Change any header fields
   - Change item quantities
   - Add more items (+ Add Item)
   - Remove items (click × button)
3. Click **Update Bill**

### How to Delete a Bill
1. Click **trash icon (🗑️)** on bill row
   OR click **Delete Bill** in details view
2. Confirm deletion
3. Bill and all items removed
4. Stock automatically adjusted

### Tips
- **Use Autocomplete:** Supplier/donor names suggest previous entries
- **Search Dropdowns:** Type to search in item/center lists
- **Item Counter:** Shows "(X items)" as you add/remove
- **Mobile Friendly:** Works on tablets and phones
- **Undo:** Can't undo delete - be careful!

### Bill Number Format
- **GRN-20240115-0001** = Incoming Stock, Jan 15 2024, 1st bill of day
- **DON-20240115-0002** = Donation, Jan 15 2024, 2nd bill of day
- **DSP-20240116-0001** = Dispatch, Jan 16 2024, 1st bill of day

Counter resets daily, so each day starts at 0001.

## Troubleshooting

### Problem: Can't add bill - validation error
**Solution:** 
- Check all required fields filled (marked with *)
- Make sure at least 1 item added
- Verify quantities > 0

### Problem: Dropdown doesn't show items
**Solution:**
- Check Items page - ensure items exist and are Active
- Refresh page (F5)

### Problem: Bill saved but stock didn't update
**Solution:**
- Check Current Stock page and refresh
- Verify item was in bill
- Check database triggers (for developers)

### Problem: Can't delete bill
**Solution:**
- Check browser console for errors
- Verify bill exists (refresh table)
- Try closing detail modal first

### Problem: Modal stuck open
**Solution:**
- Click outside modal to close
- Press Escape key
- Refresh page (F5)

## Performance Notes

### Expected Performance
- Load 100 bills: < 500ms
- Open modal: < 200ms
- Save bill (10 items): < 500ms
- View details: < 300ms

### If Slow
- Check number of bills (pagination needed if > 1000)
- Check item count per bill (> 50 may be slow)
- Clear browser cache
- Restart application

## Migration Notes

### First Run
When you first start the app after updating:
1. Migration runs automatically
2. Creates backup: `inventory_backup_YYYYMMDD_HHMMSS.db`
3. Groups old items into bills
4. Renames old tables to *_OLD
5. Shows success message in console

### Migration Logic
Old items grouped by:
- **Incoming:** Date + Supplier Name
- **Donations:** Date + Donor Name
- **Outgoing:** Date + Center

Items on same date with same supplier become one bill.

### If Migration Fails
1. Check console for error message
2. Backup file created even if migration fails
3. Old data still in *_OLD tables
4. Contact developer with error message

## Keyboard Shortcuts

### Modals
- **Enter** - Submit form (when focused on input)
- **Escape** - Close modal
- **Tab** - Navigate fields

### Tables
- **Click row** - No default action (use buttons)

### General
- **Ctrl+R** / **F5** - Refresh page
- **Ctrl+Shift+I** - Open DevTools (for debugging)

## Validation Rules

### All Bills
- Date required
- At least 1 item required
- All item quantities > 0
- Item must be selected from dropdown

### Incoming Stock
- Supplier name required (min 2 chars)

### Donations
- Donor name required (min 2 chars)

### Outgoing Stock
- Center must be selected
- Officer name required (min 2 chars)
- Officer NIC required (format validated)
- Qty Issued ≤ Qty Requested

## Stock Calculation

### Adding Bill
- **Incoming/Donations:** Stock += Qty_Received (for each item)
- **Outgoing:** Stock -= Qty_Issued (for each item)

### Editing Bill
1. Old items: Stock reversed (incoming: -, outgoing: +)
2. New items: Stock applied (incoming: +, outgoing: -)
3. Net effect calculated automatically

### Deleting Bill
- **Incoming/Donations:** Stock -= Qty_Received (reversal)
- **Outgoing:** Stock += Qty_Issued (items come back)

## Support

### Documentation
- **Technical:** `FRONTEND_IMPLEMENTATION.md`
- **Testing:** `TESTING_GUIDE.md`
- **Summary:** `COMPLETION_SUMMARY.md`
- **This Guide:** `QUICK_REFERENCE.md`

### For Help
1. Check this guide first
2. Check TESTING_GUIDE.md for examples
3. Check browser console for errors
4. Contact developer with:
   - What you were trying to do
   - What happened
   - Any error messages
   - Screenshots if possible

---

**Version:** 1.0.0 Bill-Based Entry System
**Last Updated:** [Date]
**Status:** ✅ Production Ready (pending testing)
