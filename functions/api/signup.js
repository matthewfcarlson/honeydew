const setCache = async (env, key, data) => env.HONEYDEW.put(key, data)
const getCache = async (env,key) => env.HONEYDEW.get(key)
import jwt from '@tsndr/cloudflare-worker-jwt'

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

export async function onRequestGet(context) {
    const {
      request, // same as existing Worker API
      env, // same as existing Worker API
      params, // if filename includes [id] or [[path]]
      waitUntil, // same as ctx.waitUntil in existing Worker API
      next, // used for middleware or to fetch assets
      data, // arbitrary space for passing data between middlewares
    } = context;

    console.log(request.url)

    if (data.authorized != undefined && context.data.authorized == true) {
        return new Response('{"msg": "Already logged in"}', { status: 400 })
    }

    const userId = await generateNewUserUUID(env)
    const dbId = formatUserDbId(userId);
    const user = await env.HONEYDEW.get(dbId)
    console.log("user", user, userId, dbId);


    const secret = 'SECRET HERE';
    // Creating a token
    const token = await jwt.sign({
        id: userId,
        name: 'John Doe',
        email: 'john.doe@gmail.com',
        nbf: Math.floor(Date.now() / 1000) + (60 * 60),      // Not before: Now + 1h
        exp: Math.floor(Date.now() / 1000) + (12 * (60 * 60)) // Expires: Now + 12h
    }, secret);

    const db_data = JSON.stringify({household_id:null, name: "John Doe", current_task: null})

    const info = JSON.stringify("Created New Account", null, 2);
    const newCookie = `Device-Token=${token}; HttpOnly; SameSite=Strict`
    const response = new Response(info, {
    headers: { "Content-Type": "application/json" },
    })
    response.headers.set("Set-Cookie", newCookie)

    await env.HONEYDEW.put(dbId, db_data)

    return response;
}