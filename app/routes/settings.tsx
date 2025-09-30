import { CogIcon } from '@navikt/aksel-icons'
import { Button, Checkbox, CheckboxGroup, Heading, Page, VStack } from '@navikt/ds-react'
import { Form, redirect } from 'react-router'
import { settingsContext } from '~/context/settings-context'
import { serializeSettings } from '~/middleware/settings'
import type { Route } from './+types/settings'

export function meta() {
  return [{ title: 'Innstillinger' }, { name: 'description', content: 'Applikasjonsinnstillinger' }]
}

export async function loader({ context }: Route.LoaderArgs) {
  const settings = context.get(settingsContext)
  return { settings }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()

  const settings = {
    showStepper: formData.has('showStepper'),
    showMetadata: formData.has('showMetadata'),
  }

  const cookieHeader = serializeSettings(settings)

  const url = new URL(request.url)
  const returnTo = url.searchParams.get('returnTo') || '/'

  return redirect(returnTo, {
    headers: {
      'Set-Cookie': cookieHeader,
    },
  })
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { settings } = loaderData

  return (
    <Page>
      <Page.Block width="xl" gutters>
        <VStack gap="8">
          <Heading level="1" size="large">
            Innstillinger
          </Heading>

          <Form method="post">
            <VStack gap="6">
              <CheckboxGroup legend="Visningsinnstillinger">
                <Checkbox name="showStepper" value="showStepper" defaultChecked={settings.showStepper}>
                  Vis stegvelger
                </Checkbox>
                <Checkbox name="showMetadata" value="showMetadata" defaultChecked={settings.showMetadata}>
                  Vis metadata
                </Checkbox>
              </CheckboxGroup>

              <Button type="submit" variant="primary" icon={<CogIcon aria-hidden />}>
                Lagre
              </Button>
            </VStack>
          </Form>
        </VStack>
      </Page.Block>
    </Page>
  )
}
