import { HoneydewPagesFunction } from "../../types";
import Database, { HOUSEID, UserId } from "../../_db";
import { ArrayBufferToHexString, ResponseJsonAccessDenied, ResponseJsonBadRequest, ResponseJsonMissingData, ResponseJsonNotFound, ResponseRedirect } from "../../_utils";

export interface ApiHousehold {
    name:string;
    id:HOUSEID;
    members:{userid:UserId, firstname:string, lastname:string}[];
}

export interface ApiUser {
    first_name:string;
    last_name:string;
    id:UserId;
    household:ApiHousehold|null;
    task:any;
}

export async function VerifyHouseKeyCode(id:string, db:Database, secret_key:string) {
    const parts = id.split(":");
    if (parts.length != 2) {
        console.error("VerifyHouseKeyCode BAD SPLIT", parts);
        return false;
    }
    // TODO: if the hash doesn't match the first part, put the IP on the sus list
    const key_id = parts[0];
    const key_sha = parts[1];
    // Check sha
    const hash_data = new TextEncoder().encode(key_id+secret_key);
    const hash_digest = await crypto.subtle.digest("SHA-256", hash_data);
    const hash_text = ArrayBufferToHexString(hash_digest).substring(0,16);
    // TODO: check if key-id is in fact a UUID
    if (hash_text != key_sha) {
        console.error("Housekey join: SHA does not match")
        return false;
    }

    // TODO: check sha as well
    // TODO: don't respond right away to prevent timing attacks
    if (await db.HouseKeyExists(key_id) == false) {
        console.error("Housekey does not exist: "+key_id);
        return false;
    }
    const key = await db.HouseKeyGet(key_id);

    return key;
}

export const onRequestGet: HoneydewPagesFunction = async function (context) {
    const id = context.params.id;
    if (id == null || id == undefined) return ResponseJsonMissingData();
    if (context.data.userid == null) {
        return ResponseRedirect(context.request, "/signup?k="+id)
    }
    const db = context.data.db as Database;
    const user = context.data.user
    if (user == null) return ResponseJsonNotFound();
    if (Array.isArray(id)) {
        console.error("auth/join ID IS ARRAY", id);
        return ResponseJsonBadRequest();
    }

    const key = await VerifyHouseKeyCode(id, db, context.env.JWT_SECRET);

    if (key == false) {
        console.error("Join household, key is bad");
        return ResponseJsonAccessDenied();
    }

    if (user.household == key.house) {
        return ResponseRedirect(context.request,"/error?t=AlreadyHouseholdMember");
    }

    const results = await db.UserSetHousehold(user.id, key.house, user);
    if (!results) {
        console.error("auth/join FAILED, could not set household");
        return ResponseJsonBadRequest();
    }

    return ResponseRedirect(context.request,"/household");
}