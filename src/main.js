const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');

// Ensure proper Windows taskbar and notification icon behavior
if (process.platform === 'win32') {
    app.setAppUserModelId('com.dmc.inventory');
}

const fs = require('fs');
const db = require('./database/db');
const pdfGenerator = require('./reports/pdfGenerator');

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

app.whenReady().then(async () => {
    try {
        
        db.initialize();
        createWindow();
        buildAppMenu();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });

        function buildAppMenu() {
            try {
                const template = [
                    {
                        label: 'File',
                        submenu: [
                            { role: 'quit' }
                        ]
                    },
                    {
                        label: 'Reports',
                        submenu: [
                            {
                                label: 'Open Reports',
                                accelerator: 'CmdOrCtrl+R',
                                click: () => {
                                    if (mainWindow) mainWindow.webContents.send('app:openReports');
                                }
                            }
                        ]
                    },
                    { role: 'help', submenu: [ { label: 'Learn More', click: () => require('electron').shell.openExternal('https://github.com') } ] }
                ];
                const menu = Menu.buildFromTemplate(template);
                Menu.setApplicationMenu(menu);
            } catch (err) {
                console.error('Failed to build application menu:', err);
            }
        }
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

// IPC Handlers for GN Divisions
ipcMain.handle('gnDivisions:getAll', () => db.getAllGNDivisions());
ipcMain.handle('gnDivisions:getActive', () => db.getActiveGNDivisions());
ipcMain.handle('gnDivisions:add', (event, gn) => db.addGNDivision(gn));
ipcMain.handle('gnDivisions:update', (event, gnId, gn) => db.updateGNDivision(gnId, gn));
ipcMain.handle('gnDivisions:delete', (event, gnId) => db.deleteGNDivision(gnId));

// IPC Handlers for Incoming Stock Bills
ipcMain.handle('incoming:bills:getAll', () => db.getAllIncomingBills());
ipcMain.handle('incoming:bills:getDetails', (event, billId) => db.getIncomingBillDetails(billId));
ipcMain.handle('incoming:bills:add', (event, billData) => db.addIncomingBill(billData));
ipcMain.handle('incoming:bills:update', (event, billId, billData) => db.updateIncomingBill(billId, billData));
ipcMain.handle('incoming:bills:delete', (event, billId) => db.deleteIncomingBill(billId));

// Legacy IPC Handlers for Incoming Stock (for backward compatibility)
ipcMain.handle('incoming:getAll', () => db.getAllIncomingStock());

// IPC Handlers for Donation Bills
ipcMain.handle('donations:bills:getAll', () => db.getAllDonationBills());
ipcMain.handle('donations:bills:getDetails', (event, billId) => db.getDonationBillDetails(billId));
ipcMain.handle('donations:bills:add', (event, billData) => db.addDonationBill(billData));
ipcMain.handle('donations:bills:update', (event, billId, billData) => db.updateDonationBill(billId, billData));
ipcMain.handle('donations:bills:delete', (event, billId) => db.deleteDonationBill(billId));

// Legacy IPC Handlers for Donations (for backward compatibility)
ipcMain.handle('donations:getAll', () => db.getAllDonations());

// IPC Handlers for Outgoing Stock Bills
ipcMain.handle('outgoing:bills:getAll', () => db.getAllOutgoingBills());
ipcMain.handle('outgoing:bills:getDetails', (event, billId) => db.getOutgoingBillDetails(billId));
ipcMain.handle('outgoing:bills:add', (event, billData) => db.addOutgoingBill(billData));
ipcMain.handle('outgoing:bills:update', (event, billId, billData) => db.updateOutgoingBill(billId, billData));
ipcMain.handle('outgoing:bills:delete', (event, billId) => db.deleteOutgoingBill(billId));

// Legacy IPC Handlers for Outgoing Stock (for backward compatibility)
ipcMain.handle('outgoing:getAll', () => db.getAllOutgoingStock());

// IPC Handlers for Care Packages
ipcMain.handle('carePackages:getAllTemplates', () => db.getAllCarePackageTemplates());
ipcMain.handle('carePackages:getActiveTemplates', () => db.getActiveCarePackageTemplates());
ipcMain.handle('carePackages:getTemplate', (event, templateId) => db.getCarePackageTemplate(templateId));
ipcMain.handle('carePackages:addTemplate', (event, template) => db.addCarePackageTemplate(template));
ipcMain.handle('carePackages:updateTemplate', (event, templateId, template) => db.updateCarePackageTemplate(templateId, template));
ipcMain.handle('carePackages:deleteTemplate', (event, templateId) => db.deleteCarePackageTemplate(templateId));

ipcMain.handle('carePackages:getTemplateItems', (event, templateId) => db.getCarePackageTemplateItems(templateId));
ipcMain.handle('carePackages:addTemplateItem', (event, templateItem) => db.addCarePackageTemplateItem(templateItem));
ipcMain.handle('carePackages:updateTemplateItem', (event, templateItemId, templateItem) => db.updateCarePackageTemplateItem(templateItemId, templateItem));
ipcMain.handle('carePackages:deleteTemplateItem', (event, templateItemId) => db.deleteCarePackageTemplateItem(templateItemId));
ipcMain.handle('carePackages:copyTemplateItems', (event, sourceId, targetId) => db.copyCarePackageTemplateItems(sourceId, targetId));

ipcMain.handle('carePackages:getAllIssues', () => db.getAllCarePackageIssues());
ipcMain.handle('carePackages:getIssue', (event, issueId) => db.getCarePackageIssue(issueId));
ipcMain.handle('carePackages:addIssue', (event, issue) => db.addCarePackageIssue(issue));
ipcMain.handle('carePackages:updateIssue', (event, issueId, issue) => db.updateCarePackageIssue(issueId, issue));
ipcMain.handle('carePackages:deleteIssue', (event, issueId) => db.deleteCarePackageIssue(issueId));

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

// IPC Handlers for Reports
ipcMain.handle('reports:generatePDF', async (event, options) => {
    try {
        const { reportType, selectedItemIds, dateFrom, dateTo, centerId } = options;
        
        // Get default downloads folder
        const downloadsPath = app.getPath('downloads');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const defaultFileName = `DMC_${reportType}_${timestamp}.pdf`;
        
        // Show save dialog
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Report',
            defaultPath: path.join(downloadsPath, defaultFileName),
            filters: [
                { name: 'PDF Files', extensions: ['pdf'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled || !result.filePath) {
            return { success: false, canceled: true };
        }

        const outputPath = result.filePath;
        let data, reportPath;

        switch (reportType) {
            case 'current-stock':
                data = db.getCurrentStockReport(selectedItemIds);
                reportPath = await pdfGenerator.generateCurrentStockReport(
                    data, 
                    selectedItemIds, 
                    outputPath
                );
                break;

            case 'incoming':
                data = db.getIncomingStockReport(dateFrom, dateTo, selectedItemIds);
                reportPath = await pdfGenerator.generateIncomingReport(
                    data,
                    { from: dateFrom, to: dateTo },
                    selectedItemIds,
                    outputPath
                );
                break;

            case 'outgoing':
                data = db.getOutgoingStockReport(dateFrom, dateTo, selectedItemIds);
                reportPath = await pdfGenerator.generateOutgoingReport(
                    data,
                    { from: dateFrom, to: dateTo },
                    selectedItemIds,
                    outputPath
                );
                break;

            case 'donations':
                data = db.getDonationsReport(dateFrom, dateTo, selectedItemIds);
                reportPath = await pdfGenerator.generateDonationsReport(
                    data,
                    { from: dateFrom, to: dateTo },
                    selectedItemIds,
                    outputPath
                );
                break;

            case 'care-packages':
                data = db.getCarePackageIssuesReport(dateFrom, dateTo);
                reportPath = await pdfGenerator.generateCarePackagesReport(
                    data,
                    { from: dateFrom, to: dateTo },
                    outputPath
                );
                break;

            case 'center-wise-items':
                if (!centerId) {
                    return { success: false, error: 'Center ID is required' };
                }
                const centerInfo = db.getCenterById(centerId);
                if (!centerInfo) {
                    return { success: false, error: 'Center not found' };
                }
                data = db.getCenterWiseItemsReport(centerId, dateFrom, dateTo);
                reportPath = await pdfGenerator.generateCenterWiseItemsReport(
                    data,
                    centerInfo.Center_Name,
                    { from: dateFrom, to: dateTo },
                    outputPath
                );
                break;

            default:
                return { success: false, error: 'Invalid report type' };
        }

        return { success: true, path: reportPath };
    } catch (error) {
        console.error('Error generating PDF report:', error);
        return { success: false, error: error.message };
    }
});

// IPC Handler to export CSVs for reports
ipcMain.handle('reports:exportCSV', async (event, options) => {
    try {
        const { reportType, selectedItemIds, dateFrom, dateTo, centerId, includeSummary } = options || {};
        const downloadsPath = app.getPath('downloads');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const defaultFileName = `DMC_${reportType}_${timestamp}.csv`;

        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save CSV Report',
            defaultPath: path.join(downloadsPath, defaultFileName),
            filters: [
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled || !result.filePath) {
            return { success: false, canceled: true };
        }

        const outputPath = result.filePath;
        let data, exportResult;

        switch (reportType) {
            case 'current-stock':
                data = db.getCurrentStockReport(selectedItemIds);
                exportResult = await pdfGenerator.exportCurrentStockCSV(data, selectedItemIds, outputPath, { includeSummary: !!includeSummary });
                break;

            case 'incoming':
                data = db.getIncomingStockReport(dateFrom, dateTo, selectedItemIds);
                exportResult = await pdfGenerator.exportIncomingCSV(data, { from: dateFrom, to: dateTo }, selectedItemIds, outputPath, { includeSummary: !!includeSummary });
                break;

            case 'outgoing':
                data = db.getOutgoingStockReport(dateFrom, dateTo, selectedItemIds);
                exportResult = await pdfGenerator.exportOutgoingCSV(data, { from: dateFrom, to: dateTo }, selectedItemIds, outputPath, { includeSummary: !!includeSummary });
                break;

            case 'donations':
                data = db.getDonationsReport(dateFrom, dateTo, selectedItemIds);
                exportResult = await pdfGenerator.exportDonationsCSV(data, { from: dateFrom, to: dateTo }, selectedItemIds, outputPath, { includeSummary: !!includeSummary });
                break;

            case 'care-packages':
                data = db.getCarePackageIssuesReport(dateFrom, dateTo);
                exportResult = await pdfGenerator.exportCarePackagesCSV(data, { from: dateFrom, to: dateTo }, outputPath, { includeSummary: !!includeSummary });
                break;

            case 'center-wise-items':
                if (!centerId) {
                    return { success: false, error: 'Center ID is required' };
                }
                const centerInfo = db.getCenterById(centerId);
                if (!centerInfo) {
                    return { success: false, error: 'Center not found' };
                }
                data = db.getCenterWiseItemsReport(centerId, dateFrom, dateTo);
                exportResult = await pdfGenerator.exportCenterWiseItemsCSV(data, centerInfo.Center_Name, { from: dateFrom, to: dateTo }, outputPath, { includeSummary: !!includeSummary });
                break;

            default:
                return { success: false, error: 'Invalid report type' };
        }

        return { success: true, paths: exportResult };
    } catch (error) {
        console.error('Error exporting CSV report:', error);
        return { success: false, error: error.message };
    }
});

// IPC Handlers for Bulk Upload
ipcMain.handle('bulkUpload:items', async (event, rows) => {
    try {
        return await db.bulkInsertItems(rows);
    } catch (error) {
        console.error('Error bulk uploading items:', error);
        throw error;
    }
});

ipcMain.handle('bulkUpload:centers', async (event, rows) => {
    try {
        return await db.bulkInsertCenters(rows);
    } catch (error) {
        console.error('Error bulk uploading centers:', error);
        throw error;
    }
});

ipcMain.handle('bulkUpload:gn', async (event, rows) => {
    try {
        return await db.bulkInsertGNDivisions(rows);
    } catch (error) {
        console.error('Error bulk uploading GN divisions:', error);
        throw error;
    }
});
