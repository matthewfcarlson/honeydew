
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { AuthCheck, AuthCheckZ, AuthHousehold } from '../../auth/auth_types';
const Router = router({
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
    const household = await db.HouseholdGet(user.household);
    if (household== null) {
      throw new TRPCError({
        code: "NOT_FOUND",
        cause: "Household was not found"
      })
    }
    const apihouse: AuthHousehold = {
        id: household.id,
        name: household.name,
        members: (await Promise.all(household.members.map(x => db.UserGet(x)))).filter((x) => x != null).map(x => { return { userid: x!.id, name: x!.name, icon: x!.icon, color: x!.color } }) || [],
    };
    const currentChore = await db.ChoreGetNextChore(user.household, user.id, user._chat_id);
    const result: AuthCheck = {
      name: user.name,
      icon: user.icon,
      id: user.id,
      color: user.color,
      household: apihouse,
      currentChore,
    };
    return AuthCheckZ.parse(result);
  }),
});

export default Router;