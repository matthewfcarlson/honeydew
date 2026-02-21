import Database from "../../database/_db";
import { TelegramInlineKeyboardMarkup } from "../../database/_telegram";
import { DbUser, HouseId, TelegramCallbackKVPayload } from "../../db_types";
import { generateOutfit, getOutfitImages, GeneratedOutfit, OUTFIT_DISPLAY_ORDER } from "../../_outfit";

/**
 * Build the text description for an outfit, including sock recommendations.
 */
function buildOutfitText(outfit: GeneratedOutfit): string {
    const lines: string[] = [];
    lines.push("Today's outfit suggestion:");
    lines.push("");

    for (const slot of OUTFIT_DISPLAY_ORDER) {
        const item = outfit[slot];
        const label = slot.charAt(0).toUpperCase() + slot.slice(1);
        if (item) {
            const details = [item.name, item.color, item.brand].filter(Boolean).join(" - ");
            lines.push(`${label}: ${details}`);
        }
    }

    lines.push("");
    if (outfit.sockColor) {
        lines.push(`Socks: ${outfit.sockColor}`);
        if (outfit.backupSockColor) {
            lines.push(`Backup socks: ${outfit.backupSockColor}`);
        }
    }

    return lines.join("\n");
}

/**
 * Send an outfit to a single user via Telegram, with images and dirty buttons.
 */
export async function sendOutfitToUser(db: Database, user: DbUser, house_id: HouseId): Promise<boolean> {
    const chat_id = user._chat_id;
    if (chat_id == null) return false;

    const allClothes = await db.ClothingGetAll(house_id);
    const { outfit, missingSlots } = generateOutfit(allClothes);

    // If we can't generate an outfit (missing required slots), ask about laundry
    if (missingSlots.length > 0) {
        return await sendLaundryPrompt(db, user, house_id, missingSlots);
    }

    const telegram = db.GetTelegram();
    const images = getOutfitImages(outfit);

    // Send photos as a media group if we have 2+ images
    if (images.length >= 2) {
        const media = images.map((img) => ({
            type: "photo" as const,
            media: img.url,
            caption: img.caption,
        }));
        await telegram.sendMediaGroup(chat_id, media);
    } else if (images.length === 1) {
        await telegram.sendPhoto(chat_id, images[0].url, images[0].caption);
    }

    // Build dirty buttons for each clothing item in the outfit
    const buttons: { text: string; callback_data: string }[] = [];
    for (const slot of OUTFIT_DISPLAY_ORDER) {
        const item = outfit[slot];
        if (item == null) continue;
        const payload: TelegramCallbackKVPayload = {
            type: "OUTFIT_DIRTY",
            user_id: user.id,
            clothing_id: item.id,
            house_id,
        };
        const key = await db.TelegramCallbackCreate(payload);
        if (key != null) {
            const label = slot.charAt(0).toUpperCase() + slot.slice(1);
            buttons.push({ text: `${label} is dirty`, callback_data: key });
        }
    }

    const text = buildOutfitText(outfit);

    const keyboard: TelegramInlineKeyboardMarkup = {
        // One button per row so they're easy to tap
        inline_keyboard: buttons.map(b => [b]),
    };

    await telegram.sendTextMessage(chat_id, text, undefined, keyboard);
    return true;
}

/**
 * Send a laundry prompt when no outfit can be generated.
 */
async function sendLaundryPrompt(db: Database, user: DbUser, house_id: HouseId, missingSlots: string[]): Promise<boolean> {
    const chat_id = user._chat_id;
    if (chat_id == null) return false;

    const payload: TelegramCallbackKVPayload = {
        type: "OUTFIT_LAUNDRY",
        user_id: user.id,
        house_id,
    };
    const key = await db.TelegramCallbackCreate(payload);

    const missingText = missingSlots.join(", ");
    const text = `I can't put together an outfit today - no clean items for: ${missingText}. Has laundry been done?`;

    if (key != null) {
        const keyboard: TelegramInlineKeyboardMarkup = {
            inline_keyboard: [[{ text: "Laundry is done!", callback_data: key }]],
        };
        await db.GetTelegram().sendTextMessage(chat_id, text, undefined, keyboard);
    } else {
        await db.GetTelegram().sendTextMessage(chat_id, text);
    }
    return true;
}

export const TriggerOutfits = async function (db: Database, hour: number) {
    // Get all households that have opted into outfit notifications for this hour
    const households = await db.HouseOutfitGetHousesReadyForGivenHour(hour);

    const promises = households.map(async (house_id) => {
        const users = await db.HouseholdGetOutfitOptedInUsers(house_id);
        const userPromises = users.map(user => sendOutfitToUser(db, user, house_id));
        await Promise.allSettled(userPromises);
        await db.HouseOutfitMarkComplete(house_id);
        return house_id;
    });
    const results = await Promise.allSettled(promises);
    return {
        results,
        households,
    };
}
