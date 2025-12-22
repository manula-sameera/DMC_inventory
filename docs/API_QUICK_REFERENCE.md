# Quick Reference: Bill-Based Entry API

> Note: This document is now under `docs/`. If you are contributing, update the file in `docs/`.

## Incoming Stock (GRN)

### Get All Bills

```javascript
const bills = await window.api.incoming.bills.getAll();
// Returns: [{ Bill_ID, Bill_Number, Date_Received, Supplier_Name, Item_Count, Total_Quantity, ... }]
```

... (content preserved) ...
