type HoneydewPagesFunction<
  Env = {
    TELEGRAM:string; // the telegram API key
    JWT_SECRET: string; // the JWT secret for signing 
    TELEGRAM_WH:string; // the secret key for the webhook
    HONEYDEW: KVNamespace;
  },
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>;