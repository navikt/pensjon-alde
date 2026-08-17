import { BodyShort, Box, Detail, Heading, HStack, Label, VStack } from '@navikt/ds-react'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { AktivitetDTO, BehandlingDTO } from '~/types/behandling'
import { getServerComponent } from '~/utils/component-discovery'
import { formatDateToNorwegian } from '~/utils/date'

export interface PdfAktivitet {
  aktivitetId: number
  handlerName: string
  aktivitet: AktivitetDTO
  grunnlag: unknown
  vurdering: unknown
  begrunnelse?: string
  vurdertAvBrukerNavn: string
  vurdertAvBrukerId: string
  vurdertTidspunkt: string
}

export interface PdfInput {
  behandling: BehandlingDTO
  aktiviteter: PdfAktivitet[]
}

function HeaderField({ label, value }: { label: string; value: string | null }) {
  return (
    <VStack>
      <Detail textColor="subtle">{label}</Detail>
      <BodyShort weight="semibold">{value ?? '—'}</BodyShort>
    </VStack>
  )
}

function PdfHeader({ behandling: b }: { behandling: BehandlingDTO }) {
  const fullName = [b.fornavn, b.mellomnavn, b.etternavn].filter(Boolean).join(' ')
  return (
    <Box borderColor="neutral-subtleA" borderWidth="0 0 2 0" paddingBlock="space-16">
      <VStack gap="space-12">
        <Heading level="1" size="medium">
          {fullName || '—'}
        </Heading>
        <HStack gap="space-40">
          <HeaderField label="Fødselsnummer" value={b.fnr} />
          <HeaderField label="Fødselsdato" value={b.fodselsdato ? formatDateToNorwegian(b.fodselsdato) : null} />
          <HeaderField label="Sak" value={b.sakId != null ? String(b.sakId) : null} />
        </HStack>
      </VStack>
    </Box>
  )
}

function LockedAttesteringView({ behandling, aktiviteter }: PdfInput) {
  return (
    <VStack gap="space-40">
      <PdfHeader behandling={behandling} />
      <VStack gap="space-56">
        {aktiviteter.map((a, index) => {
          const Component = getServerComponent(a.handlerName)
          if (!Component) {
            throw new MissingComponentError([a.handlerName])
          }
          return (
            <React.Fragment key={a.aktivitetId}>
              {index > 0 && <hr className="pdf-divider" />}
              <VStack>
                <div className="component-area">
                  <div className="component">
                    <Component
                      readOnly={true}
                      grunnlag={a.grunnlag}
                      vurdering={a.vurdering}
                      aktivitet={a.aktivitet}
                      behandling={behandling}
                    />
                  </div>
                </div>

                <Box background="neutral-softA" borderWidth="1 1 1 1" marginBlock="space-16" padding="space-16">
                  <VStack gap="space-8">
                    <div>
                      <Label>Saksbehandler</Label>
                      <div>
                        {a.vurdertAvBrukerNavn} ({a.vurdertAvBrukerId})
                      </div>
                      <BodyShort textColor="subtle" size="small">
                        {formatDateToNorwegian(a.vurdertTidspunkt, { showTime: true })}
                      </BodyShort>
                    </div>
                  </VStack>
                </Box>
              </VStack>
            </React.Fragment>
          )
        })}
      </VStack>
    </VStack>
  )
}

export class MissingComponentError extends Error {
  readonly handlerNames: string[]
  constructor(handlerNames: string[]) {
    super(`Ingen komponent funnet for handlerName: ${handlerNames.join(', ')}`)
    this.name = 'MissingComponentError'
    this.handlerNames = handlerNames
  }
}

export function renderAttestering(input: PdfInput, css: string): string {
  const missing = input.aktiviteter.filter(a => !getServerComponent(a.handlerName)).map(a => a.handlerName)
  if (missing.length > 0) {
    throw new MissingComponentError([...new Set(missing)])
  }

  const router = createMemoryRouter([{ path: '*', element: <LockedAttesteringView {...input} /> }])
  const body = renderToStaticMarkup(<RouterProvider router={router} />)
  return `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8" />
<style>${css}</style>
<style>html{font-size:13px}body{margin:0;background:#fff}.pdf-root{margin:0 auto;padding:24px}.pdf-divider{border:none;border-top:1px solid var(--ax-border-neutral,#c9c2bc);margin:0}</style>
</head>
<body class="attestering">
<div class="pdf-root">${body}</div>
</body>
</html>`
}
