import Database from "../../database/_db";
import { TelegramCallbackQuery, TelegramInlineKeyboardMarkup, TelegramUpdateCallbackQuery, TelegramUpdateMessage } from "../../database/_telegram";
import { DbUser, TelegramCallbackKVKeyZ } from "../../db_types";
import { IsValidHttpUrl, ResponseJsonBadRequest, ResponseJsonOk } from "../../_utils";

async function HandleRecipeUpdate(db: Database, msg: TelegramUpdateMessage, user: DbUser) {
    const text = msg.message.text || 'N/A';
    if (IsValidHttpUrl(text) == false) return false;
    const recipe = await db.RecipeCreateIfNotExists(text);
    if (recipe == null) {
        const response = `I'm not sure "${text}" is a recipe, maybe enter it manually from the website?`
        // unable to create this recipe
        await db.GetTelegram().sendTextMessage(msg.message.chat.id, response, msg.message.message_id);
    }
    else {
        const response = `I've made a recipe for "${recipe.name}" and added it your card box ${recipe.id}. This is still a work in progress`
        // reply to the original message
        const promises = [];
        promises.push(db.GetTelegram().sendPhoto(msg.message.chat.id, recipe.image, response, msg.message.message_id));
        promises.push(db.CardBoxAddRecipe(recipe.id, user.household));
        await Promise.all(promises);
    }
    return true;
}

export async function HandleTelegramUpdateMessage(db: Database, message: TelegramUpdateMessage) {
    const x = message;
    if (x.message == undefined || x.message == null) return ResponseJsonBadRequest("message is null");
    if (x.message.from == undefined || x.message.from == null) return ResponseJsonBadRequest("message from is null");
    const chat = x.message.chat;
    // Look up chat Id
    const user = await db.UserFind(undefined, chat.id);
    if (user == null) {
        const keyboard: TelegramInlineKeyboardMarkup = {
            inline_keyboard: [[
                {
                    text: "Refresh My Memory",
                    url: "https://honeydew.matthewc.dev/auth/telegram/"+chat.id,
                },
            ]]
        };
        await db.GetTelegram().sendTextMessage(chat.id, "I don't recognize, this telegram chat. Mind clicking on this link to refresh my memory?", undefined, keyboard);
        return ResponseJsonOk();
    }
    // Check if this is a recipe or link
    if (await HandleRecipeUpdate(db, x, user) == true) return ResponseJsonOk(); 

    const response = "I'm sorry, I don't understand this message"
    await db.GetTelegram().sendTextMessage(chat.id, response, x.message.message_id);
    return ResponseJsonOk()
}

export async function HandleTelegramUpdateCallbackQuery(db: Database, message: TelegramUpdateCallbackQuery) {
    //await context.env.HONEYDEW.put("telegram_callback", JSON.stringify(message));
    try {
        const uuid = message.callback_query.data;
        if (uuid == null) throw new Error("No Message ID");
        console.error("TelegramUpdateCallbackQuery", "recieved ", uuid);
        // TODO: modify the message so that it has no buttons
        const callback_key = TelegramCallbackKVKeyZ.parse(uuid);
        const payload = await db.TelegramCallbackConsume(callback_key);
        if (payload == null) {
            console.error("TelegramUpdateCallbackQuery", `unable to find callback ${uuid}`)
            return ResponseJsonOk();
        }
    }
    catch (err) {
        console.error("TelegramUpdateCallbackQuery", err);
    }
    return ResponseJsonOk();
}