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
│             └── app.js                  # Frontend JavaScript logic
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

... (file content preserved) ...
