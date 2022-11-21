import { JwtPayload } from "@tsndr/cloudflare-worker-jwt";
import Database, { HOUSEID, USERID } from "./_db";

// These are the types used by every honeydew page function

export type HoneydewPageEnv = {
  TELEGRAM:string; // the telegram API key
  JWT_SECRET: string; // the JWT secret for signing 
  TELEGRAM_WH:string; // the secret key for the webhook
  PRODUCTION:"true"|"false"; // whether we are in production or not
  HONEYDEW: KVNamespace;
}

export type HoneydewPageData = {
  db:Database;
  authorized:boolean;
  jwt_raw: string;
  jwt?:JwtPayload;
  userid:USERID|null;
}

type HoneydewPagesFunction<
  Params extends string = any
> = (context: EventContext<HoneydewPageEnv, Params, HoneydewPageData>) => Response | Promise<Response>;