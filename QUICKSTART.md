# Quick Start Guide - DMC Inventory System

## Installation and First Run

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Run the Application
```powershell
npm start
```

## First Time Setup

When you first run the application:

1. The database will be automatically created
2. You'll see an empty dashboard
3. Start by adding items and centers

## Quick Workflow

### 1. Setup Master Data

**Add Items:**
- Click "Items Master" in sidebar
- Click "Add Item"
- Enter: Rice, KG, Food, Reorder Level: 100
- Repeat for other items

**Add Centers:**
- Click "Centers Master"
- Click "Add Center"
- Enter center details

### 2. Record Incoming Stock

- Click "Incoming Stock"
- Click "Add Incoming Stock"
- Select item, enter supplier and quantity
- Save

### 3. Record Donations

- Click "Donations"
- Click "Add Donation"
- Select item, enter donor and quantity
- Save

### 4. Dispatch Stock

- Click "Dispatch/Outgoing"
- Click "Dispatch Stock"
- Select center and item
- Enter requested and issued quantities
- Enter officer details
- Save

### 5. Monitor Stock

- Click "Dashboard" for overview
- Click "Current Stock" for detailed view
- Low stock items are highlighted

## Loading Sample Data

To quickly test the system with sample data:

```powershell
# After first run, stop the application
# Find your database location (check console output)
# Default: C:\Users\YourName\AppData\Roaming\dmc-inventory\dmc_inventory.db

# Open the database with DB Browser for SQLite (optional)
# Or load sample data programmatically
```

## Keyboard Shortcuts

- `Ctrl + R` - Refresh current page
- `F11` - Toggle fullscreen
- `Ctrl + Q` - Quit application (add if needed)

## Tips

1. **Backup Regularly**: Use Settings > Export Database
2. **Check Dashboard Daily**: Monitor low stock alerts
3. **Enter Complete Data**: Fill in all fields for better tracking
4. **Use Consistent Names**: Use standard naming for items and categories

## Common Tasks

### Taking Daily Backup
1. Go to Settings
2. Click "Export Database"
3. Save with date: `backup_2025-12-02.db`

### Checking Stock Levels
1. Go to "Current Stock"
2. Use search to find specific items
3. Red status = Low stock, needs reordering

### Generating Reports
- Currently shows transaction history
- Export database and use SQLite tools for custom reports
- Or use the built-in views

## Troubleshooting

**Problem: Application won't start**
- Check if port 3000 is available
- Try: `npm install` again

**Problem: Database error**
- Check write permissions
- Try running as administrator
- Check disk space

**Problem: Cannot add data**
- Ensure all required fields are filled
- Check if item/center exists
- Verify no duplicate names

## Support

For technical issues:
1. Check BUILD.md for detailed instructions
2. Check database location and permissions
3. Review console logs (press F12 in app)

## Next Steps

After setup:
1. Add all your items
2. Add all centers
3. Set appropriate reorder levels
4. Start recording transactions
5. Monitor dashboard daily
6. Export database weekly

## Building for Production

When ready to deploy:

```powershell
# Build the application
npm run build:win

# Create installer (requires Inno Setup)
# See BUILD.md for details
```

Distribute `DMC_Inventory_Setup.exe` to users.
