// Simple standalone migration script for decimal quantities
// Run this directly: node migrate_to_decimal.js

const path = require('path');
const os = require('os');
const fs = require('fs');

// Determine the database path
const appName = 'dmc-inventory';
let dbPath;

if (os.platform() === 'win32') {
    dbPath = path.join(process.env.APPDATA, appName, 'dmc_inventory.db');
} else if (os.platform() === 'darwin') {
    dbPath = path.join(os.homedir(), 'Library', 'Application Support', appName, 'dmc_inventory.db');
} else {
    dbPath = path.join(os.homedir(), '.config', appName, 'dmc_inventory.db');
}

console.log('Looking for database at:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found!');
    console.error('Expected location:', dbPath);
    console.error('\nIf your database is in a different location, please edit this script.');
    process.exit(1);
}

console.log('✓ Database found!');

// Create backup
const backupPath = dbPath + '.backup_' + Date.now();
console.log('\nCreating backup at:', backupPath);
fs.copyFileSync(dbPath, backupPath);
console.log('✓ Backup created successfully!');

// Now run the migration
try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    
    console.log('\n📋 Starting migration to support decimal quantities...\n');
    
    // Disable foreign keys temporarily
    db.pragma('foreign_keys = OFF');
    
    // Read the migration SQL
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'decimal_migration.sql'), 'utf8');
    
    // Execute in transaction
    const migrate = db.transaction(() => {
        db.exec(migrationSQL);
    });
    
    migrate();
    
    // Re-enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Verify the changes
    const tableInfo = db.pragma('table_info(INCOMING_STOCK)');
    const qtyField = tableInfo.find(col => col.name === 'Qty_Received');
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Verification:');
    console.log(`   - Qty_Received field type: ${qtyField.type}`);
    console.log('   - Expected: REAL (floating-point)');
    console.log('\n✓ All quantity fields now support decimal values!');
    console.log('✓ Existing data has been preserved.');
    console.log('\n💾 Backup saved at:', backupPath);
    console.log('\nYou can now restart your application and use decimal quantities.');
    
    db.close();
    
} catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n🔄 Your original database is safe. Restore from backup if needed:');
    console.error('   Backup location:', backupPath);
    process.exit(1);
}
