import type { VurderingBase } from '~/types/vurdering'

export enum EpsType {
  EKTEFELLE = 'EKTEFELLE',
  PARTNER = 'PARTNER',
  SAMBOER = 'SAMBOER',
}

export interface KontrollerInntektsopplysningerForEpsGrunnlag {
  oppgittInntekt: string
  grunnbelop: string
  sokerKontaktinfo: {
    reservertMotDigitalVarsling: boolean
    aktivDigitalt: boolean
  }
  epsInformasjon: {
    fnr: string
    fornavn: string
    etternavn: string
    forkortetNavn: string
  }
  estimertInntektOver2gOgOppgittInntektUnder2g: boolean
  oppgittInntektUnder2g: boolean
  estimertInntektOver2g: boolean
  onsketVirkningsdato: string
  epsType: EpsType | null
}

export interface KontrollerInntektsopplysningerForEpsVurdering extends VurderingBase {
  epsInntektOver2G: boolean
}
