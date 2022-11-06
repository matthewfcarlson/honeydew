import { UUID } from "./_db";

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
  const fn_name = new Error().stack.split("\n")[1].trim();
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
  console.log("redirect_url", redirect_url)
  return Response.redirect(redirect_url, status);
}


export const ResponseJsonMethodNotAllowed = (): Response => {
  return new Response(JSON.stringify({
    message: "405 Method Not Allowed"
  }), { status: 405 });
};

/**
 * readRequestBody reads in the incoming request body
 * Use await readRequestBody(..) in an async function to get the string
 * @param {Request} request the incoming request to read from
 */
export async function readRequestBody(request) {
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
    const body = {};
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

export function setCookie(response, key: string, value: string) {
  const newCookie = `${key}=${value}; HttpOnly; SameSite=Strict`
  response.headers.set("Set-Cookie", newCookie);
}
export function deleteCookie(response, key: string) {
  const newCookie = `${key}=deleted; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  response.headers.set("Set-Cookie", newCookie);
}
const testChars = str => /^[a-f-0-9]+$/.test(str);
export function ConvertToUUID(x:any): UUID {
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
export function hexStringToArrayBuffer(hexString) {
  // remove the leading 0x
  hexString = hexString.replace(/^0x/, '');

  // ensure even number of characters
  if (hexString.length % 2 != 0) {
      console.log('WARNING: expecting an even number of characters in the hexString');
  }

  // check for some non-hex characters
  const bad = hexString.match(/[G-Z\s]/i);
  if (bad) {
      console.log('WARNING: found non-hex characters', bad);
  }

  // split the string into pairs of octets
  const pairs = hexString.match(/[\dA-F]{2}/gi);

  // convert the octets to integers
  const integers = pairs.map(function(s) {
      return parseInt(s, 16);
  });

  const array = new Uint8Array(integers);

  return array.buffer;
}