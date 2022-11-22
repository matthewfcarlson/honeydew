
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import type { DbUser } from '../../data_types';
import type Database from '../../_db';
import { TRPCError } from '@trpc/server';
import { ArrayBufferToHexString } from '../../_utils';

type ValidInvite = {
  ok: true,
  link: string
}
type InviteError = {
  ok: false,
  reason: string
}

const GenerateInviteLink = async function (db: Database, user: DbUser | null, url:URL, secret_key:string): Promise<string> {
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
  if (key == "error") throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    cause: "Could not generate HouseKey for Invite"
  });

  const hash_data = new TextEncoder().encode(key.id+secret_key);
  const hash_digest = await crypto.subtle.digest("SHA-256", hash_data);
  const hash_text = ArrayBufferToHexString(hash_digest).substring(0,16);
  const full_key = `${key.id}:${hash_text}`
  const base_url = url.host;
  return `https://${base_url}/auth/join/${full_key}`
}

const Router = router({
  invite: protectedProcedure.query(async ({ ctx }) => {
    const database = ctx.data.db as Database;
    const user = ctx.data.user;
    const url = new URL(ctx.req.url);
    const link = await GenerateInviteLink(database, user, url, ctx.env.JWT_SECRET);
    return link
  })
});

export default Router;