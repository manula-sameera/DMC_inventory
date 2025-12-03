# Bill-Based Entry System - Implementation Guide

## Overview

The database structure has been updated from **item-by-item entry** to **bill-based entry** for all three transaction types:
- Incoming Stock (Goods Received)
- Donations
- Outgoing Stock (Dispatch)

## New Structure

### 1. Incoming Stock (Goods Received Notes - GRN)

**Bill Header Table: `INCOMING_BILLS`**
- `Bill_ID` - Primary key, auto-generated
- `Bill_Number` - Unique bill number (e.g., GRN-20231203-0001)
- `Date_Received` - Date of receipt
- `Supplier_Name` - Name of the supplier (common for all items in the bill)
- `Remarks` - General remarks for the entire bill
- `Created_Date`, `Modified_Date` - Timestamps

**Bill Items Table: `INCOMING_STOCK`**
- `GRN_ID` - Primary key, auto-generated
- `Bill_ID` - Foreign key to INCOMING_BILLS
- `Item_ID` - Foreign key to ITEMS_MASTER
- `Qty_Received` - Quantity received
- `Item_Remarks` - Remarks specific to this item

### 2. Donations

**Bill Header Table: `DONATION_BILLS`**
- `Bill_ID` - Primary key, auto-generated
- `Bill_Number` - Unique bill number (e.g., DON-20231203-0001)
- `Date_Received` - Date of donation
- `Donor_Name` - Name of the donor (common for all items in the bill)
- `Remarks` - General remarks for the entire donation
- `Created_Date`, `Modified_Date` - Timestamps

**Bill Items Table: `DONATIONS`**
- `Donation_ID` - Primary key, auto-generated
- `Bill_ID` - Foreign key to DONATION_BILLS
- `Item_ID` - Foreign key to ITEMS_MASTER
- `Qty_Received` - Quantity received
- `Item_Remarks` - Remarks specific to this item

### 3. Outgoing Stock (Dispatch Notes)

**Bill Header Table: `OUTGOING_BILLS`**
- `Bill_ID` - Primary key, auto-generated
- `Bill_Number` - Unique bill number (e.g., DSP-20231203-0001)
- `Date_Issued` - Date of dispatch
- `Center_ID` - Foreign key to CENTERS_MASTER (destination center)
- `Officer_Name` - Name of receiving officer (common for all items)
- `Officer_NIC` - NIC of receiving officer (common for all items)
- `Remarks` - General remarks for the entire dispatch
- `Created_Date`, `Modified_Date` - Timestamps

**Bill Items Table: `OUTGOING_STOCK`**
- `Dispatch_ID` - Primary key, auto-generated
- `Bill_ID` - Foreign key to OUTGOING_BILLS
- `Item_ID` - Foreign key to ITEMS_MASTER
- `Qty_Requested` - Quantity requested
- `Qty_Issued` - Quantity actually issued
- `Item_Remarks` - Remarks specific to this item

## API Methods

### Incoming Stock Bills

```javascript
// Get all bills with summary info
const bills = await window.api.incoming.bills.getAll();
// Returns: Array of bills with Item_Count and Total_Quantity

// Get detailed bill with all items
const billDetails = await window.api.incoming.bills.getDetails(billId);
// Returns: Bill object with items array

// Add new bill with multiple items
const billData = {
    Date_Received: '2023-12-03',
    Supplier_Name: 'ABC Suppliers',
    Remarks: 'Monthly stock order',
    items: [
        { Item_ID: 1, Qty_Received: 100, Item_Remarks: 'Good condition' },
        { Item_ID: 2, Qty_Received: 50, Item_Remarks: null },
        { Item_ID: 3, Qty_Received: 200, Item_Remarks: 'Urgent item' }
    ]
};
const billId = await window.api.incoming.bills.add(billData);

// Update existing bill
await window.api.incoming.bills.update(billId, billData);

// Delete bill (cascades to all items)
await window.api.incoming.bills.delete(billId);
```

### Donation Bills

```javascript
// Get all donation bills
const bills = await window.api.donations.bills.getAll();

// Get bill details
const billDetails = await window.api.donations.bills.getDetails(billId);

// Add new donation bill
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

// Update and delete work the same as incoming stock
```

### Outgoing Stock Bills

```javascript
// Get all dispatch bills
const bills = await window.api.outgoing.bills.getAll();

// Get bill details
const billDetails = await window.api.outgoing.bills.getDetails(billId);

// Add new dispatch bill
const billData = {
    Date_Issued: '2023-12-03',
    Center_ID: 1,
    Officer_Name: 'Jane Smith',
    Officer_NIC: '123456789V',
    Remarks: 'Monthly distribution',
    items: [
        { Item_ID: 1, Qty_Requested: 50, Qty_Issued: 50, Item_Remarks: null },
        { Item_ID: 2, Qty_Requested: 30, Qty_Issued: 25, Item_Remarks: 'Partial fulfillment' },
        { Item_ID: 3, Qty_Requested: 100, Qty_Issued: 100, Item_Remarks: null }
    ]
};
const billId = await window.api.outgoing.bills.add(billData);

// Update and delete work the same as incoming stock
```

