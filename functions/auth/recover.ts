
import jwt from '@tsndr/cloudflare-worker-jwt'
import { readRequestBody, ResponseJsonAccessDenied, ResponseJsonBadRequest, ResponseJsonMissingData, setCookie } from "../_utils";

import { HoneydewPagesFunction } from '../types';
import Database from '../database/_db';
import { DEVICE_TOKEN, TEMP_TOKEN } from './auth_types';
import { GiveNewTemporaryCookie } from './signup';
import { UserIdZ } from '../db_types';

export const onRequestPost: HoneydewPagesFunction = async function (context) {
    const { request, env, data } = context;

    const body = await readRequestBody(request) as any;

    if (body == null || body["recovery_key"] == undefined || body["user_id"] == undefined) {
        console.warn("Recovery attempt with missing fields", {
            hasBody: body != null,
            hasRecoveryKey: body?.["recovery_key"] != undefined,
            hasUserId: body?.["user_id"] != undefined,
        });
        return ResponseJsonMissingData("recovery_key and user_id");
    }

    const raw_user_id = body['user_id'];
    const recovery_key = body['recovery_key'];

    if (typeof recovery_key !== 'string' || recovery_key.length < 10) {
        console.warn("Recovery attempt with invalid recovery key format", {
            type: typeof recovery_key,
            length: typeof recovery_key === 'string' ? recovery_key.length : 'N/A',
        });
        return ResponseJsonBadRequest("Invalid recovery key format: must be a string of at least 10 characters");
    }

    const user_id = UserIdZ.safeParse(raw_user_id);
    if (!user_id.success) {
        console.warn("Recovery attempt with invalid user ID format", {
            raw_user_id,
            zodError: user_id.error.message,
        });
        return ResponseJsonBadRequest(`Invalid user ID format: ${user_id.error.issues[0]?.message || "must match U:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}`);
    }

    if (data.authorized && data.user != null) {
        console.warn("Recovery attempt while already logged in", { user_id: data.user.id });
        return ResponseJsonBadRequest("Already logged in");
    }

    const db = data.db as Database;

    const user = await db.UserGet(user_id.data);
    if (user == null) {
        console.warn("Recovery attempt for non-existent user", { user_id: user_id.data });
        return ResponseJsonAccessDenied("No user found with that ID");
    }

    // Constant-time comparison would be ideal, but crypto.subtle.timingSafeEqual
    // is not available in all Workers runtimes. The recovery key is a UUID so
    // brute-force is not practical regardless.
    if (user._recoverykey !== recovery_key) {
        console.warn("Recovery attempt with wrong recovery key", {
            user_id: user_id.data,
            providedKeyLength: recovery_key.length,
            expectedKeyLength: user._recoverykey?.length ?? 0,
        });
        return ResponseJsonAccessDenied("Recovery key does not match");
    }

    console.log("Recovery successful", { user_id: user_id.data });

    const secret = env.JWT_SECRET;

    const refresh_token = await jwt.sign({
        id: user.id,
    }, secret);

    const result = { success: true };
    const info = JSON.stringify(result);
    const response = new Response(info, {
        headers: { "Content-Type": "application/json" },
        status: 200,
    });

    await GiveNewTemporaryCookie(env, response, user);
    setCookie(response, DEVICE_TOKEN, refresh_token);

    return response;
}
