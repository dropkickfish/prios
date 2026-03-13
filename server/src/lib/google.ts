import { db, schema } from '../db.js';
import { eq } from 'drizzle-orm';
import { DAVClient } from 'tsdav';

// Note: We use manual fetch for OAuth code exchange since we removed googleapis
export const GOOGLE_AUTH_ENDPOINT = 'https://oauth2.googleapis.com';

export async function refreshGoogleToken() {
  const settings = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, 'singleton'));
  if (!settings[0]?.googleRefreshToken) return null;

  const { googleRefreshToken, googleTokenExpiry } = settings[0];

  // If token is still valid for more than 5 minutes, return existing token
  if (googleTokenExpiry && googleTokenExpiry > Date.now() + 5 * 60 * 1000) {
    return settings[0].googleAccessToken;
  }

  console.info('Refreshing Google OAuth token...');

  try {
    const response = await fetch(`${GOOGLE_AUTH_ENDPOINT}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: googleRefreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Failed to refresh Google token', { error: data.error, description: data.error_description });
      return null;
    }

    const newAccessToken = data.access_token;
    const newExpiry = Date.now() + (data.expires_in * 1000);

    await db.update(schema.appSettings).set({
      googleAccessToken: newAccessToken,
      googleTokenExpiry: newExpiry,
    }).where(eq(schema.appSettings.id, 'singleton'));

    console.info('Google OAuth token refreshed successfully');
    return newAccessToken;
  } catch (error) {
    console.error('Error during Google token refresh', error);
    return null;
  }
}

// CalDAV Helper
export async function getCalendarEvents(startTime: Date, endTime: Date) {
  const accessToken = await refreshGoogleToken();
  const settings = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, 'singleton'));

  if (!accessToken || !settings[0]) {
    console.warn('No valid Google access token or settings found');
    return [];
  }

  let email = settings[0].googleCalendarId;

  // If we don't have the email/ID, fetch it from REST API
  if (!email) {
    try {
      const restRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (restRes.ok) {
        const list = await restRes.json() as any;
        email = list.items?.find((i: any) => i.primary)?.id;
        if (email) {
          await db.update(schema.appSettings).set({ googleCalendarId: email }).where(eq(schema.appSettings.id, 'singleton'));
          console.info('Discovered and saved primary calendar ID', { email });
        }
      }
    } catch (e) {
      console.error('Failed to discover primary email', e);
    }
  }

  const serverUrl = email && email !== 'primary'
    ? `https://apidata.googleusercontent.com/caldav/v2/${email}/user/`
    : 'https://apidata.googleusercontent.com/caldav/v2/';

  try {
    const client = new DAVClient({
      serverUrl,
      credentials: { accessToken },
      authMethod: 'Custom',
      authFunction: async () => ({
        authorization: `Bearer ${accessToken}`
      }),
      defaultAccountType: 'caldav',
    });

    await client.login();
    const calendars = await client.fetchCalendars();
    const primary = calendars.find(c => c.url.includes('primary') || (email && c.url.includes(email))) || calendars[0];

    const events = await client.fetchCalendarObjects({
      calendar: primary,
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      },
    });

    return events.map(e => {
      const summary = e.data?.match(/SUMMARY:(.*)/)?.[1]?.trim() || 'Untitled';
      const uid = e.data?.match(/UID:(.*)/)?.[1]?.trim();
      const startStr = e.data?.match(/DTSTART[:;](?:.*:)?(.*)/)?.[1]?.trim();
      const endStr = e.data?.match(/DTEND[:;](?:.*:)?(.*)/)?.[1]?.trim();

      return {
        uid,
        summary,
        start: { dateTime: startStr ? new Date(startStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z')) : startTime },
        end: { dateTime: endStr ? new Date(endStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z')) : endTime },
      };
    });
  } catch (error: any) {
    console.error('getCalendarEvents failed', {
      msg: error.message,
      url: serverUrl,
      email
    });
    throw error;
  }
}

export async function createCalendarEvent(title: string, startTime: Date, durationMinutes: number) {
  const accessToken = await refreshGoogleToken();
  const settings = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, 'singleton'));

  if (!accessToken || !settings[0]) {
    console.warn('No valid Google access token or settings found for createCalendarEvent');
    return;
  }

  const email = (settings[0].googleCalendarId && settings[0].googleCalendarId !== 'primary')
    ? settings[0].googleCalendarId
    : 'primary';
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  const serverUrl = email !== 'primary'
    ? `https://apidata.googleusercontent.com/caldav/v2/${email}/user/`
    : 'https://apidata.googleusercontent.com/caldav/v2/';


  try {
    const client = new DAVClient({
      serverUrl,
      credentials: { accessToken },
      authMethod: 'Custom',
      authFunction: async () => ({
        authorization: `Bearer ${accessToken}`
      }),
      defaultAccountType: 'caldav',
    });

    await client.login();
    const calendars = await client.fetchCalendars();
    const primary = calendars.find(c => c.url.includes('primary') || c.url.includes(email)) || calendars[0];

    const uid = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const icalData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Prios//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${title}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    await client.createCalendarObject({
      calendar: primary,
      filename: `${uid}.ics`,
      iCalString: icalData,
    });
    return uid;
  } catch (error: any) {
    console.error('createCalendarEvent failed', { msg: error.message, url: serverUrl });
    throw error;
  }
}

export async function deleteCalendarEvent(uid: string) {
  const accessToken = await refreshGoogleToken();
  const settings = await db.select().from(schema.appSettings).where(eq(schema.appSettings.id, 'singleton'));

  if (!accessToken || !settings[0]) return;

  const email = (settings[0].googleCalendarId && settings[0].googleCalendarId !== 'primary')
    ? settings[0].googleCalendarId
    : 'primary';

  const serverUrl = email !== 'primary'
    ? `https://apidata.googleusercontent.com/caldav/v2/${email}/user/`
    : 'https://apidata.googleusercontent.com/caldav/v2/';

  try {
    const client = new DAVClient({
      serverUrl,
      credentials: { accessToken },
      authMethod: 'Custom',
      authFunction: async () => ({
        authorization: `Bearer ${accessToken}`
      }),
      defaultAccountType: 'caldav',
    });

    await client.login();
    const calendars = await client.fetchCalendars();
    const primary = calendars.find(c => c.url.includes('primary') || c.url.includes(email)) || calendars[0];

    // Construct object URL manually
    const objectUrl = primary.url.endsWith('/') ? `${primary.url}${uid}.ics` : `${primary.url}/${uid}.ics`;

    // @ts-ignore - deleteObject not publicly typed in some versions but exists
    await client.deleteObject(objectUrl);
    console.info('Deleted old calendar event', { uid });
  } catch (error: any) {
    // If it fails (e.g. 404), just log it and move on, don't block the new schedule
    console.warn('Failed to delete old calendar event', { msg: error.message, uid });
  }
}
