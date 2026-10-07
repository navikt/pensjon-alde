import { createContext } from 'react-router'

export interface SettingsContext {
  showStepper: boolean
  kladdemodus: boolean
}

export const settingsContext = createContext<SettingsContext>({
  showStepper: false,
  kladdemodus: false,
})
