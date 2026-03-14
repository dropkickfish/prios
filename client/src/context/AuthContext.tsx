import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

interface AuthState {
  user: User | null
  loading: boolean
  /** True when a 401 was received and re-auth is needed */
  needsLogin: boolean
}

interface AuthContextValue extends AuthState {
  refetch: () => Promise<void>
  logout: () => Promise<void>
  triggerLogin: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, needsLogin: false })

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const user = await res.json()
        setState({ user, loading: false, needsLogin: false })
      } else if (res.status === 401) {
        // Try to refresh first
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
        if (refreshRes.ok) {
          const retry = await fetch('/api/auth/me', { credentials: 'include' })
          if (retry.ok) {
            setState({ user: await retry.json(), loading: false, needsLogin: false })
            return
          }
        }
        setState({ user: null, loading: false, needsLogin: true })
      } else {
        // Non-401 error — app may be open (no auth configured)
        setState({ user: null, loading: false, needsLogin: false })
      }
    } catch {
      setState({ user: null, loading: false, needsLogin: false })
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setState({ user: null, loading: false, needsLogin: true })
  }, [])

  const triggerLogin = useCallback(() => {
    setState(s => ({ ...s, needsLogin: true }))
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, refetch: fetchMe, logout, triggerLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Call this from the API client on 401 responses */
export let onAuthFailure: (() => void) | null = null
export function setAuthFailureHandler(fn: () => void) {
  onAuthFailure = fn
}
