const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  checkUpdates: () => ipcRenderer.invoke('app:check-updates')
})
