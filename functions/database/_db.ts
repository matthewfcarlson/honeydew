import { TelegramAPI, TelegramInlineKeyboardMarkup } from "./_telegram";
import { z } from "zod";
import { getJulianDate, pickRandomUserIconAndColor } from "../_utils";
import { ChoreIdz, ChoreId, DbCardBox, DbCardBoxRaw, DbCardBoxZ, DbChoreRaw, KVDataObj, DbHousehold, DbHouseholdRaw, DbHouseholdZ, DbHouseKey, DbHouseKeyRaw, DbHouseKeyZ, DbProject, DbProjectRaw, DbProjectZ, DbRecipe, DbRecipeRaw, DbRecipeZ, DbTask, DbTaskRaw, DbTaskZ, DbUser, DbUserRaw, DbUserZ, HouseId, HouseIdZ, HouseKeyKVKey, HouseKeyKVKeyZ, ProjectId, ProjectIdZ, RecipeId, RecipeIdZ, TaskId, TaskIdZ, UserId, UserIdZ, DbChoreZ, DbChore, DbCardBoxRecipe, DbCardBoxRecipeZ, DbMagicKey, DbMagicKeyZ, MagicKVKey, MagicKVKeyZ, KVIds, UserChoreCacheKVKeyZ, DbHouseAutoAssignment, DbHouseAutoAssignmentRaw, DbHouseAutoAssignmentZ, TelegramCallbackKVKey, TelegramCallbackKVPayload, TelegramCallbackKVKeyZ, TelegramCallbackKVPayloadZ } from "../db_types";
import { Kysely, Migrator, ColumnType } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { HoneydewMigrations, LatestHoneydewDBVersion } from "./migration";
import { scrapeRecipe } from "../_recipe";
import { last } from "cheerio/lib/api/traversing";

type SQLHousehold = Omit<DbHouseholdRaw, "members">;

interface DataBaseData {
    users: DbUserRaw,
    households: SQLHousehold
    recipes: DbRecipeRaw
    cardboxes: DbCardBoxRaw
    chores: DbChoreRaw
    houseautoassign: DbHouseAutoAssignmentRaw
    projects: DbProjectRaw
    tasks: DbTaskRaw,
}

const uuidv4 = () => (crypto as any).randomUUID();
const timer = (ms: number) => new Promise(res => setTimeout(res, ms));

