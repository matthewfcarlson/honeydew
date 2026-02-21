import { HoneydewPagesFunction } from "../../types";
import jwt from '@tsndr/cloudflare-worker-jwt'
import Database from "../../database/_db";
import { ResponseJsonMissingData, ResponseRedirect, setCookie } from "../../_utils";
import { DEVICE_TOKEN, TEMP_TOKEN } from "../auth_types";
import { DbMagicKeyZ } from "../../db_types";


export const onRequestGet: HoneydewPagesFunction = async function (context) {
    const id = context.params.id;
    const user_agent = context.request.headers.get('user-agent') || '';
    if (id == null || id == undefined) return ResponseJsonMissingData();
    if (user_agent.startsWith("Telegram")) {
        return ResponseRedirect(context.request, "/error?msg=TELEGRAM_CRAWLER");
    }
    const db = context.data.db as Database;
    if (Array.isArray(id)) {
        console.error("AUTH/MAGIC/[id]", "auth/magic ID IS ARRAY", id);
        return ResponseRedirect(context.request, "/error?msg=MAGICKEY_INVALID");
    }

    const magic_key_raw = DbMagicKeyZ.safeParse(id);
    if (magic_key_raw.success == false) return ResponseRedirect(context.request, "/error?msg=MAGICKEY_INVALID");
    const magic_key = magic_key_raw.data;

    // Look up the magic key without consuming it - links stay valid for their full 1-hour TTL
    const {user: magic_user, error} = await db.UserMagicKeyLookup(magic_key);
    if (magic_user == null) {
        return ResponseRedirect(context.request, "/error?msg=" + (error || "UNKNOWN_ERROR"));
    }

    const secret = context.env.JWT_SECRET;

    // Creating a more secure token?
    const refresh_token = await jwt.sign({
        id: magic_user.id,
        // tokens do not expire just because why not?
    }, secret);
    const generic_token = await jwt.sign({
        id: magic_user.id,
        name: magic_user.name,
        exp: Math.floor(Date.now() / 1000) + (12 * (60 * 60)), // Expires: Now + 12h
    }, secret);

    const redirect = '<head><meta http-equiv="Refresh" content="0; URL=/household" /></head>';

    const response = new Response(redirect, {
        headers: { "Content-Type": "text/html; charset=utf-8" },

    })

    setCookie(response, TEMP_TOKEN, generic_token, false);
    setCookie(response, DEVICE_TOKEN, refresh_token);
    return response;
}
