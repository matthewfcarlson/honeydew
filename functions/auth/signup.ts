
import jwt from '@tsndr/cloudflare-worker-jwt'
import { ConvertToUUID, deleteCookie, readRequestBody, ResponseJsonAccessDenied, ResponseJsonBadRequest, ResponseJsonDebugOnly, ResponseJsonMissingData, ResponseJsonNotImplementedYet, setCookie } from "../_utils";

import { HoneydewPageEnv, HoneydewPagesFunction } from '../types';
import Database from '../database/_db';
import { AuthSignupResponse, DEVICE_TOKEN, TEMP_TOKEN } from './auth_types';
import { DbHousehold, DbUser } from '../db_types';
import { VerifyHouseKeyCode } from './join/[id]';

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

    const body = await readRequestBody(request) as any;

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

    if (env.PRODUCTION) {
        // If we're in production, check with turnstile
        const turnstile = body['turnstile'] || '';
        if (turnstile == '') return ResponseJsonMissingData('Turnstile response');
        const ip = request.headers.get('CF-Connecting-IP') || '';
        const formData = new FormData();
        formData.append('secret', env.TURNSTILE);
        formData.append('remoteip', ip);
        formData.append('response', turnstile);
        const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        const result = await fetch(url, {
            body: formData,
            method: 'POST',
        });
    
        const outcome = await result.json() as any;
        if (outcome == null || outcome.success == false) {
            return ResponseJsonAccessDenied();
        }
    }

    // Check if household exists
    let house: null | DbHousehold = null;
    if (housekey_data != '') {
        const key = await VerifyHouseKeyCode(housekey_data, db, env.JWT_SECRET);
        if (key == false || key == null) {
            return ResponseJsonAccessDenied();
        }
        house = await db.HouseholdGet(key.house);
        if (house == null) return ResponseJsonMissingData("Bad houseid");
        // delete this key so it can't be used again
        await db.HouseKeyDelete(key.id);
    }
    else {
        house = await db.HouseholdCreate(`${name}'s House`);
    }

    if (house == null) {
        return ResponseJsonBadRequest("We were unable to generate a house");
    }

    const user = await db.UserCreate(name, house.id);
    if (user == null) {
        return ResponseJsonBadRequest("We were unable to generate a user");
    }
    await db.UserSetHousehold(user.id, house.id, user, house);


    const secret = env.JWT_SECRET;

    // Creating a more secure token?
    const refresh_token = await jwt.sign({
        id: user.id,
        // tokens do not expire just because why not?
    }, secret);


    const result: AuthSignupResponse = {
        user_id: user.id, recovery_key: user._recoverykey, household: house.id
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
