# Beginner Bullish Scanner

A futuristic-looking beginner-friendly scanner for stocks & crypto. Add up to 10 tickers, see a mini chart, AI-ish bullish score, entry/stop/targets, and a position size calculator. Includes an **AI Suggestions** bar highlighting top picks.

> **Note:** This project ships with a **mock data provider**. Swap it for a real data provider (Polygon/Alpaca/Binance/Finnhub) before live use.

## Quick start

```bash
pnpm i   # or npm i / yarn
pnpm dev # starts Vite dev server
```

Open http://localhost:5173

## Plug in real-time data

Implement a `DataProvider` and swap it in `src/App.tsx`:

```ts
const provider: DataProvider = PolygonProvider
```

Examples and code comments live in `src/lib/data.ts` (Polygon example included).

## Electron packaging + auto-update (optional)

If you want a desktop app that auto-updates for friends:

1. Add Electron + electron-builder:
   ```bash
   pnpm add -D electron electron-builder electron-updater concurrently wait-on
   ```
2. Create an `electron/` folder with `main.ts` (BrowserWindow) and point it to Vite dev server in dev; serve `dist/` in prod.
3. Configure `electron-builder` in `package.json` with a GitHub repo and enable `publish: ["github"]` and `nsis` target on Windows.
4. In `main.ts`, use `autoUpdater.checkForUpdatesAndNotify()` from `electron-updater`.
5. CI: On each release tag, build & publish installers to GitHub Releases. Users get in-app updates.

This pattern gives you **push updates**: ship a new version → everyone gets it.

## Legal
Educational purposes only. No financial advice.

---

## Desktop app with **auto-updates** (Electron)

### 1) Install tooling
```bash
npm i -D electron electron-builder electron-updater concurrently wait-on cross-env
```

### 2) Dev run (desktop)
```bash
npm run dev:app
```
This launches Vite and an Electron window that loads it.

### 3) Build installers
```bash
# Build web + Electron and create installers in dist/
npm run build:app
```

You will get Windows (NSIS), macOS (DMG), and Linux (AppImage) artifacts by default (can be changed in `package.json > build`).

### 4) Turn on **auto-update** via GitHub Releases
- Create a GitHub repo and push your project.
- Generate a **Personal Access Token** (classic, repo scope) and set env var `GH_TOKEN` when running `npm run release`.
- Run:
```bash
GH_TOKEN=YOUR_TOKEN npm run release
```
This builds and **publishes** installers to GitHub Releases. The app uses `electron-updater` to check `publish: { provider: "github" }`, so your friends will automatically get updates once they install any released version.

> Tip: For private repos, make sure the token has permission and the repo visibility matches what you expect.

### Code signing
- **Windows**: not required for local testing; recommended for distribution (EV cert optional but helps SmartScreen).
- **macOS**: notarization required to avoid Gatekeeper prompts. See electron-builder docs (`APPLEID`, `APPLEIDPASS`, `CSC_LINK`).

### Optional: “Check for Updates” button in UI
We exposed a `desktop.checkUpdates()` API in `preload.ts`. From React you can call:
```ts
// @ts-ignore
window.desktop?.checkUpdates?.().then(console.log)
```
