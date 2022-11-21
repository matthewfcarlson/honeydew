import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { Context } from './context';
type User = {
    id: string;
    name: string;
    bio?: string;
};
const users: Record<string, User> = {
    "MATT": {
        id: "MATT",
        name: "Matthew Carlson"
    }
};
export const t = initTRPC.context<Context>().create();
export const appRouter = t.router({
    getUserById: t.procedure.input(z.string()).query(({ input }) => {
        return users[input]; // input type is string
    }),
    hello: t.procedure.query(() => {
        return {
            greeting: 'hello world',
        };
    }),
    signout: t.procedure.query((ctx)=>{
        return "OK"
    }),
    hello2: t.procedure.query(() => {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred, please try again later.',
            // optional: pass the original error to retain stack trace
            //cause: "EXPLODED",
        });
    }),
    createUser: t.procedure
        // validate input with Zod
        .input(
            z.object({
                name: z.string().min(3),
                bio: z.string().max(142).optional(),
            }),
        )
        .mutation(({ input }) => {
            const id = Date.now().toString();
            const user: User = { id, ...input };
            users[user.id] = user;
            return user;
        }),
});
// export type definition of API
export type AppRouter = typeof appRouter;