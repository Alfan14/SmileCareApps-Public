import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errors";
import type { LoginBody, RegisterBody } from "../validators/auth.schema";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
} as const;

const loginUserSelect = {
  ...publicUserSelect,
  passwordHash: true,
} as const;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
};

/** New public accounts always get PATIENT role. Client-supplied roles are rejected by strict validation. */
export async function registerUser(body: RegisterBody): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true },
  });
  if (existing) {
    throw new HttpError(409, "EMAIL_EXISTS", "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  return prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone ?? null,
      passwordHash,
      role: "PATIENT",
    },
    select: publicUserSelect,
  });
}

export async function loginUser(body: LoginBody): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { email: body.email },
    select: loginUserSelect,
  });

  // Use the same error for unknown accounts and wrong passwords to reduce account enumeration.
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });

  if (!user) {
    throw new HttpError(401, "UNAUTHENTICATED", "Session is no longer valid. Please log in again");
  }
  return user;
}
