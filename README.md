# DMC Inventory Management System

A desktop application for managing inventory in Disaster Management Centers. Built with Electron and SQLite.

## Features

- ✅ Track incoming stock and donations
- ✅ Manage outgoing stock dispatches
- ✅ Real-time stock monitoring with low stock alerts
- ✅ Master data management for items and centers
- ✅ Complete transaction history
- ✅ Database backup and restore functionality
- ✅ Works offline - no internet required
- ✅ No additional software or plugins needed

## Installation

### For End Users

1. Download the installer from the releases page
2. Run `DMC_Inventory_Setup.exe`
3. Follow the installation wizard
4. Launch the application from the Start Menu or Desktop

### For Developers

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build

# Build Windows installer
npm run build:win
```

## Database Structure

### Tables

- **ITEMS_MASTER**: Item catalog with categories and reorder levels
- **CENTERS_MASTER**: Protection center information
- **INCOMING_STOCK**: Goods received from suppliers
- **DONATIONS**: Donation records
- **OUTGOING_STOCK**: Dispatch records to centers
- **CURRENT_STOCK**: Real-time stock levels (view)

## Usage

### Adding Items

1. Navigate to "Items Master"
2. Click "Add Item"
3. Enter item details (name, unit, category, reorder level)
4. Save

### Recording Incoming Stock

1. Navigate to "Incoming Stock"
2. Click "Add Incoming Stock"
3. Select item, enter supplier and quantity
4. Save

### Dispatching Stock

1. Navigate to "Dispatch/Outgoing"
2. Click "Dispatch Stock"
3. Select center, item, and enter quantities
4. Enter officer details
5. Save

### Database Backup

1. Navigate to "Settings"
2. Click "Export Database"
3. Choose save location
4. Database file will be saved with date

### Database Restore

1. Navigate to "Settings"
2. Click "Import Database"
3. Select backup file
4. Confirm replacement

## System Requirements

- Windows 7 or later (64-bit)
- 100 MB free disk space
- No additional runtime required (all bundled)

## Building Installer with Inno Setup

1. Build the application: `npm run build:win`
2. Install Inno Setup from https://jrsoftware.org/isinfo.php
3. Open `installer.iss` in Inno Setup Compiler
4. Click "Compile"
5. Installer will be created in `installer/` folder

## Technologies Used

- **Electron**: Cross-platform desktop framework
- **SQLite** (better-sqlite3): Embedded database
- **HTML/CSS/JavaScript**: User interface
- **Inno Setup**: Windows installer

## License

MIT

## Support

For issues or questions, contact the DMC IT Department.
