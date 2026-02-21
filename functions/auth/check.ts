import { HoneydewPagesFunction } from "../types";
import Database from "../database/_db";
import { deleteCookie, ResponseJsonAccessDenied, ResponseJsonMissingData, ResponseJsonNotFound, ResponseJsonNotImplementedYet, ResponseJsonServerError } from "../_utils";
import { AuthCheck, AuthCheckZ, TEMP_TOKEN } from "./auth_types";


export const onRequestGet: HoneydewPagesFunction = async function (context) {

    if (context.data.userid == null) {
        return new Response("window.logged_in = false; // USER ID IS NULL", { headers: { "Content-Type": "application/javascript" } },);
    }
    const db = context.data.db as Database;
    const user = context.data.user;
    if (user == null) {
        const response = new Response("window.logged_in = false; // User not found", { headers: { "Content-Type": "application/javascript" } },);
        deleteCookie(response, TEMP_TOKEN);
        return response;
    }
    const household = await db.HouseholdGetExtended(user.household);
    if (household == null) {
        return ResponseJsonServerError("Failed to find household")
    }

    const final_results: AuthCheck = {
        name: user.name,
        household,
        id: user.id,
        color: user.color,
        icon: user.icon,
        outfit_reminders: user.outfit_reminders,
    }

    let result_json: string;
    try {
        result_json = JSON.stringify(AuthCheckZ.parse(final_results));
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("AUTH_CHECK_PARSE_FAILED", errorMsg, final_results);
        return new Response(
            `window.logged_in = false; window.login_error = "AUTH_CHECK_PARSE_FAILED"; // ${errorMsg.replace(/[^\w\s:,]/g, '')}`,
            { headers: { "Content-Type": "application/javascript" } },
        );
    }
    return new Response("window.logged_in = true; window.user_data = " + result_json, { headers: { "Content-Type": "application/javascript" } },)
}