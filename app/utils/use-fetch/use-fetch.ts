// Standard Fetch Utility for React Router
// Provides enhanced HTTP requests with authentication and other capabilities

// Prevent client-side usage
import {requireAccessToken} from "~/auth/auth.server";
import {data} from "react-router";

function checkServerSideOnly(functionName: string): void {
  if (typeof window !== "undefined") {
    throw new Error(
      `${functionName} is server-side only and cannot be used in the browser. ` +
        "This utility is designed for loaders and actions only.",
    );
  }
}

// Store for the current access token
let currentAccessToken: string | null = null;

/**
 * Set the access token (from OAuth proxy or environment)
 */
export function setAccessToken(token: string): void {
  checkServerSideOnly("setAccessToken");
  currentAccessToken = token;
}

/**
 * Initialize token from environment variable (development)
 */
export function initializeTokenFromEnv(): void {
  checkServerSideOnly("initializeTokenFromEnv");
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
  request: Request,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  checkServerSideOnly("useFetch");
  const startTime = Date.now();
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const method = init?.method || "GET";

  // Ensure init object exists
  const modifiedInit: RequestInit = init || {};

  // Ensure headers object exists
  const headers = new Headers(modifiedInit.headers);

  const token = await requireAccessToken(request)

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

  // Log request details
  console.log(`🌐 [${method}] ${url}`);

  if (modifiedInit.body) {
    try {
      const bodyContent =
        typeof modifiedInit.body === "string"
          ? modifiedInit.body
          : modifiedInit.body instanceof FormData
            ? "[FormData]"
            : "[Binary Data]";
      console.log(`📦 Request body:`, bodyContent);
    } catch (error) {
      console.log(`📦 Request body: [Unable to log body]`);
    }
  }

  try {
    const response = await fetch(input, modifiedInit);
    const duration = Date.now() - startTime;

    // Log response details
    console.log(`📥 [${response.status}] ${url} (${duration}ms)`);
    console.log(
      `📋 Response headers:`,
      Object.fromEntries(response.headers.entries()),
    );

    if (!response.ok) {
      console.warn(
        `⚠️ Request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${method}] ${url} failed (${duration}ms):`, error);
    throw error;
  }
}

export async function useFetch2<T>(
  request: Request,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await useFetch(request, input, init);
  if (!res.ok) {
    await normalizeAndThrow(res, `Feil ved GET ${input}`)
  }
  return (await res.json()) as T
}

/**
 * Initialize the fetch system
 */
export function initializeFetch(): void {
  checkServerSideOnly("initializeFetch");
  // Initialize from environment in development
  console.log("NODE_ENV", process.env.NODE_ENV);
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "mock"
  ) {
    initializeTokenFromEnv();
  }

  console.log("🔐 Fetch system initialized");
}

export type NormalizedError = {
  status: number
  title?: string
  message?: string
  detail?: string
  path?: string
  timestamp?: string
  trace?: string
  raw?: unknown // original body (for logging)
}

export async function normalizeAndThrow(
  response: Response,
  fallbackTitle = 'En uventet feil oppstod',
): Promise<never> {
  const ct = response.headers.get('content-type') || ''

  let body: unknown = undefined
  try {
    if (ct.includes('application/json')) {
      body = await response.json()
    } else {
      const text = await response.text()
      body = text?.length ? text : undefined
    }
  } catch {
    /* ignorer parse-feil */
  }

  const normalized = normalizeErrorBody(response, body, fallbackTitle)

  // I RR7 framework mode kan vi trygt kaste data(...)
  throw data(normalized, {
    status: normalized.status,
    statusText: normalized.title,
  })
}

function normalizeErrorBody(
  response: Response,
  body: unknown,
  fallbackTitle: string,
): NormalizedError {
  // Ren tekst → putt som detail
  if (typeof body === 'string') {
    return {
      status: response.status,
      title: response.statusText || fallbackTitle,
      detail: body,
      raw: body,
    }
  }

  // Spring Boot standard error-body
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    const status =
      (typeof b.status === 'number' ? b.status : undefined) ??
      response.status
    const title =
      (typeof b.error === 'string' ? b.error : undefined) ||
      response.statusText ||
      fallbackTitle

    return {
      status,
      title,
      message: typeof b.message === 'string' ? b.message : undefined,
      detail: typeof b.detail === 'string' ? b.detail : undefined,
      path: typeof b.path === 'string' ? b.path : undefined,
      timestamp:
        typeof b.timestamp === 'string' ? b.timestamp : undefined,
      trace: typeof b.trace === 'string' ? b.trace : undefined,
      raw: body,
    }
  }

  // Fallback
  return {
    status: response.status,
    title: response.statusText || fallbackTitle,
    raw: body,
  }
}
