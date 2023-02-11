import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Context } from '../context';
import { DbProjectZ, DbProjectZRaw, DbTask, DbTaskZRaw, ProjectIdZ } from '../../db_types';

interface TRPCContext {
  ctx: Context
}

function check_context<T extends TRPCContext>(ctx: T) {
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
  get_projects: protectedProcedure.query(async (ctx) => {
    const user = check_context(ctx);
    const db = ctx.ctx.data.db;
    const projects = await db.ProjectsListAugmented(user.household);
    return projects;
  }),
  add: protectedProcedure.input(DbProjectZRaw.shape.description).query(async (ctx) => {
    const user = check_context(ctx);
    const db = ctx.ctx.data.db;
    const description = ctx.input;
    const project = await db.ProjectCreate(description, user.household);
    if (project == null) throw new TRPCError({ code: "UNAUTHORIZED" });
    return true;
  }),
  add_task: protectedProcedure
    .input(DbTaskZRaw.pick({
      description: true,
      project: true,
    }))
    .query(async (ctx) => {
      const user = check_context(ctx);
      const db = ctx.ctx.data.db;
      const description = ctx.input.description;
      const project = ctx.input.project;
      const task = await db.TaskCreate(description, user.id, user.household, project);
      if (task == null) throw new TRPCError({ code: "UNAUTHORIZED" });
      return true;
    }),
  get_tasks: protectedProcedure.input(ProjectIdZ).query(async (ctx): Promise<DbTask[]> => {
      const user = check_context(ctx);
      const db = ctx.ctx.data.db;
      const project_id = ctx.input;
      // TODO: get the project and make sure the user can do this
      const tasks = await db.TaskGetAll(project_id);
      return tasks;
    }),
});

export default Router;