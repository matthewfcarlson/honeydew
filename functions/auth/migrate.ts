import { HoneydewPagesFunction } from "../types";
import Database from "../database/_db";
import { deleteCookie, ResponseJsonAccessDenied, ResponseJsonNotFound, ResponseJsonOk } from "../_utils";
import { AuthCheck, AuthHousehold, TEMP_TOKEN } from "./auth_types";

export const onRequestGet: HoneydewPagesFunction = async function (context) {

    const db = context.data.db as Database;
    await db.CheckOnSQL();
    
    return ResponseJsonOk();
}