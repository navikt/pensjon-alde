import { createContext } from 'react-router'

export interface SettingsContext {
  showStepper: boolean
  showMetadata: boolean
}

export const settingsContext = createContext<SettingsContext>({
  showStepper: false,
  showMetadata: false,
})
