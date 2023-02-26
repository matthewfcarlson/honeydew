import { HoneydewPagesFunction } from "../../types";
import Database from "../../database/_db";
import { TelegramAPI } from "../../database/_telegram";
import { getJulianDate } from "../../_utils";

export const onRequestGet: HoneydewPagesFunction = async function (context) {
    try {
        // we don't have a middleware for this so create a DB
        const db = new Database(context.env.HONEYDEW, new TelegramAPI(context.env.TELEGRAM), context.env.HONEYDEWSQL);
        // first get the current date that we generated this
        // TODO: we could use KV to make sure we aren't running too often?
        const date = new Date();
        const hour = date.getUTCHours();

        // then query the database for all the users that need to get processed
        const users = await db.HouseAutoAssignGetUsersReadyForGivenHour(hour);
        for (let i = 0; i < users.length; i++) {
            // we do this individually so that we don't assign the same chore to two people
            // the downside is that this is slow
            const x = users[i];
            await db.ChoreGetNextChore(x.house_id, x.user_id, x.chat_id);
        }
        // then handle all the households
        // we can do these all the same time
        const households = await db.HouseAutoAssignGetHousesReadyForGivenHour(hour);
        const promises = households.map((x) => {
            return db.TaskAutoAssignNextTask(x).then((_) => db.HouseAutoAssignMarkComplete(x));
        });

        // make sure to wait on all the results
        const results = await Promise.allSettled(promises);
        const data = (context.env.PRODUCTION == "true") ?
            {
                hour_processed: hour,
                timestamp: date,
                count: users.length,
            } :
            {
                hour_processed: hour,
                timestamp: date,
                count: users.length,
                users,
                results
            };
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/javascript" } },)
    }
    catch (err) {
        console.log(err);
        return new Response(JSON.stringify(err), { 
            status: 500,
            headers: { "Content-Type": "application/javascript" } 
        })
    }
}