function makeid(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+~_$@';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

export default class Database {
    private _sql: D1Database;
    private _kv: KVNamespace;
    private _t: TelegramAPI;
    private _db;
    constructor(kv: KVNamespace, telegram: TelegramAPI, db: D1Database) {
        this._sql = db;
        this._kv = kv;
        this._t = telegram;
        this._db = new Kysely<DataBaseData>({ dialect: new D1Dialect({ database: db }) });
    }

    // This will do a drop and create if needed
    public async CheckOnSQL() {
        const db_version = Number(await this._kv.get("SQLDB_VERSION") || "-1");
        if (db_version == null || db_version != LatestHoneydewDBVersion) {
            await this.migrateDatabase(db_version);
            return Number(await this._kv.get("SQLDB_VERSION") || "-1");
        }
        return db_version;
    }

    public GetTelegram() {
        return this._t;
    }

    private async migrateDatabase(version: number) {
        const migration_lock = await this._kv.get("SQLDB_MIGRATIONLOCK");
        if (migration_lock != null) {
            console.error("DB_MIGRATEDB", "Migration is already in progress");
            return;
        }
        // TODO: move to a lock within sqlite?
        // TODO: generate a random value and try to put it in there?
        const promise = this._kv.put("SQLDB_MIGRATIONLOCK", "locked", { expirationTtl: 60 * 60 }); // this expires every hour
        try {
            const starting = Math.max(version, 0);
            if (starting >= HoneydewMigrations.length) {
                const migration = HoneydewMigrations[HoneydewMigrations.length - 1];
                if (migration.down) migration.down(this._db);
            }
            else {
                for (let i = starting; i < HoneydewMigrations.length; i += 1) {
                    await HoneydewMigrations[i].up(this._db);
                }
            }
            await this._kv.put("SQLDB_VERSION", LatestHoneydewDBVersion.toString()); // Save the DB version and don't let it expire
            console.log("Upgraded DB to version " + LatestHoneydewDBVersion + " from " + starting)
        }
        catch (err) {
            console.error("MIGRATE_DB", err);
        }
        await promise;
        await this._kv.delete("SQLDB_MIGRATIONLOCK");
    }

    private async queryKVRaw(key: KVIds) {
        if (key == "") {
            console.error("DB_QUERYRAW", "We tries to query the database with an empty key");
        }
        const results = await this._kv.get(key);
        return results;
    }

    private async queryKVJson(key: KVIds) {
        const results = await this._kv.get(key, { type: 'json' });
        return results;
    }

    private async queryKVMeta(key: KVIds) {
        const results = await this._kv.getWithMetadata(key);
        return results;
    }

    private async setKVJson(x: KVDataObj, expirationTtl = 0) {
        await this._kv.put(x.id, JSON.stringify(x), { expirationTtl: 60 * 60 * 6 }); // all keys created expire in 6 hours
    }
    private async setKVRaw(k: KVIds, v: object, expirationTtl: number | null = null) {
        if (expirationTtl == null) await this._kv.put(k, JSON.stringify(v), { expirationTtl: 60 * 60 * 6 }); // all keys created expire in 6 hours
        else if (expirationTtl == 0) await this._kv.put(k, JSON.stringify(v)); // all keys created expire in 6 hours
        else await this._kv.put(k, JSON.stringify(v), { expirationTtl }); // all keys created expire in 6 hours
    }

    private async deleteKey(key: KVIds) {
        await this._kv.delete(key);
    }

    async UserGet(id: UserId): Promise<DbUser | null> {
        try {
            const user_id = UserIdZ.safeParse(id);
            if (user_id.success == false) return null;
            // TODO: cache the user?
            const raw = await this._db.selectFrom("users").selectAll().where("id", "==", id).executeTakeFirstOrThrow();
            const results = DbUserZ.safeParse(raw);
            if (results.success == false) return null;
            return results.data;
        }
        catch (err) {
            console.error("UserGet:", err);
            return null;
        }
    }

    async UserExists(id: UserId) {
        const user_id = UserIdZ.safeParse(id);
        if (user_id.success == false) return null;
        // TODO: cache whether the user exists or not?
        const result = await this._db.selectFrom("users").select("id").where("id", "==", id).executeTakeFirst();
        if (result == undefined) return false;
        return true;
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
            console.error("UserGenerateUUID", "This should not have happened, we were unable to generate a new user ID");
        }
        return userId
    }

    async UserCreate(name: string, household: HouseId): Promise<DbUser|null> {
        const id = await this.UserGenerateUUID();
        if (id == null) {
            console.error("UserCreate", "We were not able to create a new user");
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
        await this._db.insertInto("users").values(db_user).execute();
        const result = await this.UserSetHousehold(user.id, household);
        if (!result) {
            console.error("UserCreate", "Failed to set error");
            return null;
        }
        return db_user;
    }

    async UserSetHousehold(user_id: UserId, household_id: HouseId): Promise<boolean> {
        const user = await this.UserGet(user_id);
        if (user == null) {
            console.error("UserSetHousehold", "Could not find this USER", user_id);
            return false;
        }
        // They they are already in this house, we're good
        if (user.household == household_id) return true;
        if (await this.HouseholdExists(household_id) == false) {
            console.error("UserSetHousehold", "household requested doesn't exist", household_id);
            return false;
        }

        await this._db.updateTable("users").where("id", "==", user_id).set({
            household: household_id
        }).execute();

        return true;
    }

    async UserFind(id?: UserId, chat_id?: number): Promise<DbUser | null> {
        try {
            if (id == undefined && chat_id == undefined) return null;
            let query = this._db.selectFrom("users").selectAll();
            if (chat_id != undefined) query = query.where("_chat_id", "==", chat_id);
            if (id != undefined) query = query.where("id", "==", id);
            const raw = await query.executeTakeFirst();
            if (raw == undefined) return null;
            return DbUserZ.parse(raw);
        }
        catch (err) {
            console.error("UserFind", err);
            return null;
        }
    }

    async UserRegisterTelegram(user_id: UserId, chat_id: number, tele_user_id: number): Promise<boolean> {
        if (await this.UserExists(user_id) == false) return false;
        await this._db.updateTable("users").where("id", "==", user_id).set({ _chat_id: chat_id }).execute();
        return true;
    }

    private async UserMagicKeyGenerateId(): Promise<DbMagicKey | null> {
        // The magic key is very similar to a user recovery key but is temporary
        // TODO: should recovery keys be long lasting magic keys?
        let count = 0;
        while (count < 50) {
            count++;
            const attempted_id = DbMagicKeyZ.safeParse(makeid(50));
            if (attempted_id.success == false) {
                console.error("UserMagicKeyGenerateId", "Failed to create key");
                return null;
            }
            if (await this.UserMagicKeyExists(attempted_id.data) == false) return attempted_id.data;
        }
        return null;
    }
    async UserMagicKeyCreate(user_id: UserId): Promise<DbMagicKey | null> {
        if (await this.UserExists(user_id) == false) return null;
        const key = await this.UserMagicKeyGenerateId();
        if (key == null) return null;
        const id = this.UserMagicKeyGetId(key);
        if (id == null) return null;
        await this.setKVRaw(id, user_id, 60 * 60); //set up the magic key to correspond to the user ID, expire in one hour
        return key;
    }

    UserMagicKeyGetId(magic_key: DbMagicKey): MagicKVKey | null {
        const attempted_id = MagicKVKeyZ.safeParse("MK:" + magic_key);
        if (attempted_id.success == false) return null;
        return attempted_id.data;
    }

    async UserMagicKeyExists(magic_key: DbMagicKey): Promise<boolean> {
        const id = this.UserMagicKeyGetId(magic_key);
        if (id == null) return false;
        const result = await this.queryKVRaw(id);
        if (result == null) return false;
        return true;
    }

    async UserMagicKeyConsume(magic_key: DbMagicKey): Promise<DbUser | null> {
        const id = this.UserMagicKeyGetId(magic_key);
        if (id == null) return null;
        const result = await this.queryKVJson(id);
        if (result == null) return null;
        // Keep track of this promise so we can make sure it gets done later
        const promise = this.deleteKey(id);
        const user_id = UserIdZ.safeParse(result);
        if (user_id.success == false) {
            // This is an error, log it
            console.error("UserMagicKeyConsume", "Unable to parse information in magic key", result);
            await promise;
            return null;
        }
        // Query the user
        const user = await this.UserGet(user_id.data);
        // make sure to wait for this to get deleted
        await promise;
        return user;
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
            console.error("HouseholdGenerateUUID", "This should not have happened, we were unable to generate a new household ID");
        }
        return houseID
    }

    async HouseholdExists(id: HouseId) {
        const household_id = HouseIdZ.safeParse(id);
        if (household_id.success == false) return null;
        // TODO: cache the household?
        const result = await this._db.selectFrom("households").select("id").where("id", "==", id).executeTakeFirst();
        if (result == undefined) return false;
        return true;
    }

    async HouseholdGet(id: HouseId) {
        const household_id = HouseIdZ.safeParse(id);
        // TODO: cache the household?
        if (household_id.success == false) return null;
        const sql_data = await this._db.selectFrom("households").selectAll().where("id", "==", id).executeTakeFirst();
        // TODO use a join to get what I want from the DB?
        if (sql_data == undefined) return null;
        const members_raw = await this._db.selectFrom("users").select("id").where("household", "==", household_id.data).execute();
        const members = members_raw.map((x) => x.id);
        const data: DbHouseholdRaw = {
            members,
            ...sql_data
        }
        const results = DbHouseholdZ.safeParse(data);
        if (!results.success) {
            console.error("HouseholdGet", `Malformed data in database for {id}`);
            return null;
        }
        return results.data;
    }

    async HouseholdTelegramMessageAllMembers(raw_id: HouseId, message: string, use_markdown:boolean = false, exclude_user?:UserId) {
        try {
            const id = HouseIdZ.parse(raw_id);
            let query = this._db.selectFrom("users").select("_chat_id").where("household", "==", id);
            if (exclude_user != undefined) {
                const exclude_id = UserIdZ.parse(exclude_user);
                query = query.where("id", "!=", exclude_id);
            }
            const raw_results = await query.execute();
            if (raw_results == undefined) {
                console.warn("HouseholdTelegramMessageAllMembers", `no members of ${raw_id} are registered on telegram`)
                return true;
            }
            const telegram = this.GetTelegram();
            const users = raw_results.map((x)=>x._chat_id).filter((x): x is number => x != null)
            // Send a message to the whole household
            const parse_mode = (use_markdown) ? "MarkdownV2": undefined;
            const promises = users.map((x) => telegram.sendTextMessage(x, message, undefined, undefined, parse_mode));
            await Promise.all(promises)
            return true;
        }
        catch (err) {
            console.error("HouseholdTelegramMessageAllMembers", err);
            return false;
        }
    }

    async HouseholdCreate(name: string) {
        try {
            const id = await this.HouseholdGenerateUUID();
            if (id == null) {
                return null;
            }
            const sql_house: SQLHousehold = {
                id,
                name
            };
            const house: DbHousehold = DbHouseholdZ.parse({
                ...sql_house,
                members: []
            } as DbHouseholdRaw);

            await this._db.insertInto("households").values(sql_house).executeTakeFirstOrThrow();
            return house;
        }
        catch (err) {
            console.error("HouseholdCreate", err);
            return null;
        }

    }

    async HouseAutoAssignExists(raw_id: HouseId): Promise<boolean> {
        const result = await this.HouseAutoAssignGetHour(raw_id);
        if (result == null) return false;
        return true;
    }

    async HouseAutoAssignGetHour(raw_id: HouseId): Promise<number | null> {
        try {
            const id = HouseIdZ.parse(raw_id);
            const result = await this._db.selectFrom("houseautoassign").select("choreAssignHour").where("house_id", "==", id).executeTakeFirst();
            if (result == undefined) return null;
            return result.choreAssignHour;
        }
        catch (err) {
            console.error("HouseAutoAssignGetHour", err);
            return null;
        }
    }

    async HouseAutoAssignSetTime(raw_id: HouseId, hour: number): Promise<boolean> {
        try {
            if (hour >= 24 || hour <= 0) return false;
            const id = HouseIdZ.parse(raw_id);
            const existing_hour = await this.HouseAutoAssignGetHour(id);
            if (existing_hour == hour) return true;
            if (existing_hour == null) {
                // create a new assignment
                const raw_assignment: DbHouseAutoAssignmentRaw = {
                    house_id: id,
                    choreAssignHour: hour,
                    choreLastAssignTime: 0
                };
                const assignment = DbHouseAutoAssignmentZ.parse(raw_assignment);
                await this._db.insertInto("houseautoassign").values(assignment).executeTakeFirstOrThrow();
            }
            else {
                // otherwise modify the existing one
                await this._db.updateTable("houseautoassign").where("house_id", "==", id).set({ choreAssignHour: hour }).executeTakeFirstOrThrow();
            }
            return true
        }
        catch (err) {
            console.error("HouseAutoAssignSetTime", err);
            return false;
        }
    }

    async HouseAutoAssignGetHousesReadyForHour(hour: number, timestamp: number | null = null): Promise<HouseId[]> {
        try {
            if (timestamp == null) timestamp = (getJulianDate() - 0.5);
            const raw_results = await this._db.selectFrom("houseautoassign").select("house_id").where("choreAssignHour", "==", hour).where("choreLastAssignTime", "<", timestamp).execute();
            if (raw_results == undefined) return [];
            const results = raw_results
                .map((x) => HouseIdZ.safeParse(x.house_id))
                .map((x) => (x.success) ? x.data : null)
                .filter((x): x is HouseId => x != null)
            return results;
        }
        catch (err) {
            console.error("HouseAutoAssignGetHousesReadyForHour", err);
            return [];
        }
    }

    async HouseAutoAssignMarkAssigned(house_id: HouseId,timestamp: number | null = null): Promise<boolean> {
        try {
            const id = HouseIdZ.parse(house_id);
            if (timestamp == null) timestamp = getJulianDate() + 0.05 // ahead about an hour
            await this._db.updateTable("houseautoassign").where("house_id", "==", house_id).set({choreLastAssignTime: timestamp}).execute();
            return true;
        }
        catch (err) {
            console.error("HouseAutoAssignMarkAssigned", err);
            return false;
        }
    }

    async HouseAutoAssignGetUsersReadyForGivenHour(hour: number, timestamp: number | null = null) {
        try {
            if (timestamp == null) timestamp = (getJulianDate() - 0.5);
            const assignment_query = this._db.selectFrom("houseautoassign").where("choreAssignHour", "==", hour).where("choreLastAssignTime", "<", timestamp);
            const joined_query = assignment_query.innerJoin("users", "users.household", "houseautoassign.house_id").select(["users._chat_id", "users.id", "houseautoassign.house_id as house_id"]);
            const raw_results = await joined_query.execute();
            if (raw_results == undefined) return [];
            interface JoinedResults {
                chat_id: number | null,
                house_id: HouseId,
                user_id: UserId,
            }
            const results = raw_results
                .map((x) => {
                    return {
                        chat_id: x._chat_id,
                        house_id: HouseIdZ.safeParse(x.house_id),
                        user_id: UserIdZ.safeParse(x.id)
                    }
                })
                .map((x) => {
                    return {
                        chat_id: x.chat_id,
                        house_id: (x.house_id.success) ? x.house_id.data : null,
                        user_id: (x.user_id.success) ? x.user_id.data : null,
                    }
                })
                .filter((x): x is JoinedResults => x.house_id != null && x.user_id != null)
            return results;
        }
        catch (err) {
            console.error("HouseAutoAssignGetUsersReadyForGivenHour", err);
            return [];
        }
    }

    async HouseAutoAssignMarkComplete(id: HouseId, timestamp: number | null = null): Promise<boolean> {
        try {
            if (timestamp == null) timestamp = getJulianDate();
            await this._db.updateTable("houseautoassign").where("house_id", "==", id).set({ choreLastAssignTime: timestamp }).executeTakeFirstOrThrow();
            return true;
        }
        catch (err) {
            console.error("HouseAutoAssignMarkComplete", err);
            return false;
        }
    }

    // Housekeys are a KV concept
    async HouseKeyExists(id: HouseKeyKVKey): Promise<boolean> {
        const housekey_id = HouseKeyKVKeyZ.safeParse(id);
        if (housekey_id.success == false) return false;
        const existing = await this.queryKVRaw(housekey_id.data);
        if (existing != null) return true;
        return false;
    }

    async HouseKeyCreate(house: HouseId, creator: UserId): Promise<DbHouseKey | null> {
        try {
            const id = HouseKeyKVKeyZ.parse("HK:" + uuidv4());
            if (await this.HouseKeyExists(id)) return null;
            const raw: DbHouseKeyRaw = {
                id,
                house,
                generated_by: creator
            }
            const housekey = DbHouseKeyZ.parse(raw);
            await this.setKVJson(housekey);
            return housekey;
        }
        catch (err) {
            console.error("HouseKeyCreate", err);
        }
        return null;
    }

    async HouseKeyGet(id: HouseKeyKVKey) {
        const housekey_id = HouseKeyKVKeyZ.safeParse(id);
        if (housekey_id.success == false) return null;
        const raw = await this.queryKVJson(housekey_id.data);
        if (raw == null) return null;
        const results = DbHouseKeyZ.safeParse(raw);
        if (results.success) return results.data;
        return null;
    }

    async HouseKeyDelete(id: HouseKeyKVKey) {
        await this.deleteKey(id);
    }

    // Projects are stored in SQL
    async ProjectGenerateUUID(): Promise<null | ProjectId> {
        let projectId: ProjectId | null = null;
        let count = 0;
        // TODO: This code seems way too boilerplate, make generic and move out
        while (count < 50) {
            count += 1;
            const attempted_id = ProjectIdZ.safeParse("P:" + uuidv4());
            if (attempted_id.success == false) {
                continue;
            }
            projectId = attempted_id.data;
            // TODO: figure how to generate a UUID required without pinging SQL server
            // Perhaps use KV as cache?
            if (await this.ProjectExists(projectId) == false) break;
        }
        if (count > 50) {
            console.error("ProjectGenerateUUID", "This should not have happened, we were unable to generate a new user ID");
        }
        return projectId
    }

    async ProjectExists(id: ProjectId): Promise<boolean> {
        const project_id = ProjectIdZ.safeParse(id);
        if (project_id.success == false) return false;
        const result = await this._db.selectFrom("projects").select("id").where("id", "==", id).executeTakeFirst();
        if (result == undefined) return false;
        return true;
    }

    async ProjectGet(id: ProjectId): Promise<DbProject | null> {
        try {
            const project_id = ProjectIdZ.parse(id);
            const project_raw = await this._db.selectFrom("projects").selectAll().where("id", "==", project_id).executeTakeFirstOrThrow();
            const project = DbProjectZ.parse(project_raw);
            return project;
        }
        catch (err) {
            console.error("ProjectGet", err);
            return null;
        }
    }

    async ProjectCreate(description: string, household: HouseId) {
        try {
            const id = await this.ProjectGenerateUUID();
            if (id == null) {
                return null;
            }
            const project: DbProject = DbProjectZ.parse({
                id,
                household,
                description,
            } as DbProjectRaw);
            await this._db.insertInto("projects").values(project).executeTakeFirstOrThrow();
            return project;
        }
        catch (err) {
            console.error("ProjectCreate", err);
            return null;
        }
    }

    async ProjectDelete(id: ProjectId) {
        const project_id = ProjectIdZ.safeParse(id);
        if (project_id.success == false) return false;
        await this._db.deleteFrom("projects").where("id", "==", project_id.data).execute();
        return true;
    }

    async ProjectsList(householdId: HouseId): Promise<DbProject[] | null> {
        const household_id = HouseIdZ.safeParse(householdId);
        if (household_id.success == false) {
            return null;
        }
        const raw_results = await this._db.selectFrom("projects").selectAll().where("household", "==", household_id.data).execute();
        const results: DbProject[] = [];
        // I tried this earlier with a map, filter, map and it didn't like it
        // Perhaps figure out a way to standardize this?
        raw_results.forEach((x) => {
            const result = DbProjectZ.safeParse(x);
            if (result.success == false) return;
            results.push(result.data);
        });
        return results;
    }
    async TaskGenerateUUID(): Promise<null | TaskId> {
        let taskId: TaskId | null = null;
        let count = 0;
        while (count < 50) {
            count += 1;
            const attempted_id = TaskIdZ.safeParse("T:" + uuidv4());
            if (attempted_id.success == false) {
                continue;
            }
            taskId = attempted_id.data;
            if (await this.TaskExists(taskId) == false) break;
        }
        if (count > 50) {
            console.error("TaskGenerateUUID", "This should not have happened, we were unable to generate a new user ID");
        }
        return taskId
    }

    async TaskExists(id: TaskId): Promise<boolean> {
        const task_id = TaskIdZ.safeParse(id);
        if (task_id.success == false) return false;
        const result = await this._db.selectFrom("tasks").select("id").where("id", "==", id).executeTakeFirst();
        if (result == undefined) return false;
        return true;
    }

    async TaskCreate(description: string, creator: UserId, household: HouseId, project: ProjectId | null = null, requirement1: TaskId | null = null, requirement2: TaskId | null = null): Promise<DbTask | null> {
        try {
            const id = await this.TaskGenerateUUID();
            if (id == null) {
                return null;
            }
            if (requirement2 != null && requirement1 == null) {
                console.warn("TaskCreate", "Cannot have a second requirement without a first");
                return null;
            }
            if (project == null && requirement1 != null) {
                console.warn("TaskCreate", "Cannot have a requirement without a project");
                return null;
            }
            const taskZ: DbTaskRaw = {
                id,
                household,
                description,
                project,
                completed: null,
                added_by: creator,
                requirement1,
                requirement2
            };
            const task: DbTask = DbTaskZ.parse(taskZ);
            await this._db.insertInto("tasks").values(task).executeTakeFirstOrThrow();
            return task;
        }
        catch (err) {
            console.error("TaskCreate", err);
            return null;
        }
    }

    async TaskGet(id: TaskId): Promise<DbTask | null> {
        try {
            const task_id = TaskIdZ.parse(id);
            const result = await this._db.selectFrom("tasks").selectAll().where("id", "==", task_id).executeTakeFirstOrThrow();
            if (result == undefined) return null;
            return DbTaskZ.parse(result);
        }
        catch (err) {
            console.error("TaskGet", err);
            return null;
        }
    }

    async TaskMarkComplete(id: TaskId, raw_user:UserId): Promise<boolean> {
        try{
            if (await this.TaskExists(id) == false) return false;
            const user_id = UserIdZ.parse(raw_user);
            const timestamp = getJulianDate();
            const task = await this.TaskGet(id);
            if (task == null) return false;
            let telegram_promise: Promise<any>|null = null;
            // Get user and make sure they're in the right household?
            const user = await this.UserGet(user_id);
            if (user == null) return false;
            if (user.household != task.household) {
                console.error("TaskMarkComplete", user, "tried to complete task:", task);
                return false;
            }
            // If the task was already completed
            if (task.completed != null) return true;
            // TODO: update the leaderboard?
            const message = `*${user.name}* just completed _${task.description}_`;
            telegram_promise = this.HouseholdTelegramMessageAllMembers(task.household, message, true, user_id);
            
            await this._db.updateTable("tasks").where("id", "==", id).set({ completed: timestamp }).execute();
            return true;
        }
        catch (err) {
            console.error("TaskMarkComplete", err);
            return false;
        }
    }

    async TaskDelete(id: TaskId) {
        try {
            const task_id = TaskIdZ.parse(id);
            const result = await this._db.deleteFrom("tasks").where("id", "==", task_id).executeTakeFirstOrThrow();
            if (result == undefined) return false;
            return result.numDeletedRows > 0
        }
        catch (err) {
            console.error("TaskDelete", err);
            return false;
        }
    }

    async RecipeExists(id: RecipeId | null, url?: string) {
        if (id == null && url == undefined) return false;
        if (id != null && url != undefined) return false;
        let query = this._db.selectFrom("recipes").select("id")

        if (id != null) {
            query = query.where("id", "==", id);
        }
        if (url != undefined) {
            query = query.where("url", "==", url);
        }
        const result = await query.executeTakeFirst();
        if (result == undefined) return false;
        return true;
    }

    async RecipeGenerateUUID(): Promise<null | RecipeId> {
        let recipeId: RecipeId | null = null;
        let count = 0;
        while (count < 50) {
            count += 1;
            const attempted_id = RecipeIdZ.safeParse("R:" + uuidv4());
            if (attempted_id.success == false) {
                continue;
            }
            recipeId = attempted_id.data;
            if (await this.RecipeExists(recipeId) == false) break;
        }
        if (count > 50) {
            console.error("RecipeGenerateUUID", "This should not have happened, we were unable to generate a new user ID");
        }
        return recipeId
    }

    async RecipeCreateIfNotExists(url: string): Promise<DbRecipe | null> {
        try {
            const recipe_raw = await this._db.selectFrom("recipes").selectAll().where("url", "==", url).executeTakeFirst();
            if (recipe_raw != undefined) {
                return DbRecipeZ.parse(recipe_raw);
            }
            const id = await this.RecipeGenerateUUID();
            if (id == null) {
                return null;
            }
            const result = await scrapeRecipe(url);
            if (result == null) {
                return null;
            }
            // Otherwise we need to create it
            const recipe: DbRecipeRaw = {
                id,
                ...result
            }
            const recipe_z = DbRecipeZ.parse(recipe);
            await this._db.insertInto("recipes").values(recipe_z).execute();
            return recipe_z;
        }
        catch (err) {
            console.error("RecipeCreateIfNotExists", err);
            return null;
        }
    }

    async CardBoxAddRecipe(recipe_id: RecipeId, house_id: HouseId): Promise<DbCardBox | null> {
        try {
            const cardbox_raw = await this._db.selectFrom("cardboxes").selectAll().where("recipe_id", "==", recipe_id).where("household_id", "==", house_id).executeTakeFirst();
            if (cardbox_raw != undefined) {
                return DbCardBoxZ.parse(cardbox_raw);
            }
            // Otherwise we need to create it
            const cardbox: DbCardBoxRaw = {
                recipe_id,
                household_id: house_id,
                lastMade: null,
                favorite: 0,
                meal_prep: 0,
            }
            const cardbox_z = DbCardBoxZ.parse(cardbox);
            await this._db.insertInto("cardboxes").values(cardbox_z).execute();
            return cardbox_z;
        }
        catch (err) {
            console.error("CardBoxAddRecipe", err);
            return null;
        }
    }

    async CardBoxRemoveRecipe(recipe_id: RecipeId, house_id: HouseId) {
        try {
            const r_id = RecipeIdZ.parse(recipe_id);
            const h_id = HouseIdZ.parse(house_id);
            const result = await this._db.deleteFrom("cardboxes").where("recipe_id", "==", r_id).where("household_id", "==", h_id).executeTakeFirst();
            return true; //result.numDeletedRows > 0
        }
        catch (err) {
            console.error("CardBoxRemoveRecipe", err);
            return false;
        }
    }

    async CardBoxGetFavorites(house_id: HouseId, favorites: boolean = true): Promise<DbCardBoxRecipe[]> {
        const id_parse = HouseIdZ.safeParse(house_id);
        if (id_parse.success == false) return []
        const cardbox = await this._db.selectFrom(["cardboxes", "recipes"]).selectAll("cardboxes").selectAll("recipes").where("household_id", "==", house_id).where("favorite", "==", favorites ? 1 : 0).whereRef("cardboxes.recipe_id", "==", "recipes.id").execute();
        const results: DbCardBoxRecipe[] = [];
        cardbox.forEach((x) => {
            const cardbox: DbCardBoxRaw = x
            const recipe: DbRecipeRaw = {
                id: x.recipe_id,
                url: x.url,
                name: x.name,
                image: x["image"],
                totalTime: x.totalTime,
            }
            const z = DbCardBoxRecipeZ.safeParse({
                recipe,
                ...cardbox,
            });
            if (z.success) results.push(z.data);
            else console.error(z.error);
        });
        return results;
    }

    async CardBoxSetFavorite(recipe_id: RecipeId, house_id: HouseId, favored: boolean): Promise<boolean> {
        try {
            // Just make sure there is at least one
            const cardbox_raw = await this._db.selectFrom("cardboxes").selectAll().where("recipe_id", "==", recipe_id).where("household_id", "==", house_id).executeTakeFirst();
            if (cardbox_raw == undefined) {
                return false;
            }
            await this._db.updateTable("cardboxes").where("recipe_id", "==", recipe_id).where("household_id", "==", house_id).set({ favorite: (favored ? 1 : 0) }).execute();
            return true;
        }
        catch (err) {
            console.error("CardBoxSetFavorite", err);
            return false;
        }
    }

    async CardBoxSetMealPrep(recipe_id: RecipeId, house_id: HouseId, prepared: boolean): Promise<boolean> {
        try {
            // Just make sure there is at least one
            const cardbox_raw = await this._db.selectFrom("cardboxes").selectAll().where("recipe_id", "==", recipe_id).where("household_id", "==", house_id).executeTakeFirst();
            if (cardbox_raw == undefined) {
                return false;
            }
            await this._db.updateTable("cardboxes").where("recipe_id", "==", recipe_id).where("household_id", "==", house_id).set({ meal_prep: (prepared ? 1 : 0) }).execute();
            return true;
        }
        catch (err) {
            console.error("CardBoxSetMealPrep", err);
            return false;
        }
    }

    async ChoreExists(id: ChoreId) {
        const chore_id = ChoreIdz.safeParse(id);
        if (chore_id.success == false) return false;
        const result = await this._db.selectFrom("chores").select("id").where("id", "==", id).executeTakeFirst();
        if (result == undefined) return false;
        return true;
    }

    async ChoreGenerateUUID(): Promise<null | ChoreId> {
        let id: ChoreId | null = null;
        let count = 0;
        while (count < 50) {
            count += 1;
            const attempted_id = ChoreIdz.safeParse("C:" + uuidv4());
            if (attempted_id.success == false) {
                continue;
            }
            id = attempted_id.data;
            if (await this.ChoreExists(id) == false) break;
        }
        if (count > 50) {
            console.error("ChoreGenerateUUID", "This should not have happened, we were unable to generate a new user ID");
        }
        return id
    }

    async ChoreCreate(name: string, household_id: HouseId, frequency: number, back_dated: number = 1): Promise<DbChore | null> {
        try {
            const id = await this.ChoreGenerateUUID();
            if (id == null) {
                return null;
            }

            const chore_raw: DbChoreRaw = {
                id,
                household_id,
                name,
                frequency,
                lastDone: getJulianDate() - back_dated, // the default is we said it was done yesterday
                waitUntil: null,
                doneBy: null,
                lastTimeAssigned: null,
            };
            const chore = DbChoreZ.parse(chore_raw);
            await this._db.insertInto("chores").values(chore).executeTakeFirstOrThrow();
            return chore;
        }
        catch (err) {
            console.error("TaskCreate", err);
            return null;
        }
    }

    async ChoreComplete(id: ChoreId, raw_user: UserId): Promise<boolean> {
        try{
            if (await this.ChoreExists(id) == false) return false;
            const user_id = UserIdZ.parse(raw_user);
            const timestamp = getJulianDate();
            const chore = await this.ChoreGet(id);
            if (chore == null) return false;
            let telegram_promise: Promise<any>|null = null;
            // Get user and make sure they're in the right household?
            const user = await this.UserGet(user_id);
            if (user == null) return false;
            if (user.household != chore.household_id) {
                console.error("ChoreComplete", user, "tried to complete chore:", chore);
                return false;
            }
            // If the timestamp was last done at least an hour ago let people know it was done
            if ((timestamp - 0.05) > chore.lastDone) {
                // TODO: update the leaderboard?
                const message = `*${user.name}* just completed _${chore.name}_`;
                telegram_promise = this.HouseholdTelegramMessageAllMembers(chore.household_id, message, true, user_id);
            }
            
            await this._db.updateTable("chores").where("id", "==", id).set({ lastDone: timestamp }).execute();
            return true;
        }
        catch (err) {
            console.error("ChoreComplete", err);
            return false;
        }
    }
    async ChoreAssignTo(id: ChoreId, user: UserId | null): Promise<boolean> {
        if (await this.ChoreExists(id) == false) return false;
        // Validate userId
        if (user != null && UserIdZ.safeParse(user).success == false) return false;
        await this._db.updateTable("chores").where("id", "==", id).set({ doneBy: user }).execute();
        return true;
    }

    async ChoreGet(id: ChoreId) {
        try {
            const chore_id = ChoreIdz.safeParse(id);
            if (chore_id.success == false) return null;
            const result = await this._db.selectFrom("chores").selectAll().where("id", "==", id).executeTakeFirstOrThrow();
            if (result == undefined) return null;
            return DbChoreZ.parse(result);
        }
        catch (err) {
            console.error("ChoreGet", err);
            return null;
        }
    }

    async ChoreDelete(id: ChoreId) {
        try {
            const chore_id = ChoreIdz.safeParse(id);
            if (chore_id.success == false) return false;
            const result = await this._db.deleteFrom("chores").where("id", "==", id).executeTakeFirstOrThrow();
            if (result == undefined) return false;
            return result.numDeletedRows > 0
        }
        catch (err) {
            console.error("ChoreDelete", err);
            return false;
        }
    }

    async ChorePickNextChore(house_id: HouseId, user_id: UserId): Promise<DbChore | null> {
        try {
            const id = HouseIdZ.safeParse(house_id);
            if (id.success == false) return null;
            const today = getJulianDate();
            const last_signed_time = today - 0.5;
            const query = this._db.selectFrom("chores").selectAll().where("lastDone", "<", last_signed_time).where("household_id", "==", house_id).where((qb) => qb.where("lastTimeAssigned", "is", null).orWhere("lastTimeAssigned", "<", last_signed_time));
            const result = await query.execute();
            if (result == undefined || result.length == 0) {
                return null;
            }
            // we now need to sort them and select the one we want
            const filtered_results = result
                .map((x) => DbChoreZ.safeParse(x))
                .map((x) => (x.success) ? x.data : null)
                .filter((x): x is DbChore => x != null)
                .filter((x) => x.doneBy == null || x.doneBy == user_id)
                .filter((x) => (x.lastDone + x.frequency) < today);
            // TODO: filter out any chores that were done more recently than their frequency, ie don't need to get done again
            if (filtered_results.length == 0) {
                return null;
            }
            const sorted_results = filtered_results.sort((a, b) => {
                // The thought is how frequently is it done vs how long it's delayed, how long of a cycle is it delayed for?
                const a_cycle = (today - a.lastDone) / a.frequency;
                const b_cycle = (today - b.lastDone) / b.frequency;
                return b_cycle - a_cycle
            });
            return sorted_results[0];
        }
        catch (err) {
            console.error("ChorePickNextChore", err);
            return null;
        }
    }

    private UserChoreCacheKVKeyGenerate(user_id:UserId) {
        const kv_key = UserChoreCacheKVKeyZ.parse("CC:" + user_id);
        return kv_key;
    }

    // Gets the current chore without picking a new one
    async ChoreGetCurrentChore(raw_user_id: UserId): Promise<DbChore | null> {
        try {
            // First validate user_id
            const user_id = UserIdZ.parse(raw_user_id);
            // see if we already have one cached
            const kv_key = this.UserChoreCacheKVKeyGenerate(user_id);
            const raw_cached_chore_id = await this.queryKVJson(kv_key);
            if (raw_cached_chore_id != null) {
                const chore_id = ChoreIdz.parse(raw_cached_chore_id);
                const chore = await this.ChoreGet(chore_id);
                if (chore == null) {
                    console.warn("ChoreGetCurrentChore", "Deleting marking as we couldn't find this chore", chore_id, kv_key);
                    await this.deleteKey(kv_key);
                }
                else return chore;
            }
            return null;
        }
        catch (err) {
            console.error("ChoreGetCurrentChore", err);
            return null;
        }
    }

    // First check if we need to 
    async ChoreGetNextChore(raw_house_id: HouseId, raw_user_id: UserId, telegram_id: string | number | null): Promise<DbChore | null> {
        try {
            // First validate user_id
            const user_id = UserIdZ.parse(raw_user_id);
            const house_id = HouseIdZ.parse(raw_house_id);
            // see if we already have one cached
            const current_chore = await this.ChoreGetCurrentChore(user_id);
            if (current_chore != null) return current_chore;
            // Otherwise pick a new one
            const kv_key = this.UserChoreCacheKVKeyGenerate(user_id);
            const chore = await this.ChorePickNextChore(house_id, user_id);
            if (chore == null) return null;
            const promises = [];
            const today = getJulianDate();
            // Make sure to set the last time assigned to today
            const update_query = this._db.updateTable("chores").where("id", "==", chore.id).set({ "lastTimeAssigned": today });
            promises.push(this.setKVRaw(kv_key, chore.id, (60 * 60 * 23))); // it lasts 23 hours
            promises.push(update_query.execute());
            if (telegram_id != null) {
                // TODO: escape the name
                const text = `Hey, today your chore is: *${chore.name}*`
                const payload: TelegramCallbackKVPayload = {
                    user_id,
                    type:"COMPLETE_CHORE",
                    chore_id: chore.id
                }
                const payload_key = await this.TelegramCallbackCreate(payload);
                if (payload_key == null) {
                    promises.push(this.GetTelegram().sendTextMessage(telegram_id, text, undefined, undefined, "MarkdownV2"));
                }
                else {
                    // TODO: add options for completing the task from 
                    const keyboard: TelegramInlineKeyboardMarkup = {
                        inline_keyboard: [[
                            {
                                text: "Did The Chore",
                                callback_data: payload_key
                            },
                        ]]
                    };
                    promises.push(this.GetTelegram().sendTextMessage(telegram_id, text, undefined, keyboard, "MarkdownV2"));
                }
                
            }
            await Promise.all(promises);
            return chore;
        }
        catch (err) {
            console.error("ChoreGetNextChore", err);
            return null;
        }
    }
    async ChoreSkipCurrentChore(raw_user_id: UserId): Promise<boolean> {
        try {
            // First validate user_id
            const user_id = UserIdZ.parse(raw_user_id);
            // delete if we have one cached
            const kv_key = UserChoreCacheKVKeyZ.parse("CC:" + user_id);
            await this.deleteKey(kv_key);
            return true;
        }
        catch (err) {
            console.error("ChoreSkipCurrentChore", err);
            return false;
        }
    }

    async ChoreGetAll(house_id: HouseId): Promise<DbChore[]> {
        try {
            const id = HouseIdZ.safeParse(house_id);
            if (id.success == false) return [];
            const today = getJulianDate();
            const result = await this._db.selectFrom("chores").selectAll().where("household_id", "==", house_id).execute();
            if (result == undefined) return [];
            // we now need to sort them and select the one we want
            const sorted_results = result.map((x) => DbChoreZ.safeParse(x)).map((x) => (x.success) ? x.data : null).filter((x): x is DbChore => x != null);
            return sorted_results;
        }
        catch (err) {
            console.error("ChoreGetAll", err);
            return [];
        }
    }

    // Telegram callback items
    async TelegramCallbackExists(raw_id: TelegramCallbackKVKey): Promise<boolean> {
        const id = TelegramCallbackKVKeyZ.safeParse(raw_id);
        if (id.success == false) return false;
        const existing = await this.queryKVRaw(id.data);
        if (existing != null) return true;
        return false;
    }

    private async TelegramCallbackGenerateUUID(): Promise<TelegramCallbackKVKey | null> {
        let count = 0;
        while (count < 50) {
            count++;
            const attempted_id = TelegramCallbackKVKeyZ.safeParse("TC:" + uuidv4());
            if (attempted_id.success == false) {
                console.error("TelegramCallbackGenerateUUID", "Failed to create key");
                return null;
            }
            if (await this.TelegramCallbackExists(attempted_id.data) == false) return attempted_id.data;
        }
        return null;
    }

    async TelegramCallbackCreate(raw_payload: TelegramCallbackKVPayload): Promise<TelegramCallbackKVKey | null> {
        try {
            const id = await this.TelegramCallbackGenerateUUID();
            if (id == null) return null;
            const payload = TelegramCallbackKVPayloadZ.parse(raw_payload);
            await this.setKVRaw(id, payload, 60*60*24); // callbacks last for one day
            return id;
        }
        catch (err) {
            console.error("TelegramCallbackCreate", err);
            return null;
        }
    }
    async TelegramCallbackConsume(raw_id: TelegramCallbackKVKey): Promise<TelegramCallbackKVPayload | null> {
        try {
            const id = TelegramCallbackKVKeyZ.parse(raw_id);
            const raw_payload = await this.queryKVJson(id);
            await this.deleteKey(id);
            return TelegramCallbackKVPayloadZ.parse(raw_payload);
        }
        catch (err) {
            console.error("TelegramCallbackConsume", err);
            return null;
        }
    }
}