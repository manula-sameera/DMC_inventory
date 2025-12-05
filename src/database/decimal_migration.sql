-- Migration to support decimal quantities for incoming stock, donations, outgoing stock, and care packages
-- This migration changes INTEGER quantity fields to REAL to support decimal values

-- Step 1: Create backup tables with new schema
CREATE TABLE IF NOT EXISTS INCOMING_STOCK_NEW (
    GRN_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Bill_ID INTEGER NOT NULL,
    Item_ID INTEGER NOT NULL,
    Qty_Received REAL NOT NULL CHECK(Qty_Received > 0),
    Item_Remarks TEXT,
    FOREIGN KEY (Bill_ID) REFERENCES INCOMING_BILLS(Bill_ID) ON DELETE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
);

CREATE TABLE IF NOT EXISTS DONATIONS_NEW (
    Donation_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Bill_ID INTEGER NOT NULL,
    Item_ID INTEGER NOT NULL,
    Qty_Received REAL NOT NULL CHECK(Qty_Received > 0),
    Item_Remarks TEXT,
    FOREIGN KEY (Bill_ID) REFERENCES DONATION_BILLS(Bill_ID) ON DELETE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
);

CREATE TABLE IF NOT EXISTS OUTGOING_STOCK_NEW (
    Dispatch_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Bill_ID INTEGER NOT NULL,
    Item_ID INTEGER NOT NULL,
    Qty_Requested REAL NOT NULL CHECK(Qty_Requested > 0),
    Qty_Issued REAL NOT NULL CHECK(Qty_Issued >= 0),
    Item_Remarks TEXT,
    FOREIGN KEY (Bill_ID) REFERENCES OUTGOING_BILLS(Bill_ID) ON DELETE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
);

CREATE TABLE IF NOT EXISTS CARE_PACKAGE_TEMPLATE_ITEMS_NEW (
    Template_Item_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Template_ID INTEGER NOT NULL,
    Item_ID INTEGER NOT NULL,
    Quantity_Per_Package REAL NOT NULL CHECK(Quantity_Per_Package > 0),
    Item_Remarks TEXT,
    FOREIGN KEY (Template_ID) REFERENCES CARE_PACKAGE_TEMPLATES(Template_ID) ON DELETE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
);

CREATE TABLE IF NOT EXISTS CARE_PACKAGE_ISSUES_NEW (
    Issue_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Template_ID INTEGER NOT NULL,
    Date_Issued DATE NOT NULL,
    Packages_Issued REAL NOT NULL CHECK(Packages_Issued > 0),
    Recipient_Type TEXT NOT NULL CHECK(Recipient_Type IN ('Center', 'GN Division')),
    Center_ID INTEGER,
    GN_ID INTEGER,
    Officer_Name TEXT NOT NULL,
    Officer_NIC TEXT NOT NULL,
    Remarks TEXT,
    Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Modified_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Template_ID) REFERENCES CARE_PACKAGE_TEMPLATES(Template_ID),
    FOREIGN KEY (Center_ID) REFERENCES CENTERS_MASTER(Center_ID),
    FOREIGN KEY (GN_ID) REFERENCES GN_DIVISIONS(GN_ID),
    CHECK (
        (Recipient_Type = 'Center' AND Center_ID IS NOT NULL AND GN_ID IS NULL) OR
        (Recipient_Type = 'GN Division' AND GN_ID IS NOT NULL AND Center_ID IS NULL)
    )
);

-- Step 2: Copy existing data to new tables
INSERT INTO INCOMING_STOCK_NEW (GRN_ID, Bill_ID, Item_ID, Qty_Received, Item_Remarks)
SELECT GRN_ID, Bill_ID, Item_ID, CAST(Qty_Received AS REAL), Item_Remarks FROM INCOMING_STOCK;

INSERT INTO DONATIONS_NEW (Donation_ID, Bill_ID, Item_ID, Qty_Received, Item_Remarks)
SELECT Donation_ID, Bill_ID, Item_ID, CAST(Qty_Received AS REAL), Item_Remarks FROM DONATIONS;

INSERT INTO OUTGOING_STOCK_NEW (Dispatch_ID, Bill_ID, Item_ID, Qty_Requested, Qty_Issued, Item_Remarks)
SELECT Dispatch_ID, Bill_ID, Item_ID, CAST(Qty_Requested AS REAL), CAST(Qty_Issued AS REAL), Item_Remarks FROM OUTGOING_STOCK;

INSERT INTO CARE_PACKAGE_TEMPLATE_ITEMS_NEW (Template_Item_ID, Template_ID, Item_ID, Quantity_Per_Package, Item_Remarks)
SELECT Template_Item_ID, Template_ID, Item_ID, CAST(Quantity_Per_Package AS REAL), Item_Remarks FROM CARE_PACKAGE_TEMPLATE_ITEMS;

