const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('node:path')
const { autoUpdater } = require('electron-updater')

let win = null

function createWindow () {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0b1220',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  // Dev server URL is injected by script during dev
  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    win.loadURL(devServerUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.on('ready', async () => {
  createWindow()
  // Auto update checks: on start and every 30 minutes
  autoUpdater.autoDownload = true
  try {
    await autoUpdater.checkForUpdatesAndNotify()
  } catch (e) {
    // ignore errors silently in dev/offline
  }
  setInterval(()=>autoUpdater.checkForUpdates().catch(()=>{}), 30*60*1000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// IPC for "Check for updates" menu/button if you add one later
ipcMain.handle('app:check-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    return { ok: true, version: app.getVersion(), updateInfo: result?.updateInfo }
  } catch (e:any) {
    return { ok: false, error: e?.message || String(e) }
  }
})
