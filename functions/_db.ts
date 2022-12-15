import TelegramAPI from "./api/telegram/_telegram";
import { z } from "zod";
import { pickRandomUserIconAndColor } from "./_utils";
import { DbDataObj, DbHousehold, DbHouseholdZ, DbHouseKey, DbHouseKeyRaw, DbHouseKeyZ, DbIds, DbUser, DbUserRaw, DbUserZ, HouseId, HouseIdZ, HouseKeyId, HouseKeyIdz, UserId, UserIdZ } from "./db_types";

const uuidv4 = () => (crypto as any).randomUUID();

export default class Database {
    private _db: D1Database;
    private _kv: KVNamespace;
    private _t: TelegramAPI;
    constructor(kv: KVNamespace, telegram: TelegramAPI, db: D1Database) {
        this._db = db;
        this._kv = kv;
        this._t = telegram;
    }

    private async queryDBRaw(key: DbIds) {
        if (key == "") {
            console.error("We tries to query the database with an empty key");
        }
        const results = await this._kv.get(key);
        return results;
    }

    private async queryDBJson(key: DbIds) {
        const results = await this._kv.get(key, { type: 'json' });
        return results;
    }

    private async queryDBMeta(key: DbIds) {
        const results = await this._kv.getWithMetadata(key);
        return results;
    }

    private async setDBJson(x: DbDataObj, expirationTtl = 0) {
        await this._kv.put(x.id, JSON.stringify(x), { expirationTtl: 60 * 60 * 6 }); // all keys created expire in 6 hours
    }

    private async deleteKey(key: DbIds) {
        await this._kv.delete(key);
    }

    async GetUser(id: UserId) : Promise<DbUser | null>{
        const raw = await this.queryDBJson(id);
        if (raw == null ) return null;
        const results = DbUserZ.safeParse(raw);
        if (results.success == false) return null;
        return results.data;
    }

    async UserExists(id: UserId) {
        const existing_user = await this.queryDBRaw(id);
        if (existing_user != null) return true;
        return false;
    }

    async generateNewUserUUID() {
        let userId: UserId|null = null;
        let count = 0;
        while (count < 50) {
            count += 1;
            const attempted_id = UserIdZ.safeParse("U:"+uuidv4());
            if (attempted_id.success == false){
                continue;
            }
            userId = attempted_id.data;
            if (await this.UserExists(userId) == false) break;
        }
        if (count > 50) {
            console.error("This should not have happened, we were unable to generate a new user ID");
        }
        return userId
    }

    async UserCreate(name: string, household: HouseId) {
        const id = await this.generateNewUserUUID();
        if (id == null) {
            console.error("We were not able to create a new user");
            return null;
        }
        const [icon, color] = pickRandomUserIconAndColor();
        // I need to come up a better-mechanism, I need at least 128 bits
        // base-64 of crypto.getRandomValues()?
        const recovery_key = uuidv4(); // https://neilmadden.blog/2018/08/30/moving-away-from-uuids/
        if (await this.UserExists(id)) return null;
        const user: DbUserRaw ={
            name,
            id,
            household: household,
            color,
            icon,
            _recoverykey: recovery_key,
            _chat_id: null
        };
        const db_user = DbUserZ.parse(user);
        await this.setDBJson(db_user);
        return user;
    }

    async UserSetHousehold(id: UserId, household: HouseId, user?: DbUser | null, house?: DbHousehold | null) {
        if (user == null || user == undefined) {
            user = await this.GetUser(id);
        }
        if (user == null) {
            console.error("Could not find this USER", id);
            return false;
        }
        if (user.household != null) {
            console.error("UserSetHousehold", "need to implement joining a new household")
        }
        if (house == null && await this.HouseholdExists(household) == false) {
            return false;
        }
        user.household = household;
        const promises = [this.setDBJson(user),];

        if (house == null || house == undefined) {
            house = await this.HouseholdGet(household);
        }
        if (house == null) {
            console.error("Could not find this house", household);
            return false;
        }
        // make sure there is only one of the user, add it to list of members
        if (house.members.indexOf(id) == -1) {
            house.members.push(id);
            promises.push(this.setDBJson(house));
        }

        await Promise.all(promises);

        return true;
    }

    async HouseholdExists(id: HouseId) {
        const existing = await this.queryDBRaw(id);
        if (existing != null) return true;
        return false;
    }

    async HouseholdGet(id: HouseId) {
        const data = await this.queryDBJson(id);
        if (data == null) return null;
        const results = DbHouseholdZ.safeParse(data);
        if (!results.success) {
            console.error(`Malformed data in database for {id}`);
            return null;
        }
        return results.data;
    }

    async HouseholdCreate(name: string, creator?: UserId) {
        try{
            const id = HouseIdZ.parse("H:"+uuidv4());
            if (await this.HouseholdExists(id)) {
                console.error("Unable to generate house id");
                return null;
            }
            const house: DbHousehold = DbHouseholdZ.parse({
                id,
                name,
                members: []
            });
            await this.setDBJson(house);
            if (creator != undefined) {
                await this.UserSetHousehold(creator, id, null, house);
                house.members.push(creator);
            }
            return house;
        }
        catch (err) {
            console.error(err);
            return null;
        }
    }

    async HouseKeyExists(id: HouseKeyId) {
        const existing = await this.queryDBRaw(id);
        if (existing != null) return true;
        return false;
    }

    async HouseKeyCreate(house: HouseId, creator: UserId) : Promise<DbHouseKey | null> {
        try{
            const id = HouseKeyIdz.parse("HK:"+uuidv4());
            if (await this.HouseKeyExists(id)) return null;
            const raw: DbHouseKeyRaw = {
                id,
                house,
                generated_by: creator
            }
            const housekey = DbHouseKeyZ.parse(raw);
            await this.setDBJson(housekey);
            return housekey;
        }
        catch (err) {
            console.error(err);
        }
        return null;
    }

    async HouseKeyGet(id: HouseKeyId) {
        const raw = await this.queryDBJson(id);
        if (raw == null) return null;
        const results = DbHouseKeyZ.safeParse(raw);
        if (results.success) return results.data;
        return null;
    }

    async HouseKeyDelete(id: HouseKeyId) {
        await this.deleteKey(id);
    }

}