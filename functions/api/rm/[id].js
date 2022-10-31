export async function onRequestGet(context) {
  const {
    request, // same as existing Worker API
    env, // same as existing Worker API
    params, // if filename includes [id] or [[path]]
    waitUntil, // same as ctx.waitUntil in existing Worker API
    next, // used for middleware or to fetch assets
    data, // arbitrary space for passing data between middlewares
  } = context;
  if (data.authorized == undefined || context.data.authorized == false) {
    return new Response('{"msg": "Invalid Token"}', { status: 403 })
  }
  console.log(context.data.jwt);
  const res = await fetch(`https://rickandmortyapi.com/api/character/${params.id}`);
  const api_result = await res.json();
  const info = JSON.stringify(api_result, null, 2);
  return new Response(info);
}