import { JwtPayload } from "@tsndr/cloudflare-worker-jwt";
import { DbUser } from "./data_types";

// These are the types used by every honeydew page function

export type HoneydewPageEnv = {
  TELEGRAM:string; // the telegram API key
  JWT_SECRET: string; // the JWT secret for signing 
  TELEGRAM_WH:string; // the secret key for the webhook
  PRODUCTION:"true"|"false"; // whether we are in production or not
  HONEYDEW: KVNamespace;
}

export type HoneydewPageData = {
  db:unknown;
  user: DbUser|null;
  authorized:boolean;
  jwt_raw: string;
  jwt?:JwtPayload;
  userid:string|null;
}

type HoneydewPagesFunction<
  Params extends string = any
> = (context: EventContext<HoneydewPageEnv, Params, HoneydewPageData>) => Response | Promise<Response>;