export type { OpptjeningstyperKategori, OpptjeningstyperResponse, OpptjeningTypeKode } from '~/types/opptjeningstyper'

import type { OmsorgGrunnlagDTO, OmsorgTilSlettingDTO } from '../Omsorg/omsorg-types'

export type { OmsorgGrunnlagDTO, OmsorgTilSlettingDTO } from '../Omsorg/omsorg-types'

export type OppdaterPgiSakValg = {
  sakId: number
  sakType?: string | null
  sakStatus?: string | null
}

export type OppdaterOpptjeningGrunnlag = {
  saker?: OppdaterPgiSakValg[]
  opptjeningsGrunnlagDto?: {
    fnr: string | null
    omsorgListe?: OmsorgGrunnlagDTO[]
  }
  opptjeningstyper?: { code?: string | null; description?: string | null }[] | null
}

export type OppdaterOpptjeningVurdering = {
  sakId?: number
  fnr?: string
  omsorgTilSletting?: OmsorgTilSlettingDTO[]
}

export type VurderingResponse = {
  vurdering: string | null
  vurdertTidspunkt?: string | null
  vurdertAvBrukerId?: string | null
  vurdertAvBrukerNavn?: string | null
}

export type ActionErrors = { _form?: string; _server?: string[] }

export type Endringstype = 'OPPRETT' | 'OPPDATER' | 'SLETT'
