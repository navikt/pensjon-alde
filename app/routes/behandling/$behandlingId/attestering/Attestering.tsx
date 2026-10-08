import { ArrowDownIcon, NewspaperIcon } from '@navikt/aksel-icons'
import { BodyShort, Box, Button, Heading, HStack, Label, Page, Radio, RadioGroup, VStack } from '@navikt/ds-react'
import React, { useEffect, useRef } from 'react'
import { Form, useOutletContext } from 'react-router'
import commonStyles from '~/common.module.css'
import { useIsSubmitting } from '~/hooks/use-is-submitting'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'
import type { AktivitetDTO } from '~/types/behandling'
import { getAllServerComponents } from '~/utils/component-discovery'
import { formatDateToNorwegian } from '~/utils/date'
import './attestering.css'

export enum AttesteringUtfall {
  GODKJENN = 'GODKJENN',
  IKKE_GODKJENN = 'IKKE_GODKJENN',
}

export interface AktivitetTilAttestering {
  aktivitetId: number
  handlerName: string
  friendlyName: string
  grunnlag: string
  vurdering: string
  aktivitet: AktivitetDTO
  vurdertTidspunkt?: string
  vurdertAvBrukerId?: string
  vurdertAvBrukerNavn?: string
  begrunnelse?: string
}

export interface AttesteringActionData {
  errors?: { begrunnelse?: string }
  data?: { utfall?: AttesteringUtfall; begrunnelse?: string }
}

interface AttesteringProps {
  aktiviteter: AktivitetTilAttestering[]
  notatUrl?: string
  visNotat: boolean
  actionData?: AttesteringActionData
}

interface AktivitetAttesteringProps {
  actionData?: AttesteringActionData
  containerRef: React.RefObject<HTMLDivElement | null>
}

function AktivitetAttestering({ actionData, containerRef }: AktivitetAttesteringProps) {
  const { errors, data } = actionData || {}
  const isSubmitting = useIsSubmitting()
  const [utfall, setUtfall] = React.useState<AttesteringUtfall | ''>(data?.utfall ?? '')

  useEffect(() => {
    if (utfall) {
      containerRef.current?.scrollIntoView()
    }
  }, [utfall, containerRef])

  return (
    <Box background="brand-blue-soft" borderRadius="16" padding="space-28" as="div" ref={containerRef}>
      <Form method="POST">
        <VStack gap="space-40">
          <Heading level="2" size="medium">
            Attestering
          </Heading>
          <RadioGroup legend="Beslutning" name="utfall" onChange={setUtfall} value={utfall}>
            <Radio size="small" value={AttesteringUtfall.GODKJENN}>
              Godkjenn
            </Radio>
            <Radio size="small" value={AttesteringUtfall.IKKE_GODKJENN}>
              Ikke godkjenn
            </Radio>
          </RadioGroup>
          {utfall === AttesteringUtfall.IKKE_GODKJENN && (
            <RadioGroup
              legend="Velg begrunnelse"
              name="begrunnelse"
              error={errors?.begrunnelse}
              defaultValue={data?.begrunnelse}
            >
              <Radio size="small" value="Feil i vedtak">
                Feil i vedtak
              </Radio>

              <Radio size="small" value="Forvaltningsnotat utilstrekkelig">
                Forvaltningsnotat utilstrekkelig
              </Radio>

              <Radio size="small" value="Hent inn nytt grunnlag">
                Hent inn nytt grunnlag
              </Radio>

              <Radio size="small" value="Saksbehandlerstandard ikke fulgt">
                Saksbehandlerstandard ikke fulgt
              </Radio>
            </RadioGroup>
          )}
          {utfall && (
            <Button style={{ alignSelf: 'start' }} size="small" type="submit" loading={isSubmitting}>
              {utfall === AttesteringUtfall.IKKE_GODKJENN ? 'Returner til saksbehandler' : 'Attester og iverksett'}
            </Button>
          )}
        </VStack>
      </Form>
    </Box>
  )
}

export default function Attestering({ aktiviteter, notatUrl, visNotat, actionData }: AttesteringProps) {
  const { behandling } = useOutletContext<AktivitetOutletContext>()

  const components = getAllServerComponents()

  const attesteringViewRef = React.useRef<HTMLDivElement>(null)

  const aktiviteterRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const onSjekketClick = (aktivitetId: number, checked: boolean) => {
    if (!checked) return

    const currentIndex = aktiviteter.findIndex(a => a.aktivitetId === aktivitetId)
    const nextAktivitet = aktiviteter[currentIndex + 1]
    if (nextAktivitet) {
      const nextElement = aktiviteterRefs.current.get(nextAktivitet.aktivitetId)
      nextElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      attesteringViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <Page.Block width="xl" gutters className={commonStyles.behandlingPage}>
      <VStack gap="space-28">
        <HStack justify="space-between">
          <Heading level="1" size="large">
            Oppgaven er til attestering
          </Heading>
          {visNotat && notatUrl && (
            <Button as="a" target="_blank" variant="tertiary" icon={<NewspaperIcon />} href={notatUrl}>
              Vis notat
            </Button>
          )}
        </HStack>
        <VStack gap="space-56">
          {aktiviteter.map(aktivitet => {
            const Component = components.get(aktivitet.handlerName)

            return Component ? (
              <VStack
                key={aktivitet.aktivitetId}
                ref={el => {
                  if (el) {
                    aktiviteterRefs.current.set(aktivitet.aktivitetId, el)
                  }
                }}
              >
                <Box
                  borderColor="neutral-subtleA"
                  borderWidth="1 1 0 1"
                  paddingInline="space-28"
                  borderRadius="16 16 0 0"
                >
                  <div className="component-area">
                    <div className="component">
                      <Component
                        readOnly={true}
                        begrunnelse={aktivitet.begrunnelse}
                        grunnlag={aktivitet.grunnlag}
                        vurdering={aktivitet.vurdering}
                        aktivitet={aktivitet.aktivitet}
                        behandling={behandling}
                        visNotat={visNotat}
                      />
                    </div>
                  </div>
                </Box>
                <Box
                  background="neutral-softA"
                  borderWidth="0 1 1 1"
                  borderRadius="0 0 16 16"
                  borderColor="neutral-subtleA"
                  paddingBlock="space-20"
                  paddingInline="space-28"
                >
                  <HStack gap="space-32" align="center" justify="space-between">
                    <VStack>
                      <Label>Saksbehandler</Label>
                      <div>
                        {aktivitet.vurdertAvBrukerNavn} ({aktivitet.vurdertAvBrukerId})
                      </div>
                      <BodyShort textColor="subtle" size="small">
                        {formatDateToNorwegian(aktivitet.vurdertTidspunkt, { showTime: true })}
                      </BodyShort>
                    </VStack>
                    {aktiviteter.length > 1 && (
                      <div>
                        <Button
                          variant="tertiary"
                          size="small"
                          icon={<ArrowDownIcon aria-hidden />}
                          onClick={() => onSjekketClick(aktivitet.aktivitetId, true)}
                        >
                          Videre
                        </Button>
                      </div>
                    )}
                  </HStack>
                </Box>
              </VStack>
            ) : null
          })}
        </VStack>

        <AktivitetAttestering actionData={actionData} containerRef={attesteringViewRef} />
      </VStack>
    </Page.Block>
  )
}
