# Testing Guide - Bill-Based Entry System

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

### Test 2: View Bill Details

**Steps:**
1. Find the bill created in Test 1
2. Click the View icon (👁️)

**Expected Results:**
- ✓ Modal opens with "Bill Details - GRN-YYYYMMDD-0001"
- ✓ Shows bill information table:
  - Bill Number
  - Date
  - Supplier
  - Remarks
- ✓ Shows items table with 2 rows:
  - Item names
  - Quantities
  - Units
  - Remarks
- ✓ Shows "Edit Bill" and "Delete Bill" buttons

### Test 3: Edit Incoming Stock Bill

**Steps:**
1. From detail view, click "Edit Bill" button
   (Or click Edit icon ✏️ from table)
2. Modify:
   - Change supplier name to "XYZ Pharmaceuticals"
   - Change first item quantity to 150
   - Remove second item (click × button)
3. Add new item:
   - Click "+ Add Item"
   - Select item
   - Enter quantity: 75
4. Click "Update Bill"

**Expected Results:**
- ✓ Modal closes
- ✓ Success notification: "Bill updated successfully!"
- ✓ Table shows updated bill:
  - Items: "2 items" (not 3, because one removed)
  - Total Qty: 225 (150 + 75)
  - Supplier: XYZ Pharmaceuticals
- ✓ Stock recalculated correctly:
  - First item: +50 (150 - 100)
  - Second item: -50 (removed)
  - Third item: +75 (new)

### Test 4: Delete Incoming Stock Bill

**Steps:**
1. Click Delete icon (🗑️) on a bill
2. Confirm deletion

**Expected Results:**
- ✓ Confirmation dialog: "This will remove all items from stock"
- ✓ On confirm: Bill disappears from table
- ✓ Success notification: "Bill deleted successfully"
- ✓ Stock quantities decreased for all items in that bill
- ✓ Bill removed from database

### Test 5: Add Donation Bill

**Steps:**
1. Navigate to "Donations" page
2. Click "Add Bill" button
3. Fill bill header:
   - Date: Select date
   - Donor Name: Type "Red Cross"
   - Remarks: Type "Monthly donation"
4. Add items (same process as incoming)
5. Save

**Expected Results:**
- ✓ Bill Number format: DON-YYYYMMDD-0001
- ✓ Donor autocomplete suggests "Red Cross" on subsequent bills
- ✓ Stock increased
- ✓ All CRUD operations work (view, edit, delete)

### Test 6: Add Outgoing Stock Bill (Dispatch)

**Steps:**
1. Navigate to "Outgoing Stock" page
2. Click "Add Bill" button
3. Fill bill header:
   - Date: Select date
   - Center: Select from searchable dropdown
   - Officer Name: Type "Officer John Doe"
   - Officer NIC: Type "123456789V"
   - Remarks: Optional
4. Add item:
   - Item: Select item
   - Quantity Requested: 100
   - Quantity Issued: 80 (can be less than requested)
   - Remarks: Optional
5. Add another item
6. Save

**Expected Results:**
- ✓ Bill Number format: DSP-YYYYMMDD-0001
- ✓ Center dropdown is searchable
- ✓ Validation: Issued ≤ Requested
- ✓ Stock decreased by Issued quantities (not Requested)
- ✓ Table shows 8 columns including Center, Officer, NIC
- ✓ View details shows both Requested and Issued columns

**Validation Tests:**
- Try Issued > Requested → Error: "Issued quantity cannot exceed requested quantity"
- Try without selecting center → Error: "Please select a center"

### Test 7: Multiple Bills Same Day

**Steps:**
1. Add 3 incoming bills on same date
2. Check bill numbers

**Expected Results:**
- ✓ Bill numbers: 
  - GRN-YYYYMMDD-0001
  - GRN-YYYYMMDD-0002
  - GRN-YYYYMMDD-0003
- ✓ Counter increments correctly
- ✓ Different suppliers tracked separately

### Test 8: Daily Counter Reset

**Steps:**
1. Add bill today → GRN-20240115-0001
2. Change system date to tomorrow
3. Add bill tomorrow → GRN-20240116-0001

