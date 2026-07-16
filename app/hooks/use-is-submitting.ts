import { useNavigation } from 'react-router'

export function useIsSubmitting() {
  const navigation = useNavigation()
  return navigation.state !== 'idle' && navigation.formData != null
}
