import { HoneydewPagesFunction } from "../types";
import { HOUSEID, USERID } from "../_db";
import { ResponseJsonAccessDenied, ResponseJsonNotFound } from "../_utils";

export interface ApiHousehold {
    name:string;
    id:HOUSEID;
    members:{userid:USERID, firstname:string, lastname:string}[];
}

export interface ApiUser {
    first_name:string;
    last_name:string;
    id:USERID;
    household:ApiHousehold|null;
    task:any;
}

export const onRequestGet: HoneydewPagesFunction = async function (context) {
    if (context.data.userid == null) return ResponseJsonAccessDenied();
    const db = context.data.db;
    const user = await db.GetUser(context.data.userid);
    if (user == null) return ResponseJsonNotFound();
    const household = await db.HouseholdGet(user.household);
    const apihouse: ApiHousehold|null = (household == null) ? null: {
        id: household.id,
        name: household.name,
        members: await (await Promise.all(household.members.map(x=>db.GetUser(x)))).map(x=>{return {userid:x.id, firstname:x.firstname, lastname:x.lastname}}),
    };
    console.log("User/Household: ", user, household);
    const results:ApiUser = {
        first_name: user.firstname,
        last_name:user.lastname,
        household:apihouse,
        id:user.id,
        // TODO: get current task
        task:null
    }

    return new Response(JSON.stringify(results));
}