## Database Migration

The application includes automatic migration from the old structure to the new structure.

### Migration Process

1. **Automatic Detection**: On startup, the app checks if migration is needed
2. **Backup**: Creates a timestamped backup of your database before migration
3. **Migration**: Groups existing items by date and supplier/donor/center to create bills
4. **Verification**: Counts records to ensure data integrity
5. **Cleanup**: Optional cleanup of old tables after verification

### Manual Migration

If you need to run migration manually:

```javascript
const DatabaseMigration = require('./src/database/migration');
const path = require('path');

const dbPath = path.join(__dirname, 'dmc_inventory.db');
const migration = new DatabaseMigration(dbPath);

// Check if migration is needed
if (migration.needsMigration()) {
    // Run migration
    const result = migration.runMigration();
    console.log(result);
    
    // Optional: Clean up old tables after verifying
    if (result.success) {
        migration.cleanupOldTables();
    }
}
```

### Migration Files

- **`src/database/migration.sql`** - SQL migration script
- **`src/database/migration.js`** - Migration helper class
- **Backup Location**: Same directory as database with timestamp

## Bill Number Format

Bill numbers are automatically generated in the format:
- **Incoming Stock**: `GRN-YYYYMMDD-####` (e.g., GRN-20231203-0001)
- **Donations**: `DON-YYYYMMDD-####` (e.g., DON-20231203-0001)
- **Outgoing Stock**: `DSP-YYYYMMDD-####` (e.g., DSP-20231203-0001)

The counter resets daily for each transaction type.

## Benefits of Bill-Based Entry

1. **Efficiency**: Enter common information (supplier, date, officer) once for multiple items
2. **Organization**: All items from a single transaction are grouped together
3. **Traceability**: Easy to track and reference complete transactions
4. **Reduced Errors**: Less repetitive data entry reduces chances of mistakes
5. **Better Reporting**: Reports can now show bills with multiple items
6. **Data Integrity**: Cascade delete ensures items are removed when bill is deleted

## UI Implementation Guidelines

### Adding a New Bill

1. Show a form with:
   - Bill header fields (Date, Supplier/Donor/Center, Officer details, etc.)
   - A dynamic table/list to add multiple items
   - Add/Remove item buttons
   - Each item row: Item dropdown, Quantity, Item-specific remarks

2. Validate before submission:
   - All required fields are filled
   - At least one item is added
   - Quantities are positive numbers

3. Submit all data as a single transaction

### Viewing Bills

1. Show list of bills with:
   - Bill Number
   - Date
   - Supplier/Donor/Center name
   - Item Count
   - Total Quantity
   - Actions (View, Edit, Delete)

2. Detail view shows:
   - All bill header information
   - Table of all items in the bill
   - Individual item quantities and remarks

### Editing Bills

1. Load existing bill details
2. Allow editing of both header and items
3. Can add/remove items from the bill
4. Update submits all changes as a transaction

## Backward Compatibility

The system maintains backward compatibility with legacy methods:
- `window.api.incoming.getAll()` - Returns flattened item list
- `window.api.donations.getAll()` - Returns flattened item list
- `window.api.outgoing.getAll()` - Returns flattened item list

These methods now include `Bill_Number` field for reference.

## Example UI Flow

### Incoming Stock Entry

```
┌─────────────────────────────────────┐
│  Add Incoming Stock (GRN)           │
├─────────────────────────────────────┤
│  Date Received: [2023-12-03]        │
│  Supplier Name: [ABC Suppliers  ▼]  │
│  Remarks: [Monthly order]           │
├─────────────────────────────────────┤
│  Items:                             │
│  ┌──────────────────────────────┐  │
│  │Item      │Qty  │Remarks      │  │
│  ├──────────────────────────────┤  │
│  │Rice 1kg  │100  │Good quality │  │
│  │Sugar 1kg │50   │             │  │
│  │Oil 1L    │200  │Urgent       │  │
│  └──────────────────────────────┘  │
│  [+ Add Item] [- Remove]            │
├─────────────────────────────────────┤
│  [Cancel]        [Save Bill]        │
└─────────────────────────────────────┘
```

## Testing the New Structure

1. Start the application - migration runs automatically
2. Check console for migration success message
3. Add a test bill with multiple items
4. Verify items appear in current stock
5. Edit the bill and change items
6. Delete the bill and verify items are removed from stock
7. Generate reports to see new bill-based format

## Notes

- All stock calculations still work correctly (summing from item tables)
- Reports now include Bill_Number for better traceability
- Current_Stock view remains unchanged - it still calculates from items
- The migration is non-destructive - old tables are renamed, not deleted
- You can keep old tables as backup or remove them after verification
