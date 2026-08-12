import type { AktivitetComponentProps } from '~/types/aktivitet-component'

// biome-ignore lint/suspicious/noExplicitAny: Komponentregisteret er heterogent — grunnlag/vurdering-typene er ukjente her
type AnyAktivitetComponent = React.ComponentType<AktivitetComponentProps<any, any>>

export interface ComponentRegistryEntry {
  handlerName: string
  behandlingName: string
  aktivitetName: string
  path: string
}

// Use import.meta.glob with eager loading to get components at build time
// This works on both server and client because it's resolved at build time
const aktivitetModules = import.meta.glob('/app/behandlinger/**/*/index.tsx', {
  eager: true,
})

// Parse the discovered modules to extract behandling and aktivitet names
const parseModulePath = (modulePath: string) => {
  // Path format: /app/behandlinger/{behandlingName}/{aktivitetName}/index.tsx
  const pathParts = modulePath.split('/')
  const behandlingName = pathParts[3] // alderspensjon-soknad
  const aktivitetName = pathParts[4] // vurder-samboer

  return {
    behandlingName,
    aktivitetName,
    handlerName: aktivitetName, // handler name matches aktivitet folder name
    path: modulePath,
  }
}

// Create component map from discovered modules
const componentMap = new Map<string, AnyAktivitetComponent>()

// Process all discovered modules
Object.entries(aktivitetModules).forEach(([path, module]) => {
  const { handlerName } = parseModulePath(path)

  // Extract Component export from the module
  const component = (module as { Component?: AnyAktivitetComponent }).Component

  if (component && typeof component === 'function') {
    componentMap.set(handlerName, component)
  }
})

// Get all server components (synchronous since they're eagerly loaded)
export const getAllServerComponents = (): Map<string, AnyAktivitetComponent> => {
  return componentMap
}

// Get server-loaded component
export const getServerComponent = (handlerName: string): AnyAktivitetComponent | null => {
  return componentMap.get(handlerName) || null
}

// Get available component metadata
export const getAvailableComponents = (): ComponentRegistryEntry[] => {
  return Object.keys(aktivitetModules).map(path => {
    const { behandlingName, aktivitetName, handlerName } = parseModulePath(path)
    return {
      handlerName,
      behandlingName,
      aktivitetName,
      path,
    }
  })
}

// Helper to check if a handler has a server component
export const hasServerComponent = (handlerName: string): boolean => {
  return componentMap.has(handlerName)
}

// Get list of all available handler names
export const getServerComponentNames = (): string[] => {
  return Array.from(componentMap.keys())
}
