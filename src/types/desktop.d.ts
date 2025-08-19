export {}

declare global {
  interface Window {
    desktop?: {
      checkUpdates?: () => Promise<{
        ok: boolean
        version?: string
        updateInfo?: any
        error?: string
      }>
    }
  }
}

