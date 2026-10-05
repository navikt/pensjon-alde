export type { OpptjeningstyperKategori, OpptjeningstyperResponse, OpptjeningTypeKode } from '~/types/opptjeningstyper'

import type { DagpengerBackendDTO } from '../Dagpenger/dagpenger-types'
import type { ForstegangstjenesteBackendDTO } from '../Forstegangstjeneste/forstegangstjeneste-types'
import type { InntektBackendDTO } from '../Inntekt/inntekt-types'
import type { OmsorgBackendDTO } from '../Omsorg/omsorg-types'

export type {
  DagpengerBackendDTO,
  DagpengerDTO,
} from '../Dagpenger/dagpenger-types'
export type {
  ForstegangstjenesteBackendDTO,
  ForstegangstjenesteDTO,
} from '../Forstegangstjeneste/forstegangstjeneste-types'
export type { InntektBackendDTO, InntektDTO } from '../Inntekt/inntekt-types'
export type { OmsorgBackendDTO, OmsorgDTO } from '../Omsorg/omsorg-types'

export type OppdaterPgiSakValg = {
  sakId: number
  sakType?: string | null
  sakStatus?: string | null
}

export type OppdaterOpptjeningGrunnlag = {
  saker?: OppdaterPgiSakValg[]
  kanOppretteGenerellSak?: boolean
  opptjeningsGrunnlagDto?: {
    fnr: string | null
    inntektListe: InntektBackendDTO[]
    omsorgListe: OmsorgBackendDTO[]
    dagpengerListe: DagpengerBackendDTO[]
    forstegangstjeneste?: ForstegangstjenesteBackendDTO | null
  }
}

export type OppdaterOpptjeningVurdering = {
  sakId?: number
  fnr?: string
  inntektEndringer?: { endringstype: Endringstype; inntektListe: InntektBackendDTO[] }[]
  dagpengerEndringer?: { endringstype: Endringstype; dagpengerListe: DagpengerBackendDTO[] }[]
  omsorgEndringer?: { endringstype: Endringstype; omsorgListe: OmsorgBackendDTO[] }[]
  forstegangstjenesteEndringer?: { endringstype: Endringstype; forstegangstjeneste: ForstegangstjenesteBackendDTO }[]
}

export type VurderingResponse = {
  vurdering: string | null
  vurdertTidspunkt?: string | null
  vurdertAvBrukerId?: string | null
  vurdertAvBrukerNavn?: string | null
}

export type ActionErrors = { _form?: string; _server?: string[] }

export type Endringstype = 'OPPRETT' | 'OPPDATER' | 'SLETT'
