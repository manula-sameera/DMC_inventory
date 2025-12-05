// Script to apply decimal migration to existing database
// This updates quantity fields from INTEGER to REAL to support decimal values

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

function applyDecimalMigration() {
    try {
        // Get database path
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'dmc_inventory.db');
        
        if (!fs.existsSync(dbPath)) {
            console.error('Database file not found at:', dbPath);
            return false;
        }

        console.log('Opening database:', dbPath);
        const db = new Database(dbPath);
        
        // Enable foreign keys
        db.pragma('foreign_keys = OFF'); // Temporarily disable for migration
        
        // Read migration SQL
        const migrationPath = path.join(__dirname, 'decimal_migration.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('Applying decimal migration...');
        
        // Execute migration in a transaction
        db.transaction(() => {
            db.exec(migrationSQL);
        })();
        
        // Re-enable foreign keys
        db.pragma('foreign_keys = ON');
        
        console.log('✓ Migration completed successfully!');
        console.log('✓ Quantity fields now support decimal values');
        
        db.close();
        return true;
    } catch (error) {
        console.error('Migration failed:', error);
        return false;
    }
}

// If running directly
if (require.main === module) {
    // For standalone execution, we need to manually set the path
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('Enter the full path to your dmc_inventory.db file: ', (dbPath) => {
        try {
            if (!fs.existsSync(dbPath)) {
                console.error('Database file not found at:', dbPath);
                rl.close();
                return;
            }

            console.log('Opening database:', dbPath);
            const db = new Database(dbPath);
            
            // Create backup first
            const backupPath = dbPath + '.backup_' + Date.now();
            console.log('Creating backup at:', backupPath);
            fs.copyFileSync(dbPath, backupPath);
            
            // Enable foreign keys
            db.pragma('foreign_keys = OFF'); // Temporarily disable for migration
            
            // Read migration SQL
            const migrationPath = path.join(__dirname, 'decimal_migration.sql');
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            console.log('Applying decimal migration...');
            
            // Execute migration in a transaction
            db.transaction(() => {
                db.exec(migrationSQL);
            })();
            
            // Re-enable foreign keys
            db.pragma('foreign_keys = ON');
            
            console.log('✓ Migration completed successfully!');
            console.log('✓ Quantity fields now support decimal values');
            console.log('✓ Backup saved at:', backupPath);
            
            db.close();
        } catch (error) {
            console.error('Migration failed:', error);
        }
        
        rl.close();
    });
}

module.exports = { applyDecimalMigration };
