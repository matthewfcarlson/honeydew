// Generates an invite linkimport { HoneydewPagesFunction } from "../types";
import { HoneydewPagesFunction } from "../../types";
import { HOUSEID, USERID } from "../../_db";
import { ArrayBufferToHexString, ResponseJsonAccessDenied, ResponseJsonBadRequest, ResponseJsonMissingData, ResponseJsonNotFound } from "../../_utils";

function bufferToBase64(buffer:ArrayBufferLike) {
    const binary = String.fromCharCode.apply(null, buffer);
    return btoa(binary);
}

export const onRequestGet: HoneydewPagesFunction = async function (context) {
    if (context.data.userid == null) return ResponseJsonAccessDenied();
    if (context.data.authorized == undefined || context.data.authorized == false) {
        return new Response('{"msg": "Invalid Token"}', { status: 403 })
    }
    const db = context.data.db;
    const user = await db.GetUser(context.data.userid);
    if (user == null) return ResponseJsonNotFound();
    if (user.household == "") return ResponseJsonBadRequest();
    const household = await db.HouseholdGet(user.household);
    if (household == null) return ResponseJsonNotFound();
    // TODO: regenerate the housekey and keep track of when it was regenerated
    // TODO: don't store housekey in object itself, store it as expiring key?

    // TODO: give the housekey ID instead
    const key = await db.HouseKeyCreate(household.id, user.id);
    if (key == "error") return ResponseJsonBadRequest(); // TODO: retry?
    const url = context.request.url;

    // TODO: look into converting UUID into arrayBuffer, then smashing two together and then outputting as BASE64
    // Could be smaller?
    const base_url= url.substring(0, url.indexOf("/", 8));
    const hash_data = new TextEncoder().encode(key.id+"secretkey");
    const hash_digest = await crypto.subtle.digest("SHA-256", hash_data);
    const hash_text = ArrayBufferToHexString(hash_digest).substring(0,10);
    const results = {
        link: `${base_url}/api/household/join/${key.id}:${hash_text}`,
    }
    console.log(bufferToBase64(hash_digest));
    console.log(ArrayBufferToHexString(hash_digest));
    return new Response(JSON.stringify(results));
}
//http://127.0.0.1:8788/api/household/join/a475b24a-037d-4abf-b0ea-d905d30741a4
//http://127.0.0.1:8788/api/household/join/OTNmMzM1NWMtYzBmNy00YTEwLWI2MzItOTAzNDIxNjQ5NzA5