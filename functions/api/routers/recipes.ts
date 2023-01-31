import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { RecipeIdZ } from '../../db_types';

const Router = router({
  favorites: protectedProcedure.query(async (ctx)=>{
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
    return await db.CardBoxGetFavorites(user.household, true);
  }),
  toTry: protectedProcedure.query(async (ctx)=>{
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
    return await db.CardBoxGetFavorites(user.household, false);
  }),
  mark_favored: protectedProcedure.input(z.object({recipe_id:RecipeIdZ, favored:z.boolean()})).query( async (ctx)=> {
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
    // TODO: check if cardbox exists?
    return await db.CardBoxSetFavorite(input.recipe_id, user.household, input.favored);
  }),
  mark_meal_prep: protectedProcedure.input(z.object({recipe_id:RecipeIdZ, prepared:z.boolean()})).query( async (ctx)=> {
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
    // TODO: check if cardbox exists?
    return await db.CardBoxSetMealPrep(input.recipe_id, user.household, input.prepared);
  }),
  remove: protectedProcedure.input(RecipeIdZ).query( async (ctx)=> {
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
    return await db.CardBoxRemoveRecipe(input, user.household);
  }),
  add: protectedProcedure.input(z.string().url()).query( async (ctx) => {
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
    const url = ctx.input;
    const db = ctx.ctx.data.db;
    const recipe = await db.RecipeCreateIfNotExists(url);
    if (recipe == null) throw new TRPCError({
        code: "NOT_FOUND",
        cause: "Recipe was not found"
    });
    const cardbox = await db.CardBoxAddRecipe(recipe.id, user.household);
    if (cardbox == null) return false;
    return true;
  }),
  meal_plan: protectedProcedure.query(async (ctx)=> {
    return []
  }),
  create_meal_plan: protectedProcedure.query(async (ctx)=> {
    return []
  }),
});

export default Router;