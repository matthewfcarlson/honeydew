
import jwt from '@tsndr/cloudflare-worker-jwt'
import { ConvertToUUID, deleteCookie, readRequestBody, ResponseJsonAccessDenied, ResponseJsonBadRequest, ResponseJsonDebugOnly, ResponseJsonMissingData, ResponseJsonNotImplementedYet, setCookie } from "../_utils";

import { v4 as uuidv4 } from 'uuid';
import { HoneydewPageEnv, HoneydewPagesFunction } from '../types';
import Database, { DbHousehold } from '../_db';
import { AuthSignupResponse, DEVICE_TOKEN, TEMP_TOKEN } from './auth_types';
import { DbUser } from '../data_types';
import { VerifyHouseKeyCode } from './join/[id]';

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

export async function GiveNewTemporaryCookie(env: HoneydewPageEnv, response:Response, user:DbUser) {
     // Creating a more secure token?
     const secret = env.JWT_SECRET;
     const generic_token = await jwt.sign({
        id: user.id,
        name: user.name,
        exp: Math.floor(Date.now() / 1000) + 12, //(12 * (60 * 60)) // Expires: Now + 12h
    }, secret);

    setCookie(response, TEMP_TOKEN, generic_token, false);
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
        console.error("Already logged in, don't sign them in again");
        return ResponseJsonBadRequest("Already logged in")
    }

    const db = data.db as Database;
    const user = await db.UserCreate(name);

    // Check if household exists
    let house: null | DbHousehold = null;
    if (housekey_data != '') {
        const key = await VerifyHouseKeyCode(housekey_data, db, env.JWT_SECRET);
        if (key == false) {
            return ResponseJsonAccessDenied();
        }
        house = await db.HouseholdGet(key.house);
        if (house == null) return ResponseJsonMissingData("Bad houseid");
        await db.UserSetHousehold(user.id, house.id, user, house);
    }

    const secret = env.JWT_SECRET;
    
    // Creating a more secure token?
    const refresh_token = await jwt.sign({
        id: user.id,
        // tokens do not expire just because why not?
    }, secret);
    
    if (house == null) {
        house = await db.HouseholdCreate(`${user.name}'s House`, user.id);
    }
    
    const household_id = (house != null) ? house.id : null;
    const result: AuthSignupResponse = {
        user_id: user.id, recovery_key: user._recoverykey, household: household_id
    }
    const info = JSON.stringify(result, null, 2);
    const response = new Response(info, {
        headers: { "Content-Type": "application/json" },
        status: 200,
    })
    // Give the generic cookie
    await GiveNewTemporaryCookie(env, response, user);
    setCookie(response, DEVICE_TOKEN, refresh_token);

    return response;
}
