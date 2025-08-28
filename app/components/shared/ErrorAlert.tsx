import { Alert } from '@navikt/ds-react'
import { isRouteErrorResponse } from 'react-router'

interface ErrorAlertProps {
  error: unknown
  onRetry?: () => void
}

export function ErrorAlert({ error, onRetry }: ErrorAlertProps) {
  let title = 'Det oppstod en feil'
  let message = 'En uventet feil oppstod. Prøv igjen senere.'

  if (isRouteErrorResponse(error)) {
    title = `Feil ${error.status}`
    message =
      error.status === 404
        ? 'Siden eller ressursen ble ikke funnet.'
        : error.status === 403
          ? 'Du har ikke tilgang til denne ressursen.'
          : error.status === 500
            ? 'Det oppstod en serverfeil. Prøv igjen senere.'
            : error.statusText || message
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <Alert variant="error" style={{ marginBottom: '1rem' }}>
      <strong>{title}</strong>
      <div>{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: '0.5rem',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Prøv igjen
        </button>
      )}
    </Alert>
  )
}
