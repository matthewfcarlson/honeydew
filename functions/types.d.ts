import { JwtPayload } from "@tsndr/cloudflare-worker-jwt";
import Database, { HOUSEID, USERID } from "./_db";

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
    db:Database;
    authorized:boolean;
    jwt_raw: string;
    jwt?:JwtPayload;
    userid:USERID|null;
  }
> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>;