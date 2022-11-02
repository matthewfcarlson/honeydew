import { ResponseJsonNotFound, readRequestBody, ResponseJsonMethodNotAllowed, ResponseJsonDebugOnly } from "../../_utils";
import TelegramAPI, { isTelegramUpdateCallbackQuery, isTelegramUpdateMessage, TelegramInlineKeyboardMarkup } from "./_telegram";

export const onRequest: HoneydewPagesFunction = async function onRequestPost(context) {
    if (context.env.PRODUCTION == "true") return ResponseJsonDebugOnly();
    const ta = new TelegramAPI(context.env.TELEGRAM);
    const results = await ta.deleteWebhook();
    console.log(results);
    const results2 = await ta.setWebhook("https://honeydew.matthewc.dev/api/telegram/webhook", context.env.TELEGRAM_WH);
    console.log(results2);
    return new Response("TEST");
}