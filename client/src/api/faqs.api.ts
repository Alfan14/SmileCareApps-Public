import type { Faq } from "../types/api";
import { api } from "./client";

export const getFaqs = () => api<Faq[]>("/faqs");
