const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  checkUpdates: () => ipcRenderer.invoke('app:check-updates'),
  fetchJson: (url) => ipcRenderer.invoke('net:json', url),
  onUpdateStatus: (cb) => {
    const handler = (_evt, payload) => {
      try { cb && cb(payload) } catch {}
    }
    ipcRenderer.on('app:update-status', handler)
    return () => ipcRenderer.off('app:update-status', handler)
  }
})
