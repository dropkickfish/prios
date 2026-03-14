import type { OAuthProvider, ProviderTokens, UserProfile } from './types.js'

export function createGoogleProvider(): OAuthProvider {
  const clientId = process.env.AUTH_GOOGLE_CLIENT_ID!
  const clientSecret = process.env.AUTH_GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.AUTH_GOOGLE_REDIRECT_URI!

  return {
    name: 'google',
    displayName: 'Google',

    getAuthUrl(state: string): string {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'online',
      })
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    },

    async exchangeCode(code: string): Promise<ProviderTokens> {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
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
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
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
