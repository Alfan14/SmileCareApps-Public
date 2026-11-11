import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errors";

// Public fields only.
const select = {
  id: true,
  name: true,
  slug: true,
  description: true,
  durationMin: true,
  priceMin: true,
  priceMax: true,
  bookingPrice: true,
  imageUrl: true,
  sortOrder: true,
} as const;

export const listTreatments = () =>
  prisma.treatment.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select });

/** Accepts either the slug (teeth-cleaning) or the id. */
export async function getTreatment(idOrSlug: string) {
  const treatment = await prisma.treatment.findFirst({
    where: { active: true, OR: [{ slug: idOrSlug }, { id: idOrSlug }] },
    select,
  });
  if (!treatment) throw new HttpError(404, "NOT_FOUND", "Treatment not found");
  return treatment;
}
