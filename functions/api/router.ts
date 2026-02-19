import { router } from './trpc';
import { z } from 'zod';

import householdRouter from './routers/household';
import meRouter from './routers/me';
import recipeRouter from './routers/recipes';
import choreRouter from './routers/chores';
import projectRouter from './routers/projects';
import clothesRouter from './routers/clothes';

export const appRouter = router({
  household: householdRouter,
  me: meRouter,
  recipes: recipeRouter,
  chores: choreRouter,
  projects: projectRouter,
  clothes: clothesRouter,
});

export type AppRouter = typeof appRouter;