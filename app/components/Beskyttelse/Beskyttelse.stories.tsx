import type { Meta, StoryObj } from '@storybook/react'
import type { ToppbarInfo } from '~/api/behandling-api/types'
import { BeskyttelseTags } from './Beskyttelse'

const toppbarInfo: ToppbarInfo = {
  fnr: '12345678901',
  sakId: 456,
  sakType: 'Alderspensjon',
  fornavn: 'Ola',
  etternavn: 'Nordmann',
  mellomnavn: null,
  fodselsdato: '1962-03-15',
}

const meta = {
  title: 'Komponenter/BeskyttelseTags',
  component: BeskyttelseTags,
} satisfies Meta<typeof BeskyttelseTags>

export default meta
type Story = StoryObj<typeof meta>

export const StrengtFortrolig: Story = {
  args: { toppbarInfo: { ...toppbarInfo, beskyttelse: ['STRENGT_FORTROLIG'] } },
}

export const EgenAnsatt: Story = {
  args: { toppbarInfo: { ...toppbarInfo, beskyttelse: ['EGEN_ANSATT'] } },
}

export const EpsMedBeskyttelse: Story = {
  args: { toppbarInfo: { ...toppbarInfo, epsBeskyttelse: ['FORTROLIG', 'EGEN_ANSATT'] } },
}

export const BrukerOgEps: Story = {
  args: {
    toppbarInfo: { ...toppbarInfo, beskyttelse: ['FORTROLIG', 'EGEN_ANSATT'], epsBeskyttelse: ['STRENGT_FORTROLIG'] },
  },
}

export const UtenBeskyttelse: Story = {
  args: { toppbarInfo },
}
