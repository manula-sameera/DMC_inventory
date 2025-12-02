const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./database/db');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../assets/icon.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    // Open DevTools in development
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    try {
        db.initialize();
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    } catch (error) {
        console.error('Failed to initialize app:', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        db.close();
        app.quit();
    }
});

// IPC Handlers for Items
ipcMain.handle('items:getAll', () => db.getAllItems());
ipcMain.handle('items:getActive', () => db.getActiveItems());
ipcMain.handle('items:add', (event, item) => db.addItem(item));
ipcMain.handle('items:update', (event, itemId, item) => db.updateItem(itemId, item));
ipcMain.handle('items:delete', (event, itemId) => db.deleteItem(itemId));

// IPC Handlers for Centers
ipcMain.handle('centers:getAll', () => db.getAllCenters());
ipcMain.handle('centers:getActive', () => db.getActiveCenters());
ipcMain.handle('centers:add', (event, center) => db.addCenter(center));
ipcMain.handle('centers:update', (event, centerId, center) => db.updateCenter(centerId, center));
ipcMain.handle('centers:delete', (event, centerId) => db.deleteCenter(centerId));

// IPC Handlers for Incoming Stock
ipcMain.handle('incoming:getAll', () => db.getAllIncomingStock());
ipcMain.handle('incoming:add', (event, stock) => db.addIncomingStock(stock));

// IPC Handlers for Donations
ipcMain.handle('donations:getAll', () => db.getAllDonations());
ipcMain.handle('donations:add', (event, donation) => db.addDonation(donation));

// IPC Handlers for Outgoing Stock
ipcMain.handle('outgoing:getAll', () => db.getAllOutgoingStock());
ipcMain.handle('outgoing:add', (event, stock) => db.addOutgoingStock(stock));

// IPC Handlers for Current Stock
ipcMain.handle('stock:getCurrent', () => db.getCurrentStock());
ipcMain.handle('stock:getLowStock', () => db.getLowStock());
ipcMain.handle('stock:getItemHistory', (event, itemId) => db.getItemHistory(itemId));

// IPC Handlers for Import/Export
ipcMain.handle('db:export', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Database',
        defaultPath: `dmc_inventory_backup_${new Date().toISOString().split('T')[0]}.db`,
        filters: [
            { name: 'Database Files', extensions: ['db'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (!result.canceled && result.filePath) {
        return db.exportDatabase(result.filePath);
    }
    return { success: false, canceled: true };
});

ipcMain.handle('db:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Database',
        filters: [
            { name: 'Database Files', extensions: ['db'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const importResult = db.importDatabase(result.filePaths[0]);
        if (importResult.success) {
            // Reload the window to refresh all data
            mainWindow.reload();
        }
        return importResult;
    }
    return { success: false, canceled: true };
});
