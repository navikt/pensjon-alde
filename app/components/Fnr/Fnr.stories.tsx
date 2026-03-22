import type { Meta, StoryObj } from '@storybook/react'
import { Fnr } from './Fnr'

const meta = {
  title: 'Komponenter/Fnr',
  component: Fnr,
} satisfies Meta<typeof Fnr>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    value: '12345678901',
  },
}

export const MedNummer: Story = {
  args: {
    value: 12345678901,
  },
}

export const Null: Story = {
  args: {
    value: null,
  },
}

export const KortVerdi: Story = {
  args: {
    value: '123456',
  },
}
