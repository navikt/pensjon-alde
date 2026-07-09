import { LocalAlert, Page } from '@navikt/ds-react'
import { useOutletContext } from 'react-router'
import styles from '~/common.module.css'
import type { AktivitetOutletContext } from '~/types/aktivitetOutletContext'

export async function loader() {
  return {}
}

export default function OppdaterOpptjeningsgrunnlagAvbruttRoute() {
  const { behandling } = useOutletContext<AktivitetOutletContext>()

  return (
    <Page.Block gutters className={`${styles.page} ${styles.center}`}>
      <LocalAlert status="warning">
        <LocalAlert.Header>
          <LocalAlert.Title>Behandlingen er avbrutt</LocalAlert.Title>
        </LocalAlert.Header>
        <LocalAlert.Content>
          Oppdatering av opptjeningsgrunnlag for behandling {behandling.behandlingId} er avbrutt.
        </LocalAlert.Content>
      </LocalAlert>
    </Page.Block>
  )
}
