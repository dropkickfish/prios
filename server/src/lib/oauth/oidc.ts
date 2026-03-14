import type { OAuthProvider, ProviderTokens, UserProfile } from './types.js'

interface OidcDiscovery {
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
}

let discoveryCache: OidcDiscovery | null = null

async function getDiscovery(): Promise<OidcDiscovery> {
  if (discoveryCache) return discoveryCache
  const url = process.env.AUTH_OIDC_DISCOVERY_URL!
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`)
  discoveryCache = await res.json() as OidcDiscovery
  return discoveryCache
}

export function createOidcProvider(): OAuthProvider {
  const clientId = process.env.AUTH_OIDC_CLIENT_ID!
  const clientSecret = process.env.AUTH_OIDC_CLIENT_SECRET!
  const redirectUri = process.env.AUTH_OIDC_REDIRECT_URI!
  const displayName = process.env.AUTH_OIDC_DISPLAY_NAME ?? 'SSO'

  return {
    name: 'oidc',
    displayName,

    async getAuthUrl(state: string): Promise<string> {
      const discovery = await getDiscovery()
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
      })
      return `${discovery.authorization_endpoint}?${params}`
    },

    async exchangeCode(code: string): Promise<ProviderTokens> {
      const discovery = await getDiscovery()
      const res = await fetch(discovery.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code,
        }),
      })
      const data = await res.json() as any
      if (data.error) throw new Error(data.error_description ?? data.error)
      return {
        accessToken: data.access_token,
        idToken: data.id_token,
        expiresIn: data.expires_in,
      }
    },

    async getUserProfile(tokens: ProviderTokens): Promise<UserProfile> {
      const discovery = await getDiscovery()
      const res = await fetch(discovery.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      if (!res.ok) {
        // Re-fetch discovery in case endpoints rotated
        discoveryCache = null
        throw new Error(`OIDC userinfo failed: ${res.status}`)
      }
      const data = await res.json() as any
      return {
        providerId: data.sub,
        email: data.email,
        name: data.name,
        avatarUrl: data.picture,
      }
    },
  }
}
