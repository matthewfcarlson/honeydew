type HoneydewPagesFunction<
  Env = {
    TELEGRAM:string;
    JWT_SECRET: string;
    HONEYDEW: KVNamespace;
  },
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>;