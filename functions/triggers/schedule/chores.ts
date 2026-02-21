import { HoneydewPagesFunction } from "../../types";
import Database from "../../database/_db";
import { TelegramAPI } from "../../database/_telegram";
import { getJulianDate } from "../../_utils";
import { TriggerOutfits } from "./outfits";

/**
 * Chore scheduling trigger — called once per hour with the current UTC hour.
 *
 * This function handles three things in order:
 *
 * 1. **Chore assignment**: For every household whose `choreAssignHour` matches
 *    the current hour (and hasn't been processed recently), pick the next chore
 *    for each member and send them a Telegram notification. Users are processed
 *    sequentially to avoid assigning the same chore to two people.
 *
 * 2. **Household task assignment**: For the same set of households, pick the
 *    next project task and notify all members. Then mark the household as
 *    processed by advancing `choreLastAssignTime` (prevents re-processing
 *    for ~24 hours — see `HouseAutoAssignMarkComplete`).
 *
 * 3. **Chore reminders (12h later)**: For households whose `choreAssignHour`
 *    is 12 hours behind the current hour (i.e., chores were assigned earlier
 *    today), send a reminder to any user who still hasn't completed their
 *    assigned chore. Uses `HouseAutoAssignGetUsersRecentlyAssigned` which
 *    checks `choreLastAssignTime > (now - 0.75 days)` to ensure reminders
 *    only fire when chores were actually assigned recently.
 *
 * Deduplication:
 * - Assignment: guarded by `choreLastAssignTime < (now - 0.5)` — won't
 *   re-assign until ~12h after last processing.
 * - Reminders: guarded by `choreLastAssignTime > (now - 0.75)` — only
 *   fires when chores were assigned within the last ~18h. Also skips
 *   users who already completed their chore (`lastDone >= lastTimeAssigned`)
 *   or have no cached chore.
 */
export const TriggerChores = async function (db: Database, hour: number) {
    // Step 1: Assign chores to individual users in matching households.
    // "Ready" means choreAssignHour == hour AND choreLastAssignTime < (now - 0.5).
    const users = await db.HouseAutoAssignGetUsersReadyForGivenHour(hour);
    for (let i = 0; i < users.length; i++) {
        // Sequential so two users in the same household don't get the same chore
        const x = users[i];
        await db.ChoreGetNextChore(x.house_id, x.user_id, x.chat_id);
    }

    // Step 2: Assign a project task to each household, then mark the household
    // as processed. HouseAutoAssignMarkComplete sets choreLastAssignTime to
    // (now + 0.02), which prevents Steps 1 and 2 from running again for ~24h.
    const households = await db.HouseAutoAssignGetHousesReadyForGivenHour(hour);
    const promises = households.map((x) => {
        return db.TaskAutoAssignNextTask(x).then((_) => db.HouseAutoAssignMarkComplete(x));
    });

    // Step 3: Send reminders for chores assigned 12 hours ago.
    // If this trigger is running at hour H, we look for households whose
    // choreAssignHour is (H + 12) % 24 — those had their chores assigned
    // 12 hours ago. We use HouseAutoAssignGetUsersRecentlyAssigned (checks
    // choreLastAssignTime > now - 0.75) to only match households that were
    // actually processed today, not stale entries.
    const reminder_hour = (hour + 12) % 24;
    const reminder_users = await db.HouseAutoAssignGetUsersRecentlyAssigned(reminder_hour);
    const reminder_promises = reminder_users.map(async (x) => {
        // Skip if the user has no current chore cached (already expired or never assigned)
        const chore = await db.ChoreGetCurrentChore(x.user_id);
        if (chore == null) return false;
        if (x.chat_id == null) return false;
        // Skip if the chore was already completed since it was assigned
        if (chore.lastTimeAssigned != null && chore.lastDone >= chore.lastTimeAssigned) return false;

        // Build informative reminder message
        const today = getJulianDate();
        const daysAgo = Math.floor(today - chore.lastDone);
        const daysAgoText = daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`;

        // Look up who last completed it
        let lastDoneByText = "";
        if (chore.lastDoneBy) {
            const lastUser = await db.UserGet(chore.lastDoneBy);
            if (lastUser) {
                lastDoneByText = ` by ${lastUser.name}`;
            }
        }

        // Escape special characters for MarkdownV2
        const escapedName = chore.name.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
        const escapedDaysAgoText = daysAgoText.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
        const escapedLastDoneByText = lastDoneByText.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');

        const message = `Just a friendly reminder to complete your chore: *${escapedName}*\\! Last done ${escapedDaysAgoText}${escapedLastDoneByText}\\.`
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

    const [raw_results, outfit_results] = await Promise.all([
        TriggerChores(db, hour),
        TriggerOutfits(db, hour),
    ]);
    const data = (context.env.PRODUCTION == "true") ?
        {
            hour_processed: hour,
            timestamp: date,
            count: raw_results.users.length,
            outfit_count: outfit_results.households.length,
        } :
        {
            hour_processed: hour,
            timestamp: date,
            count: raw_results.users.length,
            users: raw_results.users,
            results: raw_results.results,
            houses: raw_results.households,
            outfit_count: outfit_results.households.length,
            outfit_results: outfit_results.results,
            outfit_houses: outfit_results.households,
        };
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/javascript" } },)
}