import { DbProject } from "functions/db_types";
import { HandleTelegramUpdateMessage } from "../functions/api/telegram/_handler";
import { MockedTelegramAPI, MockedTelegramRequest, TelegramUpdateMessage } from "../functions/database/_telegram";
import Database from "../functions/database/_db";
const { HONEYDEW, __D1_BETA__HONEYDEWSQL } = getMiniflareBindings();

function generateTelegramResponse(data: any) {
  return new Response(JSON.stringify({
    ok: true,
    data
  }))
}

const telegram = new MockedTelegramAPI("TESTING");
const kv = HONEYDEW as KVNamespace;
const db = new Database(kv, telegram, __D1_BETA__HONEYDEWSQL)
beforeAll(async () => {
  return await db.CheckOnSQL();
});

describe('Telegram tests', () => {
  it('it should response to a users request if not registered', async () => {
    let got_message = false;
    telegram.registerListener(async (x) => {
      // I don't check for anything more fancy
      if (x.type == "POST" && x.method == "sendMessage") {
        const text = x.data.text as string;
        if (text.includes("don't recognize")) {
          got_message = true;
        }
      }
      return generateTelegramResponse(null);
    });
    // TODO: create function that handles this?
    const update1: TelegramUpdateMessage = {
      message: {
        message_id: 1,
        from: {
          id: 10,
          is_bot: false,
          first_name: "Bob"
        },
        date: 1,
        chat: {
          id: 1,
          type: "private",
        },
        text: "Hello there"
      },
      update_id: 0
    };
    expect(got_message).toBe(false);
    const result = await HandleTelegramUpdateMessage(db, update1);
    expect(result.status).toEqual(200);
    expect(got_message).toBe(true);
  });

  it('it should add a recipe', async () => {
    let got_message = false;
    telegram.registerListener(async (x) => {
      // I don't check for anything more fancy
      console.error(x);
      if (x.type == "POST" && x.method == "sendMessage") {
        got_message = true;
      }
      return generateTelegramResponse(null);
    });
    const household = await db.HouseholdGenerateUUID();
    if (household == null) return;
    const user = await db.UserCreate("Bob", household);
    if (user == null) return;
    const chat_id = 20;
    const tuser_id = 10;
    expect(await db.UserRegisterTelegram(user.id, chat_id, tuser_id)).toBe(true);
    // TODO: create function that handles this?
    const update1: TelegramUpdateMessage = {
      message: {
        message_id: 1,
        from: {
          id: tuser_id,
          is_bot: false,
          first_name: "Bob"
        },
        date: 1,
        chat: {
          id: chat_id,
          type: "private",
        },
        text: "https://www.americastestkitchen.com/recipes/15318-multicooker-chicken-in-a-pot-with-lemon-herb-sauce"
      },
      update_id: 0
    };
    const result = await HandleTelegramUpdateMessage(db, update1);
    expect(result.status).toEqual(200);
    //expect(got_message).toEqual(false);
    // TODO: Look for a recipe that got added
  });
});