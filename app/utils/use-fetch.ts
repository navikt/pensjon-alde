// Standard Fetch Utility for React Router
// Provides enhanced HTTP requests with authentication and other capabilities

// Store for the current access token
let currentAccessToken: string | null = null;

/**
 * Set the access token (from OAuth proxy or environment)
 */
export function setAccessToken(token: string): void {
  currentAccessToken = token;
}

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  return currentAccessToken;
}

/**
 * Initialize token from environment variable (development)
 */
export function initializeTokenFromEnv(): void {
  const envToken = process.env.ACCESS_TOKEN;
  if (envToken) {
    setAccessToken(envToken);
    console.log("🔐 Access token initialized from environment");
  }
}

/**
 * Enhanced fetch function with automatic authentication and other capabilities
 * Use this instead of regular fetch in loaders and actions
 */
export async function useFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const token = getAccessToken();

  // Ensure init object exists
  const modifiedInit: RequestInit = init || {};

  // Ensure headers object exists
  const headers = new Headers(modifiedInit.headers);

  // Add Authorization header if token is available and not already present
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Add default Content-Type if not present
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Update the init object with modified headers
  modifiedInit.headers = headers;

  return fetch(input, modifiedInit);
}

/**
 * Initialize the fetch system
 */
export function initializeFetch(): void {
  // Initialize from environment in development
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "mock"
  ) {
    initializeTokenFromEnv();
  }

  console.log("🔐 Fetch system initialized");
}

/**
 * Extract token from incoming request (for OAuth proxy integration)
 */
export function extractTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}
