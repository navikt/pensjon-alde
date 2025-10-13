import { createContext } from 'react-router'

export interface UserContext {
  navident: string
  fornavn: string
  etternavn: string
  enhet: string
}

export const userContext = createContext<UserContext>()
