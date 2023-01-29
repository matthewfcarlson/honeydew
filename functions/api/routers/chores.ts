
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ChoreIdz, RecipeIdZ, UserIdZ } from '../../db_types';

const Router = router({
  all: protectedProcedure.query(async (ctx) => {
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
  next: protectedProcedure.query(async (ctx) => {
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
    return await db.ChoreGetNextChore(user.household, user.id, user._chat_id);
  }),
  another: protectedProcedure.query(async (ctx) => {
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
    const result = await db.ChoreSkipCurrentChore(user.id);
    if (result == false) return false;
    return await db.ChoreGetNextChore(user.household, user.id, user._chat_id);
  }),
  complete: protectedProcedure.input(z.string()).query(async (ctx) => {
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
    // TODO: check if this chore belongs to this household
    return await db.ChoreComplete(chore_id.data, user.id);
  }),
  delete: protectedProcedure.input(z.string()).query(async (ctx) => {
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
    // TODO: check if this chore belongs to this household
    return await db.ChoreDelete(chore_id.data);
  }),
  add: protectedProcedure.input(z.object({
    name: z.string(),
    frequency: z.number().nonnegative()
  })).query(async (ctx) => {
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
    await (db as any)._db.updateTable("chores").set({lastDone: 10, lastTimeAssigned:10}).execute();
    if (chore == null) throw new TRPCError({
      code: "NOT_FOUND",
      cause: "Chore was not found"
    });
    return true;
  }),
  assignTo: protectedProcedure.input(z.object({
    raw_choreid: ChoreIdz,
    raw_assigneeid: UserIdZ.nullable(),
  })).query(async (ctx) => {
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
    // validate the acid
    const assignee_id = UserIdZ.nullable().parse(ctx.input.raw_assigneeid);
    const chore_id = ChoreIdz.parse(ctx.input.raw_choreid);
    const db = ctx.ctx.data.db;
    // get the chore and make sure it's in our household
    const chore = await db.ChoreGet(chore_id);
    if (chore == null) throw new TRPCError({
      code: "NOT_FOUND",
      cause: "Chore was not found"
    });
    // Assign the user to the chore
    if (chore.household_id != user.household) return false;
    // TODO: check to make sure the assigned user is in the household as well?
    const result = await db.ChoreAssignTo(chore_id, assignee_id);
    return result;
  }),
});

export default Router;