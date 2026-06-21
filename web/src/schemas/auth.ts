import { z } from 'zod';

/**
 * Auth input schemas (the validation source of truth for sign-up / log-in).
 *
 * Phone is validated for shape here; canonical E.164 normalization happens in
 * the service via `domain/phone` (so an invalid number is rejected before any
 * DB or hashing work). The password minimum is a security floor.
 */

/** Minimum password length we accept. */
export const MIN_PASSWORD_LENGTH = 8;

export const PhoneSchema = z
  .string()
  .trim()
  .min(4, 'Въведете телефонен номер.')
  .max(20, 'Невалиден телефонен номер.');

export const PasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Паролата трябва да е поне ${MIN_PASSWORD_LENGTH} символа.`)
  .max(200, 'Паролата е твърде дълга.');

export const SignupSchema = z.object({
  phone: PhoneSchema,
  password: PasswordSchema,
});

export const LoginSchema = z.object({
  phone: PhoneSchema,
  // Don't enforce length rules on login — just require something present.
  password: z.string().min(1, 'Въведете парола.').max(200),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
