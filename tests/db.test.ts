import TelegramAPI from "../functions/api/telegram/_telegram";
import Database from "../functions/_db";
const { HONEYDEW } = getMiniflareBindings();

class MockedSQL implements D1Database {
    prepare(query: string): D1PreparedStatement {
        throw new Error("Method not implemented.");
    }
    dump(): Promise<ArrayBuffer> {
        throw new Error("Method not implemented.");
    }
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
        throw new Error("Method not implemented.");
    }
    exec<T = unknown>(query: string): Promise<D1Result<T>> {
        throw new Error("Method not implemented.");
    }
}

function createDB() {
    const telegram = new TelegramAPI("TESTING");
    const kv = HONEYDEW as KVNamespace;
    const db = new Database(kv, telegram, new MockedSQL())
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