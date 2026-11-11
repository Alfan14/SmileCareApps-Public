import type { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { HttpError } from "../middleware/errors";
import {
  addDateKeyDays,
  clinicDateStart,
  clinicDayRange,
  currentClinicDateKey,
  dateKeyForInstant,
  inclusiveDateKeys,
  startOfClinicMonth,
} from "../utils/clinic-date";
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

function pageInfo(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function getOwnerDashboard(query: OwnerDashboardQuery) {
  const now = new Date();
  const todayKey = currentClinicDateKey(now);
  const today = clinicDayRange(todayKey);
  const tomorrowKey = addDateKeyDays(todayKey, 1);
  const rangeDays = query.range === "30d" ? 30 : 7;
  const chartFromKey = addDateKeyDays(todayKey, -(rangeDays - 1));
  const chartFrom = clinicDateStart(chartFromKey);
  const chartTo = clinicDateStart(tomorrowKey);
  const monthStart = startOfClinicMonth(now);

  const [totalPatients, appointmentsToday, pendingAppointments, completedThisMonth, revenueMonth, chartAppointments, chartPayments, upcomingSchedule] = await Promise.all([
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.appointment.count({ where: { startTime: today, status: { not: "CANCELLED" } } }),
    prisma.appointment.count({ where: { status: "PENDING", OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }] } }),
    prisma.appointment.count({ where: { status: "COMPLETED", startTime: { gte: monthStart, lt: chartTo } } }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: monthStart, lt: chartTo } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where: { startTime: { gte: chartFrom, lt: chartTo } },
      select: { startTime: true, status: true },
    }),
    prisma.payment.findMany({
      where: { status: "PAID", paidAt: { gte: chartFrom, lt: chartTo } },
      select: { amount: true, paidAt: true },
    }),
    prisma.appointment.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED"] }, startTime: { gte: now } },
      orderBy: { startTime: "asc" },
      take: 8,
      select: {
        id: true, startTime: true, endTime: true, status: true, consultationType: true,
        patient: { select: { id: true, name: true, email: true, phone: true } },
        treatment: { select: { id: true, name: true, slug: true, durationMin: true } },
        payment: { select: { status: true, amount: true, currency: true, paidAt: true } },
      },
    }),
  ]);

  const dayKeys = inclusiveDateKeys(chartFromKey, todayKey);
  const bookingCounts = new Map<string, number>(dayKeys.map((key) => [key, 0] as const));
  const revenueCounts = new Map<string, number>(dayKeys.map((key) => [key, 0] as const));
  const statusCounts = new Map<string, number>();
  for (const appointment of chartAppointments) {
    const key = dateKeyForInstant(appointment.startTime);
    if (bookingCounts.has(key)) bookingCounts.set(key, (bookingCounts.get(key) ?? 0) + 1);
    statusCounts.set(appointment.status, (statusCounts.get(appointment.status) ?? 0) + 1);
  }
  for (const payment of chartPayments) {
    if (!payment.paidAt) continue;
    const key = dateKeyForInstant(payment.paidAt);
    if (revenueCounts.has(key)) revenueCounts.set(key, (revenueCounts.get(key) ?? 0) + payment.amount);
  }

  return {
    timezone: env.CLINIC_TIMEZONE,
    range: query.range,
    summary: {
      totalPatients,
      appointmentsToday,
      pendingAppointments,
      completedThisMonth,
      revenuePaiseThisMonth: revenueMonth._sum.amount ?? 0,
      paidTransactionsThisMonth: revenueMonth._count._all,
      currency: "inr",
    },
    charts: {
      bookingsByDay: dayKeys.map((date) => ({ date, count: bookingCounts.get(date) ?? 0 })),
      revenueByDay: dayKeys.map((date) => ({ date, revenuePaise: revenueCounts.get(date) ?? 0, currency: "inr" })),
      appointmentsByStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
    },
    upcomingSchedule,
  };
}