**Expected Results:**
- ✓ Counter resets to 0001 for new day
- ✓ Each day has independent sequence

### Test 9: Autocomplete Feature

**Steps:**
1. Add incoming bill with supplier "ABC Supplies"
2. Save
3. Add new incoming bill
4. Start typing "ABC" in supplier field

**Expected Results:**
- ✓ Autocomplete suggests "ABC Supplies"
- ✓ Can select from dropdown
- ✓ Can still type new supplier name

### Test 10: Dynamic Item Management

**Steps:**
1. Open Add Bill modal
2. Click "+ Add Item" 10 times
3. Remove 5 items (random)
4. Add 3 more items
5. Verify item counter

**Expected Results:**
- ✓ Can add unlimited items
- ✓ Can remove any item
- ✓ Item counter shows correct count: "(8 items)"
- ✓ No errors or UI glitches
- ✓ Row IDs remain unique

### Test 11: Long Bills

**Steps:**
1. Create bill with 20+ items
2. View details
3. Edit and modify items

**Expected Results:**
- ✓ Modal scrolls correctly
- ✓ All items visible in detail view
- ✓ Edit modal loads all items
- ✓ No performance issues
- ✓ Save completes successfully

### Test 12: Edge Cases

#### Empty Remarks
1. Add bill without remarks → Should work

#### Special Characters
1. Use supplier name: "O'Brien & Co."
2. Use remarks: "Test with <html> & special chars"
3. Expected: Escaped correctly, no XSS

#### Very Long Text
1. Enter 500 characters in remarks
2. Expected: Accepts and displays correctly

#### Duplicate Items in Bill
1. Add same item twice with different quantities
2. Expected: Allowed, both rows saved

#### Inactive Items
1. Make an item Inactive
2. Edit bill containing that item
3. Expected: Item still appears in dropdown with "[Inactive]" label

### Test 13: Stock Accuracy

**Steps:**
1. Note current stock of Item A: 100 units
2. Add incoming bill: Item A +50 → Stock should be 150
3. Add outgoing bill: Item A -30 → Stock should be 120
4. Edit incoming bill: Change Item A to +70 → Stock should be 140 (120 - 50 + 70)
5. Delete outgoing bill → Stock should be 170 (140 + 30)
6. Delete incoming bill → Stock should be 100 (back to original)

**Expected Results:**
- ✓ All calculations correct
- ✓ No orphaned stock entries
- ✓ Current Stock page shows accurate quantities

### Test 14: Concurrent Editing

**Steps:**
1. Open bill for editing
2. Open same bill in detail view (if possible)
3. Edit and save
4. Refresh detail view

**Expected Results:**
- ✓ Changes reflected immediately
- ✓ No data corruption
- ✓ Latest data always shown

### Test 15: Validation Messages

Test all validation scenarios:
1. Empty bill (no items) → "Please add at least one item to the bill"
2. Missing item selection → "Please fill all required item fields correctly"
3. Zero quantity → "Please fill all required item fields correctly"
4. Missing supplier → Form validation error
5. Issued > Requested (outgoing) → "Issued quantity cannot exceed requested quantity"
6. Missing center (outgoing) → "Please select a center"

**Expected Results:**
- ✓ Clear, user-friendly error messages
- ✓ Messages appear as notifications (not browser alerts)
- ✓ Form doesn't submit with errors
- ✓ User can correct and resubmit

### Test 16: Navigation

**Steps:**
1. Open add bill modal
2. Switch to different page (e.g., Items)
3. Switch back to Incoming

**Expected Results:**
- ✓ Modal closes when switching pages
- ✓ No modal artifacts left on screen
- ✓ Page loads correctly

### Test 17: Refresh Functionality

**Steps:**
1. Add bill
2. Click Refresh button (top right)

**Expected Results:**
- ✓ Table reloads
- ✓ Success notification: "Data refreshed successfully"
- ✓ New data appears

### Test 18: Mobile/Responsive

**Steps:**
1. Resize browser window to mobile size (375px width)
2. Open add bill modal
3. Scroll through items table
4. Add/remove items

**Expected Results:**
- ✓ Modal fits on screen
- ✓ Items table scrolls horizontally if needed
- ✓ Buttons stack vertically
- ✓ All functionality works
- ✓ Text readable

