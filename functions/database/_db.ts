import TelegramAPI from "../api/telegram/_telegram";
import { z } from "zod";
import { pickRandomUserIconAndColor } from "../_utils";
import { DbDataObj, DbHousehold, DbHouseholdZ, DbHouseKey, DbHouseKeyRaw, DbHouseKeyZ, DbIds, DbProject, DbProjectZ, DbTask, DbUser, DbUserRaw, DbUserZ, HouseId, HouseIdZ, HouseKeyId, HouseKeyIdz, ProjectId, ProjectIdZ, TaskId, TaskIdZ, UserId, UserIdZ } from "../db_types";
import { Kysely, Migrator } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { HoneydewMigrations, LatestHoneydewDBVersion } from "./migration";

interface DataBaseData {
    users: DbUser,
    households: DbHousehold
}

const uuidv4 = () => (crypto as any).randomUUID();
const timer = (ms:number) => new Promise( res => setTimeout(res, ms));

export default class Database {
    private _sql: D1Database;
    private _kv: KVNamespace;
    private _t: TelegramAPI;
    private _models;
    private _db;
    constructor(kv: KVNamespace, telegram: TelegramAPI, db: D1Database) {
        this._sql = db;
        this._kv = kv;
        this._t = telegram;
        this._models = {};
        this._db = new Kysely<DataBaseData>({ dialect: new D1Dialect({ database: db }) });
    }

    // This will do a drop and create if needed
    public async CheckOnSQL() {
        const db_version = Number(await this._kv.get("SQLDB_VERSION") || "0");
        if (db_version == null || db_version != LatestHoneydewDBVersion) return await this.migrateDatabase(db_version);
    }