const SCHEDULE_SELECT = {
  id: true, startTime: true, endTime: true, status: true, consultationType: true,
  notes: true, isNewPatient: true, createdAt: true, holdExpiresAt: true,
  cancelledAt: true, cancelReason: true, cancelledBy: true, rescheduleCount: true,
  patient: { select: { id: true, name: true, email: true, phone: true } },
  treatment: { select: { id: true, name: true, slug: true, durationMin: true } },
  payment: { select: { status: true, amount: true, currency: true, paidAt: true, failureReason: true } },
  record: { select: { id: true, title: true, date: true } },
} as const;

export async function listOwnerSchedule(query: OwnerScheduleQuery) {
  const todayKey = currentClinicDateKey();
  const fromKey = query.from ?? query.date ?? query.to ?? todayKey;
  const toKey = query.to ?? query.date ?? fromKey;
  const from = clinicDateStart(fromKey);
  const to = clinicDateStart(addDateKeyDays(toKey, 1));
  const where: Prisma.AppointmentWhereInput = {
    startTime: { gte: from, lt: to },
    ...(query.status ? { status: query.status as AppointmentStatus } : {}),
    ...(query.treatmentId ? { treatmentId: query.treatmentId } : {}),
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.consultationType ? { consultationType: query.consultationType } : {}),
    ...(query.paymentStatus ? { payment: { is: { status: query.paymentStatus } } } : {}),
    ...(query.q ? {
      patient: { is: { OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        { phone: { contains: query.q } },
      ] } },
    } : {}),
  };
  const orderBy = { startTime: query.sort } as const;

  if (query.view === "calendar") {
    // One query for the whole visible range; the UI draws the month/week grid from `days`.
    const rows = await prisma.appointment.findMany({ where, orderBy, take: 1000, select: SCHEDULE_SELECT });
    const days: Record<string, typeof rows> = {};
    for (const row of rows) (days[dateKeyForInstant(row.startTime)] ??= []).push(row);
    return {
      view: "calendar" as const,
      range: { from: fromKey, to: toKey },
      days,
      counts: Object.fromEntries(Object.entries(days).map(([k, v]) => [k, v.length])),
      truncated: rows.length === 1000,
    };
  }

  const [total, data] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where, orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: SCHEDULE_SELECT,
    }),
  ]);
  return { data, range: { from: fromKey, to: toKey }, pagination: pageInfo(query.page, query.limit, total) };
}

/** Dentist closes out a visit. Only CONFIRMED appointments that have already started can be completed / no-show. */
export async function setAppointmentOutcome(id: string, status: "COMPLETED" | "NO_SHOW", now: Date = new Date()) {
  const appt = await prisma.appointment.findUnique({ where: { id }, select: { id: true, status: true, startTime: true } });
  if (!appt) throw new HttpError(404, "NOT_FOUND", "Appointment not found");
  if (appt.status !== "CONFIRMED") throw new HttpError(409, "NOT_CONFIRMED", "Only confirmed appointments can be marked completed or no-show");
  if (appt.startTime > now) throw new HttpError(409, "NOT_STARTED", "This appointment has not started yet");
  const { count } = await prisma.appointment.updateMany({ where: { id, status: "CONFIRMED" }, data: { status } });
  if (count === 0) throw new HttpError(409, "CONFLICT", "This appointment was already changed. Refresh and try again.");
  return { id, status };
}

export async function listWorkingHours() {
  return prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } });
}

export async function updateWorkingHours(dayOfWeek: number, input: WorkingHoursBody) {
  const data = {
    startTime: input.startTime,
    endTime: input.endTime,
    breakStart: input.breakStart ?? null,
    breakEnd: input.breakEnd ?? null,
    slotMinutes: input.slotMinutes,
    isOff: input.isOff,
  };
  return prisma.workingHours.upsert({
    where: { dayOfWeek },
    update: data,
    create: { dayOfWeek, ...data },
  });
}

export async function listBlockedDates(query: BlockedDatesQuery) {
  const todayKey = currentClinicDateKey();
  const fromKey = query.from ?? query.to ?? todayKey;
  const toKey = query.to ?? addDateKeyDays(fromKey, 30);
  const data = await prisma.blockedDate.findMany({
    where: { date: { gte: clinicDateStart(fromKey), lt: clinicDateStart(addDateKeyDays(toKey, 1)) } },
    orderBy: { date: "asc" },
  });
  return {
    range: { from: fromKey, to: toKey },
    data: data.map((item) => ({ date: dateKeyForInstant(item.date), reason: item.reason })),
  };
}

