import { useQuery } from "@tanstack/react-query";
import { getFaqs } from "../api/faqs.api";
import { getReviews } from "../api/reviews.api";
import { getTreatment, getTreatments } from "../api/treatments.api";

export const useTreatments = () => useQuery({ queryKey: ["treatments"], queryFn: getTreatments });

export const useTreatment = (slug: string) =>
  useQuery({ queryKey: ["treatments", slug], queryFn: () => getTreatment(slug), enabled: slug.length > 0 });

export const useFaqs = () => useQuery({ queryKey: ["faqs"], queryFn: getFaqs });

export const useReviews = () => useQuery({ queryKey: ["reviews"], queryFn: () => getReviews() });
