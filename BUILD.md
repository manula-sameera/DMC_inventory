## Build Instructions

### Prerequisites

1. Node.js (v18 or later)
2. npm (comes with Node.js)
3. Inno Setup (for creating Windows installer)

### Development Setup

```powershell
# Clone or navigate to project directory
cd I:\Sources\DMC_inventory

# Install dependencies
npm install

# Run in development mode
npm start
```

### Production Build

```powershell
# Build the application for Windows
npm run build:win

# This will create a folder: dist/win-unpacked/
# The executable will be: dist/win-unpacked/DMC Inventory System.exe
```

### Creating Installer with Inno Setup

**Option 1: Using Inno Setup GUI**

1. Download and install Inno Setup from: https://jrsoftware.org/isinfo.php
2. Build the Electron app first: `npm run build:win`
3. Open `installer.iss` with Inno Setup Compiler
4. Click "Compile" (or press Ctrl+F9)
5. The installer will be created in the `installer/` folder

**Option 2: Using Command Line**

```powershell
# Install Inno Setup first, then add to PATH or use full path
# Build the app
npm run build:win

# Compile installer
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss

# The installer will be created as: installer/DMC_Inventory_Setup.exe
```

### Directory Structure After Build

```
DMC_inventory/
├── dist/
│   └── win-unpacked/          # Unpacked application files
├── installer/
│   └── DMC_Inventory_Setup.exe # Final installer
└── ...
```

### Testing the Build

1. After building, test the unpacked version:
   ```powershell
   .\dist\win-unpacked\"DMC Inventory System.exe"
   ```

2. Test the installer:
   - Run `installer/DMC_Inventory_Setup.exe`
   - Install to a test location
   - Verify all features work
   - Test database import/export
   - Uninstall and verify cleanup

### Distribution

Distribute the `DMC_Inventory_Setup.exe` file to end users. They only need to:
1. Run the installer
2. Follow the installation wizard
3. Launch the application

No additional software (Node.js, SQLite, etc.) needs to be installed on client PCs.

### Troubleshooting

**Issue: npm install fails**
- Ensure Node.js is properly installed
- Try: `npm install --legacy-peer-deps`

**Issue: Build fails with better-sqlite3 errors**
- Delete node_modules and package-lock.json
- Run: `npm install`
- Rebuild: `npm rebuild better-sqlite3`

**Issue: Installer doesn't include all files**
- Check that `npm run build:win` completed successfully
- Verify `dist/win-unpacked/` contains all necessary files
- Check Inno Setup script paths in `installer.iss`

### Database Location

When installed, the database will be stored at:
```
C:\Users\<Username>\AppData\Roaming\dmc-inventory\dmc_inventory.db
```

This location persists across application updates.
