
import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
const Router = router({
  get: publicProcedure.query(() => {
    // [..]
    return [];
  }),
});

export default Router;