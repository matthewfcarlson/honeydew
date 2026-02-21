import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ClothingIdZ, OutfitIdZ } from '../../db_types';
import { parseIndyxCSV, fetchIndyxOpenCloset, extractIndyxUsername } from '../../_clothing/indyx';

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

  import_indyx_opencloset: protectedProcedure.input(z.string().min(1).max(500)).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const user = ctx.ctx.data.user;
    const db = ctx.ctx.data.db;

    const username = extractIndyxUsername(ctx.input);

    let result;
    try {
      result = await fetchIndyxOpenCloset(username);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch from Indyx';
      throw new TRPCError({ code: "BAD_REQUEST", cause: message, message });
    }

    if (result.items.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", cause: "No items found in this Open Closet", message: "No items found in this Open Closet" });
    }

    // Create clothing items
    const createdItems = await db.ClothingBulkCreate(result.items, user.household, user.id);

    // Build Indyx item ID → our ClothingId map using the parallel indyx_item_ids array
    const indyxIdMap: Record<string, string> = {};
    for (let i = 0; i < Math.min(result.indyx_item_ids.length, createdItems.length); i++) {
      indyxIdMap[result.indyx_item_ids[i]] = createdItems[i].id;
    }

    // Create outfits with resolved ClothingId references
    let importedOutfits = 0;
    if (result.outfits.length > 0 && Object.keys(indyxIdMap).length > 0) {
      const outfitsToCreate = result.outfits.map((outfit) => {
        const clothingIds = outfit.indyx_item_ids
          .map((indyxId) => indyxIdMap[indyxId])
          .filter(Boolean);
        return {
          name: outfit.name || 'Outfit',
          image_url: outfit.image_url,
          clothing_items: clothingIds.join(','),
        };
      }).filter((o) => o.clothing_items.length > 0);

      const createdOutfits = await db.OutfitBulkCreate(outfitsToCreate, user.household, user.id);
      importedOutfits = createdOutfits.length;
    }

    return {
      imported_items: createdItems.length,
      total_items: result.items.length,
      imported_outfits: importedOutfits,
      total_outfits: result.outfits.length,
    };
  }),

  outfits: protectedProcedure.query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const user = ctx.ctx.data.user;
    const db = ctx.ctx.data.db;
    return await db.OutfitGetAll(user.household);
  }),

  delete_outfit: protectedProcedure.input(OutfitIdZ).query(async (ctx) => {
    if (ctx.ctx.data.user == null) {
      throw new TRPCError({ code: "NOT_FOUND", cause: "User was not found" });
    }
    const db = ctx.ctx.data.db;
    return await db.OutfitDelete(ctx.input);
  }),
});

export default Router;
