import { JwtPayload } from "@tsndr/cloudflare-worker-jwt";

type HoneydewPagesFunction<
  Env = {
    TELEGRAM:string; // the telegram API key
    JWT_SECRET: string; // the JWT secret for signing 
    TELEGRAM_WH:string; // the secret key for the webhook
    PRODUCTION:"true"|"false"; // whether we are in production or not
    HONEYDEW: KVNamespace;
  },
  Params extends string = any,
  Data = {
    authorized:boolean;
    jwt_raw: string;
    jwt?:JwtPayload;

  }
> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>;