### Test 19: Reports Integration

**Steps:**
1. Add several bills
2. Navigate to Reports page
3. Generate "Incoming Stock Report"

**Expected Results:**
- ✓ Report shows bill-based data
- ✓ Can filter by date range
- ✓ Includes bill numbers
- ✓ Shows supplier/donor/center info

### Test 20: Migration from Old Data

**Steps:**
1. Start with old item-by-item data
2. Run migration on first app start
3. Check results

**Expected Results:**
- ✓ Old items grouped into bills by (date + supplier/donor/center)
- ✓ All items preserved
- ✓ Stock quantities match old system
- ✓ Old tables renamed to *_OLD
- ✓ Backup file created
- ✓ Can still query old data for reference

## Performance Tests

### Load Time
- Page load with 0 bills → < 100ms
- Page load with 100 bills → < 500ms
- Page load with 1000 bills → < 2s

### Modal Open Time
- Add modal → < 200ms
- Edit modal with 10 items → < 500ms
- Detail modal → < 300ms

### Save Time
- Bill with 1 item → < 100ms
- Bill with 10 items → < 500ms
- Bill with 50 items → < 2s

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (Chromium) - Primary
- [ ] Electron app - Primary
- [ ] Firefox (if using web version)
- [ ] Safari (if using web version)

## Regression Testing

After any code changes, re-run:
1. Test 1 (Add bill)
2. Test 2 (View bill)
3. Test 3 (Edit bill)
4. Test 4 (Delete bill)
5. Test 13 (Stock accuracy)

## Bug Reporting Template

If issues found:
```
**Issue:** [Short description]
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. ...

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Environment:**
- OS: [Windows/Mac/Linux]
- App Version: [Version]
- Database: [Fresh/Migrated]

**Console Errors:** [Paste any errors from browser console]
**Screenshots:** [If applicable]
```

## Test Completion Checklist

### Incoming Stock Bills
- [ ] Add bill with 1 item
- [ ] Add bill with 10+ items
- [ ] View bill details
- [ ] Edit bill (add/remove/modify items)
- [ ] Delete bill
- [ ] Stock updates correctly
- [ ] Bill number format correct
- [ ] Supplier autocomplete works
- [ ] Validation works

### Donation Bills
- [ ] Add donation bill
- [ ] View details
- [ ] Edit donation
- [ ] Delete donation
- [ ] Donor autocomplete works
- [ ] Stock updates correctly

### Outgoing Stock Bills
- [ ] Add dispatch bill
- [ ] Center selection works
- [ ] Officer fields required
- [ ] Requested vs Issued validation
- [ ] View details shows both quantities
- [ ] Edit dispatch
- [ ] Delete dispatch
- [ ] Stock decreases by Issued amount

### UI/UX
- [ ] All modals open correctly
- [ ] Add/remove items works
- [ ] Item counter updates
- [ ] Action buttons work
- [ ] Tables display correctly
- [ ] Responsive on mobile
- [ ] No console errors
- [ ] Notifications display correctly

### Edge Cases
- [ ] Empty remarks accepted
- [ ] Special characters handled
- [ ] Long text handled
- [ ] Duplicate items allowed
- [ ] Inactive items in edit
- [ ] Very long bills (20+ items)

### Integration
- [ ] Migration works
- [ ] Stock calculations correct
- [ ] Reports show bill data
- [ ] Database queries efficient
- [ ] No data corruption

## Success Criteria

✅ **All tests pass** = Frontend implementation complete and ready for production

❌ **Any test fails** = Document bug and fix before proceeding

## Next Steps After Testing

1. **If all tests pass:**
   - Mark "TODO - Frontend Implementation" as complete ✓
   - Update UPDATE_NOTES.md with completion status
   - Create release notes
   - Deploy to production

2. **If tests fail:**
   - Document all bugs in BUGS.md
   - Prioritize critical vs minor issues
   - Fix bugs
   - Re-test
   - Repeat until all pass

3. **Post-deployment:**
   - Monitor for user feedback
   - Track any new issues
   - Plan enhancements from FRONTEND_IMPLEMENTATION.md
