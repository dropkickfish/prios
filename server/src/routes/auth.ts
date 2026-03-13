import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db.js';
import { eq } from 'drizzle-orm';
import { GOOGLE_AUTH_ENDPOINT } from '../lib/google.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/auth/google/url', async () => {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: 'code',
      scope: 'openid email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return { url };
  });

  fastify.get('/auth/google/callback', async (request, reply) => {
    const { code } = request.query as any;

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
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    // Fetch user email
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const user = await userRes.json() as any;
    const email = user.email;

    await db.insert(schema.appSettings).values({
      id: 'singleton',
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: Date.now() + (tokens.expires_in * 1000),
      googleCalendarId: email,
    }).onConflictDoUpdate({
      target: schema.appSettings.id,
      set: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: Date.now() + (tokens.expires_in * 1000),
        googleCalendarId: email,
      }
    });

    return reply.type('text/html').send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
          <h1 style="color: #38bdf8;">Connected!</h1>
          <p>You can close this window now.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage('google-auth-success', '*');
            }
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  });

  fastify.get('/auth/google/status', async () => {
    const settings = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, 'singleton'));
    return { connected: !!settings[0]?.googleRefreshToken };
  });

  fastify.delete('/auth/google', async () => {
    await db.update(schema.appSettings).set({
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
    }).where(eq(schema.appSettings.id, 'singleton'));
    return { success: true };
  });
};

export default authRoutes;
