import { useRouteLoaderData } from 'react-router'
import type { loader } from './BehandlingHeaderLayout'

export function useBehandlingHeaderData() {
  const data = useRouteLoaderData<typeof loader>('layout/BehandlingHeaderLayout/BehandlingHeaderLayout')
  if (!data) throw new Error('BehandlingHeaderLayout loader data not found')
  return data
}
