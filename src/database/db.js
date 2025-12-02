const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = null;
    }

    initialize() {
        try {
            const userDataPath = app.getPath('userData');
            this.dbPath = path.join(userDataPath, 'dmc_inventory.db');
            
            // Ensure directory exists
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true });
            }

            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            
            this.createTables();
            console.log('Database initialized successfully at:', this.dbPath);
            return true;
        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    createTables() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        this.db.exec(schema);
    }

    // Items Master Methods
    getAllItems() {
        const stmt = this.db.prepare('SELECT * FROM ITEMS_MASTER ORDER BY Item_Name');
        return stmt.all();
    }

    getActiveItems() {
        const stmt = this.db.prepare('SELECT * FROM ITEMS_MASTER WHERE Status = ? ORDER BY Item_Name');
        return stmt.all('Active');
    }

    addItem(item) {
        const stmt = this.db.prepare(`
            INSERT INTO ITEMS_MASTER (Item_Name, Unit_Measure, Category, Reorder_Level)
            VALUES (?, ?, ?, ?)
        `);
        return stmt.run(item.Item_Name, item.Unit_Measure, item.Category, item.Reorder_Level || 0);
    }

    updateItem(itemId, item) {
        const stmt = this.db.prepare(`
            UPDATE ITEMS_MASTER 
            SET Item_Name = ?, Unit_Measure = ?, Category = ?, Reorder_Level = ?, 
                Modified_Date = CURRENT_TIMESTAMP
            WHERE Item_ID = ?
        `);
        return stmt.run(item.Item_Name, item.Unit_Measure, item.Category, item.Reorder_Level, itemId);
    }

    deleteItem(itemId) {
        const stmt = this.db.prepare('UPDATE ITEMS_MASTER SET Status = ?, Modified_Date = CURRENT_TIMESTAMP WHERE Item_ID = ?');
        return stmt.run('Inactive', itemId);
    }

    // Centers Master Methods
    getAllCenters() {
        const stmt = this.db.prepare('SELECT * FROM CENTERS_MASTER ORDER BY Center_Name');
        return stmt.all();
    }

    getActiveCenters() {
        const stmt = this.db.prepare('SELECT * FROM CENTERS_MASTER WHERE Status = ? ORDER BY Center_Name');
        return stmt.all('Active');
    }

    addCenter(center) {
        const stmt = this.db.prepare(`
            INSERT INTO CENTERS_MASTER (Center_Name, District, Contact_Person, Contact_Phone)
            VALUES (?, ?, ?, ?)
        `);
        return stmt.run(center.Center_Name, center.District, center.Contact_Person, center.Contact_Phone);
    }

    updateCenter(centerId, center) {
        const stmt = this.db.prepare(`
            UPDATE CENTERS_MASTER 
            SET Center_Name = ?, District = ?, Contact_Person = ?, Contact_Phone = ?,
                Modified_Date = CURRENT_TIMESTAMP
            WHERE Center_ID = ?
        `);
        return stmt.run(center.Center_Name, center.District, center.Contact_Person, center.Contact_Phone, centerId);
    }

    deleteCenter(centerId) {
        const stmt = this.db.prepare('UPDATE CENTERS_MASTER SET Status = ?, Modified_Date = CURRENT_TIMESTAMP WHERE Center_ID = ?');
        return stmt.run('Inactive', centerId);
    }

    // Incoming Stock Methods
    getAllIncomingStock() {
        const stmt = this.db.prepare(`
            SELECT i.*, im.Item_Name, im.Unit_Measure 
            FROM INCOMING_STOCK i
            JOIN ITEMS_MASTER im ON i.Item_ID = im.Item_ID
            ORDER BY i.Date_Received DESC, i.GRN_ID DESC
        `);
        return stmt.all();
    }

    addIncomingStock(stock) {
        const stmt = this.db.prepare(`
            INSERT INTO INCOMING_STOCK (Date_Received, Item_ID, Supplier_Name, Qty_Received, Remarks)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(stock.Date_Received, stock.Item_ID, stock.Supplier_Name, stock.Qty_Received, stock.Remarks || null);
    }

    // Donations Methods
    getAllDonations() {
        const stmt = this.db.prepare(`
            SELECT d.*, im.Item_Name, im.Unit_Measure 
            FROM DONATIONS d
            JOIN ITEMS_MASTER im ON d.Item_ID = im.Item_ID
            ORDER BY d.Date_Received DESC, d.Donation_ID DESC
        `);
        return stmt.all();
    }

    addDonation(donation) {
        const stmt = this.db.prepare(`
            INSERT INTO DONATIONS (Date_Received, Item_ID, Donor_Name, Qty_Received, Remarks)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(donation.Date_Received, donation.Item_ID, donation.Donor_Name, donation.Qty_Received, donation.Remarks || null);
    }

    // Outgoing Stock Methods
    getAllOutgoingStock() {
        const stmt = this.db.prepare(`
            SELECT o.*, im.Item_Name, im.Unit_Measure, c.Center_Name, c.District
            FROM OUTGOING_STOCK o
            JOIN ITEMS_MASTER im ON o.Item_ID = im.Item_ID
            JOIN CENTERS_MASTER c ON o.Center_ID = c.Center_ID
            ORDER BY o.Date_Issued DESC, o.Dispatch_ID DESC
        `);
        return stmt.all();
    }

    addOutgoingStock(stock) {
        const stmt = this.db.prepare(`
            INSERT INTO OUTGOING_STOCK (Date_Issued, Center_ID, Item_ID, Qty_Requested, Qty_Issued, Officer_Name, Officer_NIC, Remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            stock.Date_Issued, stock.Center_ID, stock.Item_ID, 
            stock.Qty_Requested, stock.Qty_Issued, stock.Officer_Name, 
            stock.Officer_NIC, stock.Remarks || null
        );
    }

    // Current Stock Methods
    getCurrentStock() {
        const stmt = this.db.prepare('SELECT * FROM CURRENT_STOCK ORDER BY Item_Name');
        return stmt.all();
    }

    getLowStock() {
        const stmt = this.db.prepare('SELECT * FROM CURRENT_STOCK WHERE Stock_Status = ? ORDER BY Item_Name');
        return stmt.all('Low Stock');
    }

    // Report Methods
    getItemHistory(itemId) {
        const incoming = this.db.prepare(`
            SELECT 'Incoming' as Type, Date_Received as Date, Supplier_Name as Source, Qty_Received as Quantity
            FROM INCOMING_STOCK WHERE Item_ID = ?
        `).all(itemId);

        const donations = this.db.prepare(`
            SELECT 'Donation' as Type, Date_Received as Date, Donor_Name as Source, Qty_Received as Quantity
            FROM DONATIONS WHERE Item_ID = ?
        `).all(itemId);

        const outgoing = this.db.prepare(`
            SELECT 'Outgoing' as Type, Date_Issued as Date, 
                   (SELECT Center_Name FROM CENTERS_MASTER WHERE Center_ID = o.Center_ID) as Source, 
                   Qty_Issued as Quantity
            FROM OUTGOING_STOCK o WHERE Item_ID = ?
        `).all(itemId);

        return [...incoming, ...donations, ...outgoing].sort((a, b) => new Date(b.Date) - new Date(a.Date));
    }

    // Import/Export Methods
    exportDatabase(exportPath) {
        try {
            this.db.backup(exportPath);
            return { success: true, path: exportPath };
        } catch (error) {
            console.error('Export error:', error);
            return { success: false, error: error.message };
        }
    }

    importDatabase(importPath) {
        try {
            // Close current database
            if (this.db) {
                this.db.close();
            }

            // Backup current database
            const backupPath = this.dbPath + '.backup.' + Date.now();
            if (fs.existsSync(this.dbPath)) {
                fs.copyFileSync(this.dbPath, backupPath);
            }

            // Copy imported database
            fs.copyFileSync(importPath, this.dbPath);

            // Reopen database
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');

            return { success: true };
        } catch (error) {
            console.error('Import error:', error);
            return { success: false, error: error.message };
        }
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = new DatabaseManager();
