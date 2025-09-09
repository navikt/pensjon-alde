import { ArrowDownIcon, ArrowUpIcon, ClockDashedIcon, InboxDownIcon } from '@navikt/aksel-icons'
import { Box, Tabs } from '@navikt/ds-react'
import { useEffect, useState } from 'react'
import style from './aktivitet-debug.module.css'

interface IAktivitetDebugProps {
  input: unknown
  vurdering: unknown
}

export const AktivitetDebug: React.FC<IAktivitetDebugProps> = ({ input, vurdering }) => {
  const [isOpen, setIsOpen] = useState(false)

  // Close debug panel on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const formatData = (data: unknown) => {
    if (data === null || data === undefined) {
      return 'Ingen data'
    }

    try {
      return JSON.stringify(data, null, 2)
    } catch (error) {
      return `Error formatting data: ${String(error)}`
    }
  }

  return (
    <div className={style.debugPanel}>
      <div className={`${style.container} ${isOpen ? style.open : style.closed}`}>
        <button
          type="button"
          className={style.button}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close debug panel' : 'Open debug panel'}
          aria-expanded={isOpen}
        >
          {isOpen ? <ArrowDownIcon aria-hidden /> : <ArrowUpIcon aria-hidden />}
          Debug
        </button>
        {isOpen && (
          <Box.New background="default" borderWidth="4 0" borderColor="danger" className={style.tabsContainer}>
            <Tabs defaultValue="grunnlag">
              <Tabs.List>
                <Tabs.Tab value="grunnlag" label="Aktivitet grunnlag" icon={<ClockDashedIcon aria-hidden />} />
                <Tabs.Tab value="vurdering" label="Aktivitet vurdering" icon={<InboxDownIcon aria-hidden />} />
              </Tabs.List>
              <Tabs.Panel value="grunnlag" className={style.tabPanel}>
                <Box.New padding="4">
                  <pre>{formatData(input)}</pre>
                </Box.New>
              </Tabs.Panel>
              <Tabs.Panel value="vurdering" className={style.tabPanel}>
                <Box.New padding="4">
                  <pre>{formatData(vurdering)}</pre>
                </Box.New>
              </Tabs.Panel>
            </Tabs>
          </Box.New>
        )}
      </div>
    </div>
  )
}
