# Quick Start Guide - DMC Inventory System

> Note: This document is now under `docs/`. If you are contributing, update the file in `docs/`.

## Installation and First Run

### Step 1: Install Dependencies

```powershell
npm install
```

### Step 2: Run the Application

```powershell
npm start
```

## First Time Setup

When you first run the application:

1. The database will be automatically created
2. You'll see an empty dashboard
3. Start by adding items and centers

## Quick Workflow

### 1. Setup Master Data

**Add Items:**

- Click "Items Master" in sidebar
- Click "Add Item"
- Enter: Rice, KG, Food, Reorder Level: 100
- Repeat for other items

**Add Centers:**

- Click "Centers Master"
- Click "Add Center"
- Enter center details

### 2. Record Incoming Stock

- Click "Incoming Stock"
- Click "Add Incoming Stock"
- Select item, enter supplier and quantity
- Save

### 3. Record Donations

- Click "Donations"
- Click "Add Donation"
- Select item, enter donor and quantity
- Save

### 4. Dispatch Stock

- Click "Dispatch/Outgoing"
- Click "Dispatch Stock"
- Select center and item
- Enter requested and issued quantities
- Enter officer details
- Save

### 5. Monitor Stock

- Click "Dashboard" for overview
- Click "Current Stock" for detailed view
- Low stock items are highlighted

## Loading Sample Data

To quickly test the system with sample data:

```powershell
# After first run, stop the application
# Find your database location (check console output)
# Default: C:\Users\YourName\AppData\Roaming\dmc-inventory\dmc_inventory.db

# Open the database with DB Browser for SQLite (optional)
# Or load sample data programmatically
```

... (rest preserved) ...
