import { inferAsyncReturnType } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { HoneydewPageData, HoneydewPageEnv } from '../types';

export async function createInnerContext(data:HoneydewPageData, env:HoneydewPageEnv, url:string) {
  return {
    data,
    env,
    url
  }
}
export type Context = inferAsyncReturnType<typeof createInnerContext>;

export async function createContextFactory(data: HoneydewPageData, env:HoneydewPageEnv) {
  return async (opts:FetchCreateContextFnOptions)=> {
    return await createInnerContext(data, env, opts.req.url);
  }
}