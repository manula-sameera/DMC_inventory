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
    GN_ID INTEGER,
    Contact_Person TEXT,
    Contact_Phone TEXT,
    Status TEXT DEFAULT 'Active' CHECK(Status IN ('Active', 'Inactive')),
    Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Modified_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (GN_ID) REFERENCES GN_DIVISIONS(GN_ID)
);

-- GN Divisions Master Table
CREATE TABLE IF NOT EXISTS GN_DIVISIONS (
    GN_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    GN_Division_Name TEXT NOT NULL UNIQUE,
    DS_Division TEXT,
    Status TEXT DEFAULT 'Active' CHECK(Status IN ('Active', 'Inactive')),
    Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Modified_Date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Incoming Stock Bills (Goods Received Note Header)
CREATE TABLE IF NOT EXISTS INCOMING_BILLS (
    Bill_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Bill_Number TEXT UNIQUE,
    Date_Received DATE NOT NULL,
    Supplier_Name TEXT NOT NULL,
    Remarks TEXT,
    Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Modified_Date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Incoming Stock Items (Bill Line Items)
CREATE TABLE IF NOT EXISTS INCOMING_STOCK (
    GRN_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Bill_ID INTEGER NOT NULL,
    Item_ID INTEGER NOT NULL,
    Qty_Received REAL NOT NULL CHECK(Qty_Received > 0),
    Item_Remarks TEXT,
    FOREIGN KEY (Bill_ID) REFERENCES INCOMING_BILLS(Bill_ID) ON DELETE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
);

-- Donation Bills (Donation Receipt Header)
CREATE TABLE IF NOT EXISTS DONATION_BILLS (
    Bill_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Bill_Number TEXT UNIQUE,
    Date_Received DATE NOT NULL,
    Donor_Name TEXT NOT NULL,
    Remarks TEXT,
    Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Modified_Date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Donation Items (Bill Line Items)
CREATE TABLE IF NOT EXISTS DONATIONS (
    Donation_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Bill_ID INTEGER NOT NULL,
    Item_ID INTEGER NOT NULL,
    Qty_Received REAL NOT NULL CHECK(Qty_Received > 0),
    Item_Remarks TEXT,
    FOREIGN KEY (Bill_ID) REFERENCES DONATION_BILLS(Bill_ID) ON DELETE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
);

-- Outgoing Stock Bills (Dispatch Note Header)
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
);

-- Outgoing Stock Items (Bill Line Items)
CREATE TABLE IF NOT EXISTS OUTGOING_STOCK (
    Dispatch_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Bill_ID INTEGER NOT NULL,
    Item_ID INTEGER NOT NULL,
    Qty_Requested REAL NOT NULL CHECK(Qty_Requested > 0),
    Qty_Issued REAL NOT NULL CHECK(Qty_Issued >= 0),
    Item_Remarks TEXT,
    FOREIGN KEY (Bill_ID) REFERENCES OUTGOING_BILLS(Bill_ID) ON DELETE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
);

-- Care Package Templates (Define what items are in each package type)
CREATE TABLE IF NOT EXISTS CARE_PACKAGE_TEMPLATES (
    Template_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Package_Name TEXT NOT NULL UNIQUE,
    Description TEXT,
    Status TEXT DEFAULT 'Active' CHECK(Status IN ('Active', 'Inactive')),
    Created_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Modified_Date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Care Package Template Items (Items in each package template)
CREATE TABLE IF NOT EXISTS CARE_PACKAGE_TEMPLATE_ITEMS (
    Template_Item_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Template_ID INTEGER NOT NULL,
    Item_ID INTEGER NOT NULL,
    Quantity_Per_Package REAL NOT NULL CHECK(Quantity_Per_Package > 0),
    Item_Remarks TEXT,
    FOREIGN KEY (Template_ID) REFERENCES CARE_PACKAGE_TEMPLATES(Template_ID) ON DELETE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES ITEMS_MASTER(Item_ID)
);

-- Care Package Issues (Track when packages are issued)
CREATE TABLE IF NOT EXISTS CARE_PACKAGE_ISSUES (
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incoming_bills_date ON INCOMING_BILLS(Date_Received);
CREATE INDEX IF NOT EXISTS idx_incoming_bills_supplier ON INCOMING_BILLS(Supplier_Name);
CREATE INDEX IF NOT EXISTS idx_incoming_stock_bill ON INCOMING_STOCK(Bill_ID);
CREATE INDEX IF NOT EXISTS idx_incoming_stock_item ON INCOMING_STOCK(Item_ID);

CREATE INDEX IF NOT EXISTS idx_donation_bills_date ON DONATION_BILLS(Date_Received);
CREATE INDEX IF NOT EXISTS idx_donation_bills_donor ON DONATION_BILLS(Donor_Name);
CREATE INDEX IF NOT EXISTS idx_donations_bill ON DONATIONS(Bill_ID);
CREATE INDEX IF NOT EXISTS idx_donations_item ON DONATIONS(Item_ID);

CREATE INDEX IF NOT EXISTS idx_outgoing_bills_date ON OUTGOING_BILLS(Date_Issued);
CREATE INDEX IF NOT EXISTS idx_outgoing_bills_center ON OUTGOING_BILLS(Center_ID);
CREATE INDEX IF NOT EXISTS idx_outgoing_stock_bill ON OUTGOING_STOCK(Bill_ID);
CREATE INDEX IF NOT EXISTS idx_outgoing_stock_item ON OUTGOING_STOCK(Item_ID);

-- Care Package Indexes
CREATE INDEX IF NOT EXISTS idx_care_package_template_items_template ON CARE_PACKAGE_TEMPLATE_ITEMS(Template_ID);
CREATE INDEX IF NOT EXISTS idx_care_package_template_items_item ON CARE_PACKAGE_TEMPLATE_ITEMS(Item_ID);
CREATE INDEX IF NOT EXISTS idx_care_package_issues_template ON CARE_PACKAGE_ISSUES(Template_ID);
CREATE INDEX IF NOT EXISTS idx_care_package_issues_date ON CARE_PACKAGE_ISSUES(Date_Issued);
CREATE INDEX IF NOT EXISTS idx_care_package_issues_center ON CARE_PACKAGE_ISSUES(Center_ID);
CREATE INDEX IF NOT EXISTS idx_care_package_issues_gn ON CARE_PACKAGE_ISSUES(GN_ID);
