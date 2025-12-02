# Reports Module

## PDF Report Generation

This module handles the generation of PDF reports for the DMC Inventory Management System.

### Features

- **A4 Format**: All reports are generated in A4 page size (595.28 x 841.89 points)
- **Table Structure**: Data is presented in well-formatted tables with headers and borders
- **Unicode Support**: Full support for Unicode characters including Sinhala (සිංහල), Tamil (தமிழ்), and other international languages
- **Pagination**: Automatic page breaks with headers repeated on each page
- **Page Numbering**: Each page includes page numbers and generation timestamp
- **Summary Statistics**: Reports include summary sections with aggregated data

### Report Types

1. **Current Stock Levels**
   - Shows all items with current quantities
   - Displays reorder levels and status
   - No date range required

2. **Incoming Stock**
   - Lists all received items within date range
   - Includes source/supplier information
   - Shows quantities and remarks

3. **Outgoing Stock**
   - Displays dispatched items within date range
   - Includes destination center information
   - Shows quantities and remarks

4. **Donations**
   - Lists donated items within date range
   - Includes donor name and contact information
   - Shows quantities

### Unicode Character Support

The PDF generator includes proper handling for Unicode characters:

- **String Encoding**: All text fields are processed through `ensureString()` method
- **Database Encoding**: SQLite database uses UTF-8 encoding
- **Font Rendering**: Uses PDFKit's built-in font rendering with Unicode support
- **Text Features**: Includes proper text rendering features for complex scripts

#### Supported Languages/Scripts

✓ English (Latin)
✓ Sinhala (සිංහල)
✓ Tamil (தமிழ்)
✓ Arabic (العربية)
✓ Chinese (中文)
✓ And other Unicode-supported languages

### Usage

Reports are generated through the UI:
1. Navigate to Reports page
2. Select report type
3. Choose date range (if applicable)
4. Select items (or all items)
5. Click "Generate PDF Report"
6. Choose save location

### Technical Details

- **Library**: PDFKit
- **Node.js Module**: `pdfGenerator.js`
- **Character Encoding**: UTF-8
- **Font Support**: Helvetica (with Unicode text rendering)
- **File Format**: PDF 1.3+ compatible
