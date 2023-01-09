import { router } from './trpc';
import { z } from 'zod';

import householdRouter from './routers/household';
import meRouter from './routers/me';
import recipeRouter from './routers/recipes';
import choreRouter from './routers/chores';

export const appRouter = router({
  household: householdRouter,
  me: meRouter,
  recipes: recipeRouter,
  chores: choreRouter,
});

export type AppRouter = typeof appRouter;