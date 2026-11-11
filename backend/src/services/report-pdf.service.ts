import type { Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { HttpError } from "../middleware/errors";

type Viewer = { role: "PATIENT"; patientId: string } | { role: "OWNER" };

const fmt = (d: Date, opts: Intl.DateTimeFormatOptions = { dateStyle: "long" }) =>
  new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: env.CLINIC_TIMEZONE }).format(d);

/** Load a record the viewer may see. Patients get a 404 for anyone else's record. */
export async function loadReport(recordId: string, viewer: Viewer) {
  const record = await prisma.treatmentRecord.findFirst({
    where: { id: recordId, ...(viewer.role === "PATIENT" ? { patientId: viewer.patientId } : {}) },
    include: {
      patient: { select: { name: true, email: true, phone: true, dob: true } },
      appointment: { select: { startTime: true, consultationType: true, treatment: { select: { name: true } } } },
      prescriptions: { orderBy: { date: "asc" } },
    },
  });
  if (!record) throw new HttpError(404, "NOT_FOUND", "Treatment record not found");
  return record;
}

type Report = Awaited<ReturnType<typeof loadReport>>;

/** Render the report to a Buffer (kept separate from HTTP so it is unit-testable). */
export function renderReportPdf(r: Report): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `Treatment report - ${r.title}`, Author: env.CLINIC_NAME } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const heading = (text: string) => doc.moveDown(1).fontSize(12).fillColor("#0f766e").font("Helvetica-Bold").text(text.toUpperCase()).moveDown(0.3).fillColor("#111827").font("Helvetica").fontSize(11);
    const row = (label: string, value: string) => doc.font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(value);

    doc.fontSize(20).fillColor("#0f766e").font("Helvetica-Bold").text(env.CLINIC_NAME);
    doc.fontSize(10).fillColor("#6b7280").font("Helvetica").text(env.CLINIC_ADDRESS);
    doc.moveDown(0.5).fontSize(16).fillColor("#111827").font("Helvetica-Bold").text("Treatment Report");

    heading("Patient");
    row("Name", r.patient.name);
    row("Email", r.patient.email);
    if (r.patient.phone) row("Phone", r.patient.phone);
    if (r.patient.dob) row("Date of birth", fmt(r.patient.dob));

    heading("Visit");
    row("Date", fmt(r.date));
    if (r.appointment) {
      row("Appointment", fmt(r.appointment.startTime, { dateStyle: "medium", timeStyle: "short" }));
      row("Treatment", r.appointment.treatment.name);
    }
    if (r.toothNo) row("Tooth no.", r.toothNo);

    heading("Procedure");
    doc.font("Helvetica-Bold").text(r.title).font("Helvetica").moveDown(0.3).text(r.summary, { align: "left" });

    heading("Prescriptions");
    if (r.prescriptions.length === 0) doc.fillColor("#6b7280").text("No medicines were prescribed.").fillColor("#111827");
    r.prescriptions.forEach((p, i) => {
      doc.font("Helvetica-Bold").text(`${i + 1}. ${p.medicine}`).font("Helvetica").text(p.instructions, { indent: 16 }).moveDown(0.3);
    });

    doc.moveDown(2).fontSize(9).fillColor("#6b7280")
      .text(`Generated on ${fmt(new Date(), { dateStyle: "medium", timeStyle: "short" })}. This report is a summary for your records and does not replace professional medical advice.`, { align: "center" });
    doc.end();
  });
}

export async function streamTreatmentReportPdf(res: Response, recordId: string, viewer: Viewer): Promise<void> {
  const report = await loadReport(recordId, viewer);
  const pdf = await renderReportPdf(report);
  res.status(200);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="treatment-report-${report.id}.pdf"`);
  res.setHeader("Cache-Control", "private, no-store"); // medical data: never cache in shared proxies
  res.setHeader("Content-Length", String(pdf.length));
  res.end(pdf);
}
