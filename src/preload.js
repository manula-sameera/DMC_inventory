const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Items API
    items: {
        getAll: () => ipcRenderer.invoke('items:getAll'),
        getActive: () => ipcRenderer.invoke('items:getActive'),
        add: (item) => ipcRenderer.invoke('items:add', item),
        update: (itemId, item) => ipcRenderer.invoke('items:update', itemId, item),
        delete: (itemId) => ipcRenderer.invoke('items:delete', itemId)
    },
    
    // Centers API
    centers: {
        getAll: () => ipcRenderer.invoke('centers:getAll'),
        getActive: () => ipcRenderer.invoke('centers:getActive'),
        add: (center) => ipcRenderer.invoke('centers:add', center),
        update: (centerId, center) => ipcRenderer.invoke('centers:update', centerId, center),
        delete: (centerId) => ipcRenderer.invoke('centers:delete', centerId)
    },
    
    // GN Divisions API
    gnDivisions: {
        getAll: () => ipcRenderer.invoke('gnDivisions:getAll'),
        getActive: () => ipcRenderer.invoke('gnDivisions:getActive'),
        add: (gn) => ipcRenderer.invoke('gnDivisions:add', gn),
        update: (gnId, gn) => ipcRenderer.invoke('gnDivisions:update', gnId, gn),
        delete: (gnId) => ipcRenderer.invoke('gnDivisions:delete', gnId)
    },
    
    // Incoming Stock API (Bill-based)
    incoming: {
        // Bill operations
        bills: {
            getAll: () => ipcRenderer.invoke('incoming:bills:getAll'),
            getDetails: (billId) => ipcRenderer.invoke('incoming:bills:getDetails', billId),
            add: (billData) => ipcRenderer.invoke('incoming:bills:add', billData),
            update: (billId, billData) => ipcRenderer.invoke('incoming:bills:update', billId, billData),
            delete: (billId) => ipcRenderer.invoke('incoming:bills:delete', billId)
        },
        // Legacy item operations (for backward compatibility)
        getAll: () => ipcRenderer.invoke('incoming:getAll')
    },
    
    // Donations API (Bill-based)
    donations: {
        // Bill operations
        bills: {
            getAll: () => ipcRenderer.invoke('donations:bills:getAll'),
            getDetails: (billId) => ipcRenderer.invoke('donations:bills:getDetails', billId),
            add: (billData) => ipcRenderer.invoke('donations:bills:add', billData),
            update: (billId, billData) => ipcRenderer.invoke('donations:bills:update', billId, billData),
            delete: (billId) => ipcRenderer.invoke('donations:bills:delete', billId)
        },
        // Legacy item operations (for backward compatibility)
        getAll: () => ipcRenderer.invoke('donations:getAll')
    },
    
    // Outgoing Stock API (Bill-based)
    outgoing: {
        // Bill operations
        bills: {
            getAll: () => ipcRenderer.invoke('outgoing:bills:getAll'),
            getDetails: (billId) => ipcRenderer.invoke('outgoing:bills:getDetails', billId),
            add: (billData) => ipcRenderer.invoke('outgoing:bills:add', billData),
            update: (billId, billData) => ipcRenderer.invoke('outgoing:bills:update', billId, billData),
            delete: (billId) => ipcRenderer.invoke('outgoing:bills:delete', billId)
        },
        // Legacy item operations (for backward compatibility)
        getAll: () => ipcRenderer.invoke('outgoing:getAll')
    },
    
    // Care Packages API
    carePackages: {
        // Templates
        getAllTemplates: () => ipcRenderer.invoke('carePackages:getAllTemplates'),
        getActiveTemplates: () => ipcRenderer.invoke('carePackages:getActiveTemplates'),
        getTemplate: (templateId) => ipcRenderer.invoke('carePackages:getTemplate', templateId),
        addTemplate: (template) => ipcRenderer.invoke('carePackages:addTemplate', template),
        updateTemplate: (templateId, template) => ipcRenderer.invoke('carePackages:updateTemplate', templateId, template),
        deleteTemplate: (templateId) => ipcRenderer.invoke('carePackages:deleteTemplate', templateId),
        
        // Template Items
        getTemplateItems: (templateId) => ipcRenderer.invoke('carePackages:getTemplateItems', templateId),
        addTemplateItem: (templateItem) => ipcRenderer.invoke('carePackages:addTemplateItem', templateItem),
        updateTemplateItem: (templateItemId, templateItem) => ipcRenderer.invoke('carePackages:updateTemplateItem', templateItemId, templateItem),
        deleteTemplateItem: (templateItemId) => ipcRenderer.invoke('carePackages:deleteTemplateItem', templateItemId),
        copyTemplateItems: (sourceId, targetId) => ipcRenderer.invoke('carePackages:copyTemplateItems', sourceId, targetId),
        
        // Issues
        getAllIssues: () => ipcRenderer.invoke('carePackages:getAllIssues'),
        getIssue: (issueId) => ipcRenderer.invoke('carePackages:getIssue', issueId),
        addIssue: (issue) => ipcRenderer.invoke('carePackages:addIssue', issue),
        updateIssue: (issueId, issue) => ipcRenderer.invoke('carePackages:updateIssue', issueId, issue),
        deleteIssue: (issueId) => ipcRenderer.invoke('carePackages:deleteIssue', issueId)
    },
    
    // Current Stock API
    stock: {
        getCurrent: () => ipcRenderer.invoke('stock:getCurrent'),
        getLowStock: () => ipcRenderer.invoke('stock:getLowStock'),
        getItemHistory: (itemId) => ipcRenderer.invoke('stock:getItemHistory', itemId)
    },
    
    // Database Import/Export API
    database: {
        export: () => ipcRenderer.invoke('db:export'),
        import: () => ipcRenderer.invoke('db:import')
    },

    // Reports API
    reports: {
        generatePDF: (options) => ipcRenderer.invoke('reports:generatePDF', options)
    }
});
