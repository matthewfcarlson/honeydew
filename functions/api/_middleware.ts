import jwt from '@tsndr/cloudflare-worker-jwt';
import { HoneydewPagesFunction } from '../types';

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

async function isValidJwt(secret:string, token: string) {

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

const jwtHandler: HoneydewPagesFunction = async (context) => {
  const cookieString = context.request.headers.get("Cookie");
  const secret = context.env.JWT_SECRET;
  const token = (cookieString != null) ? getCookie(cookieString, 'Device-Token') : null;
  const isValid = await isValidJwt(secret, token)
  context.data.jwt_raw = token;

  if (!isValid || token == null) {
    const ip = context.request.headers.get('cf-connecting-ip') || '';
    const userAgent = context.request.headers.get('User-Agent') || '';
    const requestMethod = context.request.method || '';
    const requestUrl = context.request.url || '';
    const safeToken = token || '';

    // Log all JWT failures
    console.log("FAIL [" + ip + "] " + requestMethod + " " + requestUrl + " [UA: " + userAgent + "] [JWT: " + safeToken + "]" )

    // Invalid JWT - reject request
    context.data.authorized = false;
    
  }
  else {
    const {payload} = jwt.decode(token);
    context.data.jwt = payload;
    context.data.authorized = true;
  }

  return await context.next();
}

async function topLevelErrorHandler(context) {
  let res = null;
  try {
    // register the console handler
    const _error = console.error;
    const message_hours_lifetime = 12; // messages last 12 hours
    console.error = (...data) =>{
      const key = `err:${Date.now().toString()}`;
      context.env.HONEYDEW.put(key, JSON.stringify(data), {expirationTtl: 60*60*message_hours_lifetime}); 
      _error("ERROR", ...data);
    }
    // Time stamp and then go the next handler
    context.data.timestamp = Date.now();
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


export const onRequest: HoneydewPagesFunction[] = [topLevelErrorHandler, jwtHandler]