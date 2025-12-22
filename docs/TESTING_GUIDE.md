# Testing Guide - Bill-Based Entry System

> Note: This document is now under `docs/`. If you are contributing, update the file in `docs/` instead of the root.

## Prerequisites

1. Backup existing database (if any)
2. Have sample items and centers in database
3. Have Electron app ready to run

## Quick Start Test

### Step 1: Start the Application

```powershell
cd i:\Sources\DMC_inventory
npm start
```

### Step 2: Check Migration

- On first run, watch console for migration messages
- Look for: "✓ Migration completed successfully"
- Check for backup file created: `inventory_backup_YYYYMMDD_HHMMSS.db`

### Step 3: Verify UI Changes

1. Navigate to "Incoming Stock" page
2. Verify table has columns:
   - Bill Number
   - Date
   - Supplier
   - Items (count)
   - Total Qty
   - Remarks
   - Actions (View, Edit, Delete icons)
3. Verify "Add Bill" button exists (not "Add Item")

## Test Scenarios

### Test 1: Add Incoming Stock Bill

**Steps:**

1. Click "Incoming Stock" in sidebar
2. Click "Add Bill" button
3. Fill bill header:
   - Date: Select today
   - Supplier Name: Type "ABC Medical Supplies"
   - Remarks: Type "First test bill"
4. Add first item:
   - Item: Select from dropdown
   - Quantity: Enter 100
   - Remarks: Leave empty
5. Click "+ Add Item" button
6. Add second item:
   - Item: Select different item
   - Quantity: Enter 50
   - Remarks: Type "Urgent stock"
7. Click "Save Bill"

**Expected Results:**

- ✓ Modal closes
- ✓ Success notification: "Bill created successfully! Bill ID: X"
- ✓ Table shows new bill with:
  - Bill Number: GRN-YYYYMMDD-0001
  - Items: "2 items"
  - Total Qty: 150
  - Supplier: ABC Medical Supplies
- ✓ Stock quantities increased in Current Stock page

**Validation Tests:**

- Try saving without items → Error: "Please add at least one item"
- Try saving without supplier → Error: "Please fill required fields"
- Try negative quantity → Blocked by input validation

... (Content preserved from original file) ...
