import { useNavigation, useParams, useSearchParams } from 'react-router'
import { venterPaValideringPaAktivitet } from '~/utils/fortsett-behandling'

export function useIsSubmitting(): boolean {
  const navigation = useNavigation()
  const { aktivitetId } = useParams()
  const [searchParams] = useSearchParams()
  return (
    (navigation.state !== 'idle' && navigation.formData != null) ||
    venterPaValideringPaAktivitet(aktivitetId, searchParams)
  )
}
