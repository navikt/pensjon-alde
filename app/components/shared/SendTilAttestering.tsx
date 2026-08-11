import { Button, Heading, Page, VStack } from '@navikt/ds-react'
import { Form } from 'react-router'
import styles from '~/common.module.css'
import { useIsSubmitting } from '~/hooks/use-is-submitting'

interface SendTilAttesteringProps {
  heading: string
  submitLabel: string
  cancelLabel: string
  onAvbryt: () => void
}

export function SendTilAttestering({ heading, submitLabel, cancelLabel, onAvbryt }: SendTilAttesteringProps) {
  const isSubmitting = useIsSubmitting()

  return (
    <Page.Block gutters className={`${styles.page} ${styles.center}`}>
      <VStack gap="space-32">
        <Heading size="medium" level="2">
          {heading}
        </Heading>

        <Form method="post">
          <VStack gap="space-8" align="center">
            <Button type="submit" variant="primary" size="small" loading={isSubmitting}>
              {submitLabel}
            </Button>

            <Button type="button" variant="tertiary" size="small" onClick={onAvbryt} disabled={isSubmitting}>
              {cancelLabel}
            </Button>
          </VStack>
        </Form>
      </VStack>
    </Page.Block>
  )
}
