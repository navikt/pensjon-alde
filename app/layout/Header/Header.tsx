import { CogIcon, ExternalLinkIcon, MenuGridIcon, MoonIcon, SunIcon } from '@navikt/aksel-icons'
import { ActionMenu, BodyShort, Detail, Dropdown, InternalHeader, Spacer } from '@navikt/ds-react'
import { Link, useLocation } from 'react-router'
import type { Me } from '~/types/me'

interface Props {
  me: Me
  isDarkmode: boolean
  setDarkmode: (darkmode: boolean) => void
  verdandeAktivitetUrl: string | undefined
  verdandeBehandlingUrl: string | undefined
}

export const Header = ({ me, isDarkmode, setDarkmode, verdandeAktivitetUrl, verdandeBehandlingUrl }: Props) => {
  const location = useLocation()
  const settingsUrl = `/settings?returnTo=${encodeURIComponent(location.pathname)}`

  return (
    <InternalHeader>
      <InternalHeader.Title as="h2">Pesys</InternalHeader.Title>

      <Spacer />

      <Dropdown>
        <InternalHeader.Button as={Dropdown.Toggle}>
          <MenuGridIcon style={{ fontSize: '1.5rem' }} title="Systemer og oppslagsverk" />
        </InternalHeader.Button>

        <Dropdown.Menu>
          <Dropdown.Menu.GroupedList>
            <Dropdown.Menu.GroupedList.Heading>Dokumentasjon</Dropdown.Menu.GroupedList.Heading>
            <Dropdown.Menu.GroupedList.Item
              as="a"
              target="_blank"
              href={'https://navno.sharepoint.com/sites/fag-og-ytelser-pesys/'}
            >
              Rutiner for Pesys
              <ExternalLinkIcon aria-hidden />
            </Dropdown.Menu.GroupedList.Item>
            <Dropdown.Menu.GroupedList.Item
              as="a"
              target="_blank"
              href={'https://lovdata.no/pro/#document/HJELP/nav-rettskilder'}
            >
              Rettskilder
              <ExternalLinkIcon aria-hidden />
            </Dropdown.Menu.GroupedList.Item>
          </Dropdown.Menu.GroupedList>

          {verdandeBehandlingUrl && (
            <>
              <Dropdown.Menu.Divider />

              <Dropdown.Menu.GroupedList>
                <Dropdown.Menu.GroupedList.Heading>Verdande</Dropdown.Menu.GroupedList.Heading>
                <Dropdown.Menu.GroupedList.Item as="a" target="_blank" href={verdandeBehandlingUrl}>
                  Gå til behandling
                  <ExternalLinkIcon aria-hidden />
                </Dropdown.Menu.GroupedList.Item>

                {verdandeAktivitetUrl && (
                  <Dropdown.Menu.GroupedList.Item as="a" target="_blank" href={verdandeAktivitetUrl}>
                    Gå til aktivitet
                    <ExternalLinkIcon aria-hidden />
                  </Dropdown.Menu.GroupedList.Item>
                )}
              </Dropdown.Menu.GroupedList>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>

      <ActionMenu>
        <ActionMenu.Trigger>
          <InternalHeader.UserButton name={me ? `${me.fornavn} ${me.etternavn}` : 'Bruker'} />
        </ActionMenu.Trigger>

        <ActionMenu.Content>
          <dl>
            {me?.fornavn && me?.etternavn && (
              <BodyShort as="dt" size="small">
                {me.fornavn} {me.etternavn}
              </BodyShort>
            )}

            {me?.navident && <Detail as="dd">{me.navident}</Detail>}
          </dl>

          <Dropdown.Menu.Divider />

          <ActionMenu.Item disabled={!isDarkmode} icon={<SunIcon />} onClick={() => setDarkmode(false)}>
            Bytt til lys modus
          </ActionMenu.Item>

          <ActionMenu.Item disabled={isDarkmode} icon={<MoonIcon />} onClick={() => setDarkmode(true)}>
            Bytt til mørk modus
          </ActionMenu.Item>

          <Dropdown.Menu.Divider />

          <ActionMenu.Item as={Link} to={settingsUrl} icon={<CogIcon />}>
            Innstillinger
          </ActionMenu.Item>
        </ActionMenu.Content>
      </ActionMenu>
    </InternalHeader>
  )
}
