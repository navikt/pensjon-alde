import type { AktivitetComponentProps } from '~/types/aktivitet-component'

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
const componentMap = new Map<string, React.ComponentType<AktivitetComponentProps<any, any>>>()

// Process all discovered modules
Object.entries(aktivitetModules).forEach(([path, module]) => {
  const { handlerName } = parseModulePath(path)

  // Extract Component export from the module
  const component = (module as any)?.Component

  if (component && typeof component === 'function') {
    componentMap.set(handlerName, component as React.ComponentType<AktivitetComponentProps<any, any>>)
  }
})

// Get all server components (synchronous since they're eagerly loaded)
export const getAllServerComponents = (): Map<string, React.ComponentType<AktivitetComponentProps<any, any>>> => {
  return componentMap
}

// Get server-loaded component
export const getServerComponent = (
  handlerName: string,
): React.ComponentType<AktivitetComponentProps<any, any>> | null => {
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
