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
    
    // Incoming Stock API
    incoming: {
        getAll: () => ipcRenderer.invoke('incoming:getAll'),
        add: (stock) => ipcRenderer.invoke('incoming:add', stock),
        update: (grnId, stock) => ipcRenderer.invoke('incoming:update', grnId, stock),
        delete: (grnId) => ipcRenderer.invoke('incoming:delete', grnId)
    },
    
    // Donations API
    donations: {
        getAll: () => ipcRenderer.invoke('donations:getAll'),
        add: (donation) => ipcRenderer.invoke('donations:add', donation),
        update: (donationId, donation) => ipcRenderer.invoke('donations:update', donationId, donation),
        delete: (donationId) => ipcRenderer.invoke('donations:delete', donationId)
    },
    
    // Outgoing Stock API
    outgoing: {
        getAll: () => ipcRenderer.invoke('outgoing:getAll'),
        add: (stock) => ipcRenderer.invoke('outgoing:add', stock),
        update: (dispatchId, stock) => ipcRenderer.invoke('outgoing:update', dispatchId, stock),
        delete: (dispatchId) => ipcRenderer.invoke('outgoing:delete', dispatchId)
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
