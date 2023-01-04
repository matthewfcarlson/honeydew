import { DbProject } from "functions/db_types";
import { TelegramAPI } from "../functions/database/_telegram";
import Database from "../functions/database/_db";
import { describe, expect, test } from '@jest/globals';
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

    // Reassign back to the new house
    expect(await db.UserSetHousehold(user.id, house.id)).toBe(true);

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
    let project_list = await db.ProjectsList(null, house_id);
    expect(project_list).toHaveLength(2);
    project_list = await db.ProjectsList(null, null);
    expect(project_list).toBeNull();
    project_list = await db.ProjectsList(user_id);
    expect(project_list).toHaveLength(2);

    // Act
    await db.ProjectDelete(project1.id);
    // Assert
    project_list = await db.ProjectsList(null, house_id);
    expect(project_list).toHaveLength(1);

    // Act
    await db.ProjectDelete(project2.id);
    // Assert
    project_list = await db.ProjectsList(null, house_id);
    expect(project_list).toHaveLength(0);

    // Act
    project_list = await db.ProjectsList(user_id, house_id);
    expect(project_list).toBeNull();
    project_list = await db.ProjectsList(null, null);
    expect(project_list).toBeNull();

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
    const task = await db.TaskCreate("Clean", user_id, house_id);
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
    const task = await db.TaskCreate("Clean", user_id, house_id);
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
    const task1 = await db.TaskCreate("Clean", user_id, house_id, project.id);
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
    let task = await db.TaskCreate("Clean", user_id, house_id);
    expect(task).not.toBeNull();
    if (task == null) return;
    expect(task.completed).toBe(false);

    expect(await db.TaskMarkComplete(task.id)).toBe(true)

    // Assert
    task = await db.TaskGet(task.id);
    expect(task).not.toBeNull();
    if (task == null) return;
    expect(task.completed).toBe(true);

    expect(await db.TaskMarkComplete(task.id)).toBe(true)
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
    "https://www.allrecipes.com/recipe/239047/one-pan-orecchiette-pasta/",
    //"https://www.kingarthurbaking.com/recipes/english-muffin-toasting-bread-recipe",
    //"https://www.bbcgoodfood.com/recipes/slow-cooker-spaghetti-bolognese",
    //"https://www.seriouseats.com/spicy-spring-sicilian-pizza-recipe",
    "https://www.centraltexasfoodbank.org/recipe/oven-roasted-holiday-vegetables",
    //"https://www.joshuaweissman.com/post/dominos-pizza",
  ])("can add %s as a recipe", async (url) => {
    const recipe = await db.RecipeCreateIfNotExists(url)
    expect(recipe).not.toBeNull();
    if (recipe == null) return;
    expect(await db.RecipeExists(null, url)).toBe(true);
    expect(recipe.name.length).toBeGreaterThan(5);
  });

  it("can add recipe to cardbox", async () => {
    const url = "https://www.allrecipes.com/recipe/239047/one-pan-orecchiette-pasta/";
    const recipe = await db.RecipeCreateIfNotExists(url)
    expect(recipe).not.toBeNull();
    if (recipe == null) return;
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const cardbox = await db.CardBoxAddRecipe(recipe.id, house_id);
    expect(cardbox).not.toBeNull();
  })

});