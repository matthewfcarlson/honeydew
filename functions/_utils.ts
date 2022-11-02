export const ResponseJsonBadRequest = () : Response => {
    return new Response(JSON.stringify({
      message: "400 Bad Request"
    }), { status : 400});
};

export const ResponseJsonMissingData = (param?:string) : Response => {
  return new Response(JSON.stringify({
    message: `400 Missing Data\n${param}`
  }), { status : 400});
};

export const ResponseJsonNotFound = () : Response => {
    return new Response(JSON.stringify({
      message: "404 Not Found"
    }), { status : 404});
};

export const ResponseJsonDebugOnly = () : Response => {
  return new Response(JSON.stringify({
    message: "404 Not Found in Prod"
  }), { status : 404});
};


export const ResponseJsonMethodNotAllowed = () : Response => {
    return new Response(JSON.stringify({
      message: "405 Method Not Allowed"
    }), { status : 405});
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