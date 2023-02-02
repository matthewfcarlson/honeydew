import { DbProject } from "functions/db_types";
import { HandleTelegramUpdate } from "../functions/telegram/webhook"
import { MockedTelegramAPI, MockedTelegramRequest, TelegramCallbackQuery, TelegramUpdate, TelegramUpdateMessage } from "../functions/database/_telegram";
import Database from "../functions/database/_db";
import { getJulianDate } from "../functions/_utils";
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
    const result = await HandleTelegramUpdate(db, update1);
    expect(result.status).toEqual(200);
    expect(got_message).toBe(true);
  });

  it('it should add a recipe', async () => {
    let got_message = false;
    telegram.registerListener(async (x) => {
      // I don't check for anything more fancy
      //console.error(x);
      if (x.type == "POST" && x.method == "sendMessage") {
        const text = x.data.text as string;
        if (text.includes("recipe")) {
          got_message = true;
        }
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
    const url = "https://www.debugscraper.com/telegram-recipe"
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
        text: url
      },
      update_id: 0
    };
    const result = await HandleTelegramUpdate(db, update1);
    expect(result.status).toEqual(200);
    // Look for a recipe that got added
    expect(await db.RecipeExists(null, url)).toBe(true);
  });

  it('message should come when we get a new task', async () => {
    let got_message = false;
    telegram.registerListener(async (x) => {
      // I don't check for anything more fancy
      //console.error(x);
      if (x.type == "POST" && x.method == "sendMessage") {
        const text = x.data.text as string;
        if (text.includes("chore")) {
          got_message = true;
        }
      }
      return generateTelegramResponse(null);
    });
    const household = await db.HouseholdCreate("Temp housing");
    if (household == null) return;
    const user = await db.UserCreate("Bob", household.id);
    if (user == null) return;
    const chat_id = 420;
    const tuser_id = 69;
    expect(await db.UserRegisterTelegram(user.id, chat_id, tuser_id)).toBe(true);

    // Now create a chore
    expect(got_message).toBe(false);
    await db.ChoreCreate("Break your bones", household.id, 1, 10);
    await db.ChoreGetNextChore(household.id, user.id, tuser_id);

    expect(got_message).toBe(true);
  });

  it('can send message to whole household', async () => {
    let message_count = 0;
    telegram.registerListener(async (x) => {
      // I don't check for anything more fancy
      //console.error(x);
      if (x.type == "POST" && x.method == "sendMessage") {
        const text = x.data.text as string;
        if (text.includes("TESTING")) {
          message_count += 1;
        }
      }
      return generateTelegramResponse(null);
    });
    const household = await db.HouseholdCreate("Temp housing");
    if (household == null) return;

    const user = await db.UserCreate("Bob", household.id);
    if (user == null) return;
    const chat_id = 420;
    const tuser_id = 69;
    expect(await db.UserRegisterTelegram(user.id, chat_id, tuser_id)).toBe(true);

    const user2 = await db.UserCreate("Joe", household.id);
    if (user2 == null) return;
    const chat2_id = 204;
    const tuser2_id = 96;
    expect(await db.UserRegisterTelegram(user2.id, chat2_id, tuser2_id)).toBe(true);

    // Now create a chore
    expect(message_count).toBe(0);
    expect(await db.HouseholdTelegramMessageAllMembers(household.id, "TESTING", false)).toBe(true);
    expect(message_count).toBe(2);
    expect(await db.HouseholdTelegramMessageAllMembers(household.id, "TESTING", false, user2.id)).toBe(true);
    expect(message_count).toBe(3);
  });
});


describe('Telegram callback tests', () => {
  it('can handle a chore callback', async () => {
    let removed_markup = false;
    telegram.registerListener(async (x) => {
      // I don't check for anything more fancy
      console.error("chore callback", x);
      if (x.type == "POST" && x.method == "editMessageReplyMarkup") {
        removed_markup = true;
      }
      return generateTelegramResponse(null);
    });
    // register a user and household
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // register for telegram
    const timestamp = getJulianDate();
    const chat_id = 1321321;
    const tuser_id = 12312312;
    expect(await db.UserRegisterTelegram(user_id, chat_id, tuser_id)).toBe(true);

    // create the chore
    const chore = await db.ChoreCreate("Do the thing", house_id, 1, 10);
    expect(chore).not.toBeNull();
    if (chore == null) return;

    // Create a callback to do the chore
    const callback = await db.TelegramCallbackCreate({
      user_id,
      type: "COMPLETE_CHORE",
      chore_id: chore.id
    });
    expect(callback).not.toBeNull();
    if (callback == null) return;


    // Now send a callback query
    const query: TelegramCallbackQuery = {
      id: "just a generic id string",
      message: {
        message_id: 12345,
        chat: {
          id:chat_id,
          type:"private"
        },
        date: timestamp,
      },
      from: {
        id: tuser_id,
        is_bot: false,
        first_name: "Bob"
      },
      chat_instance: "the chat instance",
      data: callback,
    };
    const update1: TelegramUpdate = {
      update_id: Math.floor(timestamp),
      callback_query: query
    }

    expect(removed_markup).toBe(false);
    const result = await HandleTelegramUpdate(db, update1);
    expect(result.status).toEqual(200);

    const chore_done = await db.ChoreGet(chore.id);
    expect(chore_done).not.toBeNull();
    if (chore_done == null) return;
    // Check to make sure we've removed the markup and the chore has been completed
    expect(removed_markup).toBe(true);
    expect(chore_done.lastDone).toBeGreaterThan(chore.lastDone);
  });
});