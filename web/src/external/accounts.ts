import type { Account } from '@prisma/client';
import { prisma } from './db';

/**
 * Account data-access. Pure persistence — no hashing, validation, or session
 * logic (that belongs in the services layer). Phone numbers are expected to be
 * already normalised to E.164 by the caller (see `domain/phone`).
 */

/** Returns the account with this E.164 phone, or `null`. */
export function findAccountByPhone(phone: string): Promise<Account | null> {
  return prisma.account.findUnique({ where: { phone } });
}

/** Returns the account with this id, or `null`. */
export function findAccountById(id: string): Promise<Account | null> {
  return prisma.account.findUnique({ where: { id } });
}

/** Creates an account. Throws on a duplicate phone (unique constraint). */
export function createAccount(input: {
  phone: string;
  passwordHash: string;
}): Promise<Account> {
  return prisma.account.create({ data: input });
}
