
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ChoreIdz, RecipeIdZ, UserIdZ } from '../../db_types';
import { getJulianDate } from '../../_utils';

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
    const all_chores = await db.ChoreGetAll(user.household);
    if (all_chores.length == 0) return [];
    const timestamp = getJulianDate();
    const sorted_chores = all_chores.sort((a,b)=> {
      // how long has it been since it was last done
      const a_score = Math.abs(a.lastDone - timestamp) / (a.frequency+1);
      const b_score = Math.abs(b.lastDone - timestamp) / (b.frequency+1);
      return b_score - a_score;
    });
    return sorted_chores;
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
    const result = await db.ChoreComplete(chore_id.data, user.id);
    return {
      success: result.success,
      streak: result.streak,
      isFirstToday: result.isFirstToday,
    };
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
    frequency: z.number().positive()
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
    const backdate = (input.frequency > 7) ? input.frequency / 2 : input.frequency;
    const chore = await db.ChoreCreate(input.name, user.household, input.frequency, backdate, user.id);
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
    // If the chore doesn't belong to you, don't do it
    if (chore.household_id != user.household) return false;
    // check to make sure the assigned user is in the household as well?
    if (assignee_id != null && assignee_id != user.id) {
      const assignee = await db.UserGet(assignee_id);
      if (assignee == null) return false;
      if (assignee.household != user.household) return false;
    }
    // Assign the user to the chore
    const result = await db.ChoreAssignTo(chore_id, assignee_id);
    return result;
  }),
});

export default Router;