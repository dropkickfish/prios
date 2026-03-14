import { createGoogleProvider } from './google.js'
import { createGithubProvider } from './github.js'
import { createOidcProvider } from './oidc.js'
import type { OAuthProvider } from './types.js'

export type { OAuthProvider, UserProfile } from './types.js'

let _providers: Map<string, OAuthProvider> | null = null

export function getProviders(): Map<string, OAuthProvider> {
  if (_providers) return _providers

  _providers = new Map()

  if (process.env.AUTH_GOOGLE_CLIENT_ID && process.env.AUTH_GOOGLE_CLIENT_SECRET) {
    const p = createGoogleProvider()
    _providers.set(p.name, p)
  }

  if (process.env.AUTH_GITHUB_CLIENT_ID && process.env.AUTH_GITHUB_CLIENT_SECRET) {
    const p = createGithubProvider()
    _providers.set(p.name, p)
  }

  if (process.env.AUTH_OIDC_CLIENT_ID && process.env.AUTH_OIDC_CLIENT_SECRET && process.env.AUTH_OIDC_DISCOVERY_URL) {
    const p = createOidcProvider()
    _providers.set(p.name, p)
  }

  return _providers
}

export function getProvider(name: string): OAuthProvider | undefined {
  return getProviders().get(name)
}
