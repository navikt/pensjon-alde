import { join } from 'node:path'
import type { Plugin } from 'vite'

// The aktivitet route modules eagerly imported by component-discovery pull in
// server-only modules. Importing them is harmless EXCEPT for the two that have
// import-time side effects:
//   - env.server     -> loadEnv() -> process.exit(1) on missing env
//   - unleash.server -> constructs an Unleash client + network fetch
// The PDF runtime only renders the exported Component, so redirect every import
// form (~ alias, relative path, with/without .ts) of those modules to a stub.
const STUBBED = ['env.server', 'unleash.server'] as const

export function stubServerModules(stubsDir: string): Plugin {
  return {
    name: 'pdf-stub-server-modules',
    enforce: 'pre',
    resolveId(source) {
      if (source.includes('/pdf/stubs/')) return null
      for (const name of STUBBED) {
        if (new RegExp(`(^|/)(utils/)?${name}(\\.ts)?$`).test(source)) {
          return join(stubsDir, `${name}.ts`)
        }
      }
      return null
    },
  }
}
