import { HoneydewPagesFunction } from "../../types";
import Database from "../../database/_db";
import { TelegramAPI } from "../../database/_telegram";

export const TriggerOutfits = async function (db: Database) {
    // Get all households that have auto-assign configured (meaning they use Telegram triggers)
    // Send each household a message about clothing choices being under construction
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const house_sets = await Promise.all(hours.map((h) => db.HouseAutoAssignGetHousesReadyForGivenHour(h, 0)));
    // Deduplicate household IDs across all hours
    const seen = new Set<string>();
    const households = house_sets.flat().filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });

    const message = "Clothing choices under construction";
    const promises = households.map(async (house_id) => {
        await db.HouseholdTelegramMessageAllMembers(house_id, message);
        return house_id;
    });
    const results = await Promise.allSettled(promises);
    return {
        results,
        households,
    };
}

/* istanbul ignore next */
export const onRequestGet: HoneydewPagesFunction = async function (context) {
    const db = new Database(context.env.HONEYDEW, new TelegramAPI(context.env.TELEGRAM), context.env.HONEYDEWSQL);

    const date = new Date();

    const raw_results = await TriggerOutfits(db);
    const data = (context.env.PRODUCTION == "true") ?
        {
            timestamp: date,
            count: raw_results.households.length,
        } :
        {
            timestamp: date,
            count: raw_results.households.length,
            results: raw_results.results,
            houses: raw_results.households,
        };
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/javascript" } })
}
