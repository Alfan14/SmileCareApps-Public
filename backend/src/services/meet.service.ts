import { createHash } from "node:crypto";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

type MeetAppointment = {
  id: string;
  startTime: Date;
  endTime: Date;
  consultationType: string;
  meetLink: string | null;
  calendarEventId: string | null;
  patient: { name: string; email: string };
  treatment: { name: string };
};

type GoogleCalendarConfig = {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  calendarId?: string;
  clinicName: string;
  timezone: string;
  dentistEmail?: string;
};

type FetchLike = typeof fetch;
type CalendarEvent = {
  id?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
    createRequest?: { status?: { statusCode?: string } };
  };
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

/** Deterministic Google event ID: a retry after a network timeout cannot create a second event. */
export function googleEventIdForAppointment(appointmentId: string): string {
  return createHash("sha256").update(`smilecare:${appointmentId}`).digest("hex");
}

export function extractGoogleMeetLink(event: CalendarEvent): string | null {
  const video = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video" && typeof entry.uri === "string",
  );
  return video?.uri ?? event.hangoutLink ?? null;
}

function assertGoogleConfig(config: GoogleCalendarConfig): asserts config is GoogleCalendarConfig & {
  clientId: string; clientSecret: string; refreshToken: string;
} {
  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    throw new Error(
      "Google Meet is enabled but GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN are not all configured",
    );
  }
}

async function readGoogleError(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  return `Google Calendar API returned HTTP ${response.status}${body ? `: ${body.slice(0, 500)}` : ""}`;
}

async function getAccessToken(config: GoogleCalendarConfig, fetcher: FetchLike): Promise<string> {
  assertGoogleConfig(config);
  const response = await fetcher(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(await readGoogleError(response));
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("Google OAuth token response did not contain access_token");
  return payload.access_token;
}

async function getCalendarEvent(
  calendarId: string,
  eventId: string,
  accessToken: string,
  fetcher: FetchLike,
): Promise<Response> {
  return fetcher(
    `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
}

/**
 * Creates or recovers a unique Meet event. Google Calendar's custom event ID is deterministic,
 * making an insert retry safe even if Google created the event but the backend timed out.
 */
export async function createGoogleMeetEvent(
  appointment: MeetAppointment,
  config: GoogleCalendarConfig,
  options: { fetcher?: FetchLike; pollAttempts?: number; wait?: (ms: number) => Promise<void> } = {},
): Promise<{ eventId: string; meetLink: string }> {
  assertGoogleConfig(config);
  const fetcher = options.fetcher ?? fetch;
  const pollAttempts = options.pollAttempts ?? 5;
  const wait = options.wait ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const accessToken = await getAccessToken(config, fetcher);
  const calendarId = config.calendarId || "primary";
  const eventId = googleEventIdForAppointment(appointment.id);

  let event: CalendarEvent | null = null;
  if (appointment.calendarEventId) {
    const existing = await getCalendarEvent(calendarId, eventId, accessToken, fetcher);
    if (existing.ok) event = (await existing.json()) as CalendarEvent;
    else if (existing.status !== 404) throw new Error(await readGoogleError(existing));
  }

  if (!event) {
    const attendees = [appointment.patient.email, config.dentistEmail]
      .filter((email): email is string => Boolean(email))
      .filter((email, index, all) => all.indexOf(email) === index)
      .map((email) => ({ email }));

    const insert = await fetcher(
      `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: eventId,
          summary: `${config.clinicName} — Video consultation`,
          description: `SmileCare appointment reference: ${appointment.id}`,
          start: { dateTime: appointment.startTime.toISOString(), timeZone: config.timezone },
          end: { dateTime: appointment.endTime.toISOString(), timeZone: config.timezone },
          attendees,
          conferenceData: {
            createRequest: {
              requestId: eventId,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      },
    );

    if (insert.ok) {
      event = (await insert.json()) as CalendarEvent;
    } else if (insert.status === 409) {
      // Previous request may have succeeded even though its response never reached this server.
      const existing = await getCalendarEvent(calendarId, eventId, accessToken, fetcher);
      if (!existing.ok) throw new Error(await readGoogleError(existing));
      event = (await existing.json()) as CalendarEvent;
    } else {
      throw new Error(await readGoogleError(insert));
    }
  }

  let meetLink = extractGoogleMeetLink(event);
  for (let attempt = 0; !meetLink && attempt < pollAttempts; attempt += 1) {
    await wait(1000);
    const refreshed = await getCalendarEvent(calendarId, eventId, accessToken, fetcher);
    if (!refreshed.ok) throw new Error(await readGoogleError(refreshed));
    event = (await refreshed.json()) as CalendarEvent;
    meetLink = extractGoogleMeetLink(event);
  }

  if (!meetLink) {
    const state = event?.conferenceData?.createRequest?.status?.statusCode ?? "unknown";
    throw new Error(`Google Meet conference is not ready yet (status: ${state}); retry the appointment Meet provisioning`);
  }

  return { eventId, meetLink };
}

/**
 * Provision only after the payment transaction has confirmed the appointment. A Calendar outage
 * must not roll back a paid appointment; the Stripe webhook retry path calls this again.
 */
export async function ensureMeetLinkForAppointment(appointmentId: string): Promise<string | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, treatment: true },
  });
  if (!appointment || appointment.consultationType !== "VIDEO") return null;
  if (appointment.meetLink) return appointment.meetLink;

  if (!env.GOOGLE_MEET_ENABLED) {
    const fallbackLink = env.MEET_LINK ?? null;
    if (fallbackLink) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { meetLink: fallbackLink },
      });
    }
    return fallbackLink;
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { meetStatus: "PENDING" },
  });

  try {
    const googleConfig: GoogleCalendarConfig = {
      ...(env.GOOGLE_CLIENT_ID ? { clientId: env.GOOGLE_CLIENT_ID } : {}),
      ...(env.GOOGLE_CLIENT_SECRET ? { clientSecret: env.GOOGLE_CLIENT_SECRET } : {}),
      ...(env.GOOGLE_REFRESH_TOKEN ? { refreshToken: env.GOOGLE_REFRESH_TOKEN } : {}),
      calendarId: env.GOOGLE_CALENDAR_ID,
      clinicName: env.CLINIC_NAME,
      timezone: env.CLINIC_TIMEZONE,
      ...(env.DENTIST_EMAIL ? { dentistEmail: env.DENTIST_EMAIL } : {}),
    };
    const result = await createGoogleMeetEvent(appointment as MeetAppointment, googleConfig);
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        calendarEventId: result.eventId,
        meetLink: result.meetLink,
        meetCreatedAt: new Date(),
        meetStatus: "CREATED",
      },
    });
    return result.meetLink;
  } catch (error) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { meetStatus: "FAILED" },
    }).catch((updateError) => console.error("Could not record Google Meet failure", updateError));
    throw error;
  }
}
