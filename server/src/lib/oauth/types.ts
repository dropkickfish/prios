export interface UserProfile {
  providerId: string
  email: string
  name?: string
  avatarUrl?: string
}

export interface ProviderTokens {
  accessToken: string
  refreshToken?: string
  idToken?: string
  expiresIn?: number
}

export interface OAuthProvider {
  name: string
  displayName: string
  getAuthUrl(state: string): string | Promise<string>
  exchangeCode(code: string): Promise<ProviderTokens>
  getUserProfile(tokens: ProviderTokens): Promise<UserProfile>
}
