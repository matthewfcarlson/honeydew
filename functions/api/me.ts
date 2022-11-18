import { HoneydewPagesFunction } from "../types";
import { HOUSEID, USERID } from "../_db";
import { ResponseJsonAccessDenied, ResponseJsonNotFound } from "../_utils";

export const onRequestGet: HoneydewPagesFunction = async function (context) {
    const url = new URL(context.request.url)
    const jsonp = url.searchParams.has("json")

    if (context.data.userid == null){
        if (!jsonp) return ResponseJsonAccessDenied();
        else return new Response("window.logged_in = false; // USER ID IS NULL", {headers: { "Content-Type": "application/javascript" }},);
    }
    const db = context.data.db;
    const user = await db.GetUser(context.data.userid);
    if (user == null) {
        const newCookie = `Device-Token=deleted; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        const response = (!jsonp) ? ResponseJsonNotFound() : new Response("window.logged_in = false; // User not found", {headers: { "Content-Type": "application/javascript" }},);
        response.headers.set("Set-Cookie", newCookie)
        return response;
    }
    const household = await db.HouseholdGet(user.household);
    const apihouse= (household == null) ? null: {
        id: household.id,
        name: household.name,
        members: await (await Promise.all(household.members.map(x=>db.GetUser(x)))).map(x=>{return {userid:x.id, firstname:x.firstname, lastname:x.lastname}}),
    };
   // console.log("User/Household: ", user, household);
    const results = {
        first_name: user.firstname,
        last_name:user.lastname,
        household:apihouse,
        id:user.id,
        // TODO: get current task
        task:null
    }
    if (!jsonp){
        return new Response(JSON.stringify(results));
    }
    return new Response("window.logged_in = true;", {headers: { "Content-Type": "application/javascript" }},)
}