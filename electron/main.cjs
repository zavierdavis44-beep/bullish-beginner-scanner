const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('node:path')
const { autoUpdater } = require('electron-updater')
const https = require('node:https')

let win = null
let splash = null

function createWindow () {
  // Splash window
  splash = new BrowserWindow({
    width: 380,
    height: 220,
    frame: false,
    transparent: false,
    resizable: false,
    backgroundColor: '#0b1220',
    alwaysOnTop: true,
  })
  try { splash.loadFile(path.join(__dirname, 'splash.html')) } catch {}

  // Main window
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0b1220',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

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

  // Show main and close splash once ready
  win.once('ready-to-show', () => {
    try { win.show() } catch {}
    try { splash?.close(); splash = null } catch {}
  })
}

app.on('ready', async () => {
  createWindow()
  // Enable background download and silent install on availability
  autoUpdater.autoDownload = true
  // Some GitHub endpoints require explicit Accept/User-Agent to avoid 406
  try {
    autoUpdater.requestHeaders = Object.assign({}, autoUpdater.requestHeaders || {}, {
      'User-Agent': 'THE-ZAi-Updater',
      // Prefer HTML endpoints GitHub expects for /releases/latest redirects, but allow Atom/API too
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/atom+xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br'
    })
  } catch {}
  // Try a robust "generic" feed fallback that points directly at latest.yml
  try {
    const owner = 'zavierdavis44-beep'
    const repo = 'bullish-beginner-scanner'
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: { 'User-Agent': 'THE-ZAi-Updater', 'Accept': 'application/vnd.github+json' }
    })
    if (res.ok){
      const json = await res.json()
      const tag = json?.tag_name
      if (tag && typeof tag === 'string'){
        const base = `https://github.com/${owner}/${repo}/releases/download/${tag}`
        try { autoUpdater.setFeedURL({ provider: 'generic', url: base }) } catch {}
      }
    }
  } catch {}
  try { await autoUpdater.checkForUpdates().catch(()=>{}) } catch {}
  setInterval(()=>autoUpdater.checkForUpdates().catch(()=>{}), 30*60*1000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('app:check-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates()
    return { ok: true, version: app.getVersion(), updateInfo: result?.updateInfo }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
})

// Simple JSON fetch via main process to avoid CORS in renderer
ipcMain.handle('net:json', async (_evt, url) => {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('HTTP '+res.status)
    return await res.json()
  } catch (e) {
    return { __error: true, message: e?.message || String(e) }
  }
})

// Update lifecycle: auto-download and restart once ready
autoUpdater.on('update-available', () => {
  try { win?.webContents.send('app:update-status', { status: 'available' }) } catch {}
})
autoUpdater.on('download-progress', (p) => {
  try { win?.webContents.send('app:update-status', { status: 'downloading', progress: p?.percent||0 }) } catch {}
})
autoUpdater.on('update-downloaded', () => {
  try { win?.webContents.send('app:update-status', { status: 'ready' }) } catch {}
  // Install silently and relaunch app (Windows NSIS supports silent run-after)
  try { autoUpdater.quitAndInstall(true, true) } catch {}
})
autoUpdater.on('error', (err) => {
  try { win?.webContents.send('app:update-status', { status: 'error', message: err?.message||String(err) }) } catch {}
})