INSERT INTO CARE_PACKAGE_ISSUES_NEW (Issue_ID, Template_ID, Date_Issued, Packages_Issued, Recipient_Type, Center_ID, GN_ID, Officer_Name, Officer_NIC, Remarks, Created_Date, Modified_Date)
SELECT Issue_ID, Template_ID, Date_Issued, CAST(Packages_Issued AS REAL), Recipient_Type, Center_ID, GN_ID, Officer_Name, Officer_NIC, Remarks, Created_Date, Modified_Date FROM CARE_PACKAGE_ISSUES;

-- Step 3: Drop old tables
DROP TABLE INCOMING_STOCK;
DROP TABLE DONATIONS;
DROP TABLE OUTGOING_STOCK;
DROP TABLE CARE_PACKAGE_TEMPLATE_ITEMS;
DROP TABLE CARE_PACKAGE_ISSUES;

-- Step 4: Rename new tables to original names
ALTER TABLE INCOMING_STOCK_NEW RENAME TO INCOMING_STOCK;
ALTER TABLE DONATIONS_NEW RENAME TO DONATIONS;
ALTER TABLE OUTGOING_STOCK_NEW RENAME TO OUTGOING_STOCK;
ALTER TABLE CARE_PACKAGE_TEMPLATE_ITEMS_NEW RENAME TO CARE_PACKAGE_TEMPLATE_ITEMS;
ALTER TABLE CARE_PACKAGE_ISSUES_NEW RENAME TO CARE_PACKAGE_ISSUES;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_incoming_stock_bill ON INCOMING_STOCK(Bill_ID);
CREATE INDEX IF NOT EXISTS idx_incoming_stock_item ON INCOMING_STOCK(Item_ID);
CREATE INDEX IF NOT EXISTS idx_donations_bill ON DONATIONS(Bill_ID);
CREATE INDEX IF NOT EXISTS idx_donations_item ON DONATIONS(Item_ID);
CREATE INDEX IF NOT EXISTS idx_outgoing_stock_bill ON OUTGOING_STOCK(Bill_ID);
CREATE INDEX IF NOT EXISTS idx_outgoing_stock_item ON OUTGOING_STOCK(Item_ID);
CREATE INDEX IF NOT EXISTS idx_care_package_template_items_template ON CARE_PACKAGE_TEMPLATE_ITEMS(Template_ID);
CREATE INDEX IF NOT EXISTS idx_care_package_template_items_item ON CARE_PACKAGE_TEMPLATE_ITEMS(Item_ID);
CREATE INDEX IF NOT EXISTS idx_care_package_issues_template ON CARE_PACKAGE_ISSUES(Template_ID);
CREATE INDEX IF NOT EXISTS idx_care_package_issues_date ON CARE_PACKAGE_ISSUES(Date_Issued);
CREATE INDEX IF NOT EXISTS idx_care_package_issues_center ON CARE_PACKAGE_ISSUES(Center_ID);
CREATE INDEX IF NOT EXISTS idx_care_package_issues_gn ON CARE_PACKAGE_ISSUES(GN_ID);

-- Step 6: Drop and recreate CURRENT_STOCK view to reflect REAL data type
DROP VIEW IF EXISTS CURRENT_STOCK;

CREATE VIEW CURRENT_STOCK AS
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
    ) - COALESCE(
        (SELECT SUM(cpti.Quantity_Per_Package * cpi.Packages_Issued)
         FROM CARE_PACKAGE_ISSUES cpi
         JOIN CARE_PACKAGE_TEMPLATE_ITEMS cpti ON cpi.Template_ID = cpti.Template_ID
         WHERE cpti.Item_ID = im.Item_ID), 0
    ) AS Current_Quantity,
    CASE 
        WHEN (
            COALESCE((SELECT SUM(Qty_Received) FROM INCOMING_STOCK WHERE Item_ID = im.Item_ID), 0) + 
            COALESCE((SELECT SUM(Qty_Received) FROM DONATIONS WHERE Item_ID = im.Item_ID), 0) - 
            COALESCE((SELECT SUM(Qty_Issued) FROM OUTGOING_STOCK WHERE Item_ID = im.Item_ID), 0) -
            COALESCE((SELECT SUM(cpti.Quantity_Per_Package * cpi.Packages_Issued)
                     FROM CARE_PACKAGE_ISSUES cpi
                     JOIN CARE_PACKAGE_TEMPLATE_ITEMS cpti ON cpi.Template_ID = cpti.Template_ID
                     WHERE cpti.Item_ID = im.Item_ID), 0)
        ) <= im.Reorder_Level THEN 'Low Stock'
        ELSE 'OK'
    END AS Stock_Status
FROM ITEMS_MASTER im
WHERE im.Status = 'Active';
