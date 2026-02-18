import Database from "../../database/_db";

export const TriggerOutfits = async function (db: Database, hour: number) {
    // Get all households that have opted into outfit notifications for this hour
    const households = await db.HouseOutfitGetHousesReadyForGivenHour(hour);

    const message = "Clothing choices under construction";
    const promises = households.map(async (house_id) => {
        await db.HouseholdTelegramMessageAllMembers(house_id, message);
        await db.HouseOutfitMarkComplete(house_id);
        return house_id;
    });
    const results = await Promise.allSettled(promises);
    return {
        results,
        households,
    };
}
