import type { Meta, StoryObj } from '@storybook/react'
import ForbiddenPage from './ForbiddenPage'

const meta = {
  title: 'Sider/ForbiddenPage',
  component: ForbiddenPage,
} satisfies Meta<typeof ForbiddenPage>

export default meta
type Story = StoryObj<typeof meta>

export const MedTraceId: Story = {
  args: {
    dato: Date.now(),
    traceId: 'abc123-def456-ghi789',
  },
}

export const UtenTraceId: Story = {
  args: {
    dato: Date.now(),
    traceId: undefined,
  },
}
