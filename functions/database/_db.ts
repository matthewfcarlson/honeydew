import { TelegramAPI } from "./_telegram";
import { z } from "zod";
import { pickRandomUserIconAndColor } from "../_utils";
import { DbCardBox, DbCardBoxRaw, DbCardBoxZ, DbDataObj, DbHousehold, DbHouseholdRaw, DbHouseholdZ, DbHouseKey, DbHouseKeyRaw, DbHouseKeyZ, DbIds, DbProject, DbProjectRaw, DbProjectZ, DbRecipe, DbRecipeRaw, DbRecipeZ, DbTask, DbTaskRaw, DbTaskZ, DbUser, DbUserRaw, DbUserZ, HouseId, HouseIdZ, HouseKeyId, HouseKeyIdz, ProjectId, ProjectIdZ, RecipeId, RecipeIdZ, TaskId, TaskIdZ, UserId, UserIdZ } from "../db_types";
import { Kysely, Migrator, ColumnType } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { HoneydewMigrations, LatestHoneydewDBVersion } from "./migration";
import { scrapeRecipe } from "../_recipe";
import { last } from "cheerio/lib/api/traversing";

type SQLHousehold = Omit<DbHouseholdRaw, "members">;

interface DataBaseData {
    users: DbUserRaw,
    households: SQLHousehold
    projects: DbProjectRaw
    recipes: DbRecipeRaw
    cardboxes: DbCardBoxRaw
}

const uuidv4 = () => (crypto as any).randomUUID();
const timer = (ms: number) => new Promise(res => setTimeout(res, ms));

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
        const db_version = Number(await this._kv.get("SQLDB_VERSION") || "0");
        if (db_version == null || db_version != LatestHoneydewDBVersion) return await this.migrateDatabase(db_version);
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
            console.error("MIGRATE_DB", err);
        }
        await promise;
        await this._kv.delete("SQLDB_MIGRATIONLOCK");
    }

    private async queryDBRaw(key: DbIds) {
        if (key == "") {
            console.error("DB_QUERYRAW", "We tries to query the database with an empty key");
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
        try {
            const user_id = UserIdZ.safeParse(id);
            if (user_id.success == false) return null;
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

    async UserCreate(name: string, household: HouseId) {
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
        return user;
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

    async UserRegisterTelegram(user_id: UserId, chat_id: number, tuser_id: number): Promise<boolean> {
        if (await this.UserExists(user_id) == false) return false;
        await this._db.updateTable("users").where("id", "==", user_id).set({ _chat_id: chat_id }).execute();
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
            console.error("HouseholdGenerateUUID", "This should not have happened, we were unable to generate a new household ID");
        }
        return houseID
    }

    async HouseholdExists(id: HouseId) {
        const household_id = HouseIdZ.safeParse(id);
        if (household_id.success == false) return null;
        const result = await this._db.selectFrom("households").select("id").where("id", "==", id).executeTakeFirst();
        if (result == undefined) return false;
        return true;
    }

    async HouseholdGet(id: HouseId) {
        const household_id = HouseIdZ.safeParse(id);
        if (household_id.success == false) return null;
        const sql_data = await this._db.selectFrom("households").selectAll().where("id", "==", id).executeTakeFirst();
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

    // Housekeys are a KV concept
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
            console.error("HouseKeyCreate", err);
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
            });
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
        await this.deleteKey(id);
        return true;
    }

    async ProjectsList(userId: UserId | null = null, householdId: HouseId | null = null): Promise<DbProject[] | null> {
        if (userId == null && householdId == null) return null;
        if (userId != null && householdId != null) return null;
        if (householdId == null) {
            const user_id = UserIdZ.safeParse(userId);
            if (user_id.success == false) return null;
            const user = await this.UserGet(user_id.data);
            if (user == null) return null;
            householdId = user.household;
        }
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
        const existing = await this.queryDBRaw(task_id.data);
        if (existing != null) return true;
        return false;
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
                completed: false,
                added_by: creator,
                requirement1,
                requirement2
            };
            const task: DbTask = DbTaskZ.parse(taskZ);
            await this.setDBJson(task);
            return task;
        }
        catch (err) {
            console.error("TaskCreate", err);
            return null;
        }
    }

    async TaskGet(id: TaskId): Promise<DbTask | null> {
        const task_id = TaskIdZ.safeParse(id);
        if (task_id.success == false) return null;

        const raw = await this.queryDBJson(id);
        if (raw == null) return null;
        const results = DbTaskZ.safeParse(raw);
        if (results.success == false) {
            return null;
        }
        return results.data;
    }

    async TaskMarkComplete(id: TaskId): Promise<boolean> {
        const task_id = TaskIdZ.safeParse(id);
        if (task_id.success == false) {
            console.error("TaskComplete", "Unable to parse task id")
            return false;
        }

        const task = await this.TaskGet(id);
        if (task == null) {
            console.error("TaskComplete", "Unable to find task");
            return false;
        }
        if (task.completed == false) {
            task.completed = true;
            await this.setDBJson(task);
        }
        return true;
    }

    async TaskDelete(id: TaskId) {
        await this.deleteKey(id);
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
            await this._db.insertInto("recipes").values(recipe).execute();
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
            }
            const cardbox_z = DbCardBoxZ.parse(cardbox);
            await this._db.insertInto("cardboxes").values(cardbox).execute();
            return cardbox_z;
        }
        catch (err) {
            console.error("CardBoxAddRecipe", err);
            return null;
        }
    }
}