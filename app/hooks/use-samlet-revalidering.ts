import { useCallback, useEffect, useRef } from 'react'
import { useNavigation, useRevalidator } from 'react-router'

export function useSamletRevalidering(pause: boolean) {
  const revalidator = useRevalidator()
  const revalidatorRef = useRef(revalidator)
  revalidatorRef.current = revalidator

  const navigerer = useNavigation().state !== 'idle'
  const blokkertRef = useRef(false)
  blokkertRef.current = navigerer || pause

  const utsattRef = useRef(false)
  const pagaarRef = useRef(false)

  const start = useCallback(function start() {
    utsattRef.current = false
    pagaarRef.current = true
    void revalidatorRef.current.revalidate().finally(() => {
      pagaarRef.current = false
      if (utsattRef.current && !blokkertRef.current) start()
    })
  }, [])

  useEffect(() => {
    if (!navigerer && !pause && !pagaarRef.current && utsattRef.current) start()
  }, [navigerer, pause, start])

  const revalider = useCallback(() => {
    if (blokkertRef.current || pagaarRef.current) {
      utsattRef.current = true
      return
    }
    start()
  }, [start])

  const forkastUtsatt = useCallback(() => {
    utsattRef.current = false
  }, [])

  return { revalider, forkastUtsatt }
}
