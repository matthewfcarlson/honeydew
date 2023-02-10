
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import type { DbUser } from '../../db_types';
import type Database from '../../database/_db';
import { TRPCError } from '@trpc/server';
import { ArrayBufferToHexString } from '../../_utils';

const GenerateInviteLink = async function (db: Database, user: DbUser | null, url: URL, secret_key: string): Promise<string> {
  if (user == null) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
    });
  }
  if (user.household == "" || user.household == null) throw new TRPCError({
    code: 'NOT_FOUND',
    cause: "You are not part of a household"
  });
  const household = await db.HouseholdGet(user.household);
  if (household == null) throw new TRPCError({
    code: 'NOT_FOUND',
    cause: "Household is not found",
  });
  const key = await db.HouseKeyCreate(household.id, user.id);
  if (key == null) throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    cause: "Could not generate HouseKey for Invite"
  });

  const hash_data = new TextEncoder().encode(key.id + secret_key);
  const hash_digest = await crypto.subtle.digest("SHA-256", hash_data);
  const hash_text = ArrayBufferToHexString(hash_digest).substring(0, 16);
  const full_key = `${key.id}_${hash_text}`
  const base_url = url.host;
  return `https://${base_url}/auth/join/${full_key}`
}

const Router = router({
  invite: protectedProcedure.query(async ({ ctx }) => {
    const database = ctx.data.db as Database;
    const user = ctx.data.user;
    const url = new URL(ctx.url);
    const link = await GenerateInviteLink(database, user, url, ctx.env.JWT_SECRET);
    return link
  }),
  setAutoAssign: protectedProcedure.input(z.number().nonnegative().lt(24)).query(async (ctx) => {

    if (ctx.ctx.data.user == null) {
      throw new TRPCError({
        code: "NOT_FOUND",
        cause: "User was not found"
      })
    }
    const user = ctx.ctx.data.user;
    if (user.household == null) {
      throw new TRPCError({
        code: "NOT_FOUND",
        cause: "User does not have household assigned"
      })
    }
    const hour = ctx.input;
    const db = ctx.ctx.data.db;

    const result = await db.HouseAutoAssignSetTime(user.household, hour);
    return result;
  })
});

export default Router;