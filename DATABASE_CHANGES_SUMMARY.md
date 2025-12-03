# Database Structure Change - Summary

## What Changed

Your inventory system has been updated from **item-by-item entry** to **bill-based entry**. Instead of entering each item separately with repeated information, you now enter bills that contain multiple items with shared information.

## For Each Transaction Type:

### 1. Incoming Stock (Purchases/Goods Received)
**Before:** You had to enter supplier name separately for each item
**Now:** Enter supplier name once, then add multiple items to the same bill

### 2. Donations
**Before:** You had to enter donor name separately for each item
**Now:** Enter donor name once, then add multiple items to the same donation

### 3. Outgoing Stock (Dispatches)
**Before:** You had to enter center, officer name, and NIC separately for each item
**Now:** Enter center and officer details once, then add multiple items to the same dispatch

## Files Modified

1. **`src/database/schema.sql`**
   - Added 3 new bill header tables (INCOMING_BILLS, DONATION_BILLS, OUTGOING_BILLS)
   - Modified 3 item tables (INCOMING_STOCK, DONATIONS, OUTGOING_STOCK) to link to bills
   - Updated indexes for better performance

2. **`src/database/db.js`**
   - Added 15 new methods for bill operations:
     - `getAllIncomingBills()`, `getIncomingBillDetails()`, `addIncomingBill()`, etc.
     - `getAllDonationBills()`, `getDonationBillDetails()`, `addDonationBill()`, etc.
     - `getAllOutgoingBills()`, `getOutgoingBillDetails()`, `addOutgoingBill()`, etc.
   - Updated report methods to include bill numbers
   - Kept legacy methods for backward compatibility

3. **`src/main.js`**
   - Added automatic migration check on startup
   - Added 15 new IPC handlers for bill operations
   - Kept legacy handlers for compatibility

4. **`src/preload.js`**
   - Exposed new bill API methods to renderer process
   - Maintained backward compatibility with old methods

## New Files Created

1. **`src/database/migration.sql`**
   - SQL script to migrate from old structure to new structure
   - Groups existing items by date and supplier/donor/center
   - Preserves all existing data

2. **`src/database/migration.js`**
   - JavaScript helper for automatic migration
   - Creates backup before migration
   - Verifies migration success
   - Provides cleanup methods

3. **`BILL_BASED_STRUCTURE.md`**
   - Complete documentation of new structure
   - API usage examples
   - Migration guide
   - Testing instructions

4. **`src/renderer/bill_entry_example.html`**
   - Example UI implementation for bill-based entry
   - Shows how to create forms with multiple items
   - Includes JavaScript code for handling bills
   - Can be used as reference for updating your UI

## How Migration Works

1. **Automatic**: Runs when you start the application
2. **Safe**: Creates a backup of your database first
3. **Smart**: Groups existing items into bills based on date and supplier/donor/center
4. **Non-destructive**: Old tables are renamed (not deleted) for safety

## What You Need to Do

### Option 1: Use the Example UI (Recommended for Learning)
1. Review `src/renderer/bill_entry_example.html`
2. Copy the relevant parts to your main `app.js` and `index.html`
3. Adapt the styling to match your application

### Option 2: Build Custom UI
1. Read `BILL_BASED_STRUCTURE.md` for API documentation
2. Update your forms to collect bill header info + multiple items
3. Use the new bill API methods (e.g., `window.api.incoming.bills.add()`)

## Example Usage

### Adding an Incoming Stock Bill

```javascript
const billData = {
    Date_Received: '2023-12-03',
    Supplier_Name: 'ABC Suppliers',
    Remarks: 'Monthly order',
    items: [
        { Item_ID: 1, Qty_Received: 100, Item_Remarks: null },
        { Item_ID: 2, Qty_Received: 50, Item_Remarks: 'Urgent' },
        { Item_ID: 3, Qty_Received: 200, Item_Remarks: null }
    ]
};

const billId = await window.api.incoming.bills.add(billData);
console.log('Bill created with ID:', billId);
```

## Benefits

1. ✅ **Less repetitive data entry** - Enter supplier/donor/center once
2. ✅ **Better organization** - All items from one transaction grouped together
3. ✅ **Automatic bill numbers** - System generates GRN-YYYYMMDD-####, DON-YYYYMMDD-####, DSP-YYYYMMDD-####
4. ✅ **Easier tracking** - Reference entire bills instead of individual items
5. ✅ **Improved reports** - Reports now show bill numbers for better traceability
6. ✅ **Data integrity** - When you delete a bill, all its items are automatically deleted

## Testing Steps

1. **Start your application** - Migration runs automatically
2. **Check console** - Look for "Migration completed successfully" message
3. **Add a test bill**:
   - Use the new API or update UI
   - Add 2-3 items to the same bill
   - Verify bill is saved with auto-generated bill number
4. **Check stock** - Verify items appear in current stock
5. **Edit the bill** - Change quantities or add/remove items
6. **View bill details** - See all items in the bill
7. **Delete the bill** - Verify all items are removed from stock

## Rollback (If Needed)

If you need to rollback:
1. Close the application
2. Find your database backup (in same folder as database, with timestamp)
3. Delete current `dmc_inventory.db`
4. Rename backup file to `dmc_inventory.db`
5. Restart application

## Support

- Review `BILL_BASED_STRUCTURE.md` for detailed documentation
- Check `src/renderer/bill_entry_example.html` for UI implementation reference
- All existing functionality continues to work (backward compatible)

## Next Steps

1. Test the migration with your existing data
2. Review the example UI implementation
3. Update your UI forms to support bill-based entry
4. Test thoroughly with sample data
5. Deploy to production when satisfied

---

**Note**: Your existing data is safe. The migration creates a backup and the old tables are preserved as `*_OLD` tables until you're confident everything works correctly.
