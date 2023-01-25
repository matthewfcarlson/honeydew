import { HoneydewPagesFunction } from "../../types";
import jwt from '@tsndr/cloudflare-worker-jwt'
import Database from "../../database/_db";
import { ResponseJsonBadRequest, ResponseJsonMissingData, ResponseJsonNotFound, ResponseRedirect, setCookie } from "../../_utils";
import { GiveNewTemporaryCookie } from "../signup";
import { AuthSignupResponse, DEVICE_TOKEN } from "../auth_types";
import { DbMagicKeyZ } from "../../db_types";


export const onRequestGet: HoneydewPagesFunction = async function (context) {
    const id = context.params.id;
    if (id == null || id == undefined) return ResponseJsonMissingData();
    if (context.data.userid != null) {
        return ResponseRedirect(context.request, "/error?msg=ALREADY_LOGGEDIN&k="+id)
    }
    const db = context.data.db as Database;
    const user = context.data.user
    if (user != null) return ResponseJsonNotFound();
    if (Array.isArray(id)) {
        console.error("AUTH/JOIN/[id]", "auth/join ID IS ARRAY", id);
        return ResponseRedirect(context.request, "/error?msg=MAGICKEY_NOT_FOUND");
    }

    // TODO: sanitize the database
    const magic_key_raw = DbMagicKeyZ.safeParse(id);
    if (magic_key_raw.success == false) return ResponseRedirect(context.request, "/error?msg=MAGICKEY_NOT_FOUND");
    const magic_key = magic_key_raw.data;

    if (await db.UserMagicKeyExists(magic_key) == false) {
        return ResponseRedirect(context.request, "/error?msg=MAGICKEY_NOT_FOUND");
    }

    const magic_user = await db.UserMagicKeyConsume(magic_key);
    if (magic_user == null) {
        return ResponseRedirect(context.request, "/error?msg=USER_NOT_FOUND");
    }

    const secret = context.env.JWT_SECRET;

    // Creating a more secure token?
    const refresh_token = await jwt.sign({
        id: magic_user.id,
        // tokens do not expire just because why not?
    }, secret);


    const result: AuthSignupResponse = {
        user_id: magic_user.id, recovery_key: magic_user._recoverykey, household: magic_user.household
    }
    const info = JSON.stringify(result, null, 2);
    const response = ResponseRedirect(context.request,"/household");
    // Give the generic cookie
    await GiveNewTemporaryCookie(context.env, response, magic_user);
    setCookie(response, DEVICE_TOKEN, refresh_token);
    return response;
}