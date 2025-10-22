import { join } from 'node:path'
import { index, type RouteConfig, type RouteConfigEntry, route } from '@react-router/dev/routes'
import { glob } from 'glob'

// Dynamically discover all behandlinger and their aktiviteter
function discoverBehandlingRoutes(): RouteConfigEntry[] {
  const behandlingerPath = join(process.cwd(), 'app/behandlinger')
  const routes: RouteConfigEntry[] = []

  const behandlingFolders = glob.sync('*/', { cwd: behandlingerPath })

  for (const behandlingFolder of behandlingFolders) {
    const behandlingName = behandlingFolder.replace('/', '')
    const behandlingPath = join(behandlingerPath, behandlingName)

    const aktivitetFolders = glob.sync('*/', { cwd: behandlingPath })

    for (const aktivitetFolder of aktivitetFolders) {
      const aktivitetName = aktivitetFolder.replace('/', '')

      const indexPath = join(behandlingPath, aktivitetName, 'index.tsx')
      const hasIndex = glob.sync(indexPath).length > 0

      if (hasIndex) {
        routes.push(
          route(`${behandlingName}/${aktivitetName}`, `behandlinger/${behandlingName}/${aktivitetName}/index.tsx`),
        )
      }
    }
  }

  return routes
}

// Generate routes dynamically at build time
const dynamicAktivitetRoutes = discoverBehandlingRoutes()

export default [
  index('routes/home.tsx'),
  route('/auth/callback', './auth/callback.tsx'),
  route('/auth/microsoft', './auth/microsoft.tsx'),
  route('/settings', 'routes/settings.tsx'),

  route('/behandling/:behandlingId', 'routes/behandling/$behandlingId.tsx', [
    route('oppsummering', 'routes/behandling/$behandlingId/oppsummering/index.tsx'),
    route('attestering', 'routes/behandling/$behandlingId/attestering/index.tsx'),
    route('avbrutt-manuelt', 'routes/behandling/$behandlingId/avbrutt-manuelt/index.tsx'),
    route('avbrutt-automatisk', 'routes/behandling/$behandlingId/avbrutt-automatisk/index.tsx'),
    route('venter-attestering', 'routes/behandling/$behandlingId/venter-attestering/index.tsx'),
    route('attestert-og-iverksatt', 'routes/behandling/$behandlingId/attestert-og-iverksatt/index.tsx'),

    // The main aktivitet route that handles redirection to the correct implementation
    route(
      'aktivitet/:aktivitetId',
      'routes/behandling/$behandlingId/aktivitet/$aktivitetId.tsx',
      dynamicAktivitetRoutes,
    ),
  ]),
] satisfies RouteConfig
