import { HoneydewPagesFunction } from "../../../types";

export const onRequest: HoneydewPagesFunction = async function onRequestGet(context) {
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
  
    const id = Number(params.id[0]);
    const names = ["Rick", "morty", "Beth", "Jerry", "Summer", "Snowball"]
    if (id < 0 || id >= names.length) {
      return new Response('{"msg": "Invalid id"}', { status: 400 })
    }
    const info = JSON.stringify({name: names[id]}, null, 2);
    return new Response(info);
  }