import { describe, expect, test, it, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { TelegramAPI } from "../functions/database/_telegram";
import Database from "../functions/database/_db";
import { getJulianDate } from "../functions/_utils";
import { HouseId } from "functions/db_types";

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

describe('User tests', () => {
  it('can create user', async () => {
    // Arrange
    const house = await db.HouseholdCreate("BOB'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    expect(house.id.length).toBeGreaterThan(10);
    // Act
    const user = await db.UserCreate("BOBBY", house.id);
    // Assert
    if (user == null) return;
    expect(user.id.length).toBeGreaterThan(10);

    expect(await db.UserExists(user.id)).toBeTruthy();

  });

  it('can create magic link', async () => {
    // Arrange
    const house = await db.HouseholdCreate("BOB'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    expect(house.id.length).toBeGreaterThan(10);
    // Act
    const user = await db.UserCreate("BOBBY", house.id);
    // Assert
    if (user == null) return;

    const key = await db.UserMagicKeyCreate(user.id);
    expect(key).not.toBeNull();
    if (key == null) return;

    expect(await db.UserMagicKeyExists(key)).toBe(true);

    const result = await db.UserMagicKeyLookup(key);
    expect(result.user).not.toBeNull();
    expect(result.error).toBeNull();
    if (result.user == null) return;

    expect(result.user.id).toBe(user.id);

    // Magic links should NOT be consumed - they stay valid for their full TTL
    expect(await db.UserMagicKeyExists(key)).toBe(true);

    // Looking up again should still work
    const result2 = await db.UserMagicKeyLookup(key);
    expect(result2.user).not.toBeNull();
    expect(result2.error).toBeNull();

  });

  it('should not find a user', async () => {
    // Arrange
    const uuid = await db.UserGenerateUUID();
    expect(uuid).not.toBeNull();
    if (uuid == null) return;

    // Act
    // Assert
    expect(await db.UserExists(uuid)).toBe(false);
  });

  it('it should be able to move a user to a different household', async () => {
    // Arrange
    const house = await db.HouseholdCreate("BOB'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    expect(house.id.length).toBeGreaterThan(10);
    const user = await db.UserCreate("BOBBY", house.id);
    expect(user).not.toBeNull();
    if (user == null) return;
    expect(user.id.length).toBeGreaterThan(10);

    let newHouse = await db.HouseholdCreate("New House");
    expect(newHouse).not.toBeNull();
    if (newHouse == null) return;
    expect(newHouse.members).toHaveLength(0);

    // Act
    // Assert
    expect(await db.UserSetHousehold(user.id, house.id)).toBe(true); // we can set the user to the same house
    expect(await db.UserSetHousehold(user.id, newHouse.id)).toBe(true);
    const new_user = await db.UserGet(user.id);
    expect(new_user).not.toBeNull();
    if (new_user == null) return;
    expect(new_user.household).toEqual(newHouse.id);
    newHouse = await db.HouseholdGet(newHouse.id);
    expect(newHouse).not.toBeNull();
    if (newHouse == null) return;
    expect(newHouse.members).toHaveLength(1);

    const extendedHouse = await db.HouseholdGetExtended(newHouse.id);
    expect(extendedHouse).not.toBeNull();
    if (extendedHouse == null) return;
    expect(extendedHouse.members).toHaveLength(1);

    // Reassign back to the new house
    expect(await db.UserSetHousehold(user.id, house.id)).toBe(true);

    newHouse = await db.HouseholdGet(newHouse.id);
    expect(newHouse).not.toBeNull();
    if (newHouse == null) return;
    expect(newHouse.members).toHaveLength(0);

  });

  it('it should be able to join the same household', async () => {
    // Arrange
    let house = await db.HouseholdCreate("BOB'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    expect(house.id.length).toBeGreaterThan(10);
    const user1 = await db.UserCreate("BOBBY", house.id);
    expect(user1).not.toBeNull();
    if (user1 == null) return;
    expect(user1.id.length).toBeGreaterThan(10);

    const user2 = await db.UserCreate("JOEY", house.id);
    expect(user2).not.toBeNull();
    if (user2 == null) return;
    expect(user2.id.length).toBeGreaterThan(10);
    expect(user2.id).not.toEqual(user1.id);

    // Act
    house = await db.HouseholdGet(house.id);
    expect(house).not.toBeNull();
    if (house == null) return;
    // Assert
    expect(house.members).toHaveLength(2);
    expect(house.members).toContain(user1.id);
    expect(house.members).toContain(user2.id);

  });

  it('UUIDs should be unique', async () => {
    // Arrange
    const uuids: string[] = [];
    const uuid_count = 5;
    for (let i = 0; i < uuid_count; i++) {
      uuids.push(await db.UserGenerateUUID() || "");
    }

    // Act
    // Assert
    for (let i = 0; i < uuid_count; i++) {
      for (let j = i + 1; j < uuid_count; j++) {
        expect(i).not.toEqual(j);
        expect(uuids[i]).not.toEqual(uuids[j]);
        expect(uuids[i]).not.toEqual("");
      }
    }
  });
});

describe('Household tests', () => {
  it('can create house', async () => {
    // Arrange
    const house = await db.HouseholdCreate("BOBBY'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    expect(house.id.length).toBeGreaterThan(10);
  });

  it('should not find a house', async () => {
    // Arrange
    const uuid = await db.HouseholdGenerateUUID();
    expect(uuid).not.toBeNull();
    if (uuid == null) return;

    // Act
    // Assert
    expect(await db.HouseholdExists(uuid)).toBe(false);
  });


  it('UUIDs should be unique', async () => {
    // Arrange
    const uuids: string[] = [];
    const uuid_count = 5;
    for (let i = 0; i < uuid_count; i++) {
      uuids.push(await db.HouseholdGenerateUUID() || "");
    }

    // Act
    // Assert
    for (let i = 0; i < uuid_count; i++) {
      for (let j = i + 1; j < uuid_count; j++) {
        expect(i).not.toEqual(j);
        expect(uuids[i]).not.toEqual(uuids[j]);
        expect(uuids[i]).not.toEqual("");
      }
    }
  });

  it('house keys can be generated', async () => {
    // Arrange
    const house = await db.HouseholdCreate("BOBBY'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    const user_id = await db.UserGenerateUUID();
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // Act
    const key = await db.HouseKeyCreate(house.id, user_id);
    expect(key).not.toBeNull();
    if (key == null) return;
    expect(key.house).toBe(house.id);
    expect(key.generated_by).toBe(user_id);

    // Assert
    const new_key = await db.HouseKeyGet(key.id);
    expect(new_key).not.toBeNull();
    if (new_key == null) return;
    expect(key.id).toBe(new_key.id);
    expect(key.house).toBe(new_key.house);
    expect(key.generated_by).toBe(new_key.generated_by);
  });

  it('house keys can be deleted', async () => {
    // Arrange
    const house = await db.HouseholdCreate("BOBBY'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    const user_id = await db.UserGenerateUUID();
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // Act
    const key = await db.HouseKeyCreate(house.id, user_id);
    expect(key).not.toBeNull();
    if (key == null) return;

    // Assert
    expect(await db.HouseKeyExists(key.id)).toBe(true);
    await db.HouseKeyDelete(key.id);
    expect(await db.HouseKeyExists(key.id)).toBe(false);
  });
});

describe('House auto assign tests', () => {
  it('can create schedule', async () => {
    // Arrange
    const house = await db.HouseholdCreate("BOBBY'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    const hour = 2;

    // Create the auto assignment
    expect(await db.HouseAutoAssignExists(house.id)).toBe(false);
    expect(await db.HouseAutoAssignSetTime(house.id, hour)).toBe(true);
    expect(await db.HouseAutoAssignExists(house.id)).toBe(true);
    expect(await db.HouseAutoAssignGetHour(house.id)).toBe(hour);
    // then check to make sure it is ready
    {
      expect((await db.HouseAutoAssignGetHousesReadyForGivenHour(hour + 1))).toHaveLength(0)
      const houses = await db.HouseAutoAssignGetHousesReadyForGivenHour(hour);
      expect(houses).toHaveLength(1);
      expect(houses[0]).toBe(house.id);
    }
    // mark the house as scheduled
    await db.HouseAutoAssignMarkComplete(house.id);
    {
      const houses = await db.HouseAutoAssignGetHousesReadyForGivenHour(hour);
      expect(houses).toHaveLength(0);
    }


  });
  it('can set expecting', async () => {
    // Arrange
    const house = await db.HouseholdCreate("BOBBY'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    const hour = 2;

    // Create the auto assignment
    expect(await db.HouseExpectingSetDate(house.id,"")).toBe(true);
    expect(await db.HouseExpectingSetDate(house.id,"2023/05/03")).toBe(false);
    expect(await db.HouseExpectingSetDate(house.id,"2023-05-03")).toBe(true);

    const house2 = await db.HouseholdGet(house.id);
    expect(house2?.expecting).toBe("2023-05-03");

    // Mark it as messaged to see if it that makes sense
    expect(await db.HouseExpectingHasBeenMessaged(house.id)).toBe(false);
    expect(await db.HouseExpectingMarkMessaged(house.id)).toBe(true);
    expect(await db.HouseExpectingHasBeenMessaged(house.id)).toBe(true);

  });
});

describe('Project tests', () => {
  it('can create and delete project', async () => {
    // Arrange
    const user_id = await db.UserGenerateUUID();
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    // Act
    const project = await db.ProjectCreate("Master Closet", house_id)
    expect(project).not.toBeNull();
    if (project == null) return;

    // Assert
    expect(await db.ProjectExists(project.id)).toBe(true);

    // Act
    const project2 = await db.ProjectGet(project.id);
    expect(project2).not.toBeNull();
    if (project2 == null) return;

    // Assert
    expect(project).toStrictEqual(project2);

    // Act
    await db.ProjectDelete(project.id);
    expect(await db.ProjectExists(project.id)).toBe(false);

  });

  it('can list projects', async () => {
    // Arrange
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // Act - add two projects
    const project1 = await db.ProjectCreate("Master Closet", house_id);
    expect(project1).not.toBeNull();
    if (project1 == null) return;
    const project2 = await db.ProjectCreate("Kitchen", house_id);
    expect(project2).not.toBeNull();
    if (project2 == null) return;
    // Assert
    let project_list = await db.ProjectsList(house_id);
    expect(project_list).toHaveLength(2);
    project_list = await db.ProjectsList("" as HouseId);
    expect(project_list).toBeNull();

    // Act
    await db.ProjectDelete(project1.id);
    // Assert
    project_list = await db.ProjectsList(house_id);
    expect(project_list).toHaveLength(1);

    // Act
    await db.ProjectDelete(project2.id);
    // Assert
    project_list = await db.ProjectsList(house_id);
    expect(project_list).toHaveLength(0);
  });

  it('can list projects with tasks', async () => {
    // Arrange
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // Act - add a project and two tasks
    const project1 = await db.ProjectCreate("Master Closet", house_id);
    expect(project1).not.toBeNull();
    if (project1 == null) return;

    let project_list = await db.ProjectsListAugmented(house_id);
    expect(project_list).toHaveLength(1);
    if (project_list == null) return;
    expect(project_list[0].total_subtasks).toBe(0);

    const task1 = await db.TaskCreate("closet tape", user_id, house_id, project1.id);
    expect(task1).not.toBeNull();
    if (task1 == null) return;

    const task2 = await db.TaskCreate("closet paint", user_id, house_id, project1.id, task1.id);
    expect(task2).not.toBeNull(); // this task should be blocked
    if (task2 == null) return;

    const task3 = await db.TaskCreate("earlier work", user_id, house_id, project1.id);
    expect(task3).not.toBeNull();
    if (task3 == null) return;
    expect(await db.TaskMarkComplete(task3.id, user_id)).toBe(true);

    const task4 = await db.TaskCreate("later work", user_id, house_id, project1.id, task3.id);
    expect(task4).not.toBeNull();
    if (task3 == null) return;

    // Assert
    project_list = await db.ProjectsListAugmented(house_id);
    expect(project_list).toHaveLength(1);
    if (project_list == null) return;
    expect(project_list[0].total_subtasks).toBe(4);
    expect(project_list[0].ready_subtasks).toBe(2);
    expect(project_list[0].done_subtasks).toBe(1);

    const task_list = await db.TaskGetAll(project1.id);
    expect(task_list).toHaveLength(4);
  });

  it('UUIDs should be unique', async () => {
    // Arrange
    const uuids: string[] = [];
    const uuid_count = 5;
    for (let i = 0; i < uuid_count; i++) {
      const uuid = await db.ProjectGenerateUUID();
      expect(uuid).not.toBeNull();
      uuids.push(uuid || "");
    }

    // Act
    // Assert
    for (let i = 0; i < uuid_count; i++) {
      for (let j = i + 1; j < uuid_count; j++) {
        expect(i).not.toEqual(j);
        expect(uuids[i]).not.toEqual(uuids[j]);
        expect(uuids[i]).not.toEqual("");
      }
    }
  });
});

describe('Task tests', () => {
  it('can create and delete tasks', async () => {
    // Arrange
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // Act
    const task = await db.TaskCreate("starter task", user_id, house_id, null);
    expect(task).not.toBeNull();
    if (task == null) return;

    // Assert
    expect(await db.TaskExists(task.id)).toBe(true);

    // Act
    const task2 = await db.TaskGet(task.id);
    expect(task2).not.toBeNull();
    if (task2 == null) return;

    // Assert
    expect(task.id).toBe(task2.id);
    expect(task.added_by).toBe(task2.added_by);

    // Act
    await db.TaskDelete(task.id);
    expect(await db.TaskExists(task.id)).toBe(false);

  });

  it('can create and delete tasks', async () => {
    // Arrange
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // Act
    const task = await db.TaskCreate("generic task", user_id, house_id, null);
    expect(task).not.toBeNull();
    if (task == null) return;
  });

  it('tasks are part of projects', async () => {
    // Arrange
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    const project = await db.ProjectCreate("Master Closet", house_id)
    expect(project).not.toBeNull();
    if (project == null) return;

    // Act
    const task = await db.TaskCreate("Clean", user_id, house_id, project.id);
    expect(task).not.toBeNull();
    if (task == null) return;
  });

  it('tasks can have requirements', async () => {
    // Arrange
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    const project = await db.ProjectCreate("Master Closet", house_id)
    expect(project).not.toBeNull();
    if (project == null) return;

    // Act
    const task1 = await db.TaskCreate("Wash", user_id, house_id, project.id);
    expect(task1).not.toBeNull();
    if (task1 == null) return;

    const task2 = await db.TaskCreate("Dust", user_id, house_id, project.id);
    expect(task2).not.toBeNull();
    if (task2 == null) return;

    const task3_1_2 = await db.TaskCreate("Paint", user_id, house_id, project.id, task1.id, task2.id);
    expect(task3_1_2).not.toBeNull();
    if (task3_1_2 == null) return;
    expect(task3_1_2.requirement1).toBe(task1.id);
    expect(task3_1_2.requirement2).toBe(task2.id);

    // you can't have requirements without a project
    const task4_1_2 = await db.TaskCreate("Paint", user_id, house_id, null, task1.id, task2.id);
    expect(task4_1_2).toBeNull();

    const task5_2 = await db.TaskCreate("Paint", user_id, house_id, project.id, null, task2.id);
    expect(task5_2).toBeNull();
  });

  it('can complete a task', async () => {
    // Arrange
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // Act
    let task = await db.TaskCreate("Scrub", user_id, house_id, null);
    expect(task).not.toBeNull();
    if (task == null) return;
    expect(task.completed).toBe(null);

    const timestamp = getJulianDate();
    expect(await db.TaskMarkComplete(task.id, user_id)).toBe(true)

    // Assert
    task = await db.TaskGet(task.id);
    expect(task).not.toBeNull();
    if (task == null) return;
    expect(task.completed).toBeGreaterThanOrEqual(timestamp);
  });

  it('can assign a task', async () => {
    // Arrange
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // Create two projects
    const project = await db.ProjectCreate("Master Closet", house_id)
    expect(project).not.toBeNull();
    if (project == null) return;
    const project2 = await db.ProjectCreate("Master Bathroom", house_id)
    expect(project2).not.toBeNull();
    if (project2 == null) return;

    // Create a task
    const task = await db.TaskCreate("Clean", user_id, house_id, project.id);
    expect(task).not.toBeNull();
    if (task == null) return;
    const task2 = await db.TaskCreate("Tidy", user_id, house_id, project.id, task.id);
    expect(task2).not.toBeNull();
    if (task2 == null) return;
    const task3 = await db.TaskCreate("AlreadyDone", user_id, house_id, project.id, task.id);
    expect(task3).not.toBeNull();
    if (task3 == null) return;
    await db.TaskMarkComplete(task3.id, user_id);

    // Now assign a task to the household
    expect(await db.TaskAutoAssignNextTask(house_id)).toBe(true);
    const selected_task = await db.TaskAutoAssignGet(house_id);
    expect(selected_task).not.toBeNull();
    if (selected_task == null) return;
    expect(selected_task.id).toBe(task.id);
  });

  it('UUIDs should be unique', async () => {
    // Arrange
    const uuids: string[] = [];
    const uuid_count = 5;
    for (let i = 0; i < uuid_count; i++) {
      const uuid = await db.TaskGenerateUUID();
      expect(uuid).not.toBeNull();
      uuids.push(uuid || "");
    }

    // Act
    // Assert
    for (let i = 0; i < uuid_count; i++) {
      for (let j = i + 1; j < uuid_count; j++) {
        expect(i).not.toEqual(j);
        expect(uuids[i]).not.toEqual(uuids[j]);
        expect(uuids[i]).not.toEqual("");
      }
    }
  });
});

describe('Recipe tests', () => {
  test.each([
    "https://www.debugscraper.com/arrayed-recipe"
    // Enable these recipes as needed to test things but they're expensive in terms of time
    //"https://www.allrecipes.com/recipe/239047/one-pan-orecchiette-pasta/",
    // "https://www.kingarthurbaking.com/recipes/english-muffin-toasting-bread-recipe",
    // "https://www.bbcgoodfood.com/recipes/slow-cooker-spaghetti-bolognese",
    // "https://www.seriouseats.com/spicy-spring-sicilian-pizza-recipe",
    // "https://www.centraltexasfoodbank.org/recipe/oven-roasted-holiday-vegetables",
    //"https://www.joshuaweissman.com/post/the-healthiest-cashew-chicken-in-15-minutes",
    //"https://www.americastestkitchen.com/cookscountry/recipes/10822-slow-cooker-chicken-tikka-masala",
    //"https://www.everyplate.com/recipes/creamy-dijon-chicken-639747695018ecdf720575c1",
    //"https://www.budgetbytes.com/pasta-e-fagioli/",
  ])("can add %s as a recipe", async (url) => {
    const recipe = await db.RecipeCreateIfNotExists(url)
    expect(recipe).not.toBeNull();
    if (recipe == null) return;
    expect(recipe.name.length).toBeGreaterThan(5);
    expect(recipe.totalTime).toBeGreaterThan(0);
    expect(recipe.url).toBe(url);

    expect(await db.RecipeExists(null, url)).toBe(true);
  });

  it("can add recipe to cardbox", async () => {
    const url = "https://www.debugscraper.com/test-recipe";
    const recipe = await db.RecipeCreateIfNotExists(url)
    expect(recipe).not.toBeNull();
    if (recipe == null) return;
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const cardbox = await db.CardBoxAddRecipe(recipe.id, house_id);
    expect(cardbox).not.toBeNull();

    let yes_favorites = await db.CardBoxGetFavorites(house_id, true);
    let not_favorites = await db.CardBoxGetFavorites(house_id, false);
    expect(not_favorites).not.toBeNull();
    expect(yes_favorites).not.toBeNull();
    expect(not_favorites).toHaveLength(1);
    expect(yes_favorites).toHaveLength(0);
    expect(not_favorites[0].favorite).toBe(0);

    // Set the recipe as a favorite
    expect(await db.CardBoxSetFavorite(recipe.id, house_id, true)).toBe(true);
    expect(await db.CardBoxSetMealPrep(recipe.id, house_id, true)).toBe(true);

    // Make sure we have a favorites recipe and
    yes_favorites = await db.CardBoxGetFavorites(house_id, true);
    not_favorites = await db.CardBoxGetFavorites(house_id, false);
    expect(yes_favorites).not.toBeNull();
    expect(yes_favorites).toHaveLength(1);
    expect(yes_favorites[0].favorite).toBe(1);
    expect(not_favorites).not.toBeNull();
    expect(not_favorites).toHaveLength(0);
  })
});

describe('Chore tests', () => {
  it("can add chores to household", async () => {
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    const chore = await db.ChoreCreate("sweeping", house_id, 5);
    expect(chore).not.toBeNull();

    expect((await db.ChoreComplete(chore!.id, user_id)).success).toBe(true);

    const chore2 = await db.ChoreGet(chore!.id);
    expect(chore2).not.toBeNull();
    expect(chore2!.lastDone).not.toEqual(0);
  });

  it("can get assigned Chore", async () => {
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;
    {
      const chore = await db.ChoreCreate("sweeping", house_id, 5, 10);
      expect(chore).not.toBeNull();

      const chore_select_1 = await db.ChorePickNextChore(house_id, user_id);
      expect(chore_select_1).not.toBeNull();

      expect((await db.ChoreComplete(chore!.id, user_id)).success).toBe(true);

      const chore_select_2 = await db.ChorePickNextChore(house_id, user_id);
      expect(chore_select_2).toBeNull();

      const chore2 = await db.ChoreGet(chore!.id);
      expect(chore2).not.toBeNull();
      expect(chore2!.lastDone).not.toEqual(0);
      expect(chore2!.lastDone).not.toEqual(chore?.lastDone);
      // Verify lastDoneBy is set to the user who completed it
      expect(chore2!.lastDoneBy).toBe(user_id);

      expect((await db.ChoreGetAll(house_id)).length).toBe(1);
    }
    {
      const chore5 = await db.ChoreCreate("sweeping_5", house_id, 5, 10);
      const chore2 = await db.ChoreCreate("sweeping_2", house_id, 2, 10);
      const chore1 = await db.ChoreCreate("sweeping_2", house_id, 1, 10);
      if (chore1 == null || chore2 == null || chore5 == null) return;
      expect((await db.ChoreGetAll(house_id)).length).toBe(4);

      const chore_select_1 = await db.ChoreGetNextChore(house_id, user_id, null);
      expect(chore_select_1).not.toBeNull();
      if (chore_select_1 == null) return;
      expect(chore_select_1.id).toBe(chore1.id);

      expect((await db.ChoreComplete(chore1.id, user_id)).success).toBe(true);

      // Since we cached this chore, it should keep track of our chore
      {
        const chore_select_2 = await db.ChoreGetNextChore(house_id, user_id, null);
        expect(chore_select_2).not.toBeNull();
        if (chore_select_2 == null) return;
        expect(chore_select_2.id).toBe(chore1.id);
      }

      // Now get rid of the cached one
      expect(await db.ChoreSkipCurrentChore(user_id)).toBe(true);
      // make sure that it's not
      {
        const chore_select_2 = await db.ChoreGetCurrentChore(user_id);
        expect(chore_select_2).toBeNull();
      }
      // Now get another chore
      {
        const chore_select_3 = await db.ChoreGetNextChore(house_id, user_id, null);
        expect(chore_select_3).not.toBeNull();
        if (chore_select_3 == null) return;
        expect(chore_select_3.id).toBe(chore2.id);
      }
      // Now get rid of the cached one
      expect(await db.ChoreSkipCurrentChore(user_id)).toBe(true);
      // Now get another chore
      {
        const chore_select_3 = await db.ChoreGetNextChore(house_id, user_id, null);
        expect(chore_select_3).not.toBeNull();
        if (chore_select_3 == null) return;
        expect(chore_select_3.id).toBe(chore5.id);
      }
      // Now get rid of the cached one
      expect(await db.ChoreSkipCurrentChore(user_id)).toBe(true);
      // We shouldn't be able to get another chore since they've all been assigned recently
      {
        const chore_select_3 = await db.ChoreGetNextChore(house_id, user_id, null);
        expect(chore_select_3).toBeNull();
      }
    }
  });

  it("chores shouldn't be assigned back to back", async () => {
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;
    {
      const last_assigned = getJulianDate() - 1;
      const all_chores = await Promise.all([
        db.ChoreCreate("last assigned sweeping", house_id, 5, 6, null, last_assigned),
        db.ChoreCreate("last assigned dusting", house_id, 5, 6, null, last_assigned - 1),
        db.ChoreCreate("last assigned painting", house_id, 5, 6, null, last_assigned + 0.8)
      ])
      const chore1 = all_chores[0];
      const chore2 = all_chores[1];
      expect(chore1).not.toBeNull();
      expect(chore2).not.toBeNull();

      const chore_select_1 = await db.ChorePickNextChore(house_id, user_id);
      expect(chore_select_1).not.toBeNull();
      expect(chore_select_1?.id).toBe(chore2?.id);
    }
  });

  it("lastDoneBy tracks who completed the chore", async () => {
    const house_id = (await db.HouseholdCreate("Test house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const alice_id = (await db.UserCreate("Alice", house_id))?.id;
    const bob_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(alice_id).not.toBeNull();
    expect(bob_id).not.toBeNull();
    if (alice_id == null || bob_id == null) return;

    // Create a chore - lastDoneBy should be null initially
    const chore = await db.ChoreCreate("dishes", house_id, 1, 5);
    expect(chore).not.toBeNull();
    if (chore == null) return;
    expect(chore.lastDoneBy).toBeNull();

    // Alice completes the chore
    expect((await db.ChoreComplete(chore.id, alice_id)).success).toBe(true);
    const chore_after_alice = await db.ChoreGet(chore.id);
    expect(chore_after_alice).not.toBeNull();
    expect(chore_after_alice!.lastDoneBy).toBe(alice_id);

    // Bob completes the chore - lastDoneBy should update to Bob
    expect((await db.ChoreComplete(chore.id, bob_id)).success).toBe(true);
    const chore_after_bob = await db.ChoreGet(chore.id);
    expect(chore_after_bob).not.toBeNull();
    expect(chore_after_bob!.lastDoneBy).toBe(bob_id);
  });

});

describe('Clothing tests', () => {
  it('can create and manage clothing items', async () => {
    const house_id = (await db.HouseholdCreate("Clothing house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // Create a clothing item
    const shirt = await db.ClothingCreate("Blue Polo", house_id, user_id, {
      category: "Tops",
      subcategory: "Polo",
      color: "Blue",
      brand: "Ralph Lauren",
      max_wears: 3,
    });
    expect(shirt).not.toBeNull();
    if (shirt == null) return;
    expect(shirt.is_clean).toBe(1);
    expect(shirt.max_wears).toBe(3);
    expect(shirt.wears_since_wash).toBe(0);
    expect(shirt.wear_count).toBe(0);

    // Get the item
    const fetched = await db.ClothingGet(shirt.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("Blue Polo");

    // Get all items for the household
    const all = await db.ClothingGetAll(house_id);
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some(c => c.id === shirt.id)).toBe(true);

    // Delete the item
    expect(await db.ClothingDelete(shirt.id)).toBe(true);
    expect(await db.ClothingExists(shirt.id)).toBe(false);
  });

  it('wear tracking respects max_wears', async () => {
    const house_id = (await db.HouseholdCreate("Wear house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // Create an item that can be worn 3 times before washing
    const jeans = await db.ClothingCreate("Dark Jeans", house_id, user_id, {
      category: "Bottoms",
      subcategory: "Jeans",
      color: "Dark Blue",
      max_wears: 3,
    });
    expect(jeans).not.toBeNull();
    if (jeans == null) return;

    // Wear 1: should still be clean
    expect(await db.ClothingMarkWorn(jeans.id)).toBe(true);
    let item = await db.ClothingGet(jeans.id);
    expect(item).not.toBeNull();
    expect(item!.wear_count).toBe(1);
    expect(item!.wears_since_wash).toBe(1);
    expect(item!.is_clean).toBe(1);

    // Wear 2: should still be clean
    expect(await db.ClothingMarkWorn(jeans.id)).toBe(true);
    item = await db.ClothingGet(jeans.id);
    expect(item!.wear_count).toBe(2);
    expect(item!.wears_since_wash).toBe(2);
    expect(item!.is_clean).toBe(1);

    // Wear 3: should now be dirty (3 >= max_wears of 3)
    expect(await db.ClothingMarkWorn(jeans.id)).toBe(true);
    item = await db.ClothingGet(jeans.id);
    expect(item!.wear_count).toBe(3);
    expect(item!.wears_since_wash).toBe(3);
    expect(item!.is_clean).toBe(0);

    // Mark clean: wears_since_wash should reset
    expect(await db.ClothingMarkClean(jeans.id)).toBe(true);
    item = await db.ClothingGet(jeans.id);
    expect(item!.wear_count).toBe(3); // lifetime count stays
    expect(item!.wears_since_wash).toBe(0);
    expect(item!.is_clean).toBe(1);
  });

  it('single-wear items become dirty immediately', async () => {
    const house_id = (await db.HouseholdCreate("Single wear house"))?.id;
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    if (user_id == null) return;

    // default max_wears is 1
    const tshirt = await db.ClothingCreate("White Tee", house_id, user_id, {
      category: "Tops",
      subcategory: "T-Shirt",
    });
    expect(tshirt).not.toBeNull();
    if (tshirt == null) return;
    expect(tshirt.max_wears).toBe(1);

    // One wear should make it dirty
    expect(await db.ClothingMarkWorn(tshirt.id)).toBe(true);
    const item = await db.ClothingGet(tshirt.id);
    expect(item!.is_clean).toBe(0);
    expect(item!.wears_since_wash).toBe(1);
  });

  it('mark all clean resets entire household', async () => {
    const house_id = (await db.HouseholdCreate("Laundry house"))?.id;
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    if (user_id == null) return;

    // Create some items and make them dirty
    const shirt = await db.ClothingCreate("Shirt", house_id, user_id, { category: "Tops", subcategory: "Shirt" });
    const pants = await db.ClothingCreate("Pants", house_id, user_id, { category: "Bottoms", subcategory: "Pants" });
    expect(shirt).not.toBeNull();
    expect(pants).not.toBeNull();
    if (shirt == null || pants == null) return;

    await db.ClothingMarkDirty(shirt.id);
    await db.ClothingMarkDirty(pants.id);

    // Verify they're dirty
    let s = await db.ClothingGet(shirt.id);
    let p = await db.ClothingGet(pants.id);
    expect(s!.is_clean).toBe(0);
    expect(p!.is_clean).toBe(0);

    // Mark all clean (laundry done)
    expect(await db.ClothingMarkAllClean(house_id)).toBe(true);

    s = await db.ClothingGet(shirt.id);
    p = await db.ClothingGet(pants.id);
    expect(s!.is_clean).toBe(1);
    expect(s!.wears_since_wash).toBe(0);
    expect(p!.is_clean).toBe(1);
    expect(p!.wears_since_wash).toBe(0);
  });
});

describe('Telegram callback tests', () => {
  it('can create and consume callback', async () => {
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;
    const id = await db.TelegramCallbackCreate({
      user_id,
      type: "ANOTHER_CHORE"
    });
    expect(id).not.toBeNull();
    if (id == null) return;

    expect(await db.TelegramCallbackExists(id)).toBe(true);

    const payload = await db.TelegramCallbackConsume(id);
    expect(payload).not.toBeNull();
    if (payload == null) return;
    expect(payload.user_id).toBe(user_id);

    expect(await db.TelegramCallbackExists(id)).toBe(false);

  });
});