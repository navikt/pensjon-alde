import { Alert, BodyShort, Box, Heading, HStack, Link, Loader, VStack } from '@navikt/ds-react'
import { useEffect, useState } from 'react'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import { lagPdfBlob } from './pdf'

export type Vedtaksbrev = {
  pdf: number[] | string
  contentType: string
  displayTitle: string
  distribusjonstype: string
  brevtype: string
}

export type ForhandsvisVedtaksbrevGrunnlag = {
  brev: Vedtaksbrev[]
}

type Props = Pick<AktivitetComponentProps<ForhandsvisVedtaksbrevGrunnlag, never>, 'grunnlag' | 'aktivitet'>

export function ForhandsvisVedtaksbrev({ grunnlag, aktivitet }: Props) {
  const forekomster = new Map<string, number>()

  return (
    <Box padding={{ xs: 'space-16', md: 'space-32' }}>
      <VStack gap="space-32">
        <Heading level="1" size="medium">
          {aktivitet.friendlyName || 'Forhåndsvis vedtaksbrev'}
        </Heading>
        {grunnlag.brev.length === 0 ? (
          <Alert variant="info">Ingen vedtaksbrev tilgjengelig for forhåndsvisning.</Alert>
        ) : (
          grunnlag.brev.map(brev => {
            const forekomst = (forekomster.get(brev.displayTitle) ?? 0) + 1
            forekomster.set(brev.displayTitle, forekomst)

            return <BrevForhandsvisning key={`${brev.displayTitle}-${forekomst}`} brev={brev} />
          })
        )}
      </VStack>
    </Box>
  )
}

function BrevForhandsvisning({ brev }: { brev: Vedtaksbrev }) {
  const [pdfSrc, setPdfSrc] = useState<string | null>(null)
  const [feil, setFeil] = useState(false)

  useEffect(() => {
    setPdfSrc(null)
    setFeil(false)

    try {
      const url = URL.createObjectURL(lagPdfBlob(brev.pdf, brev.contentType))
      setPdfSrc(url)
      return () => URL.revokeObjectURL(url)
    } catch {
      setFeil(true)
    }
  }, [brev.pdf, brev.contentType])

  return (
    <VStack as="section" gap="space-16" aria-label={brev.displayTitle}>
      <Heading level="2" size="small">
        {brev.displayTitle}
      </Heading>
      <HStack gap="space-24">
        <BodyShort size="small">Brevtype: {brev.brevtype}</BodyShort>
        <BodyShort size="small">Distribusjonstype: {brev.distribusjonstype}</BodyShort>
      </HStack>
      {feil ? (
        <Alert variant="error">Kunne ikke vise PDF-en for «{brev.displayTitle}».</Alert>
      ) : pdfSrc ? (
        <>
          <Link href={pdfSrc} target="_blank" rel="noopener noreferrer">
            Åpne {brev.displayTitle} i ny fane
          </Link>
          <Box borderWidth="1" overflow="hidden" width="100%">
            <iframe
              title={`Forhåndsvisning av ${brev.displayTitle}`}
              src={pdfSrc}
              width="100%"
              style={{ border: 0, height: '80vh', display: 'block' }}
            />
          </Box>
        </>
      ) : (
        <Loader title={`Klargjør ${brev.displayTitle}`} />
      )}
    </VStack>
  )
}
