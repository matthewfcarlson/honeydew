import jwt from '@tsndr/cloudflare-worker-jwt';
import { HoneydewPagesFunction } from '../types';
import Database from '../_db';
import TelegramAPI from '../api/telegram/_telegram';
import { DEVICE_TOKEN, TEMP_TOKEN } from './auth_types';
import { GiveNewTemporaryCookie } from './signup';

/**
 * Takes a cookie string
 * @param {String} cookieString - The cookie string value: "val=key; val2=key2; val3=key3;"
 * @param {String} key - The name of the cookie we are reading from the cookie string
 * @returns {(String|null)} Returns the value of the cookie OR null if nothing was found.
 */
function getCookie(cookieString, key) {
  if (cookieString) {
    const allCookies = cookieString.split("; ")
    const targetCookie = allCookies.find(cookie => cookie.includes(key))
    if (targetCookie) {
      const [_, value] = targetCookie.split("=")
      return value
    }
  }
  return null
}

async function isValidJwt(secret: string, token: string) {

  if (token == null) return false;

  try {
    return await jwt.verify(token, secret);
    // Token is good!
  } catch (err) {
    console.log("isValidJwt", err);
    // If the JWT verification fails, an exception will be thrown and we'll end up in here
    return false
  }

}

export const jwtHandler: HoneydewPagesFunction = async (context) => {
  const cookieString = context.request.headers.get("Cookie");
  const secret = context.env.JWT_SECRET;
  const token = (cookieString != null) ? getCookie(cookieString, TEMP_TOKEN) : null;
  const isValid = await isValidJwt(secret, token)
  context.data.jwt_raw = token;
  context.data.authorized = false;
  context.data.userid = null;
  context.data.user = null;

  if (isValid) {
    const { payload } = jwt.decode(token);
    context.data.jwt = payload;
    context.data.userid = payload.id || null;
    return await context.next();
  }
  // this system might be stupid
  // I could probably get by just fine with one cookie
  const refresh_token = (cookieString != null) ? getCookie(cookieString, DEVICE_TOKEN) : null;
  const isRefreshValid = await isValidJwt(secret, refresh_token);
  if (isRefreshValid){
    const { payload } = jwt.decode(refresh_token);
    context.data.jwt = payload;
    context.data.userid = payload.id || null;
    console.log("Falling back to device token");
    const db = context.data.db as Database;
    const user = await db.GetUser(context.data.userid);
    context.data.user = user;
  }
  if (context.data.user != null) {
    console.log("Creating a new cookie", context.data.user);
    context.data.authorized = true;
    const response = await context.next();
    await GiveNewTemporaryCookie(context.env, response, context.data.user);
    return response;
  }

  console.log(context.data);

  return await context.next();
}

export const userAuthHandler: HoneydewPagesFunction = async (context)=> {
  
  if (context.data.userid == null || context.data.user != null) {
    return await context.next();
  }
  const db = context.data.db as Database;
  const user = await db.GetUser(context.data.userid);
  context.data.user = user;

  if (user != null) {
    context.data.authorized = true;
  }
  return await context.next();
}

export async function topLevelHandler(context) {
  let res = null;
  try {
    // register the console handler
    const _error = console.error;
    const message_hours_lifetime = 2; // messages last 12 hours
    console.error = function (...data) {
      const key = `err:${Date.now().toString()}`;
      context.env.HONEYDEW.put(key, JSON.stringify(data), { expirationTtl: 60 * 60 * message_hours_lifetime });
      _error(...data);
    }
    // Time stamp and then go the next handler
    context.data.timestamp = Date.now();
    // Put the KV ORM layer into context data
    context.data.db = new Database(context.env.HONEYDEW, new TelegramAPI(context.env.TELEGRAM));
    // pass to the next handler
    res = await context.next();
  }
  catch (thrown) {
    res = new Response(`Server Error ${thrown}\n${thrown.stack}`, {
      status: 500,
      statusText: "Internal Server Error",
    });
    console.error(thrown.stack);
  }
  finally {
    const delta = Date.now() - context.data.timestamp;
    res.headers.set('x-response-timing', delta);
  }
  return res;
}


export const onRequest: HoneydewPagesFunction[] = [topLevelHandler, jwtHandler, userAuthHandler]