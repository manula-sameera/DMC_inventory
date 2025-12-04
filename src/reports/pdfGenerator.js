const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
    constructor() {
        this.pageWidth = 595.28; // A4 width in points
        this.pageHeight = 841.89; // A4 height in points
        this.margin = 40;
        this.contentWidth = this.pageWidth - (this.margin * 2);
        
        // Font paths for Unicode support
        this.fontPaths = this.detectUnicodeFonts();
    }

    detectUnicodeFonts() {
        try {
            // Try to find Windows system fonts that support Sinhala script
            const windowsFonts = 'C:\\Windows\\Fonts';
            
            // Try multiple font options in order of preference (Sinhala-specific fonts first)
            const fontOptions = [
                // Iskoola Pota - best Sinhala support
                { regular: 'iskpota.ttf', bold: 'iskpotab.ttf', name: 'Iskoola Pota' },
                { regular: 'iskpota.ttf', bold: 'iskpota.ttf', name: 'Iskoola Pota (regular as bold)' },
                // Nirmala UI - good Sinhala and Tamil support
                { regular: 'Nirmala.ttc', bold: 'Nirmala.ttc', name: 'Nirmala UI' },
                // Fallback to generic Unicode fonts
                { regular: 'NotoSans-Regular.ttf', bold: 'NotoSans-Bold.ttf', name: 'Noto Sans' },
                { regular: 'segoeui.ttf', bold: 'segoeuib.ttf', name: 'Segoe UI' },
                { regular: 'arial.ttf', bold: 'arialbd.ttf', name: 'Arial' }
            ];
            
            for (const fontSet of fontOptions) {
                const regularPath = path.join(windowsFonts, fontSet.regular);
                const boldPath = path.join(windowsFonts, fontSet.bold);
                
                if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
                    console.log('Found Unicode fonts:', fontSet.name, '(' + fontSet.regular + ')');
                    return { regular: regularPath, bold: boldPath };
                }
            }
            
            console.warn('No Unicode fonts found, will use Helvetica (limited Unicode support)');
            return null;
        } catch (error) {
            console.error('Font detection error:', error.message);
            return null;
        }
    }

    createDocument() {
        const doc = new PDFDocument({
            size: 'A4',
            margin: this.margin,
            bufferPages: true
        });
        
        // Register fonts for this document
        this.registerFonts(doc);
        
        return doc;
    }

    registerFonts(doc) {
        if (this.fontPaths) {
            doc.registerFont('UnicodeFont', this.fontPaths.regular);
            doc.registerFont('UnicodeFontBold', this.fontPaths.bold);
        }
    }

    getFont(bold = false) {
        if (this.fontPaths) {
            return bold ? 'UnicodeFontBold' : 'UnicodeFont';
        } else {
            return bold ? 'Helvetica-Bold' : 'Helvetica';
        }
    }

    addHeader(doc, title, subtitle = '') {
        doc.fontSize(18)
           .font(this.getFont(true))
           .text(this.ensureString('DMC Inventory Management System'), { align: 'center' });
        
        doc.fontSize(14)
           .font(this.getFont(true))
           .text(this.ensureString(title), { align: 'center' });
        
        if (subtitle) {
            doc.fontSize(10)
               .font(this.getFont(false))
               .text(this.ensureString(subtitle), { align: 'center' });
        }
        
        doc.moveDown();
        doc.strokeColor('#cccccc')
           .lineWidth(1)
           .moveTo(this.margin, doc.y)
           .lineTo(this.pageWidth - this.margin, doc.y)
           .stroke();
        
        doc.moveDown();
        return doc.y;
    }

    ensureString(value) {
        // Ensure proper string handling for Unicode characters
        if (value === null || value === undefined) {
            return '';
        }
        return String(value);
    }

    addFooter(doc, pageNumber, totalPages) {
        const bottom = this.pageHeight - this.margin;
        
        doc.fontSize(8)
           .font(this.getFont(false))
           .text(
               `Generated on: ${new Date().toLocaleString('en-US', { 
                   year: 'numeric', 
                   month: 'long', 
                   day: 'numeric',
                   hour: '2-digit',
                   minute: '2-digit'
               })}`,
               this.margin,
               bottom - 20,
               { align: 'left' }
           );
        
        doc.text(
            `Page ${pageNumber} of ${totalPages}`,
            this.margin,
            bottom - 20,
            { align: 'right' }
        );
    }

    drawTable(doc, headers, rows, columnWidths = null) {
        const startY = doc.y;
        const tableWidth = this.contentWidth;
        
        // Calculate column widths if not provided
        if (!columnWidths) {
            const numColumns = headers.length;
            columnWidths = Array(numColumns).fill(tableWidth / numColumns);
        }
        
        // Ensure widths sum to table width
        const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
        if (Math.abs(totalWidth - tableWidth) > 1) {
            const scale = tableWidth / totalWidth;
            columnWidths = columnWidths.map(w => w * scale);
        }
        
        let currentY = startY;
        
        // Draw header
        this.drawTableRow(doc, headers, columnWidths, currentY, true);
        currentY += 25;
        
        // Draw rows
        for (let i = 0; i < rows.length; i++) {
            // Check if we need a new page
            if (currentY > this.pageHeight - 100) {
                doc.addPage();
                currentY = this.margin;
                // Redraw header on new page
                this.drawTableRow(doc, headers, columnWidths, currentY, true);
                currentY += 25;
            }
            
            this.drawTableRow(doc, rows[i], columnWidths, currentY, false);
            currentY += 20;
        }
        
        // Draw final border
        doc.strokeColor('#cccccc')
           .lineWidth(0.5)
           .moveTo(this.margin, currentY)
           .lineTo(this.pageWidth - this.margin, currentY)
           .stroke();
        
        doc.y = currentY + 10;
    }

    drawTableRow(doc, cells, columnWidths, y, isHeader = false) {
        let currentX = this.margin;
        
        // Draw cell backgrounds and borders
        if (isHeader) {
            doc.fillColor('#f0f0f0')
               .rect(this.margin, y, this.contentWidth, 25)
               .fill();
        }
        
        // Draw top border
        doc.strokeColor('#cccccc')
           .lineWidth(0.5)
           .moveTo(this.margin, y)
           .lineTo(this.pageWidth - this.margin, y)
           .stroke();
        
        // Draw vertical borders and text
        for (let i = 0; i < cells.length; i++) {
            // Draw left border
            doc.strokeColor('#cccccc')
               .lineWidth(0.5)
               .moveTo(currentX, y)
               .lineTo(currentX, y + (isHeader ? 25 : 20))
               .stroke();
            
            // Draw text with Unicode support
            const fontSize = isHeader ? 9 : 8;
            const font = this.getFont(isHeader);
            
            // Ensure proper Unicode string handling
            const cellText = this.ensureString(cells[i]);
            
            doc.fillColor('#000000')
               .fontSize(fontSize)
               .font(font)
               .text(
                   cellText,
                   currentX + 5,
                   y + (isHeader ? 8 : 5),
                   {
                       width: columnWidths[i] - 10,
                       align: i === 0 ? 'left' : (typeof cells[i] === 'number' ? 'right' : 'left'),
                       ellipsis: true
                   }
               );
            
            currentX += columnWidths[i];
        }
        
        // Draw right border
        doc.strokeColor('#cccccc')
           .lineWidth(0.5)
           .moveTo(currentX, y)
           .lineTo(currentX, y + (isHeader ? 25 : 20))
           .stroke();
    }

    // Generate Current Stock Report
    async generateCurrentStockReport(data, selectedItems, outputPath) {
        return new Promise((resolve, reject) => {
            try {
                const doc = this.createDocument();
                const stream = fs.createWriteStream(outputPath);
                
                doc.pipe(stream);
                
                // Add header
                let subtitle = 'Current Stock Levels';
                if (selectedItems && selectedItems.length > 0) {
                    subtitle += ` (${selectedItems.length} selected items)`;
                } else {
                    subtitle += ' (All Items)';
                }
                this.addHeader(doc, 'Current Stock Report', subtitle);
                
                // Prepare table data
                const headers = ['Item Name', 'Category', 'Unit', 'Current Qty', 'Total In', 'Total Out', 'Reorder', 'Status'];
                const columnWidths = [120, 80, 50, 60, 60, 60, 50, 50];
                
                const rows = data.map(item => [
                    this.ensureString(item.Item_Name),
                    this.ensureString(item.Category || 'N/A'),
                    this.ensureString(item.Unit_Measure),
                    item.Current_Quantity || 0,
                    item.Total_Incoming || 0,
                    item.Total_Outgoing || 0,
                    item.Reorder_Level || 0,
                    (item.Current_Quantity || 0) <= (item.Reorder_Level || 0) ? 'Low' : 'OK'
                ]);
                
                // Draw table
                this.drawTable(doc, headers, rows, columnWidths);
                
                // Add summary
                doc.moveDown(2);
                doc.fontSize(10).font(this.getFont(true)).text('Summary:', { underline: true });
                doc.fontSize(9).font(this.getFont(false));
                doc.text(`Total Items: ${data.length}`);
                const lowStockCount = data.filter(item => 
                    (item.Current_Quantity || 0) <= (item.Reorder_Level || 0)
                ).length;
                doc.text(`Low Stock Items: ${lowStockCount}`);
                const totalQuantity = data.reduce((sum, item) => sum + (item.Current_Quantity || 0), 0);
                doc.text(`Total Quantity: ${totalQuantity}`);
                
                // Add page numbers
                const range = doc.bufferedPageRange();
                for (let i = 0; i < range.count; i++) {
                    doc.switchToPage(i);
                    this.addFooter(doc, i + 1, range.count);
                }
                
                doc.end();
                stream.on('finish', () => resolve(outputPath));
                stream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Generate Incoming Stock Report
    async generateIncomingReport(data, dateRange, selectedItems, outputPath) {
        return new Promise((resolve, reject) => {
            try {
                const doc = this.createDocument();
                const stream = fs.createWriteStream(outputPath);
                
                doc.pipe(stream);
                
                // Add header
                let subtitle = `Incoming Stock Report`;
                if (dateRange.from && dateRange.to) {
                    subtitle += `\nPeriod: ${dateRange.from} to ${dateRange.to}`;
                }
                if (selectedItems && selectedItems.length > 0) {
                    subtitle += `\n(${selectedItems.length} selected items)`;
                }
                this.addHeader(doc, 'Incoming Stock Report', subtitle);
                
                // Prepare table data
                const headers = ['Bill #', 'Date', 'Item', 'Qty', 'Unit', 'Source', 'Remarks'];
                const columnWidths = [55, 55, 110, 45, 40, 100, 125];
                
                const rows = data.map(item => [
                    this.ensureString(item.Bill_Number || 'N/A'),
                    new Date(item.Received_Date).toLocaleDateString(),
                    this.ensureString(item.Item_Name),
                    item.Quantity,
                    this.ensureString(item.Unit_Measure),
                    this.ensureString(item.Source_Name || 'N/A'),
                    this.ensureString(item.Item_Remarks || item.Bill_Remarks || '')
                ]);
                
                // Draw table
                this.drawTable(doc, headers, rows, columnWidths);
                
                // Add summary
                doc.moveDown(2);
                doc.fontSize(10).font(this.getFont(true)).text('Summary:', { underline: true });
                doc.fontSize(9).font(this.getFont(false));
                doc.text(`Total Transactions: ${data.length}`);
                
                // Group by item
                const itemSummary = {};
                data.forEach(item => {
                    const itemName = this.ensureString(item.Item_Name);
                    if (!itemSummary[itemName]) {
                        itemSummary[itemName] = 0;
                    }
                    itemSummary[itemName] += item.Quantity;
                });
                
                doc.moveDown();
                doc.text('Total Received by Item:');
                Object.entries(itemSummary).forEach(([itemName, qty]) => {
                    doc.text(`  ${this.ensureString(itemName)}: ${qty}`);
                });
                
                // Add page numbers
                const range = doc.bufferedPageRange();
                for (let i = 0; i < range.count; i++) {
                    doc.switchToPage(i);
                    this.addFooter(doc, i + 1, range.count);
                }
                
                doc.end();
                stream.on('finish', () => resolve(outputPath));
                stream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Generate Outgoing Stock Report
    async generateOutgoingReport(data, dateRange, selectedItems, outputPath) {
        return new Promise((resolve, reject) => {
            try {
                const doc = this.createDocument();
                const stream = fs.createWriteStream(outputPath);
                
                doc.pipe(stream);
                
                // Add header
                let subtitle = `Outgoing Stock Report`;
                if (dateRange.from && dateRange.to) {
                    subtitle += `\nPeriod: ${dateRange.from} to ${dateRange.to}`;
                }
                if (selectedItems && selectedItems.length > 0) {
                    subtitle += `\n(${selectedItems.length} selected items)`;
                }
                this.addHeader(doc, 'Outgoing Stock Report', subtitle);
                
                // Prepare table data
                const headers = ['Bill #', 'Date', 'Item', 'Qty', 'Unit', 'Center', 'Officer', 'Remarks'];
                const columnWidths = [50, 50, 95, 40, 35, 90, 75, 95];
                
                const rows = data.map(item => [
                    this.ensureString(item.Bill_Number || 'N/A'),
                    new Date(item.Dispatch_Date).toLocaleDateString(),
                    this.ensureString(item.Item_Name),
                    item.Quantity,
                    this.ensureString(item.Unit_Measure),
                    this.ensureString(item.Center_Name || 'N/A'),
                    this.ensureString(item.Officer_Name || 'N/A'),
                    this.ensureString(item.Item_Remarks || item.Bill_Remarks || '')
                ]);
                
                // Draw table
                this.drawTable(doc, headers, rows, columnWidths);
                
                // Add summary
                doc.moveDown(2);
                doc.fontSize(10).font(this.getFont(true)).text('Summary:', { underline: true });
                doc.fontSize(9).font(this.getFont(false));
                doc.text(`Total Transactions: ${data.length}`);
                
                // Group by item
                const itemSummary = {};
                data.forEach(item => {
                    const itemName = this.ensureString(item.Item_Name);
                    if (!itemSummary[itemName]) {
                        itemSummary[itemName] = 0;
                    }
                    itemSummary[itemName] += item.Quantity;
                });
                
                doc.moveDown();
                doc.text('Total Dispatched by Item:');
                Object.entries(itemSummary).forEach(([itemName, qty]) => {
                    doc.text(`  ${this.ensureString(itemName)}: ${qty}`);
                });
                
                // Add page numbers
                const range = doc.bufferedPageRange();
                for (let i = 0; i < range.count; i++) {
                    doc.switchToPage(i);
                    this.addFooter(doc, i + 1, range.count);
                }
                
                doc.end();
                stream.on('finish', () => resolve(outputPath));
                stream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Generate Donations Report
    async generateDonationsReport(data, dateRange, selectedItems, outputPath) {
        return new Promise((resolve, reject) => {
            try {
                const doc = this.createDocument();
                const stream = fs.createWriteStream(outputPath);
                
                doc.pipe(stream);
                
                // Add header
                let subtitle = `Donations Report`;
                if (dateRange.from && dateRange.to) {
                    subtitle += `\nPeriod: ${dateRange.from} to ${dateRange.to}`;
                }
                if (selectedItems && selectedItems.length > 0) {
                    subtitle += `\n(${selectedItems.length} selected items)`;
                }
                this.addHeader(doc, 'Donations Report', subtitle);
                
                // Prepare table data
                const headers = ['Bill #', 'Date', 'Item', 'Qty', 'Unit', 'Donor', 'Remarks'];
                const columnWidths = [55, 55, 120, 45, 40, 110, 105];
                
                const rows = data.map(item => [
                    this.ensureString(item.Bill_Number || 'N/A'),
                    new Date(item.Donation_Date).toLocaleDateString(),
                    this.ensureString(item.Item_Name),
                    item.Quantity,
                    this.ensureString(item.Unit_Measure),
                    this.ensureString(item.Donor_Name || 'Anonymous'),
                    this.ensureString(item.Item_Remarks || item.Bill_Remarks || '')
                ]);
                
                // Draw table
                this.drawTable(doc, headers, rows, columnWidths);
                
                // Add summary
                doc.moveDown(2);
                doc.fontSize(10).font(this.getFont(true)).text('Summary:', { underline: true });
                doc.fontSize(9).font(this.getFont(false));
                doc.text(`Total Donations: ${data.length}`);
                
                // Group by item
                const itemSummary = {};
                data.forEach(item => {
                    const itemName = this.ensureString(item.Item_Name);
                    if (!itemSummary[itemName]) {
                        itemSummary[itemName] = 0;
                    }
                    itemSummary[itemName] += item.Quantity;
                });
                
                doc.moveDown();
                doc.text('Total Donated by Item:');
                Object.entries(itemSummary).forEach(([itemName, qty]) => {
                    doc.text(`  ${this.ensureString(itemName)}: ${qty}`);
                });
                
                // Group by donor
                const donorCount = {};
                data.forEach(item => {
                    const donor = this.ensureString(item.Donor_Name || 'Anonymous');
                    donorCount[donor] = (donorCount[donor] || 0) + 1;
                });
                
                doc.moveDown();
                doc.text(`Unique Donors: ${Object.keys(donorCount).length}`);
                
                // Add page numbers
                const range = doc.bufferedPageRange();
                for (let i = 0; i < range.count; i++) {
                    doc.switchToPage(i);
                    this.addFooter(doc, i + 1, range.count);
                }
                
                doc.end();
                stream.on('finish', () => resolve(outputPath));
                stream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Generate Care Packages Report
    async generateCarePackagesReport(data, dateRange, outputPath) {
        return new Promise((resolve, reject) => {
            try {
                const doc = this.createDocument();
                const stream = fs.createWriteStream(outputPath);
                
                doc.pipe(stream);
                
                // Add header
                let subtitle = `Care Packages Issued Report`;
                if (dateRange.from && dateRange.to) {
                    subtitle += `\nPeriod: ${dateRange.from} to ${dateRange.to}`;
                }
                this.addHeader(doc, 'Care Packages Report', subtitle);
                
                // Prepare table data
                const headers = ['Date', 'Package', 'Pkgs Issued', 'Item', 'Total Qty', 'Unit', 'Recipient', 'Officer'];
                const columnWidths = [55, 80, 50, 90, 50, 35, 85, 85];
                
                const rows = data.map(item => [
                    new Date(item.Date_Issued).toLocaleDateString(),
                    this.ensureString(item.Package_Name),
                    item.Packages_Issued,
                    this.ensureString(item.Item_Name),
                    item.Total_Quantity,
                    this.ensureString(item.Unit_Measure),
                    this.ensureString(item.Recipient || 'N/A'),
                    this.ensureString(item.Officer_Name || 'N/A')
                ]);
                
                // Draw table
                this.drawTable(doc, headers, rows, columnWidths);
                
                // Add summary
                doc.moveDown(2);
                doc.fontSize(10).font(this.getFont(true)).text('Summary:', { underline: true });
                doc.fontSize(9).font(this.getFont(false));
                doc.text(`Total Issues: ${data.length}`);
                
                // Group by package type
                const packageSummary = {};
                data.forEach(item => {
                    const pkgName = this.ensureString(item.Package_Name);
                    if (!packageSummary[pkgName]) {
                        packageSummary[pkgName] = 0;
                    }
                    packageSummary[pkgName] += item.Packages_Issued;
                });
                
                doc.moveDown();
                doc.text('Total Packages Issued by Type:');
                Object.entries(packageSummary).forEach(([pkgName, count]) => {
                    doc.text(`  ${this.ensureString(pkgName)}: ${count} packages`);
                });
                
                // Group by item
                const itemSummary = {};
                data.forEach(item => {
                    const itemName = this.ensureString(item.Item_Name);
                    if (!itemSummary[itemName]) {
                        itemSummary[itemName] = 0;
                    }
                    itemSummary[itemName] += item.Total_Quantity;
                });
                
                doc.moveDown();
                doc.text('Total Items Distributed:');
                Object.entries(itemSummary).forEach(([itemName, qty]) => {
                    doc.text(`  ${this.ensureString(itemName)}: ${qty}`);
                });
                
                // Add page numbers
                const range = doc.bufferedPageRange();
                for (let i = 0; i < range.count; i++) {
                    doc.switchToPage(i);
                    this.addFooter(doc, i + 1, range.count);
                }
                
                doc.end();
                stream.on('finish', () => resolve(outputPath));
                stream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = new PDFGenerator();
