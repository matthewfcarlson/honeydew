import { ResponseJsonNotFound } from "../../_utils";
import TelegramAPI, { isTelegramUpdateCallbackQuery, isTelegramUpdateMessage, TelegramInlineKeyboardMarkup } from "./_telegram";

export const onRequest: HoneydewPagesFunction = async function onRequest({ env }) {
    const ta = new TelegramAPI(env.TELEGRAM);
    const results = await ta.getUpdates();
    if (results == false) {
        return ResponseJsonNotFound();
    }
    console.log(results);
    results.forEach((x) => {
        if (isTelegramUpdateMessage(x)) {
            console.log("message", x);
            return;
            if (x.message == undefined || x.message == null) return;
            if (x.message.from == undefined || x.message.from == null) return;
            //if (x.message.from.is_bot) return;
            const to = x.message.from.first_name;
            const chat = x.message.chat;
            const text = x.message.text || "Unknown text"
            const response = `Reply to ${to} : "${text}"`
            if (chat.title != null) return;
            console.log(response, chat.title || `Chat:${chat.id}`);
            const keyboard: TelegramInlineKeyboardMarkup = {
                inline_keyboard: [[
                    {
                        text: "Completed Task",
                        callback_data: "complete4",
                        url: "https://honeydew.matthewc.dev/api/todo/1/complete",
                        login_url: {url: "https://honeydew.matthewc.dev/api/magic_link/54023423432423"},
                    }
                ]]
            };
            //ta.sendTextMessage(chat.id, response, x.message.message_id, keyboard);
        }
        if (isTelegramUpdateCallbackQuery(x)) {
            // Handle callback query
            console.log("callback", x);
        }

    });
    return new Response("TEST");
}