import TelegramAPI from "../functions/api/telegram/_telegram";
import Database from "../functions/database/_db";
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
    const house = await db.HouseholdCreate("BOBY'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    expect(house.id.length).toBeGreaterThan(10);
    // Act
    const user = await db.UserCreate("BOBY", house.id);
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
    const house = await db.HouseholdCreate("BOBY'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    expect(house.id.length).toBeGreaterThan(10);
    const user = await db.UserCreate("BOBY", house.id);
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
    let house = await db.HouseholdCreate("BOBY'S HOUSE");
    expect(house).not.toBeNull();
    if (house == null) return;
    expect(house.id.length).toBeGreaterThan(10);
    const user1 = await db.UserCreate("BOBY", house.id);
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
    const house = await db.HouseholdCreate("BOBY'S HOUSE");
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

  it('housekeys can be generated', async() => {
    // Arrange
    const house = await db.HouseholdCreate("BOBY'S HOUSE");
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

  it('housekeys can be deleted', async() => {
    // Arrange
    const house = await db.HouseholdCreate("BOBY'S HOUSE");
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

    // Act
    const project = await db.ProjectCreate("Master Closet")
    expect(project).not.toBeNull();
    if (project == null) return;

    // Assert
    expect(await db.ProjectExists(project.id)).toBe(true);

    // Act
    await db.ProjectDelete(project.id);
    expect(await db.ProjectExists(project.id)).toBe(false);

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