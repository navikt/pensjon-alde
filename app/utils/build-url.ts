type ExtractPathParams<T extends string> = T extends `${string}{${infer Param}}${infer Rest}`
  ? Param | ExtractPathParams<Rest>
  : never

export function buildUrl<T extends string>(
  template: T,
  params: Record<ExtractPathParams<T>, string | number>,
  request?: Request,
): string {
  const subdomain = request ? subdomainHelper(request) : 'intern'
  let url = template as string
  for (const [key, value] of Object.entries({ params, ...{ subdomain } })) {
    url = url.replace(`{${key}}`, encodeURIComponent(String(value)))
  }
  return url
}

function subdomainHelper(request: Request): string {
  const url = new URL(request.url)
  return url.hostname.includes('ansatt') ? 'ansatt' : 'intern'
}
