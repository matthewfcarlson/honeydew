import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ClothingIdZ, ClothingCategoryZ, CATEGORY_WASH_DEFAULTS, ClothingCategory } from '../../db_types';

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
    category: ClothingCategoryZ.optional(),
    brand: z.string().max(255).optional(),
    color: z.string().max(100).optional(),
    image_url: z.string().max(1024).optional(),
    tags: z.string().max(1024).optional(),
    heat_index: z.number().int().min(0).max(3).optional(),
    wash_threshold: z.number().int().nonnegative().nullable().optional(),
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

  upload_photo: protectedProcedure.input(z.object({
    id: ClothingIdZ,
    photo: z.string().min(1), // base64-encoded WebP image data
  })).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const db = ctx.ctx.data.db;
    // Decode base64 to ArrayBuffer
    const binaryString = atob(ctx.input.photo);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return await db.ClothingSetPhoto(ctx.input.id, bytes.buffer);
  }),

  get_photo: protectedProcedure.input(ClothingIdZ).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const db = ctx.ctx.data.db;
    const photo = await db.ClothingGetPhoto(ctx.input);
    if (photo == null) {
      return null;
    }
    // Encode ArrayBuffer to base64
    const bytes = new Uint8Array(photo);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }),

});

export default Router;
