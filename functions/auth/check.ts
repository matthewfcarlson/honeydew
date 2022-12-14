import { HoneydewPagesFunction } from "../types";
import Database from "../database/_db";
import { deleteCookie, ResponseJsonAccessDenied, ResponseJsonNotFound, ResponseJsonNotImplementedYet } from "../_utils";
import { AuthCheck, AuthHousehold, TEMP_TOKEN } from "./auth_types";

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
    const household = await db.HouseholdGet(user.household);
    const api_house: AuthHousehold | null = (household == null) ? null : {
        id: household.id,
        name: household.name,
        members: await (await Promise.all(household.members.map(x => db.UserGet(x)))).filter(x => {return x != null}).map(x => { return { userid: x!.id, name: x!.name, icon: x!.icon, color: x!.color } }),
    };
    if (api_house == null) {
        return ResponseJsonNotImplementedYet();
    }
    const results: AuthCheck = {
        name: user.name,
        household: api_house,
        id: user.id,
        color: user.color,
        icon: user.icon,
        // TODO: get current task
        task: null
    }
    const result_json = JSON.stringify(results);
    // Should we provide information 
    return new Response("window.logged_in = true; window.user_data = " + result_json, { headers: { "Content-Type": "application/javascript" } },)
}