    private async migrateDatabase(version: number) {
        const migration_lock = await this._kv.get("SQLDB_MIGRATIONLOCK");
        if (migration_lock != null) {
            console.error("Migration is already in progress");
            return;
        }
        // TODO: move to a lock within sqlite?
        const promise = this._kv.put("SQLDB_MIGRATIONLOCK", "locked", { expirationTtl: 60 * 60 }); // this expires every hour
        try {
            const starting = Number(version);
            if (starting >= HoneydewMigrations.length) {
                const migration = HoneydewMigrations[HoneydewMigrations.length - 1];
                if (migration.down) migration.down(this._db);
            }
            else {
                for (let i = starting; i < HoneydewMigrations.length; i += 1) {
                    await HoneydewMigrations[i].up(this._db);
                }
            }
            await this._kv.put("SQLDB_VERSION", LatestHoneydewDBVersion.toString(), { expirationTtl: 60 * 60 * 6 }); // we refresh the database every 6 hours
            console.log("Upgraded DB to version " + LatestHoneydewDBVersion + "from" + starting)
        }
        catch (err) {
            console.error(err);
        }
        await promise;
        await this._kv.delete("SQLDB_MIGRATIONLOCK");
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

    async UserGet(id: UserId): Promise<DbUser | null> {
        const user_id = UserIdZ.safeParse(id);
        if (user_id.success == false) return null;
        const raw = await this.queryDBJson(user_id.data);
        if (raw == null) return null;
        const results = DbUserZ.safeParse(raw);
        if (results.success == false) return null;
        return results.data;
    }

    async UserExists(id: UserId) {
        const user_id = UserIdZ.safeParse(id);
        if (user_id.success == false) return null;
        const existing_user = await this.queryDBRaw(user_id.data);
        if (existing_user != null) return true;
        return false;
    }

    async UserGenerateUUID() {
        let userId: UserId | null = null;
        let count = 0;
        while (count < 50) {
            count += 1;
            const attempted_id = UserIdZ.safeParse("U:" + uuidv4());
            if (attempted_id.success == false) {
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
        const id = await this.UserGenerateUUID();
        if (id == null) {
            console.error("We were not able to create a new user");
            return null;
        }
        const [icon, color] = pickRandomUserIconAndColor();
        // I need to come up a better-mechanism, I need at least 128 bits
        // base-64 of crypto.getRandomValues()?
        const recovery_key = uuidv4(); // https://neilmadden.blog/2018/08/30/moving-away-from-uuids/
        if (await this.UserExists(id)) return null;
        const user: DbUserRaw = {
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
        await this._db.insertInto("users").values(db_user).execute();
        const result = await this.UserSetHousehold(user.id, household);
        if (!result) {
            console.error("Failed to set error");
            return null;
        }
        return user;
    }

    async UserSetHousehold(user_id: UserId, household_id: HouseId): Promise<boolean> {
        const user = await this.UserGet(user_id);
        if (user == null) {
            console.error("Could not find this USER", user_id);
            return false;
        }
        if (await this.HouseholdExists(household_id) == false) {
            return false;
        }
        const promises = [];
        if (user.household != household_id && user.household != null) {
            // First we get the old house
            const old_house = await this.HouseholdGet(user.household);
            if (old_house != null) {
                old_house.members = old_house.members.filter((x)=>x!=user.id);
                promises.push(this.setDBJson(old_house));
            }
        }

        const house = await this.HouseholdGet(household_id);
        if (house == null) {
            console.error("Could not find this house", household_id);
            return false;
        }
        // Set the user's household
        if (user.household != household_id) {
            user.household = household_id;
            promises.push(this.setDBJson(user));
        }
        // make sure there is only one of the user, add it to list of members
        if (house.members.length == 0 || house.members.indexOf(user_id) == -1) {
            house.members.push(user_id);
            promises.push(this.setDBJson(house));
        }

        await Promise.all(promises);

        return true;
    }

    async HouseholdGenerateUUID() {
        let houseID: HouseId | null = null;
        let count = 0;
        while (count < 50) {
            count += 1;
            const attempted_id = HouseIdZ.safeParse("H:" + uuidv4());
            if (attempted_id.success == false) {
                continue;
            }
            houseID = attempted_id.data;
            if (await this.HouseholdExists(houseID) == false) break;
        }
        if (count > 50) {
            console.error("This should not have happened, we were unable to generate a new household ID");
        }
        return houseID
    }

    async HouseholdExists(id: HouseId) {
        const household_id = HouseIdZ.safeParse(id);
        if (household_id.success == false) return null;
        const existing = await this.queryDBRaw(household_id.data);
        if (existing != null) return true;
        return false;
    }

    async HouseholdGet(id: HouseId) {
        const household_id = HouseIdZ.safeParse(id);
        if (household_id.success == false) return null;
        const data = await this.queryDBJson(household_id.data);
        if (data == null) return null;
        const results = DbHouseholdZ.safeParse(data);
        if (!results.success) {
            console.error(`Malformed data in database for {id}`);
            return null;
        }
        return results.data;
    }

    async HouseholdCreate(name: string) {
        try {
            const id = await this.HouseholdGenerateUUID();
            if (id == null) {
                return null;
            }
            const house: DbHousehold = DbHouseholdZ.parse({
                id,
                name,
                members: []
            });
            await this.setDBJson(house);
            return house;
        }
        catch (err) {
            console.error(err);
            return null;
        }
    }

    async HouseKeyExists(id: HouseKeyId) {
        const housekey_id = HouseKeyIdz.safeParse(id);
        if (housekey_id.success == false) return null;
        const existing = await this.queryDBRaw(housekey_id.data);
        if (existing != null) return true;
        return false;
    }

    async HouseKeyCreate(house: HouseId, creator: UserId): Promise<DbHouseKey | null> {
        try {
            const id = HouseKeyIdz.parse("HK:" + uuidv4());
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
        const housekey_id = HouseKeyIdz.safeParse(id);
        if (housekey_id.success == false) return null;
        const raw = await this.queryDBJson(housekey_id.data);
        if (raw == null) return null;
        const results = DbHouseKeyZ.safeParse(raw);
        if (results.success) return results.data;
        return null;
    }

    async HouseKeyDelete(id: HouseKeyId) {
        await this.deleteKey(id);
    }

    async ProjectGenerateUUID(): Promise<null|ProjectId> {
        let projectId: ProjectId | null = null;
        let count = 0;
        while (count < 50) {
            count += 1;
            const attempted_id = ProjectIdZ.safeParse("P:" + uuidv4());
            if (attempted_id.success == false) {
                continue;
            }
            projectId = attempted_id.data;
            if (await this.ProjectExists(projectId) == false) break;
        }
        if (count > 50) {
            console.error("This should not have happened, we were unable to generate a new user ID");
        }
        return projectId
    }

    async ProjectExists(id: ProjectId) {
        const project_id = ProjectIdZ.safeParse(id);
        if (project_id.success == false) return null;
        const existing = await this.queryDBRaw(project_id.data);
        if (existing != null) return true;
        return false;
    }

    async ProjectGet(id: ProjectId) {
        const project_id = ProjectIdZ.safeParse(id);
        if (project_id.success == false) return null;
        throw new Error("Not implemented");
    }

    async ProjectCreate(description:string) {
        try {
            const id = await this.ProjectGenerateUUID();
            if (id == null) {
                return null;
            }
            const project: DbProject = DbProjectZ.parse({
                id,
                description,
            });
            await this.setDBJson(project);
            return project;
        }
        catch (err) {
            console.error(err);
            return null;
        }
    }

    async ProjectDelete(id: ProjectId) {
        const project_id = ProjectIdZ.safeParse(id);
        if (project_id.success == false) return false;
        await this.deleteKey(id);
        return true;
    }

    async TaskGenerateUUID(): Promise<null|TaskId> {
        let taskId: TaskId | null = null;
        let count = 0;
        while (count < 50) {
            count += 1;
            const attempted_id = TaskIdZ.safeParse("T:" + uuidv4());
            if (attempted_id.success == false) {
                continue;
            }
            taskId = attempted_id.data;
            if (await this.ProjectExists(taskId) == false) break;
        }
        if (count > 50) {
            console.error("This should not have happened, we were unable to generate a new user ID");
        }
        return taskId
    }

    async TaskExists(id: TaskId): Promise<boolean> {
        const task_id = ProjectIdZ.safeParse(id);
        if (task_id.success == false) return false;
        const existing = await this.queryDBRaw(task_id.data);
        if (existing != null) return true;
        return false;
    }

    async TaskCreate(description:string, creator: UserId, household: HouseId, requirement1:ProjectId|null = null, requirement2:ProjectId|null = null): Promise<DbTask|null> {
        return null;
    }

    async TaskGet(id: TaskId) {
        const task_id = ProjectIdZ.safeParse(id);
        if (task_id.success == false) return false;
        return null;
    }

}