import { HoneydewPagesFunction } from "../types";
import Database from "../database/_db";

export const onRequestGet: HoneydewPagesFunction = async function (context) {

    const db = context.data.db as Database;
    const result = await db.CheckOnSQL();

    return new Response(JSON.stringify({
        message: "ok",
        version: result
      }), { status: 200 });
}