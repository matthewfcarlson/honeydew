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
        context.env.HONEYDEW.put("telegram_message", JSON.stringify(x));
        if (x.message == undefined || x.message == null) return;
        if (x.message.from == undefined || x.message.from == null) return;
        //if (x.message.from.is_bot) return;
        const to = x.message.from.first_name;
        const chat = x.message.chat;
        const text = x.message.text || "Unknown text"
        const task = (uuidv4().toString() as string);
        const uuid = (uuidv4().toString() as string).substring(0,64);
        const response = `Reply to ${to} : "${text}. Task ${task}"`
        if (chat.title != null) return;
        console.log(response, chat.title || `Chat:${chat.id}`);
        const keyboard: TelegramInlineKeyboardMarkup = {
            inline_keyboard: [[
                {
                    text: "Completed Task",
                    callback_data: uuid,
                    //url: "https://honeydew.matthewc.dev/api/todo/1/complete",
                    //login_url: {url: "https://honeydew.matthewc.dev/api/magic_link/54023423432423"},
                }
            ]]
        };
        const message = await ta.sendTextMessage(chat.id, response, x.message.message_id, keyboard);
        console.error("sent message", message);
        if (message != false) {
            // inline response: 
            const kv_data = {
                task,
                secret: uuid
            }
            context.env.HONEYDEW.put(`inlinereply:${message.message_id}`, JSON.stringify(kv_data));
        }
        else {
            console.error("Telegram Update Message", "message is null");
        }
    }
    if (isTelegramUpdateCallbackQuery(body)) {
        const message = body;
        context.env.HONEYDEW.put("telegram_callback", JSON.stringify(message));
        const message_id = message.callback_query.inline_message_id;
        if (message_id != null) {
            const value = await context.env.HONEYDEW.get(`inlinereply:${message_id}`)
            console.error(value);
        }
        else {
            console.error("TelegramUpdateCallbackQuery", "no message id")
        }
    }

    return new Response("OK");
}