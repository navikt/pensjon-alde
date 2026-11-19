import { HStack, Tag } from '@navikt/ds-react'
import type { PersonBeskyttelse, ToppbarInfo } from '~/api/behandling-api/types'

type Markering = {
  key: string
  tekst: string
  farge: 'danger' | 'warning'
}

const tekster: Record<PersonBeskyttelse, string> = {
  STRENGT_FORTROLIG: 'Strengt fortrolig adresse',
  FORTROLIG: 'Fortrolig adresse',
  EGEN_ANSATT: 'Egen ansatt',
}

const farger: Record<PersonBeskyttelse, Markering['farge']> = {
  STRENGT_FORTROLIG: 'danger',
  FORTROLIG: 'warning',
  EGEN_ANSATT: 'warning',
}

export function beskyttelsesmarkeringer({
  beskyttelse = [],
  epsBeskyttelse = [],
}: Pick<ToppbarInfo, 'beskyttelse' | 'epsBeskyttelse'>): Markering[] {
  const kjente = (liste: PersonBeskyttelse[]) => liste.filter(b => b in tekster)
  return [
    ...kjente(beskyttelse).map(b => ({ key: `bruker-${b}`, tekst: tekster[b], farge: farger[b] })),
    ...kjente(epsBeskyttelse).map(b => ({ key: `eps-${b}`, tekst: `EPS: ${tekster[b]}`, farge: farger[b] })),
  ]
}

export function BeskyttelseTags({ toppbarInfo }: { toppbarInfo: ToppbarInfo }) {
  const markeringer = beskyttelsesmarkeringer(toppbarInfo)
  if (markeringer.length === 0) return null

  return (
    <HStack gap="space-8" align="center">
      {markeringer.map(m => (
        <Tag key={m.key} size="small" data-color={m.farge}>
          {m.tekst}
        </Tag>
      ))}
    </HStack>
  )
}
