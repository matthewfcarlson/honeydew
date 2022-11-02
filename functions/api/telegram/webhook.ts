import { ResponseJsonNotFound, readRequestBody, ResponseJsonMethodNotAllowed, ResponseJsonBadRequest, ResponseJsonMissingData } from "../../_utils";
import TelegramAPI, { isTelegramUpdateCallbackQuery, isTelegramUpdateMessage, TelegramInlineKeyboardMarkup } from "./_telegram";
import { v4 as uuidv4 } from 'uuid';
import { HoneydewPagesFunction } from "../../types";

export const onRequestPost: HoneydewPagesFunction = async function (context) {
    const ta = new TelegramAPI(context.env.TELEGRAM);
    const body = await readRequestBody(context.request);
    const secret = context.request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secret == null || secret == "") {
        return ResponseJsonMissingData("Telegram Token");
    }
    if (secret != context.env.TELEGRAM_WH) {
        return ResponseJsonBadRequest();
    }
    const data = {
        timestamp: Date.now().toString(),
        body,
        secret
    }

    if (isTelegramUpdateMessage(body)) {
        const x = body;
        await context.env.HONEYDEW.put("telegram_message", JSON.stringify(x));
        if (x.message == undefined || x.message == null) return;
        if (x.message.from == undefined || x.message.from == null) return;
        //if (x.message.from.is_bot) return;
        const to = x.message.from.first_name;
        const chat = x.message.chat;
        const text = x.message.text || "Unknown text"
        const task = (uuidv4().toString() as string);
        const uuid = (uuidv4().toString() as string).substring(0, 64);
        const response = `Reply to ${to} : "${text}". Task ${task}. UUID ${uuid}`
        if (chat.title != null) return;
        console.log(response, chat.title || `Chat:${chat.id}`);
        const keyboard: TelegramInlineKeyboardMarkup = {
            inline_keyboard: [[
                {
                    text: "Completed Task",
                    callback_data: uuid,
                },
                {
                    text: "Ignore",
                    callback_data: uuid, // todo: create a new UUID to keep track of
                }
            ]]
        };
        const message = await ta.sendTextMessage(chat.id, response, x.message.message_id, keyboard);
        console.error("sent message", message);
        if (message != false) {
            const kv_data = {
                task,
                chat_id: chat.id,
                message_id: message.message_id
            }
            // TODO: wrap this all in a nice API with types and everything!
            await context.env.HONEYDEW.put(`inlinereply:${uuid}`, JSON.stringify(kv_data));
        }
        else {
            console.error("Telegram Update Message", "message is null");
        }
    }
    if (isTelegramUpdateCallbackQuery(body)) {
        const message = body;
        await context.env.HONEYDEW.put("telegram_callback", JSON.stringify(message));
        const uuid = message.callback_query.data;
        if (uuid != null) {
            const key = `inlinereply:${uuid}`;
            const value = await context.env.HONEYDEW.get(key)
            console.error("querying", key);
            const kv_data = JSON.parse(value);
            if (kv_data != null) {
                const results = await Promise.all([
                    ta.sendTextMessage(kv_data.chat_id, `TASK COMPLETED: ${kv_data.task}`, kv_data.message_id),
                    ta.clearMessageReplyMarkup(kv_data.chat_id, kv_data.message_id)
                ]);
                if (results[0] == false || results[1] == false) console.error("callback promises", results);
            }
            console.error("KV DATA: ", key, kv_data);
        }
        else {
            console.error("TelegramUpdateCallbackQuery", "no message id")
        }
    }

    return new Response("OK");
}