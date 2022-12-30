import { DbProject } from "functions/db_types";
import TelegramAPI from "../functions/database/_telegram";
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

describe('Telegram tests', () => {
    it('should not find a house', async () => {
        
    });
});