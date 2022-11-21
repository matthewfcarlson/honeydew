import { router } from './trpc';
import { z } from 'zod';

import householdRouter from './routers/household';
import meRouter from './routers/me';

export const appRouter = router({
  household: householdRouter,
  me: meRouter,
});

export type AppRouter = typeof appRouter;