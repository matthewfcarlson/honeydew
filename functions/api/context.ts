import { inferAsyncReturnType } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { HoneydewPageData, HoneydewPageEnv } from '../types';
export function createContext<Params extends string = any>(pages_context:EventContext<HoneydewPageEnv, Params, HoneydewPageData>) {
  return ({ req }: FetchCreateContextFnOptions) => {
    return { req, data:pages_context.data, env:pages_context.env };
  }
}
export type Context = inferAsyncReturnType<inferAsyncReturnType<typeof createContext>>;