import { unstable_createContext as createContext } from 'react-router'

export type AuthContext = {
  token: string
}

export const authCtx = createContext<AuthContext | null>(null)
