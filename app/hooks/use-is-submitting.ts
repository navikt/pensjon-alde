import { useNavigation, useRouteLoaderData } from 'react-router'

export function useIsSubmitting(): boolean {
  const navigation = useNavigation()
  const behandling = useRouteLoaderData<{ venterPaValidering?: boolean }>('routes/behandling/$behandlingId')
  return (navigation.state !== 'idle' && navigation.formData != null) || Boolean(behandling?.venterPaValidering)
}
