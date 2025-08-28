import fs from 'node:fs'
import path from 'node:path'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

// Function to load mock data from JSON files
function loadMockData(filename: string) {
  try {
    const filePath = path.join(process.cwd(), 'app', 'mocks', 'data', filename)
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.warn(`Could not load mock data from ${filename}:`, error)
    return null
  }
}

// Define handlers for API endpoints
const handlers = [
  // GET /api/behandling/:id - match any host
  http.get(
    '*/api/saksbehandling/alde/behandling/:id',
    ({ params, request }) => {
      const { id } = params
      console.log(`🎯 MSW intercepted request to: ${request.url}`)

      const mockData = loadMockData(`behandling-${id}.json`)

      if (mockData) {
        console.log(`📄 Returning specific mock data for ID: ${id}`)
        return HttpResponse.json(mockData)
      }

      // Fallback to default mock data if specific file doesn't exist
      const defaultData = loadMockData('behandling-default.json')
      if (defaultData) {
        console.log(`📄 Returning default mock data for ID: ${id}`)
        // Replace the ID in the default data
        return HttpResponse.json({
          ...defaultData,
          behandlingId: parseInt(id as string, 10)
        })
      }

      // Return 404 if no mock data found
      console.log(`❌ No mock data found for ID: ${id}`)
      return HttpResponse.text('Behandling not found', { status: 404 })
    }
  )

  // You can add more API endpoints here
  // Example: http.get("*/api/other-endpoint", ...),
]

// Create and export the server
export const server = setupServer(...handlers)

// Function to start mocking (call this in your app setup)
export function startMocking() {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.ENABLE_MOCKING === 'true'
  ) {
    server.listen({
      onUnhandledRequest: 'bypass' // Allow real network requests for non-mocked endpoints
    })
    console.log('🔧 MSW server started - API mocking enabled')
    console.log('🎯 Registered handlers:')
    console.log(`   - GET */api/behandling/:id`)
  }
}

// Function to stop mocking
export function stopMocking() {
  server.close()
}
