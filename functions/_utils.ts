export function IsValidHttpUrl(string:string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

export const ResponseJsonBadRequest = (message?:string): Response => {
  const status = 400;
  return new Response(JSON.stringify({
    status,
    message: message || "Bad Request"
  }), { status });
};

export const ResponseJsonMissingData = (param?: string): Response => {
  const status = 400;
  return new Response(JSON.stringify({
    status,
    message: `Missing Data: ${param}`
  }), { status });
};

export const ResponseJsonNotFound = (): Response => {
  const status = 400;
  return new Response(JSON.stringify({
    message: "Not Found"
  }), { status });
};

export const ResponseJsonAccessDenied = (): Response => {
  const status = 403;
  return new Response(JSON.stringify({
    status,
    message: "Access Denied"
  }), { status });
};

export const ResponseJsonDebugOnly = (): Response => {
  const status = 404;
  return new Response(JSON.stringify({
    status,
    message: "Not Found in Prod"
  }), { status });
};

export const ResponseJsonNotImplementedYet = (): Response => {
  const fn_name = new Error().stack?.split("\n")[1].trim();
  const status = 500;
  return new Response(JSON.stringify({
    status,
    message: `Not Implemented Yet ${fn_name}`
  }), { status });
};

export const ResponseRedirect = (request:Request, url:string, status:number=307): Response => {
  const request_url = new URL(request.url);
  const base_url= request_url.origin;
  const redirect_url = base_url+url;
  return Response.redirect(redirect_url, status);
}


export const ResponseJsonMethodNotAllowed = (): Response => {
  return new Response(JSON.stringify({
    message: "405 Method Not Allowed"
  }), { status: 405 });
};

export const ResponseJsonOk = () : Response => {
  return new Response(JSON.stringify({
    message: "ok"
  }), {status:200})
}

/**
 * readRequestBody reads in the incoming request body
 * Use await readRequestBody(..) in an async function to get the string
 * @param {Request} request the incoming request to read from
 */
export async function readRequestBody(request: Request) {
  const { headers } = request;
  const contentType = headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return await request.json();
  } else if (contentType.includes('application/text')) {
    return request.text();
  } else if (contentType.includes('text/html')) {
    return request.text();
  } else if (contentType.includes('form')) {
    const formData = await request.formData();
    const body:Record<string, string|File> = {};
    for (const entry of formData.entries()) {
      body[entry[0]] = entry[1];
    }
    return body;
  } else {
    // Perhaps some other type of data was submitted in the form
    // like an image, or some other binary data.
    return null;
  }
}

export function setCookie(response:Response, key: string, value: string, http_only:boolean = true, expires:string="Fri, 31 Dec 9999 23:59:59 GMT") {
  const http = (http_only) ? "HttpOnly;" : ""; 
  const newCookie = `${key}=${value}; SameSite=Strict;Path=/;${http};expires=${expires};`
  response.headers.append("Set-Cookie", newCookie);
}
export function deleteCookie(response:Response, key: string) {
 
  const delCookie = `${key}=deleted; expires=Thu, 01 Jan 1970 00:00:00 GMT;Path=/;SameSite=Strict;`
  const delHttpCookie = `${key}=deleted; expires=Thu, 01 Jan 1970 00:00:00 GMT;Path=/;HttpOnly;SameSite=Strict;`
  response.headers.append("Set-Cookie", delCookie);
  response.headers.append("Set-Cookie", delHttpCookie);
}
const testChars = (str:string) => /^[a-f-0-9]+$/.test(str);
export function ConvertToUUID(x:any): string {
  if (typeof x === 'string' || x instanceof String) {
    x = x.substring(0,72).toLowerCase(); // make sure it's only 72 chars long
    if (testChars(x) == false) return '';
    return x;
  }
  return '';
}

export function ArrayBufferToHexString(buffer:ArrayBufferLike) {
  return [...new Uint8Array(buffer)]
  .map(x => x.toString(16).padStart(2, '0'))
  .join('');
}

/**
 * Convert a hex string to an ArrayBuffer.
 *
 * @param {string} hexString - hex representation of bytes
 * @return {ArrayBuffer} - The bytes in an ArrayBuffer.
 */
export function hexStringToArrayBuffer(hexString:string) {
  // remove the leading 0x
  hexString = hexString.replace(/^0x/, '');

  // ensure even number of characters
  if (hexString.length % 2 != 0) {
      console.warn('WARNING: expecting an even number of characters in the hexString');
  }

  // check for some non-hex characters
  const bad = hexString.match(/[G-Z\s]/i);
  if (bad) {
      console.warn('WARNING: found non-hex characters', bad);
  }

  // split the string into pairs of octets
  const pairs = hexString.match(/[\dA-F]{2}/gi);

  if (pairs == null) {
    return 0;
  }

  // convert the octets to integers
  const integers = pairs.map(function(s:string) {
      return parseInt(s, 16);
  });

  const array = new Uint8Array(integers);

  return array.buffer;
}

export function getJulianDate(): number {
  const date = new Date();
  const time = date.getTime(); // the timestamp, not neccessarely using UTC as current time
  return Math.floor((time / 86400000) - (date.getTimezoneOffset()/1440) + 2440587.5);
}

export const user_colors = [
  "#76C4AE",
  "#9FC2BA",
  "#BEE9E4",
  "#7CE0F9",
  "#CAECCF",
  "#D3D2B5",
  "#CABD80",
  "#E1CEB1",
  "#DDB0A0",
  "#D86C70",
]

export const user_icons = [
  "fa-bicycle",
  "fa-bone",
  "fa-apple-whole",
  "fa-carrot",
  "fa-leaf",
  "fa-lemon",
  "fa-pepper-hot",
  "fa-seedling",
  "fa-ice-cream",
  "fa-mug-saucer",
  "fa-shrimp",
  "fa-socks",
  "fa-glasses",
  "fa-couch",
  "fa-shower",
  "fa-spoon",
  "fa-hotdog",
  "fa-pizza-slice",
  //"fa-",
]

export function getRandomValueFromArray<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function pickRandomUserIconAndColor() {
  return [getRandomValueFromArray(user_icons), getRandomValueFromArray(user_colors)]
}