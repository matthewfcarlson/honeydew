import Database from "../../database/_db";
import { TelegramCallbackQuery, TelegramInlineKeyboardMarkup, TelegramUpdateCallbackQuery, TelegramUpdateMessage } from "../../database/_telegram";
import { DbUser } from "../../db_types";
import { IsValidHttpUrl, ResponseJsonBadRequest, ResponseJsonOk } from "../../_utils";

async function HandleRecipeUpdate(db: Database, msg: TelegramUpdateMessage, user: DbUser) {
    const text = msg.message.text || 'N/A';
    if (IsValidHttpUrl(text) == false) return false;
    const recipe = await db.RecipeCreateIfNotExists(text);
    if (recipe == null) {
        const response = `I'm not sure this is a recipe, maybe enter it manually from the website?`
        // unable to create this recipe
        await db.GetTelegram().sendTextMessage(msg.message.chat.id, response, msg.message.message_id);
    }
    else {
        const response = `I've made a recipe for "${recipe.name}" and added it your card box ${recipe.id}. This is still a work in progress`
        // reply to the original message
        const promises = [];
        promises.push(db.GetTelegram().sendTextMessage(msg.message.chat.id, response, msg.message.message_id));
        promises.push(db.GetTelegram().sendPhoto(msg.message.chat.id, recipe.image, msg.message.message_id))
        await Promise.allSettled(promises);
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
                    url: "https://honeydew.matthewc.dev/auth/telegram/"+chat.id
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

export async function HandleTelegramUpdateCallbackQuery(database: Database, message: TelegramUpdateCallbackQuery) {
    //await context.env.HONEYDEW.put("telegram_callback", JSON.stringify(message));
    const uuid = message.callback_query.data;
    if (uuid != null) {
        // const key = `inlinereply:${uuid}`;
        // const value = await context.env.HONEYDEW.get(key)
        // console.error("querying", key);
        // const kv_data = JSON.parse(value || "");
        // if (kv_data != null) {
        //     const results = await Promise.all([
        //         ta.sendTextMessage(kv_data.chat_id, `TASK COMPLETED: ${kv_data.task}`, kv_data.message_id),
        //         ta.clearMessageReplyMarkup(kv_data.chat_id, kv_data.message_id)
        //     ]);
        //     if (results[0] == false || results[1] == false) console.error("callback promises", results);
        // }
        // console.error("KV DATA: ", key, kv_data);
    }
    else {
        console.error("TelegramUpdateCallbackQuery", "no message id")
    }
    return ResponseJsonOk();
}