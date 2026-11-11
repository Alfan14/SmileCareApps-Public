import type { Request, Response, NextFunction } from "express";
import {
  createBlockedDate,
  createOwnerRecord,
  deleteBlockedDate,
  getOwnerDashboard,
  listBlockedDates,
  listOwnerPatients,
  listOwnerRecords,
  listOwnerSchedule,
  listWorkingHours,
  updateWorkingHours,
} from "../services/owner-dashboard.service";
import type {
  BlockedDatesQuery,
  CreateBlockedDateBody,
  CreateOwnerRecordBody,
  OwnerDashboardQuery,
  OwnerRecordQuery,
  OwnerPatientsQuery,
  OwnerScheduleQuery,
  WorkingHoursBody,
} from "../validators/owner-dashboard.schema";
import { HttpError } from "../middleware/errors";
import { cancelAppointmentAsOwner } from "../services/appointments.service";
import { retryRefund } from "../services/payments.service";
import { setAppointmentOutcome } from "../services/owner-dashboard.service";
import { streamTreatmentReportPdf } from "../services/report-pdf.service";

function ensureOwner(req: Request): void {
  if (!req.user?.id) throw new HttpError(401, "UNAUTHENTICATED", "Please log in");
  if (req.user.role !== "OWNER") throw new HttpError(403, "FORBIDDEN", "Owner access required");
}

export async function dashboard(req: Request, res: Response, next: NextFunction) {
  try { ensureOwner(req); res.json(await getOwnerDashboard(res.locals.query as OwnerDashboardQuery)); } catch (error) { next(error); }
}
export async function schedule(req: Request, res: Response, next: NextFunction) {
  try { ensureOwner(req); res.json(await listOwnerSchedule(res.locals.query as OwnerScheduleQuery)); } catch (error) { next(error); }
}
export async function workingHours(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ data: await listWorkingHours() }); } catch (error) { next(error); }
}
export async function updateHours(req: Request, res: Response, next: NextFunction) {
  try {
    const { dayOfWeek } = res.locals.params as { dayOfWeek: number };
    const body = res.locals.body as WorkingHoursBody;
    res.json({ workingHours: await updateWorkingHours(dayOfWeek, body) });
  } catch (error) { next(error); }
}
export async function blockedDates(req: Request, res: Response, next: NextFunction) {
  try { res.json(await listBlockedDates(res.locals.query as BlockedDatesQuery)); } catch (error) { next(error); }
}
export async function createBlocked(req: Request, res: Response, next: NextFunction) {
  try {
    const body = res.locals.body as CreateBlockedDateBody;
    res.status(201).json({ blockedDate: await createBlockedDate(body) });
  } catch (error) { next(error); }
}
export async function removeBlocked(req: Request, res: Response, next: NextFunction) {
  try {
    const { date } = res.locals.params as { date: string };
    res.json(await deleteBlockedDate(date));
  } catch (error) { next(error); }
}
export async function patients(req: Request, res: Response, next: NextFunction) {
  try { res.json(await listOwnerPatients(res.locals.query as OwnerPatientsQuery)); } catch (error) { next(error); }
}
export async function records(req: Request, res: Response, next: NextFunction) {
  try { res.json(await listOwnerRecords(res.locals.query as OwnerRecordQuery)); } catch (error) { next(error); }
}
export async function createRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const body = res.locals.body as CreateOwnerRecordBody;
    res.status(201).json({ record: await createOwnerRecord(body) });
  } catch (error) { next(error); }
}

export async function setOutcome(req: Request, res: Response, next: NextFunction) {
  try {
    ensureOwner(req);
    const { id } = res.locals.params as { id: string };
    const { status } = res.locals.body as { status: "COMPLETED" | "NO_SHOW" };
    res.json(await setAppointmentOutcome(id, status));
  } catch (error) { next(error); }
}
export async function cancelAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    ensureOwner(req);
    const { id } = res.locals.params as { id: string };
    const { reason } = res.locals.body as { reason?: string };
    res.json(await cancelAppointmentAsOwner(id, reason));
  } catch (error) { next(error); }
}
export async function retryAppointmentRefund(req: Request, res: Response, next: NextFunction) {
  try {
    ensureOwner(req);
    const { id } = res.locals.params as { id: string };
    res.json(await retryRefund(id));
  } catch (error) { next(error); }
}
export async function recordPdf(req: Request, res: Response, next: NextFunction) {
  try {
    ensureOwner(req);
    const { recordId } = res.locals.params as { recordId: string };
    await streamTreatmentReportPdf(res, recordId, { role: "OWNER" });
  } catch (error) { next(error); }
}
