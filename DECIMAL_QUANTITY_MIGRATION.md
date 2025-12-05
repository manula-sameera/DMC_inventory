# Decimal Quantity Support - Migration Guide

## Overview
This update enables decimal quantity support for:
- **Incoming Stock** (Goods Received)
- **Donations** 
- **Outgoing Stock** (Dispatches)
- **Care Package Templates** (quantity per package)
- **Care Package Issues** (number of packages issued)

Previously, all quantities were restricted to whole numbers (integers). Now you can enter decimal values like `2.5`, `10.75`, etc.

## Changes Made

### 1. Database Schema Updates
- Changed quantity fields from `INTEGER` to `REAL` (floating-point numbers)
- Updated tables:
  - `INCOMING_STOCK` - `Qty_Received`
  - `DONATIONS` - `Qty_Received`
  - `OUTGOING_STOCK` - `Qty_Requested` and `Qty_Issued`
  - `CARE_PACKAGE_TEMPLATE_ITEMS` - `Quantity_Per_Package`
  - `CARE_PACKAGE_ISSUES` - `Packages_Issued`

### 2. User Interface Updates
- All quantity input fields now accept decimal values with step `0.01`
- Minimum values changed from `1` to `0.01`

### 3. Code Updates
- Changed from `parseInt()` to `parseFloat()` for all quantity parsing
- Updated validation logic to support decimal values

## Migration Instructions

### For Existing Databases

**IMPORTANT:** Make a backup of your database before proceeding!

#### Option 1: Automatic Migration (Recommended)
1. Close the application if it's running
2. Open a terminal in the project directory
3. Run the migration script:
   ```powershell
   cd src/database
   node apply_decimal_migration.js
   ```
4. When prompted, enter the full path to your `dmc_inventory.db` file
   - Usually located at: `%APPDATA%\dmc_inventory\dmc_inventory.db`
   - Or: `C:\Users\YourUsername\AppData\Roaming\dmc_inventory\dmc_inventory.db`
5. The script will:
   - Create an automatic backup
   - Apply the migration
   - Preserve all existing data (converting integers to decimals)

#### Option 2: Manual Migration
1. Backup your database file
2. Open your database with a SQLite tool
3. Execute the SQL script: `src/database/decimal_migration.sql`

### For New Installations
No action needed! The updated schema is automatically applied.

## Usage Examples

### Incoming Stock / Donations
- Enter quantities like: `10.5`, `2.25`, `100.75`
- Useful for items measured in kilograms, liters, or partial units

### Outgoing Stock
- **Requested Quantity**: `15.5 kg`
- **Issued Quantity**: `15.5 kg` (or partial: `15.3 kg`)

### Care Packages
- **Quantity per Package**: `2.5 kg` of rice per package
- **Packages Issued**: `10.5` packages (useful for partial packages)

## Validation Rules
- All quantities must be greater than `0.01`
- Maximum 2 decimal places recommended (though more are supported)
- Outgoing stock: Issued quantity cannot exceed requested quantity
- All existing validation rules remain in place

## Data Integrity
- All existing whole number quantities are automatically converted to decimal format
- No data loss occurs during migration
- Stock calculations (current stock, low stock alerts) work correctly with decimal values

## Testing Recommendations
After migration, verify:
1. ✓ View existing bills/entries to ensure quantities display correctly
2. ✓ Create a new incoming stock entry with decimal quantity (e.g., `5.5`)
3. ✓ Create a new outgoing stock entry with decimal quantities
4. ✓ Check stock reports show decimal quantities properly
5. ✓ Verify care package calculations with decimal values

## Rollback (If Needed)
If you encounter issues and need to rollback:
1. Close the application
2. Delete the modified database file
3. Restore from the backup created during migration
4. The backup file is named: `dmc_inventory.db.backup_[timestamp]`

## Files Modified
- `src/database/schema.sql` - Updated schema for new installations
- `src/database/decimal_migration.sql` - Migration script for existing databases
- `src/database/apply_decimal_migration.js` - Migration runner script
- `src/renderer/app.js` - UI and validation updates
- `src/renderer/bill-functions.js` - Bill entry form updates

## Support
If you encounter any issues:
1. Check that the migration completed successfully
2. Verify your backup exists before making changes
3. Check the browser console (F12) for any JavaScript errors
4. Ensure all files were updated correctly

## Notes
- SQLite `REAL` type supports floating-point numbers with sufficient precision for inventory management
- Input validation ensures reasonable decimal values
- Reports and calculations automatically handle decimal quantities
- No changes needed to existing reports or PDF generation
