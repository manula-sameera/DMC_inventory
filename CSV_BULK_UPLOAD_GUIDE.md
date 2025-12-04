# CSV Bulk Upload Guide

## Overview
The DMC Inventory system now supports bulk uploading of Items, Centers, and GN Divisions via CSV files with full UTF-8 support for Sinhala and Tamil text.

## How to Use

### 1. Items Bulk Upload
Navigate to **Items Master** page and click the **"📤 Bulk Upload CSV"** button.

**Required Columns:**
- `Item_Name` - Name of the item (required)
- `Unit_Measure` - Unit of measurement (required, e.g., Kg, L, Packet)
- `Category` - Item category (required, e.g., Food, Beverages)

**Optional Columns:**
- `Reorder_Level` - Minimum stock level (default: 0)
- `Status` - Active or Inactive (default: Active)

**Example CSV:**
```csv
Item_Name,Unit_Measure,Category,Reorder_Level,Status
Rice,Kg,Food,100,Active
Dal,Kg,Food,50,Active
Sugar,Kg,Food,75,Active
```

### 2. GN Divisions Bulk Upload
Navigate to **GN Divisions** page and click the **"📤 Bulk Upload CSV"** button.

**Required Columns:**
- `GN_Division_Name` - Name of the GN Division (required)

**Optional Columns:**
- `DS_Division` - Divisional Secretariat name
- `Status` - Active or Inactive (default: Active)

**Example CSV:**
```csv
GN_Division_Name,DS_Division,Status
Ambepussa,Aranayake,Active
Kosgolla,Aranayake,Active
Aranayake,Aranayake,Active
```

### 3. Centers Bulk Upload
Navigate to **Centers Master** page and click the **"📤 Bulk Upload CSV"** button.

**Required Columns:**
- `Center_Name` - Name of the center (required)

**Optional Columns:**
- `GN_Division_Name` - Associated GN Division (must already exist in the system)
- `Contact_Person` - Name of contact person
- `Contact_Phone` - Phone number
- `Status` - Active or Inactive (default: Active)

**Example CSV:**
```csv
Center_Name,GN_Division_Name,Contact_Person,Contact_Phone,Status
Ambepussa Community Center,Ambepussa,John Silva,0771234567,Active
Kosgolla Welfare Center,Kosgolla,Mary Fernando,0777654321,Active
```

## UTF-8 Support for Sinhala/Tamil

The system fully supports UTF-8 encoded text. To use Sinhala or Tamil:

1. Create your CSV file in Excel, Google Sheets, or a text editor
2. **Important:** When saving, choose **"CSV UTF-8"** format
   - In Excel: File → Save As → Choose "CSV UTF-8 (Comma delimited)"
   - In Google Sheets: File → Download → CSV
   - In Notepad: File → Save As → Encoding: UTF-8

**Example with Sinhala:**
```csv
Item_Name,Unit_Measure,Category,Reorder_Level,Status
සහල්,කිලෝ,ආහාර,100,Active
පරිප්පු,කිලෝ,ආහාර,50,Active
සීනි,කිලෝ,ආහාර,75,Active
```

## Sample Files

Sample CSV files are included in the root directory:
- `sample_items.csv` - Sample items in English
- `sample_gn_divisions.csv` - Sample GN divisions
- `sample_centers.csv` - Sample centers
- `sample_items_sinhala.csv` - Sample items in Sinhala

## Upload Process

1. Click the bulk upload button on the respective page
2. Read the format guidelines in the modal
3. Click "Select CSV File" and choose your CSV file
4. Review the preview of the first 5 rows
5. Click "Upload" to process the file
6. Monitor the progress bar
7. Review results (success/failed counts)

## Tips

- **Test first:** Use the sample files to test the upload process
- **One type at a time:** Upload GN Divisions before Centers (if centers reference GN divisions)
- **Check for duplicates:** The system will reject duplicate names
- **Review errors:** If some records fail, check the console for detailed error messages
- **UTF-8 encoding:** Always save CSV files with UTF-8 encoding for proper character support

## Error Handling

The system will:
- Skip rows with missing required fields
- Show the number of successful and failed imports
- Continue processing even if some rows fail
- Display detailed error messages in the console
- Not rollback successful inserts if later rows fail

## Notes

- Duplicate names will be rejected (items, centers, and GN divisions must have unique names)
- When uploading centers, the GN Division must already exist in the system
- Status values should be either "Active" or "Inactive"
- All text trimming is automatic (leading/trailing spaces removed)
- Headers must match exactly (case-sensitive)
