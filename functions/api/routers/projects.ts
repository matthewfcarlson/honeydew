import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Context } from '../context';
import { DbProjectZ, DbProjectZRaw, DbTask, DbTaskZRaw, ProjectIdZ, TaskIdZ } from '../../db_types';

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
  add: protectedProcedure.input(DbProjectZRaw.pick({
    description: true,
    prep_time: true,
    work_time: true,
  }).refine((data) => data.prep_time + data.work_time > 0, {
    message: "Total time (prep + work) must be greater than zero",
    path: ["prep_time"],
  })).query(async (ctx) => {
    const user = check_context(ctx);
    const db = ctx.ctx.data.db;
    const { description, prep_time, work_time } = ctx.input;
    const project = await db.ProjectCreate(description, user.household, prep_time, work_time);
    if (project == null) throw new TRPCError({ code: "UNAUTHORIZED" });
    return true;
  }),
  add_task: protectedProcedure
    .input(DbTaskZRaw.pick({
      description: true,
      project: true,
      requirement1: true,
      requirement2: true,
    }))
    .query(async (ctx) => {
      const user = check_context(ctx);
      const db = ctx.ctx.data.db;
      const description = ctx.input.description;
      const project = ctx.input.project;
      const req1 = ctx.input.requirement1;
      const req2 = ctx.input.requirement2;
      const task = await db.TaskCreate(description, user.id, user.household, project, req1, req2);
      if (task == null) throw new TRPCError({ code: "UNAUTHORIZED" });
      return true;
    }),
  delete_task: protectedProcedure.input(TaskIdZ).query(async (ctx): Promise<boolean> => {
    const user = check_context(ctx);
    const db = ctx.ctx.data.db;
    const task_id = ctx.input;
    const task = await db.TaskGet(task_id);
    if (task == null || task.household != user.household) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "Task was not found" });
    }
    return await db.TaskDelete(task_id);
  }),
  complete_task: protectedProcedure.input(TaskIdZ).query(async (ctx): Promise<boolean> => {
    const user = check_context(ctx);
    const db = ctx.ctx.data.db;
    const task_id = ctx.input;
    const task = await db.TaskGet(task_id);
    if (task == null || task.household != user.household) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "Task was not found" });
    }
    return await db.TaskMarkComplete(task_id, user.id);
  }),
  get_tasks: protectedProcedure.input(ProjectIdZ).query(async (ctx): Promise<DbTask[]> => {
    const user = check_context(ctx);
    const db = ctx.ctx.data.db;
    const project_id = ctx.input;
    const project = await db.ProjectGet(project_id);
    if (project == null || project.household != user.household) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "Project was not found" });
    }
    const tasks = await db.TaskGetAll(project_id);
    return tasks;
  }),
  delete: protectedProcedure.input(ProjectIdZ).query(async (ctx): Promise<boolean> => {
    const user = check_context(ctx);
    const db = ctx.ctx.data.db;
    const project_id = ctx.input;
    const project = await db.ProjectGet(project_id);
    if (project == null || project.household != user.household) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "Project was not found" });
    }
    return await db.ProjectDelete(project_id);
  }),
});

export default Router;