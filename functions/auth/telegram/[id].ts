import { HouseKeyKVKeyZ, UserId } from "../../db_types";
import { HoneydewPagesFunction } from "../../types";
import Database from "../../database/_db";
import { ArrayBufferToHexString, ResponseJsonAccessDenied, ResponseJsonBadRequest, ResponseJsonMissingData, ResponseJsonNotFound, ResponseRedirect } from "../../_utils";


export const onRequestGet: HoneydewPagesFunction = async function (context) {
    const id = context.params.id;
    if (id == null || id == undefined) return ResponseJsonMissingData();
    if (Array.isArray(id)) {
        console.error("auth/join ID IS ARRAY", id);
        return ResponseJsonBadRequest();
    }
    if (context.data.userid == null) {
        return ResponseRedirect(context.request, "/error?t=TelegramNotLoggedIn")
    }
    const db = context.data.db as Database;
    const user = context.data.user
    if (user == null) return ResponseJsonNotFound();

    await db.UserRegisterTelegram(user.id, Number(id), 0);

    return ResponseRedirect(context.request,"/household");
}