const VERSION_CHECK_INTERVAL = 60000 // Check every 60 seconds
const VERSION_KEY = 'app_version'

interface VersionInfo {
  version: string
  buildTime: string
}

let checkInterval: ReturnType<typeof setInterval> | null = null

async function fetchVersion(): Promise<VersionInfo | null> {
  try {
    // Add cache-busting query param
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

function getStoredVersion(): string | null {
  return localStorage.getItem(VERSION_KEY)
}

function setStoredVersion(version: string): void {
  localStorage.setItem(VERSION_KEY, version)
}

async function checkForUpdate(): Promise<void> {
  const serverVersion = await fetchVersion()
  if (!serverVersion) return

  const storedVersion = getStoredVersion()

  if (!storedVersion) {
    // First visit, store current version
    setStoredVersion(serverVersion.version)
    return
  }

  if (storedVersion !== serverVersion.version) {
    console.log(`New version detected: ${storedVersion} -> ${serverVersion.version}`)
    
    // Store new version before reload to prevent reload loop
    setStoredVersion(serverVersion.version)
    
    // Force reload - bypass cache
    window.location.reload()
  }
}

export function startVersionChecker(): void {
  // Check immediately on start
  checkForUpdate()

  // Then check periodically
  checkInterval = setInterval(checkForUpdate, VERSION_CHECK_INTERVAL)

  // Also check when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdate()
    }
  })

  // Check on window focus
  window.addEventListener('focus', () => {
    checkForUpdate()
  })
}

export function stopVersionChecker(): void {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
}
