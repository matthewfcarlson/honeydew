
import jwt from '@tsndr/cloudflare-worker-jwt'
import {ConvertToUUID, deleteCookie, readRequestBody, ResponseJsonAccessDenied, ResponseJsonBadRequest, ResponseJsonDebugOnly, ResponseJsonMissingData, ResponseJsonNotImplementedYet, setCookie} from "../_utils";

import { v4 as uuidv4 } from 'uuid';
import { HoneydewPagesFunction } from '../types';
import { DbHousehold } from '../_db';

function formatUserDbId(userId) {
    return `user:${userId}`;
}

async function generateNewUserUUID(env) {
    let userId = uuidv4();
    let data = await env.HONEYDEW.get(formatUserDbId(userId));
    while (data != null) {
        userId = uuidv4();
        data = await env.HONEYDEW.get(formatUserDbId(userId));
    }
    return userId
}

export const onRequestPost: HoneydewPagesFunction = async function (context) {
    const {
      request, // same as existing Worker API
      env, // same as existing Worker API
      params, // if filename includes [id] or [[path]]
      waitUntil, // same as ctx.waitUntil in existing Worker API
      next, // used for middleware or to fetch assets
      data, // arbitrary space for passing data between middlewares
    } = context;

    const body = await readRequestBody(request);

    if (body == null || body["name"] == undefined) {
        return ResponseJsonMissingData("Name");
    }
    
    const name = body['name'];

    if (name.length < 2) {
        return ResponseJsonMissingData("name");
    }
    
    const housekey_data = body['key'] || '';

    if (data.authorized != undefined && context.data.authorized == true) {
        console.log("Already logged in, don't sign them in again");
        return ResponseJsonBadRequest("Already logged in")
    }

    const db = data.db;
    const user = await db.UserCreate(name, "bob");

    
    
    // Check if household exists
    let house: null|DbHousehold = null;
    if (housekey_data != '') {
        // house = await db.HouseholdGet(household);
        console.log("HOUSE UNLOCK", house);
        // TODO: revamp this for new approach using housekey with hash
        return ResponseJsonNotImplementedYet();
        if (house == null) return ResponseJsonMissingData("Bad houseid");
        //if (house.housekey != housekey) return ResponseJsonMissingData("Bad Housekey");
        await db.UserSetHousehold(user.id, house.id, user, house);
    }

    const secret = env.JWT_SECRET;
    // Creating a token
    const token = await jwt.sign({
        id: user.id,
        first_name: user.firstname,
        last_name: user.lastname,
        //exp: Math.floor(Date.now() / 1000) + (12 * (60 * 60)) // Expires: Now + 12h
    }, secret);

    if (house == null) {
        house = await db.HouseholdCreate(`${user.firstname}'s House`, user.id);
    }

    const household_id = (house != null) ? house.id : null;

    const info = JSON.stringify({msg:"Signed up", user:user.id, recovery_key: user._recoverykey, household:household_id}, null, 2);
    const response = new Response(info, {
        headers: { "Content-Type": "application/json" },
        status:200,
    })
    setCookie(response, "Device-Token", token);

    return response;
}
