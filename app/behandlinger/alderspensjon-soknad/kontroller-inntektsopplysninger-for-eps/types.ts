export interface KontrollerInntektsopplysningerForEpsGrunnlag {
  oppgittInntekt: number
  innhentetInntekt: number | null
  grunnbelop: number
}

export interface KontrollerInntektsopplysningerForEpsVurdering {
  epsInntektOver2G: boolean
}
