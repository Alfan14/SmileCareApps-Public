import { prisma } from "../config/prisma";
import type { ContactBody } from "../validators/contact.schema";

export async function saveContactMessage(input: ContactBody) {
  await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone?.trim() || null,
      body: input.message,
    },
  });
}
