import { HoneydewPagesFunction } from "../../types";
import Database from "../../database/_db";
import { TelegramAPI } from "../../database/_telegram";
import { getJulianDate } from "../../_utils";

export const onRequestGet: HoneydewPagesFunction = async function (context) {
    const db = new Database(context.env.HONEYDEW, new TelegramAPI(context.env.TELEGRAM), context.env.HONEYDEWSQL);
    // first get the current date that we generated this
    // TODO: we could use KV to make sure we aren't running too often?
    const date = new Date();
    const hour = date.getUTCHours();

    // then query the database for all the users that need to get processed
    const users = await db.HouseAutoAssignGetUsersReadyForGivenHour(hour);
    const promises = users.map(async (x)=>{
        await db.ChoreGetNextChore(x.house_id, x.user_id, x.chat_id);
        return true;
    });
    // then handle all the households
    const households = await db.HouseAutoAssignGetHousesReadyForGivenHour(hour);
    promises.concat(households.map((x)=>{
        return db.TaskAutoAssignNextTask(x).then((_)=>db.HouseAutoAssignMarkComplete(x));
    }));
    
    // make sure to wait on all the results
    const results = await Promise.allSettled(promises);
    const data = (context.env.PRODUCTION == "true") ?
    {
        hour_processed: hour,
        timestamp: date,
        count: users.length,
    }:
    {
        hour_processed: hour,
        timestamp: date,
        count: users.length,
        users,
        results
    };
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/javascript" } },)
}