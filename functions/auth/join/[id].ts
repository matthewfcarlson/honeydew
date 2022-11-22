import { HoneydewPagesFunction } from "../../types";
import Database, { HOUSEID, USERID } from "../../_db";
import { ResponseJsonAccessDenied, ResponseJsonBadRequest, ResponseJsonMissingData, ResponseJsonNotFound, ResponseRedirect } from "../../_utils";

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
    const id = context.params.id;
    if (id == null || id == undefined) return ResponseJsonMissingData();
    if (context.data.userid == null) {
        return ResponseRedirect(context.request, "/signup?k="+id)
    }
    const db = context.data.db as Database;
    const user = context.data.user
    if (user == null) return ResponseJsonNotFound();
    if (Array.isArray(id)) {
        console.log("ID IS ARRAY", id);
        return ResponseJsonBadRequest();
    }
    const parts = id.split(":");
    if (parts.length != 2) {
        console.log("BAD SPLIT", parts);
        return ResponseJsonBadRequest();
    }
    // TODO: if the hash doesn't match the first part, put the IP on the sus list
    const key_id = parts[0];
    const key_sha = parts[1];
    // TODO: check sha as well
    // TODO: don't respond right away to prevent timing attacks
    if (await db.HouseKeyExists(key_id) == false) {
        return ResponseJsonNotFound();
    }
    const key = await db.HouseKeyGet(key_id);
    console.log(key);

    if (user.household == key.house) {
        return ResponseRedirect(context.request,"/error?t=AlreadyHouseholdMember");
    }

    const results = await db.UserSetHousehold(user.id, key.house, user);
    if (!results) {
        console.log("FAILED");
    }

    // const db = context.data.db;
    // const user = await db.GetUser(context.data.userid);
    // if (user == null) return ResponseJsonNotFound();
    // const household = await db.HouseholdGet(user.household);
    // const apihouse: ApiHousehold|null = (household == null) ? null: {
    //     id: household.id,
    //     name: household.name,
    //     members: await (await Promise.all(household.members.map(x=>db.GetUser(x)))).map(x=>{return {userid:x.id, firstname:x.firstname, lastname:x.lastname}}),
    // };
    // console.log("User/Household: ", user, household);
    // const results:ApiUser = {
    //     first_name: user.firstname,
    //     last_name:user.lastname,
    //     household:apihouse,
    //     id:user.id,
    //     // TODO: get current task
    //     task:null
    // }

    return ResponseRedirect(context.request,"/household");
}