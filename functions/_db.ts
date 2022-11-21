import TelegramAPI from "./api/telegram/_telegram";
import { z } from "zod";
import { pickRandomUserIconAndColor } from "./_utils";
import { DbUser, DbUserKey, isDbUser } from "./data_types";

enum RecipeType {
    PASTA,
    SLOW_COOKER,
    MEAT,
    SOUP,
    VEGGIES,
}

export type UUID = string;
export type USERID = UUID;
export type RECIPEID = UUID;
export type HOUSEID = UUID;

const DbRecipeZ = z.object({
    id: z.string().uuid(),
    url: z.string().min(5),
    picture_url: z.string().min(5).or(z.null()),
    ingredients: z.set(z.string()),
    last_made: z.number().positive(),
    category: z.nativeEnum(RecipeType),
    household: z.string().uuid(),
});
export type DbRecipe = z.infer<typeof DbRecipeZ>;

// // stored at R:{RECIPEID}
// export interface DbRecipe {
//     id: RECIPEID; // uuid
//     url: string;
//     picture_url: string | null;
//     ingredients: string[];
//     last_made: number; // timestamp
//     category: RecipeType;
//     household: HOUSEID; // the household this belongs to
// }
const DbRecipeKey = (id: RECIPEID) => `R:${id}`;

// stored at H>R:{HOUSEID}:{RECIPEID}
// does not contain any data
interface DbHouseRecipeLink {
}
const DbHouseRecipeLinkKey = (hid: HOUSEID, rid: RECIPEID) => `${DbHouseRecipeLinkPrefix(hid)}:${rid}`;
const DbHouseRecipeLinkPrefix = (hid: HOUSEID) => `H>R:${hid}`;

// stored at H:{HOUSEID}
export interface DbHousehold {
    id: HOUSEID;
    name: string;
    members: USERID[];
}
const DbHouseholdKey = (id: HOUSEID) => `H:${id}`;
function isDbHousehold(x: unknown): x is DbHousehold {
    const y = (x as DbHousehold);
    if (y.members === undefined) return false;
    if (y.name === undefined) return false;
    if (y.id === undefined) return false;
    return true;
}

export interface DbHouseKey {
    id: UUID;
    house: HOUSEID;
    generated_by:USERID;
}
const DbHouseKeyKey = (id: UUID) => `HK:${id}`;
function isDbHouseKey(x: unknown): x is DbHouseKey {
    const y = (x as DbHouseKey);
    if (y.house === undefined) return false;
    if (y.generated_by === undefined) return false;
    if (y.id === undefined) return false;
    return true;
}

// stored at MP:{householdid}
export interface DbMealPlan {
    household: HOUSEID; // the household this belongs to
    meals_per_week: number;
    day_to_refresh: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = sunday
    last_refreshed: number;
    meals: RECIPEID[];
}
const DbMealPlanKey = (id: HOUSEID) => `MP:${id}`;

const uuidv4 = () => crypto.randomUUID();

export default class Database {
    private _kv: KVNamespace;
    private _t: TelegramAPI;
    constructor(kv: KVNamespace, telegram: TelegramAPI) {
        this._kv = kv;
        this._t = telegram;
    }

    private async queryDBRaw(key) {
        const results = await this._kv.get(key);
        return results;
    }

    private async queryDBJson(key) {
        const results = await this._kv.get(key, { type: 'json' });
        return results;
    }

    private async queryDBMeta(key) {
        const results = await this._kv.getWithMetadata(key);
        return results;
    }

    private async setDBJson(x:DbUser|DbHousehold|DbHouseKey, expirationTtl = 0) {
        const key = (isDbUser(x)) ? DbUserKey(x.id) : isDbHousehold(x) ? DbHouseholdKey(x.id) : isDbHouseKey(x) ? DbHouseKeyKey(x.id) : null;
        // TODO: remove this once prototyping is done
        await this._kv.put(key, JSON.stringify(x),{expirationTtl: 60*60*6}); // all keys created expire in 6 hours
    }

    async GetUser(id: UUID) {
        const key = DbUserKey(id);
        const results = await this.queryDBJson(key);
        if (results == null || !isDbUser(results)) return null;
        return results;
    }

    async UserExists(id: USERID) {
        const key = DbUserKey(id);
        const existing_user = await this.queryDBRaw(key);
        if (existing_user != null) return true;
        return false;
    }

    async UserCreate(name: string) {
        const id = uuidv4();
        const [icon, color] = pickRandomUserIconAndColor();
        const recovery_key = uuidv4();
        if (await this.UserExists(id)) return null;
        const user: DbUser = {
            name,
            id,
            household: null,
            color,
            icon,
            _recoverykey: recovery_key,
            _chat_id: null
        }
        await this.setDBJson(user);
        return user;
    }

    async UserSetHousehold(id: USERID, household: HOUSEID, user?: DbUser, house?:DbHousehold) {
        if (user == null) {
            user = await this.GetUser(id);
        }
        if (user.household != null) {
            console.error("UserSetHousehold", "need to implement joining a new household")
        }
        if (house == null && await this.HouseholdExists(household) == false) {
            return false;
        }
        user.household = household;
        const promises = [this.setDBJson(user),];

        if (house == null) {
            house = await this.HouseholdGet(household);
        }
        // make sure there is only one of the user, add it to list of members
        if (house.members.indexOf(id) == -1) {
            house.members.push(id);
            promises.push(this.setDBJson(house));
        }

        await Promise.all(promises);

        return true;
    }

    async HouseholdExists(id: HOUSEID) {
        const key = DbHouseholdKey(id);
        const existing = await this.queryDBRaw(key);
        if (existing != null) return true;
        return false;
    }

    async HouseholdGet(id:HOUSEID) {
        const key = DbHouseholdKey(id);
        const results = await this.queryDBJson(key);
        if (results == null || !isDbHousehold(results)) return null;
        return results;
    }

    async HouseholdCreate(name: string, creator: USERID) {
        const id = uuidv4();
        if (await this.HouseholdExists(id)) return null;
        const house: DbHousehold = {
            id,
            name,
            members: [creator]
        }
        await this.setDBJson(house);
        await this.UserSetHousehold(creator, id, null, house);
        return house;
    }

    async HouseKeyExists(id:UUID) {
        const key = DbHouseKeyKey(id);
        const existing = await this.queryDBRaw(key);
        if (existing != null) return true;
        return false;
    }

    async HouseKeyCreate(house:HOUSEID, creator:USERID) {
        const id = uuidv4();
        if (await this.HouseKeyExists(id)) return "error";
        const housekey: DbHouseKey = {
            id,
            house,
            generated_by:creator
        }
        await this.setDBJson(housekey);
        return housekey;
    }

    async HouseKeyGet(id:HOUSEID) {
        const key = DbHouseKeyKey(id);
        const results = await this.queryDBJson(key);
        if (results == null || !isDbHouseKey(results)) return null;
        return results;
    }

}