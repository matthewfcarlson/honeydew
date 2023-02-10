/**
 * Integration test example for the `post` router
 */
import { createInnerContext } from '../functions/api/context';
import { appRouter } from '../functions/api/router';
import { TelegramAPI } from "../functions/database/_telegram";
import Database from "../functions/database/_db";
import { describe, expect, test } from '@jest/globals';
import { DbUser } from '../functions/db_types';
import { HoneydewPageData, HoneydewPageEnv } from '../functions/types';
import { getJulianDate } from '../functions/_utils';
const { HONEYDEW, __D1_BETA__HONEYDEWSQL } = getMiniflareBindings();

function createDB() {
    const telegram = new TelegramAPI("TESTING");
    const kv = HONEYDEW as KVNamespace;
    const db = new Database(kv, telegram, __D1_BETA__HONEYDEWSQL)
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
    HONEYDEW,
    HONEYDEWSQL: __D1_BETA__HONEYDEWSQL,
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
        expect(caller.me.get()).rejects.toThrowError();
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
        expect(caller.household.setAutoAssign(25)).rejects.toThrowError();

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
    });
});

//   const input: inferProcedureInput<AppRouter[']['add']> = {
//     text: 'hello test',
//     title: 'hello test',
//   };

//   const post = await caller.post.add(input);
//   const byId = await caller.post.byId({ id: post.id });

//   expect(byId).toMatchObject(input);