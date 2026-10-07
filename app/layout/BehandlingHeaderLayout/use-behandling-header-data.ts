import { useRouteLoaderData } from 'react-router'
import type { loader } from '.'

export function useBehandlingHeaderData() {
  const data = useRouteLoaderData<typeof loader>('BehandlingHeaderLayout')
  if (!data) throw new Error('BehandlingHeaderLayout loader data not found')
  return data
}
