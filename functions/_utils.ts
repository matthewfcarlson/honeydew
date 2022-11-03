import { UUID } from "./_db";

export const ResponseJsonBadRequest = (): Response => {
  return new Response(JSON.stringify({
    message: "400 Bad Request"
  }), { status: 400 });
};

export const ResponseJsonMissingData = (param?: string): Response => {
  return new Response(JSON.stringify({
    message: `400 Missing Data\n${param}`
  }), { status: 400 });
};

export const ResponseJsonNotFound = (): Response => {
  return new Response(JSON.stringify({
    message: "404 Not Found"
  }), { status: 404 });
};

export const ResponseJsonAccessDenied = (): Response => {
  return new Response(JSON.stringify({
    message: "403 Access Denied"
  }), { status: 403 });
};

export const ResponseJsonDebugOnly = (): Response => {
  return new Response(JSON.stringify({
    message: "404 Not Found in Prod"
  }), { status: 404 });
};


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