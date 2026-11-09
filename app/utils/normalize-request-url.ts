/**
 * Fjerner React Router-interne detaljer fra en request-URL.
 *
 * I React Router 8 er `request.url` den rå URL-en. Ved klientnavigasjon er det en
 * single fetch-request med `.data`-suffiks (f.eks. `/behandling/1/aktivitet/2.data`,
 * `/_root.data` eller `/a/b/_.data`) og eventuelt `index`/`_routes` i query.
 * I loaders/actions/middleware bør `url`-argumentet brukes, men der vi bare har
 * `request` (f.eks. ved redirect til innlogging) må vi normalisere selv.
 */
export function normalizeRequestUrl(requestUrl: string | URL): URL {
  const url = new URL(requestUrl)

  if (url.pathname === '/_root.data') {
    url.pathname = '/'
  } else if (url.pathname.endsWith('/_.data')) {
    url.pathname = url.pathname.slice(0, -'_.data'.length)
  } else if (url.pathname.endsWith('.data')) {
    url.pathname = url.pathname.slice(0, -'.data'.length)
  }

  url.searchParams.delete('_routes')
  if (url.searchParams.get('index') === '') {
    url.searchParams.delete('index')
  }

  return url
}
