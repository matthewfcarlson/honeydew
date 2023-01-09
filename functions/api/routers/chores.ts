
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ChoreIdz, RecipeIdZ } from '../../db_types';

const Router = router({
  all: protectedProcedure.query(async (ctx)=>{
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
    const db = ctx.ctx.data.db;
    return await db.ChoreGetAll(user.household);
  }),
  complete: protectedProcedure.input(z.string()).query( async (ctx)=> {
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
    const input = ctx.input;
    const db = ctx.ctx.data.db;
    const chore_id = ChoreIdz.safeParse(input);
    if (chore_id.success == false) {
        throw new TRPCError({
        code: "NOT_FOUND",
        cause: "Invalid Chore ID"
        })
    }
    return await db.ChoreComplete(chore_id.data, user.id);
  }),
  add: protectedProcedure.input(z.object({
    name: z.string(),
    frequency: z.number().nonnegative()
  })).query( async (ctx) => {
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
    const input = ctx.input;
    const db = ctx.ctx.data.db;
    const chore = await db.ChoreCreate(input.name, user.household, input.frequency);
    if (chore == null) throw new TRPCError({
        code: "NOT_FOUND",
        cause: "Chore was not found"
    });
    return true;
  }),
});

export default Router;