import { z } from "zod";
import { StrongPasswordSchema } from "../common/password.policy";

/** User as returned to clients — NEVER includes passwordHash. */
export interface UserDto {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: StrongPasswordSchema,
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
