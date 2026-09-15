import type { LoaderFunctionArgs } from 'react-router'
import { fetchOpptjeningstyper } from '~/api/opptjeningstyper-api.server'

export async function loader({ request }: LoaderFunctionArgs) {
  return fetchOpptjeningstyper(request)
}
