# Fetch Utilities

This directory contains enhanced fetch utilities that follow React Router best practices.

## Overview

Instead of globally patching `fetch`, we provide an explicit enhanced HTTP utility that handles authentication and other capabilities. This approach is more testable, debuggable, and React Router-idiomatic.

## Files

- `use-fetch.ts` - Enhanced fetch utility with authentication and extensible capabilities

## Usage

### In Loaders and Actions

```typescript
import { useFetch } from "../utils/use-fetch";

export async function loader({ params }: Route.LoaderArgs) {
  // This automatically includes Authorization header and other enhancements
  const response = await useFetch(`/api/data/${params.id}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  
  return response.json();
}
```

### Token Management

```typescript
import { setAccessToken, getAccessToken } from "../utils/use-fetch";

// Set token (from OAuth proxy)
setAccessToken("your-token");

// Get current token
const token = getAccessToken();
```

## Benefits Over Global Fetch Patching

1. **Explicit**: Clear when enhanced capabilities are being used
2. **Testable**: Easy to mock and test individual functions
3. **Debuggable**: No hidden side effects from global patching
4. **React Router Idiomatic**: Follows explicit dependency patterns
5. **Extensible**: Can easily add logging, retries, caching, and other capabilities
6. **Flexible**: Can add request/response interceptors per use case
7. **Safe**: No interference with other libraries or code

## How It Works

1. **Token Storage**: Maintains access token in memory
2. **Enhanced Function**: `useFetch()` automatically adds Authorization headers and other capabilities
3. **Environment Fallback**: Uses `ACCESS_TOKEN` from environment in development
4. **OAuth Ready**: Can receive tokens from OAuth proxy in production
5. **Extensible**: Ready for additional capabilities like logging, retries, caching, etc.

## Configuration

### Development
```bash
# In .env
ACCESS_TOKEN=your-development-token

# Run with mock mode
npm run dev:mock
```

### Production
The system is ready to receive tokens from an OAuth proxy:

```typescript
// When OAuth proxy provides token
const token = extractTokenFromRequest(request);
if (token) {
  setAccessToken(token);
}
```

## API Reference

### `useFetch(input, init?): Promise<Response>`
Enhanced fetch that automatically adds Authorization headers and other capabilities.

### `setAccessToken(token: string): void`
Sets the current access token.

### `getAccessToken(): string | null`
Returns the current access token.

### `initializeFetch(): void`
Initializes the fetch system and loads token from environment in development.

### `extractTokenFromRequest(request: Request): string | null`
Extracts access token from incoming request (for OAuth proxy integration).

## Migration from Global Fetch Patching

If you were using global fetch patching before:

```typescript
// Before: Implicit enhancements
const response = await fetch("/api/data");

// After: Explicit enhanced fetch
const response = await useFetch("/api/data");
```

## Future Capabilities

The `useFetch` function is designed to be extended with additional capabilities:

- **Request/Response Logging**: Automatic logging of API calls
- **Retry Logic**: Automatic retries for failed requests
- **Caching**: Response caching strategies
- **Request Deduplication**: Prevent duplicate concurrent requests
- **Rate Limiting**: Client-side rate limiting
- **Request/Response Transformation**: Automatic data transformation
- **Error Handling**: Standardized error responses
- **Metrics Collection**: Performance and usage metrics

This approach is more maintainable and follows React Router conventions while being ready for future enhancements.