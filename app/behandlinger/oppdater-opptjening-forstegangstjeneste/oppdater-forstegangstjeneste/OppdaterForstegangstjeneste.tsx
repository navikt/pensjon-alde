import { useState } from 'react'
import type { AktivitetComponentProps } from '~/types/aktivitet-component'
import { ForstegangstjenesteSeksjon } from './ForstegangstjenesteSeksjon'
import type {
  ActionErrors,
  ForstegangstjenesteGrunnlag,
  ForstegangstjenestePeriodeDTO,
  ForstegangstjenesteVurdering,
  TjenesteDTO,
} from './forstegangstjeneste.types'
import {
  byggForstegangstjenestePayload,
  byggForstegangstjenesteSummary,
  finnForstegangstjenesteFeil,
  harFeil,
  INGEN_FEIL,
  nyPeriodeLinje,
  nyTjenesteLinje,
  periodeNokler,
  perioderFraVurdering,
  synligePerioder,
  TJENESTE_ID,
  tilbakestill,
  tjenesteLinjerFraVurdering,
  tjenesteNokler,
} from './forstegangstjeneste.utils'
import { OpptjeningSkjema } from './OpptjeningSkjema'
import { useLinjeState } from './use-linje-state'

type Props = Omit<AktivitetComponentProps<ForstegangstjenesteGrunnlag, ForstegangstjenesteVurdering>, 'errors'> & {
  errors?: ActionErrors
  manglerTilgang?: boolean
}

export function OppdaterForstegangstjeneste({
  grunnlag,
  vurdering,
  readOnly,
  avbrytAktivitet,
  errors,
  begrunnelse,
  visNotat,
  manglerTilgang,
}: Props) {
  const periodetyper = grunnlag?.periodetyper ?? []
  const tjenestetyper = grunnlag?.tjenestetyper ?? []
  const tjenesteState = useLinjeState<TjenesteDTO>(
    () => tjenesteLinjerFraVurdering(grunnlag, vurdering),
    tjenesteNokler,
  )
  const periodeState = useLinjeState<ForstegangstjenestePeriodeDTO>(
    () => perioderFraVurdering(grunnlag, vurdering),
    periodeNokler,
  )
  const [visAlleFeil, setVisAlleFeil] = useState(false)

  const tjeneste = tjenesteState.linjer[0]
  const perioder = periodeState.linjer
  const feil = readOnly ? INGEN_FEIL : finnForstegangstjenesteFeil(tjeneste, perioder)
  const nyPeriode = () => nyPeriodeLinje(periodetyper[0]?.code ?? null, tjenestetyper[0]?.code ?? null)

  return (
    <OpptjeningSkjema
      tittel="Oppdater førstegangstjeneste"
      opptjeningstyper={[...periodetyper, ...tjenestetyper]}
      readOnly={readOnly}
      manglerTilgang={manglerTilgang}
      errors={errors}
      visNotat={visNotat}
      endringSummary={byggForstegangstjenesteSummary(tjeneste, perioder, periodetyper, tjenestetyper)}
      payload={JSON.stringify(byggForstegangstjenestePayload(tjeneste, perioder))}
      begrunnelse={begrunnelse}
      avbrytAktivitet={avbrytAktivitet}
      harKlientFeil={harFeil(feil)}
      onInnsendingsforsok={() => setVisAlleFeil(true)}
    >
      <ForstegangstjenesteSeksjon
        tjeneste={tjeneste}
        perioder={synligePerioder(tjeneste, perioder)}
        periodetyper={periodetyper}
        tjenestetyper={tjenestetyper}
        feil={feil}
        visAlleFeil={visAlleFeil}
        readOnly={readOnly}
        onRegistrer={() => {
          tjenesteState.leggTil(nyTjenesteLinje())
          periodeState.leggTil(nyPeriode())
        }}
        onOppdaterTjeneste={(felt, verdi) =>
          tjenesteState.oppdater(TJENESTE_ID, linje => ({ ...linje, [felt]: verdi }))
        }
        onTilbakestillTjeneste={() => tjenesteState.oppdater(TJENESTE_ID, tilbakestill)}
        onSlettTjeneste={() => {
          if (tjeneste?._status === 'new') periodeState.forkastEndringer()
          tjenesteState.slett(TJENESTE_ID)
        }}
        onGjenopprettTjeneste={() => tjenesteState.gjenopprett(TJENESTE_ID)}
        onLeggTilPeriode={() => periodeState.leggTil(nyPeriode())}
        onOppdaterPeriode={(id, felt, verdi) => periodeState.oppdater(id, linje => ({ ...linje, [felt]: verdi }))}
        onTilbakestillPeriode={id => periodeState.oppdater(id, tilbakestill)}
        onSlettPeriode={periodeState.slett}
        onGjenopprettPeriode={periodeState.gjenopprett}
      />
    </OpptjeningSkjema>
  )
}
