# Project Structure

```
DMC_inventory/
│
├── src/                              # Source code directory
│   ├── main.js                      # Electron main process
│   ├── preload.js                   # Preload script (IPC bridge)
│   │
│   ├── database/                    # Database layer
│   │   ├── schema.sql              # Database schema definition
│   │   └── db.js                   # Database manager (SQLite operations)
│   │
│   └── renderer/                    # Frontend (UI)
│       ├── index.html              # Main HTML file
│       ├── styles.css              # Application styles
│       └── app.js                  # Frontend JavaScript logic
│
├── assets/                          # Application assets
│   ├── icon.png                    # PNG icon (to be added)
│   ├── icon.ico                    # Windows icon (to be added)
│   └── README.md                   # Icon instructions
│
├── dist/                            # Build output (generated)
│   └── win-unpacked/               # Unpacked Windows build
│
├── installer/                       # Installer output (generated)
│   └── DMC_Inventory_Setup.exe    # Windows installer
│
├── node_modules/                    # Dependencies (generated)
│
├── package.json                     # Node.js project configuration
├── package-lock.json               # Dependency lock file
├── installer.iss                   # Inno Setup script
├── .gitignore                      # Git ignore rules
│
├── README.md                       # Project documentation
├── BUILD.md                        # Build instructions
├── QUICKSTART.md                   # Quick start guide
└── sample_data.sql                 # Sample data for testing

```

## Key Files Explained

### Main Process (Backend)
- **main.js**: Entry point, creates window, manages IPC
- **preload.js**: Secure bridge between main and renderer
- **db.js**: All database operations

### Renderer Process (Frontend)
- **index.html**: User interface structure
- **styles.css**: Visual styling
- **app.js**: All frontend logic and event handlers

### Database
- **schema.sql**: Table definitions and views
- Database file created at runtime: `%AppData%/dmc-inventory/dmc_inventory.db`

### Configuration
- **package.json**: App metadata, dependencies, build config
- **installer.iss**: Windows installer configuration

## Data Flow

```
User Action (UI)
    ↓
app.js (Frontend)
    ↓
preload.js (IPC Bridge)
    ↓
main.js (IPC Handler)
    ↓
db.js (Database Operations)
    ↓
SQLite Database
    ↓
Results back through same chain
    ↓
UI Updated
```

## Features by File

### Dashboard (app.js)
- Statistics display
- Low stock alerts
- Data refresh

### Items Master (app.js + db.js)
- CRUD operations for items
- Category management
- Reorder level tracking

### Centers Master (app.js + db.js)
- Center registration
- Contact management
- Status tracking

### Incoming Stock (app.js + db.js)
- GRN recording
- Supplier tracking
- Stock increments

### Donations (app.js + db.js)
- Donation logging
- Donor tracking
- Stock increments

### Outgoing Stock (app.js + db.js)
- Dispatch recording
- Officer tracking
- Stock decrements
- Requested vs Issued tracking

### Current Stock (app.js + db.js + schema.sql)
- Real-time calculations via VIEW
- Stock status
- Search/filter capability

### Settings (app.js + db.js + main.js)
- Database export
- Database import
- Backup management

## Security Features

1. **Context Isolation**: Renderer process isolated
2. **Node Integration Disabled**: No direct Node.js access from UI
3. **Preload Script**: Controlled IPC communication
4. **SQL Injection Prevention**: Prepared statements
5. **Input Validation**: Frontend and backend validation

## Performance Optimizations

1. **SQLite WAL Mode**: Better concurrent access
2. **Indexed Tables**: Fast queries
3. **Cached Data**: Minimize database calls
4. **Efficient Views**: Pre-calculated stock levels

## Extension Points

To add new features:

1. **New Table**: Add to schema.sql
2. **Backend Methods**: Add to db.js
3. **IPC Handlers**: Add to main.js
4. **Frontend API**: Add to preload.js
5. **UI**: Add to index.html and app.js

## Dependencies

Key packages:
- `electron`: Desktop framework
- `better-sqlite3`: SQLite database
- `electron-builder`: Build & packaging

## Build Process

1. `npm install` → Install dependencies
2. `npm start` → Run development
3. `npm run build:win` → Build production
4. Inno Setup → Create installer
