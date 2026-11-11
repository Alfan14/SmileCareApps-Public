import { api, BASE } from "./client";
import type {
  MyAppointment,
  MyRecord,
  MyPrescription,
  MyInvoice,
} from "../types/api";

type ApiListResponse<T> =
  | T[]
  | {
      data?: T[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      [key: string]: unknown;
    };

// Handle direct arrays, paginated responses, and legacy responses.
function extractList<T>(
  response: ApiListResponse<T>,
  legacyKey: string,
): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  const legacyData = response[legacyKey];

  if (Array.isArray(legacyData)) {
    return legacyData as T[];
  }

  return [];
}

export async function getMyAppointments(): Promise<MyAppointment[]> {
  const res = await api<ApiListResponse<MyAppointment>>(
    "/patient/appointments?page=1&limit=100",
  );

  return extractList(res, "appointments");
}

export async function getMyRecords(): Promise<MyRecord[]> {
  const res = await api<ApiListResponse<MyRecord>>(
    "/patient/records?page=1&limit=100",
  );

  return extractList(res, "records");
}

export async function getMyPrescriptions(): Promise<MyPrescription[]> {
  const res = await api<ApiListResponse<MyPrescription>>(
    "/patient/prescriptions?page=1&limit=100",
  );

  return extractList(res, "prescriptions");
}

export async function getMyInvoices(): Promise<MyInvoice[]> {
  const res = await api<ApiListResponse<MyInvoice>>(
    "/patient/invoices?page=1&limit=100",
  );

  return extractList(res, "invoices");
}

type InvoiceDetailResponse =
  | MyInvoice
  | { invoice?: MyInvoice }
  | { data?: MyInvoice | { invoice?: MyInvoice } };

export async function getInvoice(id: string): Promise<MyInvoice> {
  const res = await api<InvoiceDetailResponse>(
    `/patient/invoices/${encodeURIComponent(id)}`,
  );

  if ("invoice" in res && res.invoice) {
    return res.invoice;
  }

  if ("data" in res && res.data) {
    if ("invoice" in res.data && res.data.invoice) {
      return res.data.invoice;
    }

    return res.data as MyInvoice;
  }

  return res as MyInvoice;
}

/** Download link for a treatment report PDF. A plain link works because the session cookie is sent with the navigation. */
export const recordPdfUrl = (recordId: string) => `${BASE}/patient/records/${encodeURIComponent(recordId)}/pdf`;
