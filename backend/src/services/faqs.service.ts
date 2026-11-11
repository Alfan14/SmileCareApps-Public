import { prisma } from "../config/prisma";

export const listFaqs = (category?: string) =>
  prisma.faq.findMany({
    where: category ? { category } : {},
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, question: true, answer: true, category: true, sortOrder: true },
  });
