# API Mocking System

This directory contains the API mocking setup using MSW (Mock Service Worker) for server-side rendering.

## How It Works

The mocking system intercepts HTTP requests made by your server-side code (like in React Router loaders) and returns mock data instead of making real API calls. It uses MSW v2.10.5 and only runs on the server side to avoid bundling issues. The system can be enabled via environment variables or by using the dedicated mock development mode.

## Setup

### Method 1: Mock Development Mode (Recommended)
1. **Run with mock mode**: `npm run dev:mock`
2. **Automatic initialization**: Mocking is automatically initialized in `root.tsx` when `NODE_ENV=mock`

### Method 2: Environment Variable
1. **Environment Variable**: Set `ENABLE_MOCKING=true` in your `.env` file to enable mocking
2. **Run normally**: `npm run dev`

### Common Setup
- **Server-Side Only**: Mocking only runs on the server side and is automatically initialized globally
- **Mock Data**: Add JSON files to the `data/` directory to provide mock responses

## Adding Mock Data

### File Naming Convention

Mock data files should be named based on the API endpoint:

- `behandling-{id}.json` - Specific mock for behandling with ID
- `behandling-default.json` - Fallback mock for any behandling ID
- Add more endpoints as needed

### Example: Adding Mock Data for Behandling ID 456

Create a file `data/behandling-456.json`:

```json
{
  "behandlingId": 456,
  "type": "FORSTEGANGSSOKNAD",
  "status": "OPPRETTET",
  "prioritet": "LAV",
  "uuid": "your-uuid-here",
  // ... rest of your mock data
}
```

### Adding New API Endpoints

To mock a new API endpoint, edit `server.ts` and add a new handler:

```typescript
// Example: GET /api/sak/:id
http.get("/api/sak/:id", ({ params }) => {
  const { id } = params;
  const mockData = loadMockData(`sak-${id}.json`);
  
  if (mockData) {
    return HttpResponse.json(mockData);
  }
  
  return HttpResponse.text("Sak not found", { status: 404 });
}),
```

Then create corresponding mock data files in the `data/` directory.

## Configuration

### Environment Variables

- `NODE_ENV=mock` - Enables mocking (used by `npm run dev:mock`)
- `ENABLE_MOCKING=true` - Alternative way to enable mocking
- `NODE_ENV=development` - Automatically enables mocking in development

### Manual Control

You can manually control mocking in your code:

```typescript
import { startMocking, stopMocking, initializeMocking } from "./mocks";

// Initialize mocking (done automatically in root.tsx for NODE_ENV=mock)
initializeMocking();

// Or manually start/stop
await startMocking();
stopMocking();
```

## Current Mock Endpoints

- `GET /api/behandling/:id` - Returns behandling data
  - Uses `behandling-{id}.json` if available
  - Falls back to `behandling-default.json`
  - Returns 404 if no mock data found

## Development Workflow

### Using Mock Mode (Recommended)
1. **Start with mocking**: `npm run dev:mock`
2. **Check mocking is enabled**: Look for "🔧 MSW server started - API mocking enabled" in console
3. **Add mock data**: Create JSON files in `data/` directory
4. **Test your routes**: Navigate to routes that use the API (e.g., `/behandling/123`)

### Using Environment Variable
1. **Set environment**: Add `ENABLE_MOCKING=true` to `.env`
2. **Start the app**: `npm run dev`
3. **Follow steps 2-4 above**

## Troubleshooting

### Mocking Not Working

1. **For mock mode**: Ensure you're running `npm run dev:mock`
2. **For env variable**: Check that `ENABLE_MOCKING=true` in your `.env` file
3. **Check console**: Look for "🔧 MSW server started - API mocking enabled" message
4. **Verify setup**: Mocking is automatically initialized in `root.tsx` when conditions are met
5. **Server-side only**: Ensure you're running on the server side (not client-side code)

### Mock Data Not Loading

1. Verify JSON file names match the expected pattern
2. Check JSON syntax is valid
3. Look for error messages in console about file loading

### Real API Calls Still Happening

1. Ensure the URL pattern in `server.ts` matches your API calls
2. Check that the mock server is intercepting the correct domain/path
3. Verify MSW is started before the API call is made

## Best Practices

1. **Use mock mode for development**: `npm run dev:mock` provides a clean mock environment
2. **Keep mock data realistic**: Use data that matches your actual API responses
3. **Version control mock data**: Check in your JSON files so team members have consistent data
4. **Update mocks with API changes**: Keep mock data in sync with actual API schema
5. **Use specific mocks for testing**: Create targeted mock data for specific test scenarios
6. **Server-side only**: MSW is automatically imported only on the server side to avoid build issues