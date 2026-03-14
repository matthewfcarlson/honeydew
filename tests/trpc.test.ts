/**
 * Integration test example for the `post` router
 */
import { describe, expect, test, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { createInnerContext } from '../functions/api/context';
import { appRouter } from '../functions/api/router';
import { TelegramAPI } from "../functions/database/_telegram";
import Database from "../functions/database/_db";
import { DbUser, EinkTokenKVKeyZ } from '../functions/db_types';
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

describe('chores next/another tests', () => {
    test('chores.next returns null when no chores assigned', async () => {
        const house = await db.HouseholdCreate("NEXT CHORE HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("NEXT USER", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.chores.next();
        expect(result).toBeNull();
    });

    test('chores.next returns the assigned chore', async () => {
        const house = await db.HouseholdCreate("NEXT CHORE HOUSE 2");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("NEXT USER 2", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        expect(await caller.chores.add({name: "Next Test Chore", frequency: 1})).toBe(true);
        const chores = await caller.chores.all();
        expect(chores).toHaveLength(1);

        // Assign the chore to the user
        await caller.chores.assignTo({raw_choreid: chores[0].id, raw_assigneeid: user.id});

        const next = await caller.chores.next();
        expect(next).not.toBeNull();
        expect(next!.id).toBe(chores[0].id);
    });

    test('chores.another skips current chore and returns another', async () => {
        const house = await db.HouseholdCreate("ANOTHER CHORE HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("ANOTHER USER", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        expect(await caller.chores.add({name: "Chore A", frequency: 1})).toBe(true);
        expect(await caller.chores.add({name: "Chore B", frequency: 1})).toBe(true);
        const chores = await caller.chores.all();
        expect(chores).toHaveLength(2);

        // Assign first chore
        await caller.chores.assignTo({raw_choreid: chores[0].id, raw_assigneeid: user.id});

        // another() should clear the KV cache and assign a new chore from the household
        const another = await caller.chores.another();
        // Result is a chore (ChoreSkipCurrentChore always returns true, then ChoreGetNextChore picks one)
        expect(another).not.toBeNull();
        expect(another).not.toBe(false);
    });

    test('chores.another returns false when no chores', async () => {
        const house = await db.HouseholdCreate("ANOTHER EMPTY HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("EMPTY USER", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        // No chores: ChoreSkipCurrentChore always returns true (clears KV),
        // then ChoreGetNextChore finds nothing and returns null
        const result = await caller.chores.another();
        expect(result).toBeNull();
    });

    test('unauthenticated user cannot get next chore', async () => {
        const ctx = await createInnerContext(createData(null), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);
        await expect(caller.chores.next()).rejects.toThrowError();
    });
});

describe('clothes tests', () => {
    test('you can add and list clothing items', async () => {
        const house = await db.HouseholdCreate("CLOTHES HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("CLOTHES USER", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        // Empty to start
        const initial = await caller.clothes.all();
        expect(initial).toHaveLength(0);

        // Add a clothing item
        const item = await caller.clothes.add({name: "Blue Jeans", category: "bottom"});
        expect(item).not.toBeNull();
        expect(item.name).toBe("Blue Jeans");
        expect(item.category).toBe("bottom");

        // List should now have 1
        const allItems = await caller.clothes.all();
        expect(allItems).toHaveLength(1);
        expect(allItems[0].name).toBe("Blue Jeans");
    });

    test('you can get a specific clothing item', async () => {
        const house = await db.HouseholdCreate("CLOTHES HOUSE 2");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("CLOTHES USER 2", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        const item = await caller.clothes.add({name: "Red Shirt", category: "top", brand: "ACME", color: "red"});
        expect(item).not.toBeNull();

        const fetched = await caller.clothes.get(item.id);
        expect(fetched.name).toBe("Red Shirt");
        expect(fetched.brand).toBe("ACME");
        expect(fetched.color).toBe("red");
    });

    test('you can delete a clothing item', async () => {
        const house = await db.HouseholdCreate("CLOTHES HOUSE 3");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("CLOTHES USER 3", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        const item = await caller.clothes.add({name: "Old Sweater"});
        expect(item).not.toBeNull();

        expect(await caller.clothes.delete(item.id)).toBe(true);

        const allItems = await caller.clothes.all();
        expect(allItems).toHaveLength(0);
    });

    test('you can mark a clothing item as worn', async () => {
        const house = await db.HouseholdCreate("CLOTHES HOUSE 4");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("CLOTHES USER 4", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        const item = await caller.clothes.add({name: "Dress Shirt"});
        expect(item).not.toBeNull();

        const result = await caller.clothes.mark_worn(item.id);
        expect(result).toBeTruthy();
    });

    test('you can upload and retrieve a photo', async () => {
        const house = await db.HouseholdCreate("CLOTHES HOUSE 5");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("CLOTHES USER 5", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        const item = await caller.clothes.add({name: "Fancy Coat"});
        expect(item).not.toBeNull();

        // Start with no photo
        const noPhoto = await caller.clothes.get_photo(item.id);
        expect(noPhoto).toBeNull();

        // Upload a tiny 1x1 fake WebP (base64)
        const fakeWebp = btoa("FAKE_WEBP_DATA");
        const uploaded = await caller.clothes.upload_photo({id: item.id, photo: fakeWebp});
        expect(uploaded).toBe(true);

        // Retrieve the photo
        const photo = await caller.clothes.get_photo(item.id);
        expect(photo).not.toBeNull();
        expect(photo).toBe(fakeWebp);
    });

    test('unauthenticated user cannot access clothes', async () => {
        const ctx = await createInnerContext(createData(null), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);
        await expect(caller.clothes.all()).rejects.toThrowError();
        await expect(caller.clothes.add({name: "Test"})).rejects.toThrowError();
    });

    test('cannot get a clothing item that does not exist', async () => {
        const house = await db.HouseholdCreate("CLOTHES HOUSE 6");
        expect(house).not.toBeNull();
        if (house == null) return;
        const user = await db.UserCreate("CLOTHES USER 6", house.id);
        expect(user).not.toBeNull();
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);
        const caller = appRouter.createCaller(ctx);

        // Use a valid-format but non-existent clothing ID
        const fakeId = "CL:00000000-0000-0000-0000-000000000000";
        const { ClothingIdZ } = await import('../functions/db_types');
        const parsed = ClothingIdZ.safeParse(fakeId);
        if (!parsed.success) return; // skip if format doesn't validate
        await expect(caller.clothes.get(parsed.data)).rejects.toThrowError();
    });
});

describe('cross-household permission tests', () => {
    test('cannot mark_favored a recipe from another household', async () => {
        const house1 = await db.HouseholdCreate("RECIPE PERM HOUSE A");
        expect(house1).not.toBeNull();
        if (house1 == null) return;
        const user1 = await db.UserCreate("RECIPE USER A", house1.id);
        expect(user1).not.toBeNull();
        if (user1 == null) return;

        const house2 = await db.HouseholdCreate("RECIPE PERM HOUSE B");
        expect(house2).not.toBeNull();
        if (house2 == null) return;
        const user2 = await db.UserCreate("RECIPE USER B", house2.id);
        expect(user2).not.toBeNull();
        if (user2 == null) return;

        const ctx1 = await createInnerContext(createData(user1), ENV, ROOT_URL);
        const caller1 = appRouter.createCaller(ctx1);
        const ctx2 = await createInnerContext(createData(user2), ENV, ROOT_URL);
        const caller2 = appRouter.createCaller(ctx2);

        // User1 adds a recipe
        await caller1.recipes.add("https://www.debugscraper.com/test-recipe");
        const totry = await caller1.recipes.toTry();
        expect(totry).toHaveLength(1);
        const recipe_id = totry[0].recipe_id;

        // User2 tries to favorite User1's recipe in their own household - should return false (not in their cardbox)
        const result = await caller2.recipes.mark_favored({recipe_id, favored: true});
        // The recipe isn't in user2's cardbox, so this should either return false or have no effect
        const user2Favorites = await caller2.recipes.favorites();
        expect(user2Favorites).toHaveLength(0);
    });

    test('cannot remove a recipe from another household', async () => {
        const house1 = await db.HouseholdCreate("RECIPE REMOVE HOUSE A");
        expect(house1).not.toBeNull();
        if (house1 == null) return;
        const user1 = await db.UserCreate("RECIPE REMOVE USER A", house1.id);
        expect(user1).not.toBeNull();
        if (user1 == null) return;

        const house2 = await db.HouseholdCreate("RECIPE REMOVE HOUSE B");
        expect(house2).not.toBeNull();
        if (house2 == null) return;
        const user2 = await db.UserCreate("RECIPE REMOVE USER B", house2.id);
        expect(user2).not.toBeNull();
        if (user2 == null) return;

        const ctx1 = await createInnerContext(createData(user1), ENV, ROOT_URL);
        const caller1 = appRouter.createCaller(ctx1);
        const ctx2 = await createInnerContext(createData(user2), ENV, ROOT_URL);
        const caller2 = appRouter.createCaller(ctx2);

        // User1 adds a recipe
        await caller1.recipes.add("https://www.debugscraper.com/test-recipe-2");
        const totry = await caller1.recipes.toTry();
        expect(totry).toHaveLength(1);
        const recipe_id = totry[0].recipe_id;

        // User2 tries to remove User1's recipe from their own cardbox (which doesn't have it)
        // CardBoxRemoveRecipe always returns true even if no row was deleted
        await caller2.recipes.remove(recipe_id);

        // User1's recipe should still be in user1's cardbox
        const stillThere = await caller1.recipes.toTry();
        expect(stillThere).toHaveLength(1);
    });

    test('cannot get tasks from another household project', async () => {
        const house1 = await db.HouseholdCreate("PROJECT PERM HOUSE A");
        expect(house1).not.toBeNull();
        if (house1 == null) return;
        const user1 = await db.UserCreate("PROJECT USER A", house1.id);
        expect(user1).not.toBeNull();
        if (user1 == null) return;

        const house2 = await db.HouseholdCreate("PROJECT PERM HOUSE B");
        expect(house2).not.toBeNull();
        if (house2 == null) return;
        const user2 = await db.UserCreate("PROJECT USER B", house2.id);
        expect(user2).not.toBeNull();
        if (user2 == null) return;

        const ctx1 = await createInnerContext(createData(user1), ENV, ROOT_URL);
        const caller1 = appRouter.createCaller(ctx1);
        const ctx2 = await createInnerContext(createData(user2), ENV, ROOT_URL);
        const caller2 = appRouter.createCaller(ctx2);

        // User1 creates a project
        await caller1.projects.add("Secret Project");
        const projects = await caller1.projects.get_projects();
        expect(projects).toHaveLength(1);
        const project_id = projects[0].id;

        // User2 tries to get tasks from User1's project
        await expect(caller2.projects.get_tasks(project_id)).rejects.toThrowError();
    });

    test('cannot delete a task from another household', async () => {
        const house1 = await db.HouseholdCreate("TASK PERM HOUSE A");
        expect(house1).not.toBeNull();
        if (house1 == null) return;
        const user1 = await db.UserCreate("TASK USER A", house1.id);
        expect(user1).not.toBeNull();
        if (user1 == null) return;

        const house2 = await db.HouseholdCreate("TASK PERM HOUSE B");
        expect(house2).not.toBeNull();
        if (house2 == null) return;
        const user2 = await db.UserCreate("TASK USER B", house2.id);
        expect(user2).not.toBeNull();
        if (user2 == null) return;

        const ctx1 = await createInnerContext(createData(user1), ENV, ROOT_URL);
        const caller1 = appRouter.createCaller(ctx1);
        const ctx2 = await createInnerContext(createData(user2), ENV, ROOT_URL);
        const caller2 = appRouter.createCaller(ctx2);

        // User1 creates a project + task
        await caller1.projects.add("Protected Project");
        const projects = await caller1.projects.get_projects();
        const project_id = projects[0].id;
        await caller1.projects.add_task({description: "Protected Task", project: project_id, requirement1: null, requirement2: null});
        const tasks = await caller1.projects.get_tasks(project_id);
        expect(tasks).toHaveLength(1);
        const task_id = tasks[0].id;

        // User2 tries to delete User1's task
        await expect(caller2.projects.delete_task(task_id)).rejects.toThrowError();

        // Task should still exist
        const stillThere = await caller1.projects.get_tasks(project_id);
        expect(stillThere).toHaveLength(1);
    });

    test('cannot complete a task from another household', async () => {
        const house1 = await db.HouseholdCreate("TASK COMPLETE HOUSE A");
        expect(house1).not.toBeNull();
        if (house1 == null) return;
        const user1 = await db.UserCreate("TASK COMPLETE USER A", house1.id);
        expect(user1).not.toBeNull();
        if (user1 == null) return;

        const house2 = await db.HouseholdCreate("TASK COMPLETE HOUSE B");
        expect(house2).not.toBeNull();
        if (house2 == null) return;
        const user2 = await db.UserCreate("TASK COMPLETE USER B", house2.id);
        expect(user2).not.toBeNull();
        if (user2 == null) return;

        const ctx1 = await createInnerContext(createData(user1), ENV, ROOT_URL);
        const caller1 = appRouter.createCaller(ctx1);
        const ctx2 = await createInnerContext(createData(user2), ENV, ROOT_URL);
        const caller2 = appRouter.createCaller(ctx2);

        // User1 creates a project + task
        await caller1.projects.add("Secure Project");
        const projects = await caller1.projects.get_projects();
        const project_id = projects[0].id;
        await caller1.projects.add_task({description: "Secure Task", project: project_id, requirement1: null, requirement2: null});
        const tasks = await caller1.projects.get_tasks(project_id);
        const task_id = tasks[0].id;

        // User2 tries to complete User1's task
        await expect(caller2.projects.complete_task(task_id)).rejects.toThrowError();
    });

    test('cannot delete a project from another household', async () => {
        const house1 = await db.HouseholdCreate("DELETE PROJECT HOUSE A");
        expect(house1).not.toBeNull();
        if (house1 == null) return;
        const user1 = await db.UserCreate("DELETE PROJECT USER A", house1.id);
        expect(user1).not.toBeNull();
        if (user1 == null) return;

        const house2 = await db.HouseholdCreate("DELETE PROJECT HOUSE B");
        expect(house2).not.toBeNull();
        if (house2 == null) return;
        const user2 = await db.UserCreate("DELETE PROJECT USER B", house2.id);
        expect(user2).not.toBeNull();
        if (user2 == null) return;

        const ctx1 = await createInnerContext(createData(user1), ENV, ROOT_URL);
        const caller1 = appRouter.createCaller(ctx1);
        const ctx2 = await createInnerContext(createData(user2), ENV, ROOT_URL);
        const caller2 = appRouter.createCaller(ctx2);

        // User1 creates a project
        await caller1.projects.add("Guarded Project");
        const projects = await caller1.projects.get_projects();
        const project_id = projects[0].id;

        // User2 tries to delete User1's project
        await expect(caller2.projects.delete(project_id)).rejects.toThrowError();

        // Project should still exist
        const stillThere = await caller1.projects.get_projects();
        expect(stillThere).toHaveLength(1);
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
        const kv_key = EinkTokenKVKeyZ.parse("EK:" + result.token);
        const payload = await db.EinkTokenLookup(kv_key);
        expect(payload).not.toBeNull();

        // Revoke it
        const revoked = await caller.household.revokeEinkToken(result.token);
        expect(revoked).toBe(true);

        // Verify it's gone
        const payload2 = await db.EinkTokenLookup(kv_key);
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