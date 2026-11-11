import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errors";
import type { PatientAppointmentsQuery, PatientListQuery } from "../validators/patient-dashboard.schema";

function pageInfo(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function getPatientDashboard(patientId: string) {
  const now = new Date();
  const [upcomingAppointments, completedAppointments, records, prescriptions, invoices, upcoming] = await Promise.all([
    prisma.appointment.count({
      where: { patientId, status: { in: ["PENDING", "CONFIRMED"] }, startTime: { gte: now } },
    }),
    prisma.appointment.count({ where: { patientId, status: "COMPLETED" } }),
    prisma.treatmentRecord.count({ where: { patientId } }),
    prisma.prescription.count({ where: { patientId } }),
    prisma.invoice.count({
      where: { payment: { is: { status: "PAID", appointment: { is: { patientId } } } } },
    }),
    prisma.appointment.findMany({
      where: { patientId, status: { in: ["PENDING", "CONFIRMED"] }, startTime: { gte: now } },
      orderBy: { startTime: "asc" },
      take: 5,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        consultationType: true,
        meetLink: true,
        treatment: { select: { name: true, slug: true, durationMin: true } },
        payment: { select: { status: true, amount: true, currency: true, paidAt: true } },
      },
    }),
  ]);

  return {
    summary: { upcomingAppointments, completedAppointments, records, prescriptions, invoices },
    upcomingAppointments: upcoming,
  };
}

export async function listPatientAppointments(patientId: string, query: PatientAppointmentsQuery) {
  const where = {
    patientId,
    ...(query.status ? { status: query.status as AppointmentStatus } : {}),
  };
  const [total, data] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { startTime: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        consultationType: true,
        meetLink: true,
        notes: true,
        isNewPatient: true,
        createdAt: true,
        cancelledAt: true,
        cancelReason: true,
        rescheduleCount: true,
        review: { select: { id: true, approved: true } },
        treatment: { select: { id: true, name: true, slug: true, durationMin: true, priceMin: true, priceMax: true } },
        payment: { select: { status: true, amount: true, currency: true, paidAt: true, failureReason: true } },
      },
    }),
  ]);
  return { data, pagination: pageInfo(query.page, query.limit, total) };
}

export async function listPatientRecords(patientId: string, query: PatientListQuery) {
  const where = { patientId };
  const [total, data] = await Promise.all([
    prisma.treatmentRecord.count({ where }),
    prisma.treatmentRecord.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        appointmentId: true,
        toothNo: true,
        title: true,
        summary: true,
        date: true,
      },
    }),
  ]);
  return { data, pagination: pageInfo(query.page, query.limit, total) };
}

export async function listPatientPrescriptions(patientId: string, query: PatientListQuery) {
  const where = { patientId };
  const [total, data] = await Promise.all([
    prisma.prescription.count({ where }),
    prisma.prescription.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        recordId: true,
        medicine: true,
        instructions: true,
        date: true,
      },
    }),
  ]);
  return { data, pagination: pageInfo(query.page, query.limit, total) };
}

export async function listPatientInvoices(patientId: string, query: PatientListQuery) {
  const where = {
    payment: { is: { status: "PAID" as const, appointment: { is: { patientId } } } },
  };
  const [total, data] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        number: true,
        issuedAt: true,
        emailSentAt: true,
        payment: {
          select: {
            amount: true,
            currency: true,
            status: true,
            paidAt: true,
            appointment: {
              select: {
                id: true,
                startTime: true,
                endTime: true,
                treatment: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
    }),
  ]);
  return { data, pagination: pageInfo(query.page, query.limit, total) };
}

export async function getPatientInvoice(patientId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      payment: { is: { status: "PAID", appointment: { is: { patientId } } } },
    },
    select: {
      id: true,
      number: true,
      issuedAt: true,
      emailSentAt: true,
      payment: {
        select: {
          amount: true,
          currency: true,
          status: true,
          paidAt: true,
          appointment: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              consultationType: true,
              treatment: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  });
  if (!invoice) throw new HttpError(404, "INVOICE_NOT_FOUND", "Invoice not found");
  return invoice;
}
