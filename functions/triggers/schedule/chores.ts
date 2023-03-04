import { HoneydewPagesFunction } from "../../types";
import Database from "../../database/_db";
import { TelegramAPI } from "../../database/_telegram";
import { getJulianDate } from "../../_utils";

export const TriggerChores = async function (db: Database, hour: number) {
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

    // Now look at all the users that need a reminder
    const reminder_hour = (hour + 12) % 24;
    const future_date = getJulianDate() + 5;
    const reminder_users = await db.HouseAutoAssignGetUsersReadyForGivenHour(reminder_hour, future_date); // passing in a zero for timestamp
    const reminder_promises = reminder_users.map(async (x) => {
        const chore = await db.ChoreGetCurrentChore(x.user_id);
        if (chore == null) return false;
        if (x.chat_id == null) return false;
        if (chore.lastTimeAssigned != null && chore.lastDone >= chore.lastTimeAssigned) return false;
        const message = `Just a friendly reminder to complete your chore!`
        await db.GetTelegram().sendTextMessage(x.chat_id, message, undefined, undefined, "MarkdownV2");
        return true;
    })

    // make sure to wait on all the results
    const results = await Promise.allSettled(promises.concat(reminder_promises));

    return {
        results,
        users,
        households
    }
}

/* istanbul ignore next */
export const onRequestGet: HoneydewPagesFunction = async function (context) {
    // we don't have a middleware for this so create a DB
    const db = new Database(context.env.HONEYDEW, new TelegramAPI(context.env.TELEGRAM), context.env.HONEYDEWSQL);

    // first get the current date that we generated this
    // TODO: we could use KV to make sure we aren't running too often?
    const date = new Date();
    const hour = date.getUTCHours();

    const raw_results = await TriggerChores(db, hour);
    const data = (context.env.PRODUCTION == "true") ?
        {
            hour_processed: hour,
            timestamp: date,
            count: raw_results.users.length,
        } :
        {
            hour_processed: hour,
            timestamp: date,
            count: raw_results.users.length,
            users: raw_results.users,
            results: raw_results.results,
            houses: raw_results.households,
        };
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/javascript" } },)
}