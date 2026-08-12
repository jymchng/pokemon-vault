import { z } from "zod";
import { StrongPasswordSchema } from "../common/password.policy";

export const RegisterSchema = z.object({
  email: z.string().email().max(254),
  password: StrongPasswordSchema,
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const TokenSchema = z.object({
  token: z.string().min(16).max(512),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email().max(254),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(16).max(512),
  password: StrongPasswordSchema,
});

export const VerifyEmailSchema = TokenSchema;

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type TokenDto = z.infer<typeof TokenSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
