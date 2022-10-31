export async function onRequest(context) {
    console.error("Handle magic link");
    const {
        request, // same as existing Worker API
        env, // same as existing Worker API
        params, // if filename includes [id] or [[path]]
        waitUntil, // same as ctx.waitUntil in existing Worker API
        next, // used for middleware or to fetch assets
        data, // arbitrary space for passing data between middlewares
      } = context;

    const url = request.url;
    const base_url= url.substring(0, url.indexOf("/", 8)) + "/error";
    console.log(base_url);

    return Response.redirect(base_url, 301);
}