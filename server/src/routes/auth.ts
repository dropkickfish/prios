import type { FastifyPluginAsync } from 'fastify'
import { randomBytes } from 'node:crypto'
import { db, schema } from '../db.js'
import { eq } from 'drizzle-orm'
import { GOOGLE_AUTH_ENDPOINT } from '../lib/google.js'
import { successResponse } from '../schemas/common.js'
import { getProvider, getProviders } from '../lib/oauth/index.js'
import { createSession, rotateRefreshToken, revokeSession, hashToken } from '../lib/session.js'

const SESSION_ACCESS_TTL = Number(process.env.SESSION_ACCESS_TTL ?? 900)
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || process.env.AUTH_ENABLED === 'true',
  sameSite: 'lax' as const,
  path: '/' as const,
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── App OAuth login routes ───────────────────────────────────────────────

  fastify.get('/auth/providers', {
    schema: {
      tags: ['auth'],
      summary: 'List configured OAuth providers',
    },
  }, async () => {
    const providers = getProviders()
    return Array.from(providers.values()).map(p => ({ name: p.name, displayName: p.displayName }))
  })

  fastify.get('/auth/:provider/start', {
    schema: {
      tags: ['auth'],
      summary: 'Initiate OAuth login for a provider',
    },
  }, async (request, reply) => {
    const { provider: providerName } = request.params as { provider: string }
    const provider = getProvider(providerName)
    if (!provider) return reply.status(404).send({ error: `Unknown provider: ${providerName}` })

    const state = randomBytes(16).toString('hex')
    const authUrl = await Promise.resolve(provider.getAuthUrl(state))

    reply.setCookie('oauth_state', state, {
      ...COOKIE_OPTS,
      maxAge: 600, // 10 min
      path: '/',
    })

    return reply.redirect(authUrl)
  })

  fastify.get('/auth/:provider/callback', {
    schema: {
      tags: ['auth'],
      summary: 'OAuth callback — exchanges code, creates session',
    },
  }, async (request, reply) => {
    const { provider: providerName } = request.params as { provider: string }
    const { code, state, error } = request.query as Record<string, string>

    if (error) return reply.redirect(`/login?error=${encodeURIComponent(error)}`)

    const storedState = request.cookies?.oauth_state
    if (!storedState || storedState !== state) {
      return reply.redirect('/login?error=invalid_state')
    }
    reply.clearCookie('oauth_state', { path: '/' })

    const provider = getProvider(providerName)
    if (!provider) return reply.redirect('/login?error=unknown_provider')

    try {
      const tokens = await provider.exchangeCode(code)
      const profile = await provider.getUserProfile(tokens)

      // Enforce allowed email in single-user mode
      const allowedEmail = process.env.AUTH_ALLOWED_EMAIL
      if (allowedEmail && profile.email.toLowerCase() !== allowedEmail.toLowerCase()) {
        return reply.redirect('/login?error=not_allowed')
      }

      // Upsert user
      let [user] = await db.select().from(schema.users).where(eq(schema.users.email, profile.email))
      if (!user) {
        const [created] = await db.insert(schema.users).values({
          email: profile.email,
          name: profile.name ?? null,
          avatarUrl: profile.avatarUrl ?? null,
        }).returning()
        user = created
      } else if (profile.name || profile.avatarUrl) {
        await db.update(schema.users).set({
          name: profile.name ?? user.name,
          avatarUrl: profile.avatarUrl ?? user.avatarUrl,
        }).where(eq(schema.users.id, user.id))
      }

      // Upsert OAuth account
      await db.insert(schema.oauthAccounts).values({
        userId: user.id,
        provider: providerName,
        providerId: profile.providerId,
        email: profile.email,
      }).onConflictDoNothing()

      // Issue session
      const refreshToken = await createSession(user.id, request.headers['user-agent'])
      const accessToken = fastify.jwt.sign({ sub: user.id }, { expiresIn: SESSION_ACCESS_TTL })

      reply
        .setCookie('prios_session', accessToken, { ...COOKIE_OPTS, maxAge: SESSION_ACCESS_TTL })
        .setCookie('prios_refresh', refreshToken, { ...COOKIE_OPTS, maxAge: Number(process.env.SESSION_TTL ?? 2592000), path: '/api/auth/refresh' })
        .redirect('/')
    } catch (err: any) {
      fastify.log.error(err, 'OAuth callback error')
      return reply.redirect(`/login?error=${encodeURIComponent(err.message ?? 'oauth_error')}`)
    }
  })

  fastify.post('/auth/refresh', {
    schema: {
      tags: ['auth'],
      summary: 'Refresh access token using refresh token cookie',
    },
  }, async (request, reply) => {
    const refreshToken = request.cookies?.prios_refresh
    if (!refreshToken) return reply.status(401).send({ error: 'No refresh token' })

    // We need the userId — get it from the expired access token without verifying expiry
    let userId: string | null = null
    const sessionCookie = request.cookies?.prios_session
    if (sessionCookie) {
      try {
        const payload = fastify.jwt.decode<{ sub: string }>(sessionCookie)
        userId = payload?.sub ?? null
      } catch {}
    }

    if (!userId) {
      // Fall back to DB lookup via refresh token hash
      const { getSessionUser } = await import('../lib/session.js')
      userId = await getSessionUser(hashToken(refreshToken))
    }

    if (!userId) return reply.status(401).send({ error: 'Invalid session' })

    const newRefreshToken = await rotateRefreshToken(hashToken(refreshToken), userId, request.headers['user-agent'])
    if (!newRefreshToken) return reply.status(401).send({ error: 'Session expired' })

    const accessToken = fastify.jwt.sign({ sub: userId }, { expiresIn: SESSION_ACCESS_TTL })

    return reply
      .setCookie('prios_session', accessToken, { ...COOKIE_OPTS, maxAge: SESSION_ACCESS_TTL })
      .setCookie('prios_refresh', newRefreshToken, { ...COOKIE_OPTS, maxAge: Number(process.env.SESSION_TTL ?? 2592000), path: '/api/auth/refresh' })
      .send({ ok: true })
  })

  fastify.post('/auth/logout', {
    schema: {
      tags: ['auth'],
      summary: 'Revoke session and clear cookies',
    },
  }, async (request, reply) => {
    const refreshToken = request.cookies?.prios_refresh
    if (refreshToken) await revokeSession(hashToken(refreshToken))

    return reply
      .clearCookie('prios_session', { path: '/' })
      .clearCookie('prios_refresh', { path: '/api/auth/refresh' })
      .send({ ok: true })
  })

  fastify.get('/auth/me', {
    schema: {
      tags: ['auth'],
      summary: 'Current authenticated user',
    },
  }, async (request, reply) => {
    const userId = request.userId
    if (!userId) return reply.status(401).send({ error: 'Not authenticated' })

    const [user] = await db
      .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, avatarUrl: schema.users.avatarUrl })
      .from(schema.users)
      .where(eq(schema.users.id, userId))

    if (!user) return reply.status(404).send({ error: 'User not found' })
    return user
  })

  // ─── Google Calendar OAuth (renamed from /auth/google/*) ─────────────────

  fastify.get('/auth/google-calendar/url', {
    schema: {
      tags: ['auth'],
      summary: 'Get Google OAuth authorisation URL for Calendar access',
      response: {
        200: {
          type: 'object',
          properties: { url: { type: 'string' } },
        },
      },
    },
  }, async () => {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: 'code',
      scope: 'openid email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
    })
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }
  })

  fastify.get('/auth/google-calendar/callback', {
    schema: {
      tags: ['auth'],
      summary: 'Google Calendar OAuth callback',
      querystring: {
        type: 'object',
        properties: { code: { type: 'string' } },
        required: ['code'],
      },
    },
  }, async (request, reply) => {
    const { code } = request.query as any

    const tokenRes = await fetch(`${GOOGLE_AUTH_ENDPOINT}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json() as any
    if (tokens.error) throw new Error(tokens.error_description ?? tokens.error)

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const user = await userRes.json() as any

    await db.insert(schema.appSettings).values({
      id: 'singleton',
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: Date.now() + (tokens.expires_in * 1000),
      googleCalendarId: user.email,
    }).onConflictDoUpdate({
      target: schema.appSettings.id,
      set: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: Date.now() + (tokens.expires_in * 1000),
        googleCalendarId: user.email,
      },
    })

    return reply.type('text/html').send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
          <h1 style="color: #38bdf8;">Connected!</h1>
          <p>You can close this window now.</p>
          <script>
            if (window.opener) { window.opener.postMessage('google-auth-success', '*'); }
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `)
  })

  fastify.get('/auth/google-calendar/status', {
    schema: {
      tags: ['auth'],
      summary: 'Check whether Google Calendar is connected',
      response: {
        200: {
          type: 'object',
          properties: { connected: { type: 'boolean' } },
        },
      },
    },
  }, async () => {
    const settings = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, 'singleton'))
    return { connected: !!settings[0]?.googleRefreshToken }
  })

  fastify.delete('/auth/google-calendar', {
    schema: {
      tags: ['auth'],
      summary: 'Disconnect Google Calendar',
      response: { 200: successResponse },
    },
  }, async () => {
    await db.update(schema.appSettings).set({
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
    }).where(eq(schema.appSettings.id, 'singleton'))
    return { success: true }
  })
}

export default authRoutes
