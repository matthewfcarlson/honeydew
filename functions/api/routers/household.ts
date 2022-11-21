
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
const Router = router({
  invite: protectedProcedure.query(({ctx})=> {
    return "?";
  })
});

export default Router;