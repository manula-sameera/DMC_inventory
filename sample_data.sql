-- Sample Data for DMC Inventory System

-- Sample Items
INSERT INTO ITEMS_MASTER (Item_Name, Unit_Measure, Category, Reorder_Level) VALUES
('Rice', 'KG', 'Food', 100),
('Wheat Flour', 'KG', 'Food', 50),
('Sugar', 'KG', 'Food', 30),
('Cooking Oil', 'Liter', 'Food', 20),
('Dhal', 'KG', 'Food', 40),
('Drinking Water', 'Liter', 'Beverages', 200),
('Blankets', 'Pieces', 'Supplies', 50),
('Mosquito Nets', 'Pieces', 'Supplies', 30),
('First Aid Kit', 'Set', 'Medical', 10),
('Pain Relief Tablets', 'Box', 'Medical', 20),
('Bandages', 'Roll', 'Medical', 50),
('Antiseptic', 'Bottle', 'Medical', 15),
('Tarpaulin', 'Pieces', 'Supplies', 20),
('Torch Light', 'Pieces', 'Equipment', 25),
('Batteries', 'Pack', 'Equipment', 30),
('Soap', 'Bar', 'Hygiene', 100),
('Toothpaste', 'Tube', 'Hygiene', 50),
('Sanitary Napkins', 'Pack', 'Hygiene', 40),
('Infant Formula', 'Tin', 'Food', 25),
('Baby Diapers', 'Pack', 'Hygiene', 30);

-- Sample Centers
INSERT INTO CENTERS_MASTER (Center_Name, District, Contact_Person, Contact_Phone) VALUES
('Colombo Central Relief Center', 'Colombo', 'Mr. Silva', '0771234567'),
('Galle Emergency Center', 'Galle', 'Mrs. Perera', '0712345678'),
('Kandy Protection Center', 'Kandy', 'Mr. Fernando', '0723456789'),
('Jaffna Relief Station', 'Jaffna', 'Ms. Thilini', '0734567890'),
('Batticaloa Aid Center', 'Batticaloa', 'Mr. Kumar', '0745678901'),
('Ratnapura Relief Camp', 'Ratnapura', 'Mrs. Jayasinghe', '0756789012'),
('Anuradhapura Center', 'Anuradhapura', 'Mr. Bandara', '0767890123'),
('Kurunegala Station', 'Kurunegala', 'Ms. Dias', '0778901234');

-- Sample Incoming Stock
INSERT INTO INCOMING_STOCK (Date_Received, Item_ID, Supplier_Name, Qty_Received, Remarks) VALUES
(date('now', '-30 days'), 1, 'National Food Supply', 500, 'Emergency stock'),
(date('now', '-28 days'), 2, 'National Food Supply', 300, NULL),
(date('now', '-25 days'), 6, 'Water Board', 1000, 'Bottled water'),
(date('now', '-20 days'), 7, 'Red Cross', 100, NULL),
(date('now', '-15 days'), 9, 'Health Ministry', 50, 'Emergency medical supplies'),
(date('now', '-10 days'), 1, 'National Food Supply', 200, 'Additional stock'),
(date('now', '-5 days'), 13, 'Emergency Services', 50, NULL);

-- Sample Donations
INSERT INTO DONATIONS (Date_Received, Item_ID, Donor_Name, Qty_Received, Remarks) VALUES
(date('now', '-27 days'), 3, 'ABC Company', 100, 'Corporate donation'),
(date('now', '-24 days'), 4, 'XYZ Foundation', 50, NULL),
(date('now', '-22 days'), 7, 'Community Group Colombo', 75, 'Collected from community'),
(date('now', '-18 days'), 10, 'Pharmacy Association', 100, 'Medicine donation'),
(date('now', '-12 days'), 16, 'Hygiene for All NGO', 200, NULL),
(date('now', '-8 days'), 8, 'Red Cross', 60, NULL),
(date('now', '-3 days'), 5, 'Temple Donations', 150, 'Religious organization');

-- Sample Outgoing Stock
INSERT INTO OUTGOING_STOCK (Date_Issued, Center_ID, Item_ID, Qty_Requested, Qty_Issued, Officer_Name, Officer_NIC, Remarks) VALUES
(date('now', '-26 days'), 1, 1, 200, 200, 'Officer Perera', '871234567V', 'Emergency dispatch'),
(date('now', '-23 days'), 2, 6, 300, 300, 'Officer Silva', '891234567V', NULL),
(date('now', '-21 days'), 3, 7, 50, 45, 'Officer Fernando', '901234567V', 'Partial dispatch - limited stock'),
(date('now', '-19 days'), 1, 2, 100, 100, 'Officer Perera', '871234567V', NULL),
(date('now', '-16 days'), 4, 9, 20, 20, 'Officer Kumar', '881234567V', 'Medical supplies'),
(date('now', '-14 days'), 5, 1, 150, 150, 'Officer Thilini', '921234567V', NULL),
(date('now', '-11 days'), 2, 16, 80, 80, 'Officer Silva', '891234567V', 'Hygiene supplies'),
(date('now', '-9 days'), 6, 7, 30, 30, 'Officer Jayasinghe', '851234567V', NULL),
(date('now', '-7 days'), 3, 10, 40, 40, 'Officer Fernando', '901234567V', NULL),
(date('now', '-4 days'), 1, 3, 50, 50, 'Officer Perera', '871234567V', NULL),
(date('now', '-2 days'), 7, 1, 100, 100, 'Officer Bandara', '911234567V', 'Food supplies'),
(date('now', '-1 days'), 8, 13, 15, 15, 'Officer Dias', '931234567V', 'Emergency shelter');
