const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Database Migration Helper
 * Migrates from item-by-item structure to bill-based structure
 */
class DatabaseMigration {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
    }

    /**
     * Check if database needs migration
     */
    needsMigration() {
        try {
            this.db = new Database(this.dbPath);
            
            // Check if INCOMING_STOCK table exists
            const incomingExists = this.db.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='INCOMING_STOCK'"
            ).get();
            
            // If table doesn't exist, no migration needed (fresh install)
            if (!incomingExists) {
                this.db.close();
                return false;
            }
            
            // Check if old structure exists (tables without Bill_ID)
            const tableInfo = this.db.pragma('table_info(INCOMING_STOCK)');
            const hasBillId = tableInfo.some(col => col.name === 'Bill_ID');
            
            // Check if old structure has data
            const hasData = this.db.prepare('SELECT COUNT(*) as count FROM INCOMING_STOCK').get().count > 0;
            
            // Check if bill tables exist
            const hasBillTables = this.db.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='INCOMING_BILLS'"
            ).get();
            
            this.db.close();
            
            // Needs migration if: has old structure (no Bill_ID) AND has data
            return !hasBillId && hasData;
        } catch (error) {
            console.error('Error checking migration status:', error);
            return false;
        }
    }

    /**
     * Backup database before migration
     */
    backupDatabase() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = this.dbPath.replace('.db', `_backup_${timestamp}.db`);
        
        try {
            fs.copyFileSync(this.dbPath, backupPath);
            console.log(`Database backed up to: ${backupPath}`);
            return { success: true, path: backupPath };
        } catch (error) {
            console.error('Backup failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Run migration script
     */
    runMigration() {
        try {
            // Backup first
            const backup = this.backupDatabase();
            if (!backup.success) {
                throw new Error('Failed to backup database');
            }

            this.db = new Database(this.dbPath);
            this.db.pragma('foreign_keys = OFF'); // Temporarily disable foreign keys
            
            // Manual migration instead of using migration.sql
            // This gives us better control over error handling
            
            try {
                // Rename old tables if they exist and haven't been renamed yet
                const incomingOldExists = this.db.prepare(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='INCOMING_STOCK_OLD'"
                ).get();
                
                if (!incomingOldExists) {
                    // Drop old indexes first
                    this.db.exec('DROP INDEX IF EXISTS idx_incoming_stock_bill');
                    this.db.exec('DROP INDEX IF EXISTS idx_incoming_stock_item');
                    this.db.exec('DROP INDEX IF EXISTS idx_donations_bill');
                    this.db.exec('DROP INDEX IF EXISTS idx_donations_item');
                    this.db.exec('DROP INDEX IF EXISTS idx_outgoing_stock_bill');
                    this.db.exec('DROP INDEX IF EXISTS idx_outgoing_stock_item');
                    
                    // Rename old tables
                    this.db.exec('ALTER TABLE INCOMING_STOCK RENAME TO INCOMING_STOCK_OLD');
                    this.db.exec('ALTER TABLE DONATIONS RENAME TO DONATIONS_OLD');
                    this.db.exec('ALTER TABLE OUTGOING_STOCK RENAME TO OUTGOING_STOCK_OLD');
                }
                
                // Create new bill tables
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS INCOMING_BILLS (
                        Bill_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                        Bill_Number TEXT UNIQUE,
                        Date_Received DATE NOT NULL,
                        Supplier_Name TEXT NOT NULL,
                        Remarks TEXT,
                        Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        Modified_Date DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS DONATION_BILLS (
                        Bill_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                        Bill_Number TEXT UNIQUE,
                        Date_Received DATE NOT NULL,
                        Donor_Name TEXT NOT NULL,
                        Remarks TEXT,
                        Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        Modified_Date DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS OUTGOING_BILLS (
                        Bill_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                        Bill_Number TEXT UNIQUE,
                        Date_Issued DATE NOT NULL,
                        Center_ID INTEGER NOT NULL,
                        Officer_Name TEXT NOT NULL,
                        Officer_NIC TEXT NOT NULL,
                        Remarks TEXT,
                        Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        Modified_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (Center_ID) REFERENCES CENTERS_MASTER(Center_ID)
                    )
                `);
                
                // Create new item tables
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS INCOMING_STOCK (
                        GRN_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                        Bill_ID INTEGER NOT NULL,
                        Item_ID INTEGER NOT NULL,
                        Qty_Received INTEGER NOT NULL CHECK(Qty_Received > 0),
                        Item_Remarks TEXT,
                        FOREIGN KEY (Bill_ID) REFERENCES INCOMING_BILLS(Bill_ID) ON DELETE CASCADE,
                        FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
                    )
                `);
                
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS DONATIONS (
                        Donation_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                        Bill_ID INTEGER NOT NULL,
                        Item_ID INTEGER NOT NULL,
                        Qty_Received INTEGER NOT NULL CHECK(Qty_Received > 0),
                        Item_Remarks TEXT,
                        FOREIGN KEY (Bill_ID) REFERENCES DONATION_BILLS(Bill_ID) ON DELETE CASCADE,
                        FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
                    )
                `);
                
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS OUTGOING_STOCK (
                        Dispatch_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                        Bill_ID INTEGER NOT NULL,
                        Item_ID INTEGER NOT NULL,
                        Qty_Requested INTEGER NOT NULL CHECK(Qty_Requested > 0),
                        Qty_Issued INTEGER NOT NULL CHECK(Qty_Issued >= 0),
                        Item_Remarks TEXT,
                        FOREIGN KEY (Bill_ID) REFERENCES OUTGOING_BILLS(Bill_ID) ON DELETE CASCADE,
                        FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
                    )
                `);
                
                // Migrate data - only if old tables have data
                const oldDataExists = this.db.prepare(
                    'SELECT COUNT(*) as count FROM INCOMING_STOCK_OLD'
                ).get().count > 0;
                
                if (oldDataExists) {
                    // Group and insert incoming bills
                    this.db.exec(`
                        INSERT INTO INCOMING_BILLS (Date_Received, Supplier_Name, Created_Date)
                        SELECT Date_Received, Supplier_Name, MIN(Created_Date)
                        FROM INCOMING_STOCK_OLD
                        GROUP BY Date_Received, Supplier_Name
                    `);
                    
                    // Insert incoming items
                    this.db.exec(`
                        INSERT INTO INCOMING_STOCK (Bill_ID, Item_ID, Qty_Received, Item_Remarks)
                        SELECT ib.Bill_ID, iso.Item_ID, iso.Qty_Received, iso.Remarks
                        FROM INCOMING_STOCK_OLD iso
                        JOIN INCOMING_BILLS ib ON iso.Date_Received = ib.Date_Received 
                            AND iso.Supplier_Name = ib.Supplier_Name
                    `);
                    
                    // Group and insert donation bills
                    this.db.exec(`
                        INSERT INTO DONATION_BILLS (Date_Received, Donor_Name, Created_Date)
                        SELECT Date_Received, Donor_Name, MIN(Created_Date)
                        FROM DONATIONS_OLD
                        GROUP BY Date_Received, Donor_Name
                    `);
                    
                    // Insert donation items
                    this.db.exec(`
                        INSERT INTO DONATIONS (Bill_ID, Item_ID, Qty_Received, Item_Remarks)
                        SELECT db.Bill_ID, dso.Item_ID, dso.Qty_Received, dso.Remarks
                        FROM DONATIONS_OLD dso
                        JOIN DONATION_BILLS db ON dso.Date_Received = db.Date_Received 
                            AND dso.Donor_Name = db.Donor_Name
                    `);
                    
                    // Group and insert outgoing bills
                    this.db.exec(`
                        INSERT INTO OUTGOING_BILLS (Date_Issued, Center_ID, Officer_Name, Officer_NIC, Created_Date)
                        SELECT Date_Issued, Center_ID, Officer_Name, Officer_NIC, MIN(Created_Date)
                        FROM OUTGOING_STOCK_OLD
                        GROUP BY Date_Issued, Center_ID, Officer_Name, Officer_NIC
                    `);
                    
                    // Insert outgoing items
                    this.db.exec(`
                        INSERT INTO OUTGOING_STOCK (Bill_ID, Item_ID, Qty_Requested, Qty_Issued, Item_Remarks)
                        SELECT ob.Bill_ID, oso.Item_ID, oso.Qty_Requested, oso.Qty_Issued, oso.Remarks
                        FROM OUTGOING_STOCK_OLD oso
                        JOIN OUTGOING_BILLS ob ON oso.Date_Issued = ob.Date_Issued 
                            AND oso.Center_ID = ob.Center_ID
                            AND oso.Officer_Name = ob.Officer_Name
                            AND oso.Officer_NIC = ob.Officer_NIC
                    `);
                    
                    // Generate bill numbers
                    this.db.exec(`
                        UPDATE INCOMING_BILLS 
                        SET Bill_Number = 'GRN-' || strftime('%Y%m%d', Date_Received) || '-' || 
                                          printf('%04d', Bill_ID)
                        WHERE Bill_Number IS NULL
                    `);
                    
                    this.db.exec(`
                        UPDATE DONATION_BILLS 
                        SET Bill_Number = 'DON-' || strftime('%Y%m%d', Date_Received) || '-' || 
                                          printf('%04d', Bill_ID)
                        WHERE Bill_Number IS NULL
                    `);
                    
                    this.db.exec(`
                        UPDATE OUTGOING_BILLS 
                        SET Bill_Number = 'DSP-' || strftime('%Y%m%d', Date_Issued) || '-' || 
                                          printf('%04d', Bill_ID)
                        WHERE Bill_Number IS NULL
                    `);
                }
                
            } catch (error) {
                console.error('Migration error:', error);
                throw error;
            }

            this.db.pragma('foreign_keys = ON'); // Re-enable foreign keys
            
            // Verify migration
            const verification = this.verifyMigration();
            
            this.db.close();
            
            return {
                success: true,
                backup: backup.path,
                verification
            };
        } catch (error) {
            if (this.db) {
                this.db.close();
            }
            console.error('Migration failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify migration was successful
     */
    verifyMigration() {
        try {
            const results = {
                incoming_bills: this.db.prepare('SELECT COUNT(*) as count FROM INCOMING_BILLS').get().count,
                incoming_stock: this.db.prepare('SELECT COUNT(*) as count FROM INCOMING_STOCK').get().count,
                donation_bills: this.db.prepare('SELECT COUNT(*) as count FROM DONATION_BILLS').get().count,
                donations: this.db.prepare('SELECT COUNT(*) as count FROM DONATIONS').get().count,
                outgoing_bills: this.db.prepare('SELECT COUNT(*) as count FROM OUTGOING_BILLS').get().count,
                outgoing_stock: this.db.prepare('SELECT COUNT(*) as count FROM OUTGOING_STOCK').get().count
            };

            console.log('Migration Verification:', results);
            return results;
        } catch (error) {
            console.error('Verification failed:', error);
            return null;
        }
    }

    /**
     * Check if old tables exist (for cleanup)
     */
    hasOldTables() {
        try {
            this.db = new Database(this.dbPath);
            const tables = this.db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN ('INCOMING_STOCK_OLD', 'DONATIONS_OLD', 'OUTGOING_STOCK_OLD')
            `).all();
            this.db.close();
            return tables.length > 0;
        } catch (error) {
            console.error('Error checking old tables:', error);
            return false;
        }
    }

    /**
     * Clean up old tables after successful migration
     */
    cleanupOldTables() {
        try {
            this.db = new Database(this.dbPath);
            
            this.db.exec(`
                DROP TABLE IF EXISTS INCOMING_STOCK_OLD;
                DROP TABLE IF EXISTS DONATIONS_OLD;
                DROP TABLE IF EXISTS OUTGOING_STOCK_OLD;
            `);
            
            this.db.close();
            return { success: true };
        } catch (error) {
            if (this.db) {
                this.db.close();
            }
            console.error('Cleanup failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = DatabaseMigration;
