import type { Meta, StoryObj } from '@storybook/react'
import type { BehandlingDTO } from '~/types/behandling'
import { AktivitetStatus, AldeBehandlingStatus, BehandlingStatus } from '~/types/behandling'
import FeilendeBehandling from './FeilendeBehandling'

const baseBehandling: BehandlingDTO = {
  behandlingId: 6359437,
  type: 'FleksibelApSak',
  aldeBehandlingStatus: AldeBehandlingStatus.AUTOMATISK_TIL_MANUELL,
  handlerName: 'alderspensjon-soknad',
  friendlyName: 'Alderspensjon søknad',
  sisteKjoring: {
    behandlingId: 6359437,
    aktivitetId: 6020943,
    startet: '2026-01-15T10:00:00',
    avsluttet: '2026-01-15T10:00:01',
    uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    traceId: 'trace-abc-123',
    behandlingKjoringId: 100,
    correlationId: 'corr-xyz-789',
    feilmelding:
      'NullPointerException: Cannot invoke method on null object reference at no.nav.pensjon.pen.domain.behandling.FleksibelApSakBehandling.prosesser()',
    stackTrace: null,
  },
  sisteKjoringDato: '2026-01-15T10:00:01',
  utsattTil: '2026-01-15T11:00:00',
  opprettet: '2026-01-10T08:00:00',
  stoppet: null,
  status: BehandlingStatus.FEILENDE,
  aktiviteter: [
    {
      aktivitetId: 6020943,
      type: 'FleksibelApSak_VurderSamboer',
      opprettet: '2026-01-10T08:00:00',
      handlerName: 'vurder-samboer',
      friendlyName: 'Vurder samboer',
      antallGangerKjort: 3,
      sisteAktiveringsdato: '2026-01-15T10:00:00',
      status: AktivitetStatus.FEILET,
      utsattTil: null,
    },
  ],
  fnr: '12345678901',
  sakId: 1001,
  kravId: 2001,
  fornavn: 'Ola',
  mellomnavn: null,
  etternavn: 'Nordmann',
  fodselsdato: '1960-05-15',
}

const meta = {
  title: 'Sider/FeilendeBehandling',
  component: FeilendeBehandling,
  args: {
    retry: () => {},
    avbrytAktivitet: () => {},
  },
} satisfies Meta<typeof FeilendeBehandling>

export default meta
type Story = StoryObj<typeof meta>

export const MedFeilmelding: Story = {
  args: {
    dato: Date.now(),
    behandling: baseBehandling,
  },
}

export const UtenNesteKjoring: Story = {
  args: {
    dato: Date.now(),
    behandling: {
      ...baseBehandling,
      utsattTil: null,
    },
  },
}

export const FlereFeil: Story = {
  args: {
    dato: Date.now(),
    behandling: {
      ...baseBehandling,
      aktiviteter: [
        {
          ...baseBehandling.aktiviteter[0],
          antallGangerKjort: 1,
        },
      ],
    },
  },
}
