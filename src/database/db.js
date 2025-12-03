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
            this.db.pragma('encoding = "UTF-8"');
            
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

    // Incoming Stock Bills Methods
    getAllIncomingBills() {
        const stmt = this.db.prepare(`
            SELECT 
                ib.*,
                COUNT(ist.GRN_ID) as Item_Count,
                SUM(ist.Qty_Received) as Total_Quantity
            FROM INCOMING_BILLS ib
            LEFT JOIN INCOMING_STOCK ist ON ib.Bill_ID = ist.Bill_ID
            GROUP BY ib.Bill_ID
            ORDER BY ib.Date_Received DESC, ib.Bill_ID DESC
        `);
        return stmt.all();
    }

    getIncomingBillDetails(billId) {
        const billStmt = this.db.prepare('SELECT * FROM INCOMING_BILLS WHERE Bill_ID = ?');
        const bill = billStmt.get(billId);
        
        if (bill) {
            const itemsStmt = this.db.prepare(`
                SELECT ist.*, im.Item_Name, im.Unit_Measure
                FROM INCOMING_STOCK ist
                JOIN ITEMS_MASTER im ON ist.Item_ID = im.Item_ID
                WHERE ist.Bill_ID = ?
            `);
            bill.items = itemsStmt.all(billId);
        }
        
        return bill;
    }

    addIncomingBill(billData) {
        const transaction = this.db.transaction((data) => {
            // Generate bill number if not provided
            if (!data.Bill_Number) {
                const prefix = 'GRN';
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM INCOMING_BILLS WHERE Date_Received = ?');
                const { count } = countStmt.get(data.Date_Received);
                data.Bill_Number = `${prefix}-${dateStr}-${String(count + 1).padStart(4, '0')}`;
            }

            // Insert bill header
            const billStmt = this.db.prepare(`
                INSERT INTO INCOMING_BILLS (Bill_Number, Date_Received, Supplier_Name, Remarks)
                VALUES (?, ?, ?, ?)
            `);
            const billResult = billStmt.run(data.Bill_Number, data.Date_Received, data.Supplier_Name, data.Remarks || null);
            const billId = billResult.lastInsertRowid;

            // Insert bill items
            const itemStmt = this.db.prepare(`
                INSERT INTO INCOMING_STOCK (Bill_ID, Item_ID, Qty_Received, Item_Remarks)
                VALUES (?, ?, ?, ?)
            `);

            for (const item of data.items) {
                itemStmt.run(billId, item.Item_ID, item.Qty_Received, item.Item_Remarks || null);
            }

            return billId;
        });

        return transaction(billData);
    }

    updateIncomingBill(billId, billData) {
        const transaction = this.db.transaction((id, data) => {
            // Update bill header
            const billStmt = this.db.prepare(`
                UPDATE INCOMING_BILLS
                SET Date_Received = ?, Supplier_Name = ?, Remarks = ?, Modified_Date = CURRENT_TIMESTAMP
                WHERE Bill_ID = ?
            `);
            billStmt.run(data.Date_Received, data.Supplier_Name, data.Remarks || null, id);

            // Delete existing items
            const deleteStmt = this.db.prepare('DELETE FROM INCOMING_STOCK WHERE Bill_ID = ?');
            deleteStmt.run(id);

            // Insert new items
            const itemStmt = this.db.prepare(`
                INSERT INTO INCOMING_STOCK (Bill_ID, Item_ID, Qty_Received, Item_Remarks)
                VALUES (?, ?, ?, ?)
            `);

            for (const item of data.items) {
                itemStmt.run(id, item.Item_ID, item.Qty_Received, item.Item_Remarks || null);
            }
        });

        return transaction(billId, billData);
    }

    deleteIncomingBill(billId) {
        const stmt = this.db.prepare('DELETE FROM INCOMING_BILLS WHERE Bill_ID = ?');
        return stmt.run(billId);
    }

    // Legacy method for compatibility - gets all individual items
    getAllIncomingStock() {
        const stmt = this.db.prepare(`
            SELECT 
                ist.GRN_ID,
                ib.Date_Received,
                ist.Item_ID,
                im.Item_Name,
                im.Unit_Measure,
                ib.Supplier_Name,
                ist.Qty_Received,
                ib.Bill_Number,
                ist.Item_Remarks,
                ib.Remarks
            FROM INCOMING_STOCK ist
            JOIN INCOMING_BILLS ib ON ist.Bill_ID = ib.Bill_ID
            JOIN ITEMS_MASTER im ON ist.Item_ID = im.Item_ID
            ORDER BY ib.Date_Received DESC, ist.GRN_ID DESC
        `);
        return stmt.all();
    }

    // Donation Bills Methods
    getAllDonationBills() {
        const stmt = this.db.prepare(`
            SELECT 
                db.*,
                COUNT(d.Donation_ID) as Item_Count,
                SUM(d.Qty_Received) as Total_Quantity
            FROM DONATION_BILLS db
            LEFT JOIN DONATIONS d ON db.Bill_ID = d.Bill_ID
            GROUP BY db.Bill_ID
            ORDER BY db.Date_Received DESC, db.Bill_ID DESC
        `);
        return stmt.all();
    }

    getDonationBillDetails(billId) {
        const billStmt = this.db.prepare('SELECT * FROM DONATION_BILLS WHERE Bill_ID = ?');
        const bill = billStmt.get(billId);
        
        if (bill) {
            const itemsStmt = this.db.prepare(`
                SELECT d.*, im.Item_Name, im.Unit_Measure
                FROM DONATIONS d
                JOIN ITEMS_MASTER im ON d.Item_ID = im.Item_ID
                WHERE d.Bill_ID = ?
            `);
            bill.items = itemsStmt.all(billId);
        }
        
        return bill;
    }

    addDonationBill(billData) {
        const transaction = this.db.transaction((data) => {
            // Generate bill number if not provided
            if (!data.Bill_Number) {
                const prefix = 'DON';
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM DONATION_BILLS WHERE Date_Received = ?');
                const { count } = countStmt.get(data.Date_Received);
                data.Bill_Number = `${prefix}-${dateStr}-${String(count + 1).padStart(4, '0')}`;
            }

            // Insert bill header
            const billStmt = this.db.prepare(`
                INSERT INTO DONATION_BILLS (Bill_Number, Date_Received, Donor_Name, Remarks)
                VALUES (?, ?, ?, ?)
            `);
            const billResult = billStmt.run(data.Bill_Number, data.Date_Received, data.Donor_Name, data.Remarks || null);
            const billId = billResult.lastInsertRowid;

            // Insert bill items
            const itemStmt = this.db.prepare(`
                INSERT INTO DONATIONS (Bill_ID, Item_ID, Qty_Received, Item_Remarks)
                VALUES (?, ?, ?, ?)
            `);

            for (const item of data.items) {
                itemStmt.run(billId, item.Item_ID, item.Qty_Received, item.Item_Remarks || null);
            }

            return billId;
        });

        return transaction(billData);
    }

    updateDonationBill(billId, billData) {
        const transaction = this.db.transaction((id, data) => {
            // Update bill header
            const billStmt = this.db.prepare(`
                UPDATE DONATION_BILLS
                SET Date_Received = ?, Donor_Name = ?, Remarks = ?, Modified_Date = CURRENT_TIMESTAMP
                WHERE Bill_ID = ?
            `);
            billStmt.run(data.Date_Received, data.Donor_Name, data.Remarks || null, id);

            // Delete existing items
            const deleteStmt = this.db.prepare('DELETE FROM DONATIONS WHERE Bill_ID = ?');
            deleteStmt.run(id);

            // Insert new items
            const itemStmt = this.db.prepare(`
                INSERT INTO DONATIONS (Bill_ID, Item_ID, Qty_Received, Item_Remarks)
                VALUES (?, ?, ?, ?)
            `);

            for (const item of data.items) {
                itemStmt.run(id, item.Item_ID, item.Qty_Received, item.Item_Remarks || null);
            }
        });

        return transaction(billId, billData);
    }

    deleteDonationBill(billId) {
        const stmt = this.db.prepare('DELETE FROM DONATION_BILLS WHERE Bill_ID = ?');
        return stmt.run(billId);
    }

    // Legacy method for compatibility - gets all individual items
    getAllDonations() {
        const stmt = this.db.prepare(`
            SELECT 
                d.Donation_ID,
                db.Date_Received,
                d.Item_ID,
                im.Item_Name,
                im.Unit_Measure,
                db.Donor_Name,
                d.Qty_Received,
                db.Bill_Number,
                d.Item_Remarks,
                db.Remarks
            FROM DONATIONS d
            JOIN DONATION_BILLS db ON d.Bill_ID = db.Bill_ID
            JOIN ITEMS_MASTER im ON d.Item_ID = im.Item_ID
            ORDER BY db.Date_Received DESC, d.Donation_ID DESC
        `);
        return stmt.all();
    }

    // Outgoing Stock Bills Methods
    getAllOutgoingBills() {
        const stmt = this.db.prepare(`
            SELECT 
                ob.*,
                c.Center_Name,
                c.District,
                COUNT(ost.Dispatch_ID) as Item_Count,
                SUM(ost.Qty_Issued) as Total_Quantity
            FROM OUTGOING_BILLS ob
            JOIN CENTERS_MASTER c ON ob.Center_ID = c.Center_ID
            LEFT JOIN OUTGOING_STOCK ost ON ob.Bill_ID = ost.Bill_ID
            GROUP BY ob.Bill_ID
            ORDER BY ob.Date_Issued DESC, ob.Bill_ID DESC
        `);
        return stmt.all();
    }

    getOutgoingBillDetails(billId) {
        const billStmt = this.db.prepare(`
            SELECT ob.*, c.Center_Name, c.District
            FROM OUTGOING_BILLS ob
            JOIN CENTERS_MASTER c ON ob.Center_ID = c.Center_ID
            WHERE ob.Bill_ID = ?
        `);
        const bill = billStmt.get(billId);
        
        if (bill) {
            const itemsStmt = this.db.prepare(`
                SELECT ost.*, im.Item_Name, im.Unit_Measure
                FROM OUTGOING_STOCK ost
                JOIN ITEMS_MASTER im ON ost.Item_ID = im.Item_ID
                WHERE ost.Bill_ID = ?
            `);
            bill.items = itemsStmt.all(billId);
        }
        
        return bill;
    }

    addOutgoingBill(billData) {
        const transaction = this.db.transaction((data) => {
            // Generate bill number if not provided
            if (!data.Bill_Number) {
                const prefix = 'DSP';
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM OUTGOING_BILLS WHERE Date_Issued = ?');
                const { count } = countStmt.get(data.Date_Issued);
                data.Bill_Number = `${prefix}-${dateStr}-${String(count + 1).padStart(4, '0')}`;
            }

            // Insert bill header
            const billStmt = this.db.prepare(`
                INSERT INTO OUTGOING_BILLS (Bill_Number, Date_Issued, Center_ID, Officer_Name, Officer_NIC, Remarks)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const billResult = billStmt.run(
                data.Bill_Number, data.Date_Issued, data.Center_ID, 
                data.Officer_Name, data.Officer_NIC, data.Remarks || null
            );
            const billId = billResult.lastInsertRowid;

            // Insert bill items
            const itemStmt = this.db.prepare(`
                INSERT INTO OUTGOING_STOCK (Bill_ID, Item_ID, Qty_Requested, Qty_Issued, Item_Remarks)
                VALUES (?, ?, ?, ?, ?)
            `);

            for (const item of data.items) {
                itemStmt.run(billId, item.Item_ID, item.Qty_Requested, item.Qty_Issued, item.Item_Remarks || null);
            }

            return billId;
        });

        return transaction(billData);
    }

    updateOutgoingBill(billId, billData) {
        const transaction = this.db.transaction((id, data) => {
            // Update bill header
            const billStmt = this.db.prepare(`
                UPDATE OUTGOING_BILLS
                SET Date_Issued = ?, Center_ID = ?, Officer_Name = ?, Officer_NIC = ?, 
                    Remarks = ?, Modified_Date = CURRENT_TIMESTAMP
                WHERE Bill_ID = ?
            `);
            billStmt.run(data.Date_Issued, data.Center_ID, data.Officer_Name, data.Officer_NIC, data.Remarks || null, id);

            // Delete existing items
            const deleteStmt = this.db.prepare('DELETE FROM OUTGOING_STOCK WHERE Bill_ID = ?');
            deleteStmt.run(id);

            // Insert new items
            const itemStmt = this.db.prepare(`
                INSERT INTO OUTGOING_STOCK (Bill_ID, Item_ID, Qty_Requested, Qty_Issued, Item_Remarks)
                VALUES (?, ?, ?, ?, ?)
            `);

            for (const item of data.items) {
                itemStmt.run(id, item.Item_ID, item.Qty_Requested, item.Qty_Issued, item.Item_Remarks || null);
            }
        });

        return transaction(billId, billData);
    }

    deleteOutgoingBill(billId) {
        const stmt = this.db.prepare('DELETE FROM OUTGOING_BILLS WHERE Bill_ID = ?');
        return stmt.run(billId);
    }

    // Legacy method for compatibility - gets all individual items
    getAllOutgoingStock() {
        const stmt = this.db.prepare(`
            SELECT 
                ost.Dispatch_ID,
                ob.Date_Issued,
                ob.Center_ID,
                c.Center_Name,
                c.District,
                ost.Item_ID,
                im.Item_Name,
                im.Unit_Measure,
                ost.Qty_Requested,
                ost.Qty_Issued,
                ob.Officer_Name,
                ob.Officer_NIC,
                ob.Bill_Number,
                ost.Item_Remarks,
                ob.Remarks
            FROM OUTGOING_STOCK ost
            JOIN OUTGOING_BILLS ob ON ost.Bill_ID = ob.Bill_ID
            JOIN ITEMS_MASTER im ON ost.Item_ID = im.Item_ID
            JOIN CENTERS_MASTER c ON ob.Center_ID = c.Center_ID
            ORDER BY ob.Date_Issued DESC, ost.Dispatch_ID DESC
        `);
        return stmt.all();
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
            SELECT 'Incoming' as Type, ib.Date_Received as Date, ib.Supplier_Name as Source, 
                   ist.Qty_Received as Quantity, ib.Bill_Number
            FROM INCOMING_STOCK ist
            JOIN INCOMING_BILLS ib ON ist.Bill_ID = ib.Bill_ID
            WHERE ist.Item_ID = ?
        `).all(itemId);

        const donations = this.db.prepare(`
            SELECT 'Donation' as Type, db.Date_Received as Date, db.Donor_Name as Source, 
                   d.Qty_Received as Quantity, db.Bill_Number
            FROM DONATIONS d
            JOIN DONATION_BILLS db ON d.Bill_ID = db.Bill_ID
            WHERE d.Item_ID = ?
        `).all(itemId);

        const outgoing = this.db.prepare(`
            SELECT 'Outgoing' as Type, ob.Date_Issued as Date, c.Center_Name as Source, 
                   ost.Qty_Issued as Quantity, ob.Bill_Number
            FROM OUTGOING_STOCK ost
            JOIN OUTGOING_BILLS ob ON ost.Bill_ID = ob.Bill_ID
            JOIN CENTERS_MASTER c ON ob.Center_ID = c.Center_ID
            WHERE ost.Item_ID = ?
        `).all(itemId);

        return [...incoming, ...donations, ...outgoing].sort((a, b) => new Date(b.Date) - new Date(a.Date));
    }

    // Report Query Methods
    getCurrentStockReport(itemIds = null) {
        let query = `
            SELECT 
                i.Item_ID,
                i.Item_Name,
                i.Category,
                i.Unit_Measure,
                i.Reorder_Level,
                COALESCE(
                    (SELECT SUM(Qty_Received) FROM INCOMING_STOCK WHERE Item_ID = i.Item_ID),
                    0
                ) +
                COALESCE(
                    (SELECT SUM(Qty_Received) FROM DONATIONS WHERE Item_ID = i.Item_ID),
                    0
                ) -
                COALESCE(
                    (SELECT SUM(Qty_Issued) FROM OUTGOING_STOCK WHERE Item_ID = i.Item_ID),
                    0
                ) as Current_Quantity
            FROM ITEMS_MASTER i
            WHERE i.Status = 'Active'
        `;
        
        if (itemIds && itemIds.length > 0) {
            const placeholders = itemIds.map(() => '?').join(',');
            query += ` AND i.Item_ID IN (${placeholders})`;
            const stmt = this.db.prepare(query + ' ORDER BY i.Item_Name');
            return stmt.all(...itemIds);
        } else {
            const stmt = this.db.prepare(query + ' ORDER BY i.Item_Name');
            return stmt.all();
        }
    }

    getIncomingStockReport(dateFrom, dateTo, itemIds = null) {
        let query = `
            SELECT 
                ib.Bill_Number,
                ib.Date_Received as Received_Date,
                i.Item_Name,
                i.Unit_Measure,
                ist.Qty_Received as Quantity,
                ib.Supplier_Name as Source_Name,
                ist.Item_Remarks,
                ib.Remarks as Bill_Remarks
            FROM INCOMING_STOCK ist
            JOIN INCOMING_BILLS ib ON ist.Bill_ID = ib.Bill_ID
            JOIN ITEMS_MASTER i ON ist.Item_ID = i.Item_ID
            WHERE 1=1
        `;
        
        const params = [];
        
        if (dateFrom) {
            query += ` AND DATE(ib.Date_Received) >= DATE(?)`;
            params.push(dateFrom);
        }
        
        if (dateTo) {
            query += ` AND DATE(ib.Date_Received) <= DATE(?)`;
            params.push(dateTo);
        }
        
        if (itemIds && itemIds.length > 0) {
            const placeholders = itemIds.map(() => '?').join(',');
            query += ` AND ist.Item_ID IN (${placeholders})`;
            params.push(...itemIds);
        }
        
        query += ` ORDER BY ib.Date_Received DESC, ib.Bill_Number, i.Item_Name`;
        
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }

    getOutgoingStockReport(dateFrom, dateTo, itemIds = null) {
        let query = `
            SELECT 
                ob.Bill_Number,
                ob.Date_Issued as Dispatch_Date,
                i.Item_Name,
                i.Unit_Measure,
                ost.Qty_Requested,
                ost.Qty_Issued as Quantity,
                c.Center_Name,
                ob.Officer_Name,
                ob.Officer_NIC,
                ost.Item_Remarks,
                ob.Remarks as Bill_Remarks
            FROM OUTGOING_STOCK ost
            JOIN OUTGOING_BILLS ob ON ost.Bill_ID = ob.Bill_ID
            JOIN ITEMS_MASTER i ON ost.Item_ID = i.Item_ID
            JOIN CENTERS_MASTER c ON ob.Center_ID = c.Center_ID
            WHERE 1=1
        `;
        
        const params = [];
        
        if (dateFrom) {
            query += ` AND DATE(ob.Date_Issued) >= DATE(?)`;
            params.push(dateFrom);
        }
        
        if (dateTo) {
            query += ` AND DATE(ob.Date_Issued) <= DATE(?)`;
            params.push(dateTo);
        }
        
        if (itemIds && itemIds.length > 0) {
            const placeholders = itemIds.map(() => '?').join(',');
            query += ` AND ost.Item_ID IN (${placeholders})`;
            params.push(...itemIds);
        }
        
        query += ` ORDER BY ob.Date_Issued DESC, ob.Bill_Number, i.Item_Name`;
        
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }

    getDonationsReport(dateFrom, dateTo, itemIds = null) {
        let query = `
            SELECT 
                db.Bill_Number,
                db.Date_Received as Donation_Date,
                i.Item_Name,
                i.Unit_Measure,
                d.Qty_Received as Quantity,
                db.Donor_Name,
                d.Item_Remarks,
                db.Remarks as Bill_Remarks
            FROM DONATIONS d
            JOIN DONATION_BILLS db ON d.Bill_ID = db.Bill_ID
            JOIN ITEMS_MASTER i ON d.Item_ID = i.Item_ID
            WHERE 1=1
        `;
        
        const params = [];
        
        if (dateFrom) {
            query += ` AND DATE(db.Date_Received) >= DATE(?)`;
            params.push(dateFrom);
        }
        
        if (dateTo) {
            query += ` AND DATE(db.Date_Received) <= DATE(?)`;
            params.push(dateTo);
        }
        
        if (itemIds && itemIds.length > 0) {
            const placeholders = itemIds.map(() => '?').join(',');
            query += ` AND d.Item_ID IN (${placeholders})`;
            params.push(...itemIds);
        }
        
        query += ` ORDER BY db.Date_Received DESC, db.Bill_Number, i.Item_Name`;
        
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
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
