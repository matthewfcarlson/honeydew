import { deleteCookie } from "../_utils";
import { DEVICE_TOKEN, TEMP_TOKEN } from "./auth_types";

export async function onRequestGet(context) {
    const response_data = "Logged out"

    const info = JSON.stringify(response_data, null, 2);
    const response = new Response(info, {
      headers: { "Content-Type": "application/json" },
    })
    deleteCookie(response, DEVICE_TOKEN);
    deleteCookie(response, TEMP_TOKEN);
    return response;
}