
import jwt from '@tsndr/cloudflare-worker-jwt'
import {readRequestBody} from "../_utils";

import { v4 as uuidv4 } from 'uuid';

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



export const onRequestPort: HoneydewPagesFunction = async function (context) {
    const {
      request, // same as existing Worker API
      env, // same as existing Worker API
      params, // if filename includes [id] or [[path]]
      waitUntil, // same as ctx.waitUntil in existing Worker API
      next, // used for middleware or to fetch assets
      data, // arbitrary space for passing data between middlewares
    } = context;

    const body = await readRequestBody(request);
    console.log(body);
    console.log(body["name"]);

    if (body == null || body["name"] == undefined) {
        return new Response('{"msg": "Missing Signup Data"}', { status: 400 })
    }

    const name = body['name'];

    if (data.authorized != undefined && context.data.authorized == true) {
        return new Response('{"msg": "Already logged in"}', { status: 401 })
    }

    const userId = await generateNewUserUUID(env)
    const dbId = formatUserDbId(userId);
    const user = await env.HONEYDEW.get(dbId)
    console.log("user", user, userId, dbId);


    const secret = env.JWT_SECRET;
    // Creating a token
    const db_data = {household_id:null, name, current_task: null}
    const token = await jwt.sign({
        id: userId,
        ...db_data,
        exp: Math.floor(Date.now() / 1000) + (12 * (60 * 60)) // Expires: Now + 12h
    }, secret);

    const db_data_str = JSON.stringify(db_data)

    const info = JSON.stringify({msg:"Created New Account", user:db_data}, null, 2);
    const newCookie = `Device-Token=${token}; HttpOnly; SameSite=Strict`
    const response = new Response(info, {
    headers: { "Content-Type": "application/json" },
    })
    response.headers.set("Set-Cookie", newCookie)

    await env.HONEYDEW.put(dbId, db_data_str)

    return response;
}
