import Database from "../../database/_db";
import { TelegramAnswerCallbackQuery, TelegramCallbackQuery, TelegramInlineKeyboardMarkup, TelegramUpdateCallbackQuery, TelegramUpdateMessage } from "../../database/_telegram";
import { DbUser, TelegramCallbackKVKeyZ, TelegramCallbackKVPayload } from "../../db_types";
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


async function HandleTelegramCompleteChore(db: Database, message:TelegramUpdateCallbackQuery, payload: TelegramCallbackKVPayload): Promise<TelegramAnswerCallbackQuery|null> {
    if (payload.type != "COMPLETE_CHORE") return null;
    console.log("Completing chore", payload.chore_id, message.callback_query.data)
    const result = await db.ChoreComplete(payload.chore_id, payload.user_id);
    if (result == false) {
        return {
            callback_query_id: message.callback_query.id,
            text: "Failed to complete the chore, try and do it from the website",
        }
    }
    return {
        callback_query_id: message.callback_query.id,
        text: "Chore completed!"
    }
}

export async function HandleTelegramUpdateCallbackQuery(db: Database, message: TelegramUpdateCallbackQuery) {
    try {
        const uuid = message.callback_query.data;
        if (uuid == null) throw new Error("No callback ID");
        // Make the button disappear
        const chat_id = message.callback_query.message?.chat.id;
        const message_id = message.callback_query.message?.message_id;
        if (chat_id != null && message_id != null) {
            await db.GetTelegram().clearMessageReplyMarkup(chat_id, message_id)
        }
        else {
            console.error("HandleTelegramUpdateCallbackQuery", "Failed to get message/chat ID", chat_id, message_id, message.callback_query)
        }
        // Try and find the callback key
        const callback_key = TelegramCallbackKVKeyZ.parse(uuid);
        const payload = await db.TelegramCallbackConsume(callback_key);
        if (payload == null) {
            console.error("TelegramUpdateCallbackQuery", `unable to find callback ${uuid}`)
            return ResponseJsonOk();
        }
        let answer_callback: TelegramAnswerCallbackQuery|null = null;
        if (payload.type == "COMPLETE_CHORE") {
            answer_callback = await HandleTelegramCompleteChore(db, message, payload);
        }
        if (answer_callback != null) {
            console.error("HandleTelegramUpdateCallbackQuery", answer_callback);
            await db.GetTelegram().answerCallbackQuery(answer_callback);
        }
    }
    catch (err) {
        console.error("TelegramUpdateCallbackQuery", err);
    }
    return ResponseJsonOk();
}