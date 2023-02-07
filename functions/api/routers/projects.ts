import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Context } from '../context';
import { DbProjectZ, DbProjectZRaw } from '../../db_types';

interface TRPCContext {
    ctx: Context
}

function check_context<T extends TRPCContext>(ctx:T) {
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
    return user;
}

const Router = router({
  get_projects: protectedProcedure.query(async (ctx)=>{
    const user = check_context(ctx);
    const db = ctx.ctx.data.db;
    const projects = await db.ProjectsList(user.household);
    return projects;
  }),
  new: protectedProcedure.input(DbProjectZRaw.shape.description).query( async (ctx) => {
    const user = check_context(ctx);
    const db = ctx.ctx.data.db;
    const description = ctx.input;
    const project = await db.ProjectCreate(description,user.household);
    if (project == null) return false;
    return true;
  }),
});

export default Router;