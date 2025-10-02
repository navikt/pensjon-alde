import { CheckmarkCircleIcon } from '@navikt/aksel-icons'
import { Button, Heading, HStack, VStack } from '@navikt/ds-react'
import { redirect, useNavigate } from 'react-router'
import type { Route } from './+types'

export const loader = ({ params }: Route.LoaderArgs) => {
  const { behandlingId } = params
  return { behandlingId }
}

export const action = async ({ params }: Route.ActionArgs) => {
  const { behandlingId } = params
  return redirect(`/behandling/${behandlingId}/oppsummering`)
}

const Avbrutt = ({ loaderData }: Route.ComponentProps) => {
  const { behandlingId } = loaderData
  const navigate = useNavigate()
  return (
    <VStack gap="8">
      <Heading size="medium" level="1">
        <HStack align="center">
          <CheckmarkCircleIcon />
          Sendt til attestering
        </HStack>
      </Heading>

      <VStack width="10em" gap="3">
        <Button size="small" onClick={() => console.log}>
          Til Oppgaveoversikt
        </Button>

        <Button size="small" variant="secondary" onClick={() => navigate(`/behandling/${behandlingId}/oppsummering`)}>
          Se Oppsummering
        </Button>
      </VStack>
    </VStack>
  )
}

export default Avbrutt
