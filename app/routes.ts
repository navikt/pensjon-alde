import { index, type RouteConfig, type RouteConfigEntry, route } from '@react-router/dev/routes'
import { glob } from 'glob'
import { join } from 'path'

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

  route('/behandling/:behandlingId', 'routes/behandling/$behandlingId.tsx', [
    // The main aktivitet route that handles redirection to the correct implementation
    route(
      'aktivitet/:aktivitetId',
      'routes/behandling/$behandlingId/aktivitet/$aktivitetId.tsx',
      dynamicAktivitetRoutes,
    ),
  ]),
] satisfies RouteConfig
