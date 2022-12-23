import { JwtPayload } from "@tsndr/cloudflare-worker-jwt";
import { DbUser, UserId } from "./db_types";
import type Database from "./database/_db";

// These are the types used by every honeydew page function

export type HoneydewPageEnv = {
  TELEGRAM:string; // the telegram API key
  JWT_SECRET: string; // the JWT secret for signing 
  TELEGRAM_WH:string; // the secret key for the webhook
  PRODUCTION:"true"|"false"; // whether we are in production or not
  HONEYDEW: KVNamespace;
  HONEYDEWSQL: D1Database;
  TURNSTILE: string; // the turnstile secret
}

export type HoneydewPageData = {
  db:Database;
  timestamp:number;
  user: DbUser|null;
  authorized:boolean;
  jwt_raw: string;
  jwt?:JwtPayload;
  userid:UserId|null;
}

type HoneydewPagesFunction<
  Params extends string = any
> = (context: EventContext<HoneydewPageEnv, Params, HoneydewPageData>) => Response | Promise<Response>;