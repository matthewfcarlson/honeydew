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

    // then query the database for all the households that need to get processed
    // TODO: Maybe this should return a list of users instead so we don't need to do this stupid dance
    const households = await db.HouseAutoAssignGetHousesReadyForHour(hour);
    const promises: Promise<any>[] = [];
    let total_processed = 0;

    households.forEach((house_id)=>{
        // TODO: maybe make a method that can get us chat IDs so we don't need to make extra trips to the DB
        const new_promise = db.HouseholdGet(house_id).then((household)=>{
            if (household == null) return;
            return Promise.all(household.members.map((user_id)=>{
                return db.UserGet(user_id).then((user)=>{
                    if (user == null) return;
                    total_processed += 1;
                    return db.ChoreGetNextChore(house_id, user_id, user._chat_id);
                });
            }));
        });
        promises.push(new_promise);
    })
    // make sure to wait on all the results
    const results = await Promise.allSettled(promises);
    const data = {
        total_processed,
        hour_processed: hour,
        timestamp: date,
        households,
        results,
    }
    // return the data in a somewhat sane manner
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/javascript" } },)
}