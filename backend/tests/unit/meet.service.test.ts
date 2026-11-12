import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/env", () => ({ env: {} }));
vi.mock("../../src/config/prisma", () => ({ prisma: {} }));

import {
  createGoogleMeetEvent,
  extractGoogleMeetLink,
  googleEventIdForAppointment,
} from "../../src/services/meet.service";

const config = {
  clientId: "client-id",
  clientSecret: "client-secret",
  refreshToken: "refresh-token",
  calendarId: "primary",
  clinicName: "SmileCare Clinic",
  timezone: "Asia/Kolkata",
  dentistEmail: "dentist@example.com",
};

const appointment = {
  id: "appt_123",
  startTime: new Date("2026-11-18T06:30:00.000Z"),
  endTime: new Date("2026-11-18T07:15:00.000Z"),
  consultationType: "VIDEO",
  meetLink: null,
  calendarEventId: null,
  patient: { name: "Test Patient", email: "patient@example.com" },
  treatment: { name: "Pediatric Dentistry" },
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Google Meet provisioning", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("derives a stable, Google-compatible event ID for an appointment", () => {
    const first = googleEventIdForAppointment("appt_123");
    expect(first).toBe(googleEventIdForAppointment("appt_123"));
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(googleEventIdForAppointment("appt_456"));
  });

  it("requests a unique Meet conference and invites patient and clinic", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes("oauth2.googleapis.com")) return jsonResponse({ access_token: "access-token" });
      return jsonResponse({
        id: googleEventIdForAppointment(appointment.id),
        conferenceData: { entryPoints: [{ entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" }] },
      });
    }) as unknown as typeof fetch;

    const result = await createGoogleMeetEvent(appointment, config, { fetcher });
    expect(result.meetLink).toBe("https://meet.google.com/abc-defg-hij");
    expect(result.eventId).toBe(googleEventIdForAppointment(appointment.id));
    expect(calls).toHaveLength(2);

    const insert = calls[1];
    expect(insert.url).toContain("conferenceDataVersion=1");
    expect(insert.url).toContain("sendUpdates=all");
    const body = JSON.parse(String(insert.init?.body));
    expect(body.conferenceData.createRequest.conferenceSolutionKey.type).toBe("hangoutsMeet");
    expect(body.attendees).toEqual([
      { email: "patient@example.com" },
      { email: "dentist@example.com" },
    ]);
  });

  it("recovers an already-created event after an insert conflict", async () => {
    const eventId = googleEventIdForAppointment(appointment.id);
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "access-token" }))
      .mockResolvedValueOnce(new Response("", { status: 409 }))
      .mockResolvedValueOnce(jsonResponse({
        id: eventId,
        hangoutLink: "https://meet.google.com/recovered-link",
      }));

    const result = await createGoogleMeetEvent(appointment, config, { fetcher: fetcher as unknown as typeof fetch });
    expect(result).toEqual({ eventId, meetLink: "https://meet.google.com/recovered-link" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("extracts the video entry point rather than a phone entry point", () => {
    expect(extractGoogleMeetLink({
      conferenceData: {
        entryPoints: [
          { entryPointType: "phone", uri: "tel:+100000000" },
          { entryPointType: "video", uri: "https://meet.google.com/video-link" },
        ],
      },
    })).toBe("https://meet.google.com/video-link");
  });

  it("fails clearly when OAuth credentials are incomplete", async () => {
    const { refreshToken: _refreshToken, ...incompleteConfig } = config;
    await expect(createGoogleMeetEvent(appointment, incompleteConfig))
      .rejects.toThrow("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN");
  });
});
