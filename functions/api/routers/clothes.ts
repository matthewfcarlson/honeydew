import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ClothingIdZ } from '../../db_types';
import { parseIndyxCSV } from '../../_clothing/indyx';

const Router = router({
  all: protectedProcedure.query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const user = ctx.ctx.data.user;
    const db = ctx.ctx.data.db;
    return await db.ClothingGetAll(user.household);
  }),

  get: protectedProcedure.input(ClothingIdZ).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const db = ctx.ctx.data.db;
    const clothing = await db.ClothingGet(ctx.input);
    if (clothing == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "Clothing item was not found" });
    }
    return clothing;
  }),

  add: protectedProcedure.input(z.object({
    name: z.string().min(1).max(255),
    category: z.string().max(100).optional(),
    subcategory: z.string().max(100).optional(),
    brand: z.string().max(255).optional(),
    color: z.string().max(100).optional(),
    size: z.string().max(50).optional(),
    image_url: z.string().max(1024).optional(),
    tags: z.string().max(1024).optional(),
    max_wears: z.number().positive().optional(),
  })).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const user = ctx.ctx.data.user;
    const db = ctx.ctx.data.db;
    const clothing = await db.ClothingCreate(
      ctx.input.name,
      user.household,
      user.id,
      ctx.input,
    );
    if (clothing == null) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: "Failed to create clothing item" });
    }
    return clothing;
  }),

  delete: protectedProcedure.input(ClothingIdZ).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const db = ctx.ctx.data.db;
    return await db.ClothingDelete(ctx.input);
  }),

  mark_worn: protectedProcedure.input(ClothingIdZ).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const db = ctx.ctx.data.db;
    return await db.ClothingMarkWorn(ctx.input);
  }),

  mark_clean: protectedProcedure.input(ClothingIdZ).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const db = ctx.ctx.data.db;
    return await db.ClothingMarkClean(ctx.input);
  }),

  mark_dirty: protectedProcedure.input(ClothingIdZ).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const db = ctx.ctx.data.db;
    return await db.ClothingMarkDirty(ctx.input);
  }),

  import_indyx: protectedProcedure.input(z.string().min(1)).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const user = ctx.ctx.data.user;
    const db = ctx.ctx.data.db;
    const csvContent = ctx.input;

    const items = parseIndyxCSV(csvContent);
    if (items.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", cause: "No valid clothing items found in CSV" });
    }

    const created = await db.ClothingBulkCreate(items, user.household, user.id);
    return {
      imported: created.length,
      total: items.length,
    };
  }),
});

export default Router;
