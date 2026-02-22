
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { AuthCheck, AuthCheckZ } from '../../auth/auth_types';
const Router = router({
  setOutfitReminders: protectedProcedure.input(z.boolean()).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        cause: "User was not found"
      })
    }
    const user = ctx.ctx.data.user;
    const db = ctx.ctx.data.db;
    const result = await db.UserSetOutfitReminders(user.id, ctx.input);
    return result;
  }),
  magic_link: protectedProcedure.query(async (ctx)=> {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        cause: "User was not found"
      })
    }
    const user = ctx.ctx.data.user;
    const db = ctx.ctx.data.db;
    const key = await db.UserMagicKeyCreate(user.id);
    if (key=="" || key == null) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        cause: "Unable to generate new magic link"
      })
    }
    const request_url = new URL(ctx.ctx.url);
    const base_url = request_url.host;
    const link = `https://${base_url}/auth/magic/${key}`
    return link;
  }),
  get: protectedProcedure.query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
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
    const db = ctx.ctx.data.db;
    const household = await db.HouseholdGetExtended(user.household);
    if (household== null) {
      throw new TRPCError({
        code: "NOT_FOUND",
        cause: "Household was not found"
      })
    }
    const result: AuthCheck = {
      name: user.name,
      icon: user.icon,
      id: user.id,
      color: user.color,
      household,
      task: null,
      outfit_reminders: user.outfit_reminders,
    };
    return AuthCheckZ.parse(result);
  }),
});

export default Router;