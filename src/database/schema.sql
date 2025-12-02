-- Items Master Table
CREATE TABLE IF NOT EXISTS ITEMS_MASTER (
    Item_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Item_Name TEXT NOT NULL UNIQUE,
    Unit_Measure TEXT NOT NULL,
    Category TEXT NOT NULL,
    Reorder_Level INTEGER DEFAULT 0,
    Status TEXT DEFAULT 'Active' CHECK(Status IN ('Active', 'Inactive')),
    Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Modified_Date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Centers Master Table (Protection Centers)
CREATE TABLE IF NOT EXISTS CENTERS_MASTER (
    Center_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Center_Name TEXT NOT NULL UNIQUE,
    District TEXT NOT NULL,
    Contact_Person TEXT,
    Contact_Phone TEXT,
    Status TEXT DEFAULT 'Active' CHECK(Status IN ('Active', 'Inactive')),
    Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Modified_Date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Incoming Stock (Goods Received Log)
CREATE TABLE IF NOT EXISTS INCOMING_STOCK (
    GRN_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Date_Received DATE NOT NULL,
    Item_ID INTEGER NOT NULL,
    Supplier_Name TEXT NOT NULL,
    Qty_Received INTEGER NOT NULL CHECK(Qty_Received > 0),
    Remarks TEXT,
    Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
);

-- Donations Received Log
CREATE TABLE IF NOT EXISTS DONATIONS (
    Donation_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Date_Received DATE NOT NULL,
    Item_ID INTEGER NOT NULL,
    Donor_Name TEXT NOT NULL,
    Qty_Received INTEGER NOT NULL CHECK(Qty_Received > 0),
    Remarks TEXT,
    Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
);

-- Outgoing Stock (Dispatch Log)
CREATE TABLE IF NOT EXISTS OUTGOING_STOCK (
    Dispatch_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Date_Issued DATE NOT NULL,
    Center_ID INTEGER NOT NULL,
    Item_ID INTEGER NOT NULL,
    Qty_Requested INTEGER NOT NULL CHECK(Qty_Requested > 0),
    Qty_Issued INTEGER NOT NULL CHECK(Qty_Issued >= 0),
    Officer_Name TEXT NOT NULL,
    Officer_NIC TEXT NOT NULL,
    Remarks TEXT,
    Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Center_ID) REFERENCES CENTERS_MASTER(Center_ID),
    FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
);

-- Current Stock View (Calculated from transactions)
CREATE VIEW IF NOT EXISTS CURRENT_STOCK AS
SELECT 
    im.Item_ID,
    im.Item_Name,
    im.Unit_Measure,
    im.Category,
    im.Reorder_Level,
    COALESCE(
        (SELECT SUM(Qty_Received) FROM INCOMING_STOCK WHERE Item_ID = im.Item_ID), 0
    ) + COALESCE(
        (SELECT SUM(Qty_Received) FROM DONATIONS WHERE Item_ID = im.Item_ID), 0
    ) - COALESCE(
        (SELECT SUM(Qty_Issued) FROM OUTGOING_STOCK WHERE Item_ID = im.Item_ID), 0
    ) AS Current_Quantity,
    CASE 
        WHEN (
            COALESCE((SELECT SUM(Qty_Received) FROM INCOMING_STOCK WHERE Item_ID = im.Item_ID), 0) + 
            COALESCE((SELECT SUM(Qty_Received) FROM DONATIONS WHERE Item_ID = im.Item_ID), 0) - 
            COALESCE((SELECT SUM(Qty_Issued) FROM OUTGOING_STOCK WHERE Item_ID = im.Item_ID), 0)
        ) <= im.Reorder_Level THEN 'Low Stock'
        ELSE 'OK'
    END AS Stock_Status
FROM ITEMS_MASTER im
WHERE im.Status = 'Active';

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incoming_item ON INCOMING_STOCK(Item_ID);
CREATE INDEX IF NOT EXISTS idx_incoming_date ON INCOMING_STOCK(Date_Received);
CREATE INDEX IF NOT EXISTS idx_donations_item ON DONATIONS(Item_ID);
CREATE INDEX IF NOT EXISTS idx_donations_date ON DONATIONS(Date_Received);
CREATE INDEX IF NOT EXISTS idx_outgoing_item ON OUTGOING_STOCK(Item_ID);
CREATE INDEX IF NOT EXISTS idx_outgoing_center ON OUTGOING_STOCK(Center_ID);
CREATE INDEX IF NOT EXISTS idx_outgoing_date ON OUTGOING_STOCK(Date_Issued);
