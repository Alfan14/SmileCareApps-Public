import type { Request, Response, NextFunction } from "express";
import {
  getPatientDashboard,
  getPatientInvoice,
  listPatientAppointments,
  listPatientInvoices,
  listPatientPrescriptions,
  listPatientRecords,
} from "../services/patient-dashboard.service";
import type { PatientAppointmentsQuery, PatientListQuery } from "../validators/patient-dashboard.schema";
import { HttpError } from "../middleware/errors";
import { streamTreatmentReportPdf } from "../services/report-pdf.service";

function patientId(req: Request): string {
  if (!req.user?.id) throw new HttpError(401, "UNAUTHENTICATED", "Please log in");
  return req.user.id;
}

export async function dashboard(req: Request, res: Response, next: NextFunction) {
  try { res.json(await getPatientDashboard(patientId(req))); } catch (err) { next(err); }
}

export async function appointments(req: Request, res: Response, next: NextFunction) {
  try { res.json(await listPatientAppointments(patientId(req), res.locals.query as PatientAppointmentsQuery)); } catch (err) { next(err); }
}

export async function records(req: Request, res: Response, next: NextFunction) {
  try { res.json(await listPatientRecords(patientId(req), res.locals.query as PatientListQuery)); } catch (err) { next(err); }
}

export async function prescriptions(req: Request, res: Response, next: NextFunction) {
  try { res.json(await listPatientPrescriptions(patientId(req), res.locals.query as PatientListQuery)); } catch (err) { next(err); }
}

export async function invoices(req: Request, res: Response, next: NextFunction) {
  try { res.json(await listPatientInvoices(patientId(req), res.locals.query as PatientListQuery)); } catch (err) { next(err); }
}

export async function invoiceDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { invoiceId } = res.locals.params as { invoiceId: string };
    res.json({ invoice: await getPatientInvoice(patientId(req), invoiceId) });
  } catch (err) { next(err); }
}

export async function recordPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const { recordId } = res.locals.params as { recordId: string };
    await streamTreatmentReportPdf(res, recordId, { role: "PATIENT", patientId: patientId(req) });
  } catch (err) { next(err); }
}
