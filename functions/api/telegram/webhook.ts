export const onRequest: HoneydewPagesFunction = async function onRequest({ env }) {
    return new Response(env.TELEGRAM);
  }