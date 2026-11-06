import { useNavigation, useSearchParams } from 'react-router'
import { PROSESSERER_PARAM } from '~/utils/prosessering'

export function useIsSubmitting(): boolean {
  const navigation = useNavigation()
  const [searchParams] = useSearchParams()
  return (navigation.state !== 'idle' && navigation.formData != null) || searchParams.has(PROSESSERER_PARAM)
}
