import { CopyButton } from '@navikt/ds-react'
import styles from './Fnr.module.css'

interface FnrProps {
  value: string | number | null | undefined
}

export const Fnr = ({ value }: FnrProps) => {
  if (value === undefined || value === null) return null

  const fnrString = typeof value === 'number' ? value.toString() : value

  if (fnrString.length !== 11) return <span>{fnrString}</span>

  const prefix = fnrString.slice(0, 6)
  const suffix = fnrString.slice(6)

  return (
    <span className={styles.fnrWrapper}>
      <span className={styles.fnr}>
        <span>{prefix}</span>
        <span className={styles.space} aria-hidden="true">
          {' '}
        </span>
        <span>{suffix}</span>
      </span>
      <CopyButton size="small" variant="action" copyText={fnrString} />
    </span>
  )
}
