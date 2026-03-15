// Check if we're running on the server side
/** biome-ignore-all lint/suspicious/noExplicitAny: Will add types soon */
const isServer = typeof window === 'undefined'

let server: any = null
let isInitializing = false
let isInitialized = false

// Function to check if mocking should be enabled
function shouldEnableMocking(): boolean {
  return (
    isServer &&
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'mock' || process.env.ENABLE_MOCKING === 'true')
  )
}

// Async function to start mocking
export async function startMocking() {
  if (!shouldEnableMocking()) {
    return
  }

  if (isInitialized) {
    console.log('🔧 MSW server already running')
    return
  }

  if (isInitializing) {
    console.log('🔧 MSW server is already initializing, waiting...')
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    return
  }

  isInitializing = true

  try {
    // Polyfill localStorage for MSW's CookieStore in Vite SSR
    if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
      const store = new Map<string, string>()
      globalThis.localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        get length() {
          return store.size
        },
        key: (index: number) => [...store.keys()][index] ?? null,
      }
    }

    // Dynamically import MSW only on server side
    const { server: mswServer } = await import('./server.js')
    server = mswServer

    server.listen({
      onUnhandledRequest: 'bypass', // Allow real network requests for non-mocked endpoints
    })

    console.log('🔧 MSW server started - API mocking enabled')
    console.log('🎯 Registered handlers:')
    console.log(`   - GET */api/behandling/:id`)

    // Small delay to ensure MSW is fully ready
    await new Promise(resolve => setTimeout(resolve, 100))

    isInitialized = true

    // Gracefully stop mocking on process exit
    process.on('SIGTERM', stopMocking)
    process.on('SIGINT', stopMocking)
    process.on('beforeExit', stopMocking)
  } catch (error) {
    console.warn('Failed to start MSW server:', error)
  } finally {
    isInitializing = false
  }
}

// Function to stop mocking
export function stopMocking() {
  if (server) {
    server.close()
    server = null
    isInitialized = false
    isInitializing = false
  }
}

// Initialize mocking if conditions are met
export async function initializeMocking() {
  if (shouldEnableMocking()) {
    await startMocking()
  }
}

// Note: Auto-initialization removed to avoid conflicts with loader initialization
// MSW will be initialized when initializeMocking() is called from loaders
