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
      const uuid = await db.generateNewUserUUID();
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
      
      const newHouse = await db.HouseholdCreate("New House");
      
      expect(newHouse).not.toBeNull();
      if (newHouse == null) return;
      expect(newHouse.id.length).toBeGreaterThan(10);
      
      // Act
      // Assert
      expect(await db.UserSetHousehold(user.id, house.id)).toBe(true); // we can set the user to the same house
      expect(await db.UserSetHousehold(user.id, newHouse.id)).toBe(true);
      const new_user = await db.GetUser(user.id);
      expect(new_user).not.toBeNull();
      if (new_user == null) return;
      expect(new_user.household).toEqual(newHouse.id);

      // Reassign back to the new house
      expect(await db.UserSetHousehold(user.id, house.id, new_user, house)).toBe(true);

    });
  });