export async function createBlockedDate(input: CreateBlockedDateBody) {
  const todayKey = currentClinicDateKey();
  if (input.date < todayKey) throw new HttpError(422, "PAST_BLOCKED_DATE", "Cannot block a date in the past");
  const day = clinicDayRange(input.date);
  const existingBookings = await prisma.appointment.count({
    where: {
      startTime: { lt: day.lt },
      endTime: { gt: day.gte },
      status: { in: ["PENDING", "CONFIRMED"] },
      OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: new Date() } }],
    },
  });
  if (existingBookings > 0) {
    throw new HttpError(409, "DATE_HAS_BOOKINGS", "Cannot block this date while pending or confirmed appointments exist");
  }
  const date = clinicDateStart(input.date);
  const record = await prisma.blockedDate.create({ data: { date, reason: input.reason?.trim() || null } });
  return { date: dateKeyForInstant(record.date), reason: record.reason };
}

export async function deleteBlockedDate(dateKey: string) {
  const date = clinicDateStart(dateKey);
  try {
    await prisma.blockedDate.delete({ where: { date } });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      throw new HttpError(404, "BLOCKED_DATE_NOT_FOUND", "Blocked date not found");
    }
    throw error;
  }
  return { date: dateKey, deleted: true };
}

export async function listOwnerPatients(query: OwnerPatientsQuery) {
  const search = query.search?.trim();
  const where = {
    role: "PATIENT" as const,
    ...(search ? { OR: [
      { name: { contains: search, mode: "insensitive" as const } },
      { email: { contains: search, mode: "insensitive" as const } },
      { phone: { contains: search } },
    ] } : {}),
  };
  const [total, data] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where, orderBy: { name: "asc" }, skip: (query.page - 1) * query.limit, take: query.limit,
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    }),
  ]);
  return { data, pagination: pageInfo(query.page, query.limit, total) };
}

export async function listOwnerRecords(query: OwnerRecordQuery) {
  const where = query.patientId ? { patientId: query.patientId } : {};
  const [total, data] = await Promise.all([
    prisma.treatmentRecord.count({ where }),
    prisma.treatmentRecord.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true, patientId: true, appointmentId: true, toothNo: true, title: true, summary: true, date: true,
        patient: { select: { id: true, name: true, email: true } },
        appointment: { select: { id: true, startTime: true, status: true, treatment: { select: { name: true } } } },
        prescriptions: { select: { id: true, medicine: true, instructions: true, date: true } },
      },
    }),
  ]);
  return { data, pagination: pageInfo(query.page, query.limit, total) };
}

export async function createOwnerRecord(input: CreateOwnerRecordBody) {
  const patient = await prisma.user.findFirst({ where: { id: input.patientId, role: "PATIENT" }, select: { id: true } });
  if (!patient) throw new HttpError(404, "PATIENT_NOT_FOUND", "Patient not found");
  if (input.appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: input.appointmentId, patientId: input.patientId },
      select: { id: true, status: true },
    });
    if (!appointment) throw new HttpError(404, "APPOINTMENT_NOT_FOUND", "Appointment not found for this patient");
    if (appointment.status !== "COMPLETED") {
      throw new HttpError(409, "APPOINTMENT_NOT_COMPLETED", "Treatment records can only be linked to completed appointments");
    }
  }
  const record = await prisma.treatmentRecord.create({
    data: {
      patientId: input.patientId,
      appointmentId: input.appointmentId ?? null,
      toothNo: input.toothNo?.trim() || null,
      title: input.title.trim(),
      summary: input.summary.trim(),
      ...(input.date ? { date: input.date } : {}),
      ...(input.prescriptions.length ? {
        prescriptions: {
          create: input.prescriptions.map((prescription) => ({
            patientId: input.patientId,
            medicine: prescription.medicine,
            instructions: prescription.instructions,
          })),
        },
      } : {}),
    },
    include: { prescriptions: true, patient: { select: { id: true, name: true, email: true } } },
  });
  return record;
}
