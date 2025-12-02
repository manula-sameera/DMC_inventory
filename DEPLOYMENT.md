# DMC Inventory System - Windows Deployment Guide

## ✅ Fully Offline Application

This application is designed to work **completely offline** with no internet connection required:
- No external API calls
- No CDN dependencies  
- All resources bundled in the executable
- Local SQLite database stored in user's AppData folder

## 📦 Built Executable Location

The Windows executable has been successfully built and is located at:
```
I:\Sources\DMC_inventory\dist\win-unpacked\
```

### Main Executable
- **File**: `DMC Inventory System.exe` (177 MB)
- **Architecture**: Windows x64
- **Electron Version**: 28.3.3

## 🚀 How to Deploy

### Option 1: Simple Copy (Recommended for Offline Use)

1. **Copy the entire folder** `dist\win-unpacked\` to the target computer
2. **Double-click** `DMC Inventory System.exe` to launch
3. The app will automatically create its database at:
   ```
   C:\Users\[Username]\AppData\Roaming\dmc-inventory\dmc_inventory.db
   ```

### Option 2: Create a Portable Package

Package the `win-unpacked` folder as a ZIP file:

```powershell
cd I:\Sources\DMC_inventory\dist
Compress-Archive -Path "win-unpacked" -DestinationPath "DMC_Inventory_Portable.zip"
```

Users can extract and run the app from any location (USB drive, network drive, etc.)

## 📁 What's Included

The executable folder contains:
- **DMC Inventory System.exe** - Main application
- **resources/app.asar** - Application code and assets (63 MB)
- **resources/better-sqlite3/** - SQLite database engine (native module)
- **Electron runtime files** - All Chromium/Node.js dependencies
- **All DLLs and dependencies** - No additional installation required

## 💾 Data Storage

### Database Location
The app stores its database at:
```
%APPDATA%\dmc-inventory\dmc_inventory.db
```

### Backup & Transfer
To backup or transfer data between computers:
1. Use the **Export Database** feature in the app
2. Or manually copy the database file from the AppData folder

## ✨ Features Working Offline

All features work without internet:
- ✅ Dashboard & Statistics
- ✅ Inventory Management (Current Stock)
- ✅ Incoming Stock Tracking
- ✅ Donations Management
- ✅ Dispatch/Outgoing Stock
- ✅ Items Master Data
- ✅ Centers Master Data
- ✅ PDF Report Generation
- ✅ Database Import/Export
- ✅ Report Generation (Monthly, Stock, Transaction reports)

## 🔧 System Requirements

- **OS**: Windows 10 or later (x64)
- **RAM**: 4 GB minimum (8 GB recommended)
- **Disk Space**: 300 MB for application + database growth
- **Screen Resolution**: 1280x720 minimum (1400x900 recommended)
- **Internet**: NOT REQUIRED ✅

## 🚫 No Installation Required

The application is **portable** and does not require:
- Administrator privileges (except for first run to create AppData folder)
- Windows Installer
- .NET Framework
- Any additional runtimes

## 📝 First Run

On first launch, the app will:
1. Create the database in AppData
2. Initialize database schema
3. Load default settings
4. Display the dashboard

No configuration or setup needed!

## 🔄 Updates

Since this is designed for offline use:
- No automatic updates
- To update: Replace the `win-unpacked` folder with the new version
- Database will be preserved (stored separately in AppData)

## 🛠️ Rebuilding the Application

If you need to rebuild:

```powershell
# Navigate to project
cd I:\Sources\DMC_inventory

# Install dependencies (requires internet - one time only)
npm install

# Build Windows executable
npm run build:win
```

The built executable will be in `dist\win-unpacked\`

## 📋 Distribution Checklist

- [x] Remove online dependencies (update-electron-app removed)
- [x] Bundle all native modules (better-sqlite3 included)
- [x] Include all fonts and assets
- [x] Test offline functionality
- [x] Verify database creation and initialization
- [x] Test PDF generation
- [x] Ensure all UI features work

## 🎯 Quick Start for End Users

1. Copy the `win-unpacked` folder to your computer
2. Open the folder
3. Double-click `DMC Inventory System.exe`
4. Start managing your inventory!

No internet connection required at any point! 🎉
