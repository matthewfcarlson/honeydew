import jwt from '@tsndr/cloudflare-worker-jwt'

export async function onRequestGet(context) {
    const {
      request, // same as existing Worker API
      env, // same as existing Worker API
      params, // if filename includes [id] or [[path]]
      waitUntil, // same as ctx.waitUntil in existing Worker API
      next, // used for middleware or to fetch assets
      data, // arbitrary space for passing data between middlewares
    } = context;

    const response_data = "Logged out"

    const info = JSON.stringify(response_data, null, 2);
    
    const newCookie = `Device-Token=deleted; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    const response = new Response(info, {
    headers: { "Content-Type": "application/json" },
    })
    response.headers.set("Set-Cookie", newCookie)
    return response;
}