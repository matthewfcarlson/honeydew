import { HoneydewPagesFunction } from "../../types";
import { ResponseJsonNotFound, readRequestBody, ResponseJsonMethodNotAllowed, ResponseJsonDebugOnly } from "../../_utils";
import { TelegramAPI, isTelegramUpdateCallbackQuery, isTelegramUpdateMessage, TelegramInlineKeyboardMarkup } from "../../database/_telegram";

export const onRequest: HoneydewPagesFunction = async function onRequestPost(context) {
    if (context.env.PRODUCTION == "true") return ResponseJsonDebugOnly();
    const ta = new TelegramAPI(context.env.TELEGRAM);
    const results = await ta.getWebhookInfo();
    return new Response("TEST");
}