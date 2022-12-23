import TelegramAPI from "../functions/api/telegram/_telegram";
import Database from "../functions/database/_db";
const { HONEYDEW, __D1_BETA__HONEYDEWSQL } = getMiniflareBindings();


function createDB() {
    const telegram = new TelegramAPI("TESTING");
    const kv = HONEYDEW as KVNamespace;
    const db = new Database(kv, telegram, __D1_BETA__HONEYDEWSQL)
    return db;
}

describe('Sample tests', () => {
    
    it('can create user', async () => {
        // Arrange
        const db = createDB();
        // Act
        const house = await db.HouseholdCreate("BOBY'S HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        expect(house.id.length).toBeGreaterThan(10);
        const user = await db.UserCreate("BOBY", house.id);
        // Assert
        if (user == null) return;
        expect(user.id.length).toBeGreaterThan(10);
    });
  
    it('should fail spec', () => {
      // Arrange
  
      // Act
  
      // Assert
    });
  });