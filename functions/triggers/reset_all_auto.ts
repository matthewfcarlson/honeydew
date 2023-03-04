import { HoneydewPagesFunction } from "../types";
import Database from "../database/_db";
import { TelegramAPI } from "../database/_telegram";
import { getJulianDate, ResponseJsonDebugOnly } from "../_utils";

/* istanbul ignore next */
export const onRequestGet: HoneydewPagesFunction = async function (context) {
    const db = new Database(context.env.HONEYDEW, new TelegramAPI(context.env.TELEGRAM), context.env.HONEYDEWSQL);

    if (context.env.PRODUCTION == "true") return ResponseJsonDebugOnly();
    
    const data = {
       done:true
    }

    const date = new Date();
    const hour = date.getUTCHours();
    // return the data in a somewhat sane manner
    await (db as any)._db.updateTable("houseautoassign").set({choreLastAssignTime: 0, choreAssignHour:hour}).execute();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/javascript" } },)
}