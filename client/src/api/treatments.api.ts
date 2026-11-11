import type { Treatment } from "../types/api";
import { api } from "./client";

export const getTreatments = () => api<Treatment[]>("/treatments");
export const getTreatment = (slug: string) => api<Treatment>(`/treatments/${encodeURIComponent(slug)}`);
