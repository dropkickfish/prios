import type { OAuthProvider, ProviderTokens, UserProfile } from './types.js'

export function createGithubProvider(): OAuthProvider {
  const clientId = process.env.AUTH_GITHUB_CLIENT_ID!
  const clientSecret = process.env.AUTH_GITHUB_CLIENT_SECRET!
  const redirectUri = process.env.AUTH_GITHUB_REDIRECT_URI!

  return {
    name: 'github',
    displayName: 'GitHub',

    getAuthUrl(state: string): string {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
        state,
      })
      return `https://github.com/login/oauth/authorize?${params}`
    },

    async exchangeCode(code: string): Promise<ProviderTokens> {
      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      })
      const data = await res.json() as any
      if (data.error) throw new Error(data.error_description ?? data.error)
      return { accessToken: data.access_token }
    },

    async getUserProfile(tokens: ProviderTokens): Promise<UserProfile> {
      const [userRes, emailsRes] = await Promise.all([
        fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            Accept: 'application/vnd.github+json',
          },
        }),
        fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            Accept: 'application/vnd.github+json',
          },
        }),
      ])

      const user = await userRes.json() as any
      const emails = await emailsRes.json() as any[]

      // Prefer verified primary email; fall back to public email
      const primaryEmail =
        emails.find((e: any) => e.primary && e.verified)?.email ??
        emails.find((e: any) => e.verified)?.email ??
        user.email

      if (!primaryEmail) throw new Error('No verified email found on GitHub account')

      return {
        providerId: String(user.id),
        email: primaryEmail,
        name: user.name ?? user.login,
        avatarUrl: user.avatar_url,
      }
    },
  }
}
