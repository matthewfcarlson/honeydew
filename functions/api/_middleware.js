import jwt from '@tsndr/cloudflare-worker-jwt';

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

async function isValidJwt(token) {
  const secret = 'SECRET HERE'

  if (token == null) return false;

  try {
    jwt.verify(token, secret, { 'ignoreExpiration': false });
    // Token is good!
    return true;
  } catch (err) {
    console.error(err);
    // If the JWT verification fails, an exception will be thrown and we'll end up in here
    return false
  }

}

function log(content) {
  // If you want to log JWT rejections, add code in here to send the message to your preferred cloud based logging framework
  console.error(content);
}

async function jwtHandler(context) {
  let cookieString = context.request.headers.get("Cookie");
  const token = (cookieString != null) ? getCookie(cookieString, 'Device-Token') : null;
  let isValid = await isValidJwt(token)


  if (!isValid || token == null) {
    var ip = context.request.headers.get('cf-connecting-ip') || '';
    var userAgent = context.request.headers.get('User-Agent') || '';
    var requestMethod = context.request.method || '';
    var requestUrl = context.request.url || '';
    var safeToken = token || '';

    // Log all JWT failures
    log("FAIL [" + ip + "] " + requestMethod + " " + requestUrl + " [UA: " + userAgent + "] [JWT: " + safeToken + "]" )

    // Invalid JWT - reject request
    context.data.authorized = false;
    context.data.jwt_raw = token;
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
    let delta = Date.now() - context.data.timestamp;
    res.headers.set('x-response-timing', delta);
  }
  return res;
}


export const onRequest = [topLevelErrorHandler, jwtHandler]