import { HoneydewPagesFunction } from "../types";
import Database from "../database/_db";
import { ResponseJsonOk } from "../_utils";

export const onRequestGet: HoneydewPagesFunction = async function (context) {

    const db = context.data.db as Database;
    await db.CheckOnSQL();
    
    return ResponseJsonOk();
}