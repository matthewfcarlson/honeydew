import { readRequestBody, ResponseJsonBadRequest, ResponseJsonMissingData, ResponseJsonOk } from "../../_utils";
import {TelegramAPI, isTelegramUpdateCallbackQuery, isTelegramUpdateMessage } from "../../database/_telegram";
import { HoneydewPagesFunction } from "../../types";
import Database from "../../database/_db";
import { HandleTelegramUpdateCallbackQuery, HandleTelegramUpdateMessage } from "./_handler";

// TODO: move this somewhere else so the auth middleware handlers don't run
// TODO: make this a TelegramUpdate
export const HandleTelegramUpdate = async function (db: Database, body:unknown) {
    if (isTelegramUpdateMessage(body)) {
        return await HandleTelegramUpdateMessage(db, body);
    }

    if (isTelegramUpdateCallbackQuery(body)) {
    return await HandleTelegramUpdateCallbackQuery(db, body);
    }

    console.error("Telegram Webhook", "Unknown message from telegram", body);
    return ResponseJsonOk();
}


export const onRequestPost: HoneydewPagesFunction = async function (context) {
    const body = await readRequestBody(context.request);
    const db = context.data.db as Database;
    const secret = context.request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secret == null || secret == "") {
        return ResponseJsonMissingData("Telegram Token");
    }
    if (secret != context.env.TELEGRAM_WH) {
        return ResponseJsonBadRequest();
    }
    
    return await HandleTelegramUpdate(db, body);
}