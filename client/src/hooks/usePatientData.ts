import { getInvoice, getMyAppointments, getMyInvoices, getMyPrescriptions, getMyRecords } from "../api/patient.api";
import { useOwnQuery } from "./useOwnQuery";

export const useMyAppointments = () => useOwnQuery("patient", ["appointments"], getMyAppointments);
export const useMyRecords = () => useOwnQuery("patient", ["records"], getMyRecords);
export const useMyPrescriptions = () => useOwnQuery("patient", ["prescriptions"], getMyPrescriptions);
export const useMyInvoices = () => useOwnQuery("patient", ["invoices"], getMyInvoices);
export const useInvoice = (id: string) => useOwnQuery("patient", ["invoice", id], () => getInvoice(id), { enabled: id !== "" });
