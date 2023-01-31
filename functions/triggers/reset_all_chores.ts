import { HoneydewPagesFunction } from "../types";
import Database from "../database/_db";
import { TelegramAPI } from "../database/_telegram";
import { getJulianDate } from "../_utils";

export const onRequestGet: HoneydewPagesFunction = async function (context) {
    const db = new Database(context.env.HONEYDEW, new TelegramAPI(context.env.TELEGRAM), context.env.HONEYDEWSQL);
    
    const data = {
       done:true
    }
    // return the data in a somewhat sane manner
    await (db as any)._db.updateTable("chores").set({lastDone: 10, lastTimeAssigned:10}).execute();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/javascript" } },)
}
////