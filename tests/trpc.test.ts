/**
 * Integration test example for the `post` router
 */
import { describe, expect, test, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { createInnerContext } from '../functions/api/context';
import { appRouter } from '../functions/api/router';
import { TelegramAPI } from "../functions/database/_telegram";
import Database from "../functions/database/_db";
import { DbUser } from '../functions/db_types';
import { HoneydewPageData, HoneydewPageEnv } from '../functions/types';
import { getJulianDate } from '../functions/_utils';

function createDB() {
    const telegram = new TelegramAPI("TESTING");
    const kv = env.HONEYDEW as KVNamespace;
    const db = new Database(kv, telegram, env.HONEYDEWSQL as D1Database)
    return db;
}
const db = createDB();
beforeAll(async () => {
    return await db.CheckOnSQL();
});

function createData(user: DbUser | null): HoneydewPageData {
    const authorized = user != null;
    const userid = (user == null) ? null: user.id;
    return {
        db,
        timestamp: Date.now(),
        user,
        authorized,
        jwt_raw: '',
        userid,
    }
}

const ENV: HoneydewPageEnv = {
    TELEGRAM: "",
    JWT_SECRET: "",
    TELEGRAM_WH: "",
    PRODUCTION: "false",
    HONEYDEW: env.HONEYDEW as KVNamespace,
    HONEYDEWSQL: env.HONEYDEWSQL as D1Database,
    TURNSTILE: "",
}
const ROOT_URL = "http://localhost/"
describe('User tests', () => {
    test('you can query yourself', async () => {

        const house = await db.HouseholdCreate("BOB'S HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        expect(house.id.length).toBeGreaterThan(10);
        // Act
        const user = await db.UserCreate("BOBBY", house.id);
        // Assert
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);

        const caller = appRouter.createCaller(ctx);
        const result = await caller.me.get();
        expect(result.id).toBe(user.id);

        // https://localhost/auth/magic/Mx$X5lGAtCxqaSMlTZeesOg0wHcV@ZuteuGri$QLWFB3COTKlR
        const link = await caller.me.magic_link();
        expect(link).toHaveLength(79);
    });

    test('you can query yourself', async () => {

        const ctx = await createInnerContext(createData(null), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);
        // we shouldn't get any information if we aren't logged in
        await expect(caller.me.get()).rejects.toThrowError();
    });
});
describe('household tests', () => {
    test('you can autoassign ', async () => {

        const house = await db.HouseholdCreate("BOB'S HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        expect(house.id.length).toBeGreaterThan(10);
        // Act
        const user = await db.UserCreate("BOBBY", house.id);
        // Assert
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);

        const caller = appRouter.createCaller(ctx);
        const result = await caller.household.setAutoAssign(5);
        expect(result).toBe(true);
        await expect(caller.household.setAutoAssign(25)).rejects.toThrowError();

    });

    test('you can generate invite link ', async () => {
        const house = await db.HouseholdCreate("BOB'S HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        expect(house.id.length).toBeGreaterThan(10);
        // Act
        const user = await db.UserCreate("BOBBY", house.id);
        // Assert
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);

        const caller = appRouter.createCaller(ctx);
        const result = await caller.household.invite();
        expect(result).toContain("auth/join/");
        // TODO: decode the key?
    });

    test('you can set the expecting date', async () => {
        const house = await db.HouseholdCreate("BOB'S HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        expect(house.id.length).toBeGreaterThan(10);
        // Act
        const user = await db.UserCreate("BOBBY", house.id);
        // Assert
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);

        const caller = appRouter.createCaller(ctx);
        const result = await caller.household.setExpectingDate({expecting: "2023-04-16"})
        expect(result).toBe(true);
        const result2 = await caller.household.setExpectingDate({expecting: "2023-of-16"})
        expect(result2).toBe(false);
    });
});

describe('recipe tests', () => {
    test('you can add a recipe', async () => {
        const house = await db.HouseholdCreate("BOB'S HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        expect(house.id.length).toBeGreaterThan(10);
        // Act
        const user = await db.UserCreate("BOBBY", house.id);
        // Assert
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        expect(await caller.recipes.favorites()).toHaveLength(0);
        expect(await caller.recipes.add("https://www.debugscraper.com/test-recipe")).toBe(true)

        const totry = await caller.recipes.toTry();
        expect(totry).toHaveLength(1);
        const recipe_id = totry[0].recipe_id;
        expect(await caller.recipes.mark_favored({recipe_id, favored:true})).toBe(true);
        // remove the recipe from our thing
        expect(await caller.recipes.remove(recipe_id)).toBe(true);
    });
    // TODO: do tests that have two users and have the user try to do things on the other user's account
});

describe('chore tests', () => {
    test('you can add and assign a chore', async () => {

        const house = await db.HouseholdCreate("BOB'S HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("BOBBY", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const house2 = await db.HouseholdCreate("JOEY'S HOUSE");
        expect(house2).not.toBeNull();
        if (house2 == null) return;
        const user2 = await db.UserCreate("JOEY", house2.id);
        expect(user2).not.toBeNull();
        if (user2 == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        const ctx2 = await createInnerContext(createData(user2), ENV, ROOT_URL);
        const caller2 = appRouter.createCaller(ctx2);

        // each user creates a chore
        expect(await caller.chores.add({name: "Test chore", frequency: 2})).toBe(true);
        expect(await caller2.chores.add({name: "Other Chore", frequency: 2})).toBe(true);

        let chores = await caller.chores.all();
        expect(chores).toHaveLength(1);

        let chores2 = await caller2.chores.all();
        expect(chores2).toHaveLength(1);

        // assign the chore to ourselves
        expect(await caller.chores.assignTo({raw_choreid:chores[0].id, raw_assigneeid: user.id})).toBe(true);
        expect(await caller2.chores.assignTo({raw_choreid:chores2[0].id, raw_assigneeid: user2.id})).toBe(true);
        // try to assign the chore to the other user
        expect(await caller.chores.assignTo({raw_choreid:chores[0].id, raw_assigneeid: user2.id})).toBe(false);
        // try to assign the other user's chore to themselves
        expect(await caller.chores.assignTo({raw_choreid:chores2[0].id, raw_assigneeid: user2.id})).toBe(false);
        // try to clear the assignment the other user's chore
        expect(await caller.chores.assignTo({raw_choreid:chores2[0].id, raw_assigneeid: null})).toBe(false);

        chores = await caller.chores.all();
        expect(chores).toHaveLength(1);
        expect(chores[0].doneBy).toBe(user.id);

        chores2 = await caller2.chores.all();
        expect(chores2).toHaveLength(1);
        expect(chores2[0].doneBy).toBe(user2.id);

        // now complete the chore
        const timestamp = getJulianDate();
        expect(chores[0].lastDone).toBeLessThan(timestamp);
        await caller.chores.complete(chores[0].id);
        chores = await caller.chores.all();
        expect(chores).toHaveLength(1);
        expect(chores[0].lastDone).toBeGreaterThanOrEqual(timestamp);

        // now try to delete the chore
        await caller.chores.delete(chores[0].id);
        chores = await caller.chores.all();
        expect(chores).toHaveLength(0);
    });

    test('chore completion returns streak data', async () => {
        const house = await db.HouseholdCreate("STREAK TEST HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("STREAKER", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        expect(await caller.chores.add({name: "Streak chore", frequency: 1})).toBe(true);
        const chores = await caller.chores.all();
        expect(chores).toHaveLength(1);

        const result = await caller.chores.complete(chores[0].id);
        expect(result.success).toBe(true);
        expect(result.streak).toBe(1);
        expect(result.isFirstToday).toBe(true);

        // Second completion same day
        const result2 = await caller.chores.complete(chores[0].id);
        expect(result2.success).toBe(true);
        expect(result2.streak).toBe(1);
        expect(result2.isFirstToday).toBe(false);
    });

    test('household extended data includes member streaks', async () => {
        const house = await db.HouseholdCreate("STREAK HOUSEHOLD");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("MEMBER", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        // Complete a chore to set streak
        expect(await caller.chores.add({name: "Visible streak chore", frequency: 1})).toBe(true);
        const chores = await caller.chores.all();
        await caller.chores.complete(chores[0].id);

        // Get user data which includes household with member streaks
        const meData = await caller.me.get();
        const member = meData.household.members.find(m => m.userid === user.id);
        expect(member).not.toBeUndefined();
        expect(member!.current_streak).toBe(1);
    });
});

describe('project tests', () => {
    test('you can add a project', async () => {

        const house = await db.HouseholdCreate("BOB'S HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("BOBBY", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        expect(await caller.projects.add("Test Project")).toBe(true);

        let projects = await caller.projects.get_projects();
        expect(projects).not.toBeNull();
        if (projects == null) return;
        expect(projects).toHaveLength(1);
        expect(projects[0].total_subtasks).toBe(0);

        // now add a task
        await caller.projects.add_task({description: "project task", project: projects[0].id, requirement1: null, requirement2: null});

        projects = await caller.projects.get_projects();
        expect(projects).not.toBeNull();
        if (projects == null) return;
        expect(projects).toHaveLength(1);
        expect(projects[0].total_subtasks).toBe(1);
        expect(projects[0].ready_subtasks).toBe(1);
        expect(projects[0].done_subtasks).toBe(0);

        const tasks = await caller.projects.get_tasks(projects[0].id);
        expect(tasks).not.toBeNull();
        if (tasks == null) return;
        expect(tasks).toHaveLength(1);
        expect(tasks[0].description).toBe("project task");

        expect(await caller.projects.complete_task(tasks[0].id)).toBe(true);

        projects = await caller.projects.get_projects();
        expect(projects).not.toBeNull();
        if (projects == null) return;
        expect(projects).toHaveLength(1);
        expect(projects[0].total_subtasks).toBe(1);
        expect(projects[0].ready_subtasks).toBe(0);
        expect(projects[0].done_subtasks).toBe(1);

        // now delete the project
        expect(await caller.projects.delete(projects[0].id)).toBe(true);

        // check that we don't have any projects
        projects = await caller.projects.get_projects();
        expect(projects).not.toBeNull();
        expect(projects).toHaveLength(0);
        if (projects == null) return;

    });
});

describe('eink token tests', () => {
    test('you can create an eink token', async () => {
        const house = await db.HouseholdCreate("EINK HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("EINK USER", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.household.createEinkToken();
        expect(result.token).toBeTruthy();
        expect(result.token.length).toBe(50);
        expect(result.display_url).toContain("/eink/");
    });

    test('you can revoke an eink token', async () => {
        const house = await db.HouseholdCreate("EINK HOUSE 2");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("EINK USER 2", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.household.createEinkToken();
        expect(result.token).toBeTruthy();

        // Verify we can look up the token
        const payload = await db.EinkTokenLookup(result.token);
        expect(payload).not.toBeNull();

        // Revoke it
        const revoked = await caller.household.revokeEinkToken(result.token);
        expect(revoked).toBe(true);

        // Verify it's gone
        const payload2 = await db.EinkTokenLookup(result.token);
        expect(payload2).toBeNull();
    });

    test('cannot revoke a token from another household', async () => {
        const house1 = await db.HouseholdCreate("EINK HOUSE A");
        expect(house1).not.toBeNull();
        if (house1 == null) return;
        const user1 = await db.UserCreate("EINK USER A", house1.id);
        expect(user1).not.toBeNull();
        if (user1 == null) return;

        const house2 = await db.HouseholdCreate("EINK HOUSE B");
        expect(house2).not.toBeNull();
        if (house2 == null) return;
        const user2 = await db.UserCreate("EINK USER B", house2.id);
        expect(user2).not.toBeNull();
        if (user2 == null) return;

        // User1 creates a token
        const ctx1 = await createInnerContext(createData(user1), ENV, ROOT_URL);
        const caller1 = appRouter.createCaller(ctx1);
        const result = await caller1.household.createEinkToken();

        // User2 tries to revoke it
        const ctx2 = await createInnerContext(createData(user2), ENV, ROOT_URL);
        const caller2 = appRouter.createCaller(ctx2);
        await expect(caller2.household.revokeEinkToken(result.token)).rejects.toThrowError();
    });

    test('unauthenticated user cannot create eink token', async () => {
        const ctx = await createInnerContext(createData(null), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);
        await expect(caller.household.createEinkToken()).rejects.toThrowError();
    });
});