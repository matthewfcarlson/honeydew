export async function onRequestGet(context) {
    const response_data = "Logged out"

    const info = JSON.stringify(response_data, null, 2);
    
    const newCookie = `Device-Token=deleted; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    const response = new Response(info, {
      headers: { "Content-Type": "application/json" },
    })
    response.headers.set("Set-Cookie", newCookie)
    return response;
}