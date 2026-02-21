import { describe, expect, test, it, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { DbProject } from "functions/db_types";
import { HandleTelegramUpdate } from "../functions/telegram/webhook"
import { TriggerChores } from "../functions/triggers/schedule/chores"
import { TriggerOutfits } from "../functions/triggers/schedule/outfits"
import { MockedTelegramAPI, TelegramCallbackQuery, TelegramUpdate, TelegramUpdateMessage } from "../functions/database/_telegram";
import Database from "../functions/database/_db";
import { getJulianDate } from "../functions/_utils";
import { classifyClothing, generateOutfit } from "../functions/_outfit";

function generateTelegramResponse(data: any) {
  return new Response(JSON.stringify({
    ok: true,
    data
  }))
}

const telegram = new MockedTelegramAPI("TESTING");
const kv = env.HONEYDEW as KVNamespace;
const db = new Database(kv, telegram, env.HONEYDEWSQL as D1Database)
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
    await db.ChoreCreate("Break your bones", household.id, 1, 10, user.id);
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
      // console.error("chore callback", x);
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
          id: chat_id,
          type: "private"
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

// Also stick the trigger stuff in here, because why not?
describe('Trigger tests', () => {
  it('chores trigger and reminders are sent', async () => {
    let message_count = 0;
    telegram.registerListener(async (x) => {
      // console.error("chore callback", x);
      message_count += 1;
      return generateTelegramResponse(null);
    });
    // register a user and household
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;
    // make sure it will get assigned at hour 5, number is arbitrary
    expect(await db.HouseAutoAssignSetTime(house_id, 5)).toBe(true);

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

    for (let i = 0; i < 24; i++) {
      const result = await TriggerChores(db, i);
      if (i == 5) {
        expect(result.users.length).toBe(1);
      }
      else {
        expect(result.users.length).toBe(0);
      }
    }
    expect(message_count).toBe(2);
  });
  it('chores trigger and if completed, no reminder', async () => {
    let message_count = 0;
    telegram.registerListener(async (x) => {
      // console.error("chore callback", x);
      message_count += 1;
      return generateTelegramResponse(null);
    });
    // register a user and household
    const house_id = (await db.HouseholdCreate("Bob's house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;
    // make sure it will get assigned at hour 5, number is arbitrary
    expect(await db.HouseAutoAssignSetTime(house_id, 5)).toBe(true);

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    const user2_id = (await db.UserCreate("Joey", house_id))?.id;
    expect(user2_id).not.toBeNull();
    if (user2_id == null) return;

    // register for telegram
    const chat_id = 1321321;
    const tuser_id = 12312312;
    expect(await db.UserRegisterTelegram(user_id, chat_id, tuser_id)).toBe(true);

    // create the chores
    const chore = await db.ChoreCreate("Do the thing", house_id, 1, 10);
    expect(chore).not.toBeNull();
    if (chore == null) return;
    const chore2 = await db.ChoreCreate("Do the other thing", house_id, 1, 10);
    expect(chore2).not.toBeNull();
    if (chore2 == null) return;

    await TriggerChores(db, 5);
    expect(message_count).toBe(1);
    expect((await db.ChoreComplete(chore.id, user_id)).success).toBe(true);
    for (let i = 6; i < 24; i++) {
      await TriggerChores(db, i);
    }
    expect(message_count).toBe(1);
    await db.ChoreSkipCurrentChore(user_id);
    for (let i = 0; i < 24; i++) {
      await TriggerChores(db, i);
    }
  });
});

describe('Outfit classification tests', () => {
  // Helper to make a mock clothing item for classification
  function mockClothing(category: string, subcategory: string) {
    return {
      id: "CL:00000000-0000-0000-0000-000000000000" as any,
      household_id: "H:00000000-0000-0000-0000-000000000000" as any,
      name: "Test Item",
      category,
      subcategory,
      brand: "",
      color: "",
      size: "",
      image_url: "",
      tags: "",
      wear_count: 0,
      is_clean: 1,
      added_by: "U:00000000-0000-0000-0000-000000000000" as any,
      created_at: 0,
      max_wears: 1,
      wears_since_wash: 0,
    } as any;
  }

  it('classifies tops correctly', () => {
    expect(classifyClothing(mockClothing("Tops", "Polo"))).toBe("shirt");
    expect(classifyClothing(mockClothing("Tops", "T-Shirt"))).toBe("shirt");
    expect(classifyClothing(mockClothing("Shirt", "Button Down"))).toBe("shirt");
    expect(classifyClothing(mockClothing("Tops", "Sweater"))).toBe("shirt");
  });

  it('classifies bottoms correctly', () => {
    expect(classifyClothing(mockClothing("Bottoms", "Jeans"))).toBe("pants");
    expect(classifyClothing(mockClothing("Bottoms", "Chinos"))).toBe("pants");
    expect(classifyClothing(mockClothing("Pants", "Joggers"))).toBe("pants");
  });

  it('classifies outerwear correctly', () => {
    expect(classifyClothing(mockClothing("Outerwear", "Jacket"))).toBe("coat");
    expect(classifyClothing(mockClothing("Outerwear", "Coat"))).toBe("coat");
    expect(classifyClothing(mockClothing("Tops", "Hoodie"))).toBe("coat");
    expect(classifyClothing(mockClothing("Outerwear", "Blazer"))).toBe("coat");
  });

  it('classifies shoes correctly', () => {
    expect(classifyClothing(mockClothing("Shoes", "Sneakers"))).toBe("shoes");
    expect(classifyClothing(mockClothing("Footwear", "Boots"))).toBe("shoes");
    expect(classifyClothing(mockClothing("Shoes", "Loafer"))).toBe("shoes");
  });

  it('classifies socks correctly', () => {
    expect(classifyClothing(mockClothing("Socks", "Crew"))).toBe("socks");
    expect(classifyClothing(mockClothing("Accessories", "Sock"))).toBe("socks");
  });

  it('returns null for unrecognized categories', () => {
    expect(classifyClothing(mockClothing("Accessories", "Belt"))).toBeNull();
    expect(classifyClothing(mockClothing("Other", "Misc"))).toBeNull();
  });
});

describe('Outfit generation tests', () => {
  it('generates outfit from clean clothing', async () => {
    const house_id = (await db.HouseholdCreate("Outfit house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    expect(user_id).not.toBeNull();
    if (user_id == null) return;

    // Create one item of each required type
    await db.ClothingCreate("Blue Shirt", house_id, user_id, { category: "Tops", subcategory: "Shirt", color: "Blue" });
    await db.ClothingCreate("Black Jeans", house_id, user_id, { category: "Bottoms", subcategory: "Jeans", color: "Black" });
    await db.ClothingCreate("White Sneakers", house_id, user_id, { category: "Shoes", subcategory: "Sneakers", color: "White" });
    await db.ClothingCreate("Black Socks", house_id, user_id, { category: "Socks", subcategory: "Crew", color: "Black" });

    const allClothes = await db.ClothingGetAll(house_id);
    const { outfit, missingSlots } = generateOutfit(allClothes);

    expect(missingSlots).toHaveLength(0);
    expect(outfit.shirt).not.toBeNull();
    expect(outfit.pants).not.toBeNull();
    expect(outfit.shoes).not.toBeNull();
    expect(outfit.sockColor).toBe("Black");
    // Coat is optional, no coat was added
    expect(outfit.coat).toBeNull();
  });

  it('reports missing slots when no clean items available', async () => {
    const house_id = (await db.HouseholdCreate("Empty house"))?.id;
    expect(house_id).not.toBeNull();
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    if (user_id == null) return;

    // Only create a shirt - pants and shoes are missing
    await db.ClothingCreate("Red Shirt", house_id, user_id, { category: "Tops", subcategory: "Shirt", color: "Red" });

    const allClothes = await db.ClothingGetAll(house_id);
    const { outfit, missingSlots } = generateOutfit(allClothes);

    expect(missingSlots).toContain("pants");
    expect(missingSlots).toContain("shoes");
    expect(outfit.shirt).not.toBeNull();
  });

  it('excludes dirty items from outfit generation', async () => {
    const house_id = (await db.HouseholdCreate("Dirty house"))?.id;
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    if (user_id == null) return;

    const shirt = await db.ClothingCreate("Only Shirt", house_id, user_id, { category: "Tops", subcategory: "Shirt" });
    await db.ClothingCreate("Jeans", house_id, user_id, { category: "Bottoms", subcategory: "Jeans" });
    await db.ClothingCreate("Shoes", house_id, user_id, { category: "Shoes", subcategory: "Sneakers" });

    if (shirt == null) return;
    // Mark the only shirt as dirty
    await db.ClothingMarkDirty(shirt.id);

    const allClothes = await db.ClothingGetAll(house_id);
    const { outfit, missingSlots } = generateOutfit(allClothes);

    // Should report shirt as missing since the only one is dirty
    expect(missingSlots).toContain("shirt");
    expect(outfit.shirt).toBeNull();
  });
});

describe('Outfit trigger tests', () => {
  it('sends outfit messages to opted-in users', async () => {
    let message_count = 0;
    let got_outfit_text = false;
    let got_dirty_button = false;
    telegram.registerListener(async (x) => {
      message_count += 1;
      if (x.type == "POST" && x.method == "sendMessage") {
        const text = x.data.text as string;
        if (text.includes("outfit suggestion")) {
          got_outfit_text = true;
        }
        if (x.data.reply_markup?.inline_keyboard?.length > 0) {
          const buttons = x.data.reply_markup.inline_keyboard.flat();
          if (buttons.some((b: any) => b.text.includes("dirty"))) {
            got_dirty_button = true;
          }
        }
      }
      return generateTelegramResponse(null);
    });

    const house_id = (await db.HouseholdCreate("Outfit trigger house"))?.id;
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    if (user_id == null) return;

    const chat_id = 99999;
    expect(await db.UserRegisterTelegram(user_id, chat_id, 88888)).toBe(true);

    // Set outfit hour
    expect(await db.HouseOutfitSetHour(house_id, 8)).toBe(true);

    // Create a full wardrobe
    await db.ClothingCreate("Polo Shirt", house_id, user_id, { category: "Tops", subcategory: "Polo", color: "Blue", image_url: "https://example.com/polo.jpg" });
    await db.ClothingCreate("Dark Jeans", house_id, user_id, { category: "Bottoms", subcategory: "Jeans", color: "Dark Blue", image_url: "https://example.com/jeans.jpg" });
    await db.ClothingCreate("White Sneakers", house_id, user_id, { category: "Shoes", subcategory: "Sneakers", color: "White", image_url: "https://example.com/sneakers.jpg" });
    await db.ClothingCreate("Black Socks", house_id, user_id, { category: "Socks", subcategory: "Crew", color: "Black" });

    message_count = 0;
    const result = await TriggerOutfits(db, 8);
    expect(result.households.length).toBe(1);

    // Should have received messages (media group + text with buttons)
    expect(message_count).toBeGreaterThan(0);
    expect(got_outfit_text).toBe(true);
    expect(got_dirty_button).toBe(true);
  });

  it('sends laundry prompt when no outfits possible', async () => {
    let got_laundry_prompt = false;
    let got_laundry_button = false;
    telegram.registerListener(async (x) => {
      if (x.type == "POST" && x.method == "sendMessage") {
        const text = x.data.text as string;
        if (text.includes("laundry")) {
          got_laundry_prompt = true;
        }
        if (x.data.reply_markup?.inline_keyboard?.length > 0) {
          const buttons = x.data.reply_markup.inline_keyboard.flat();
          if (buttons.some((b: any) => b.text.includes("Laundry"))) {
            got_laundry_button = true;
          }
        }
      }
      return generateTelegramResponse(null);
    });

    const house_id = (await db.HouseholdCreate("No outfits house"))?.id;
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    if (user_id == null) return;

    const chat_id = 77777;
    expect(await db.UserRegisterTelegram(user_id, chat_id, 66666)).toBe(true);

    // Set outfit hour
    expect(await db.HouseOutfitSetHour(house_id, 9)).toBe(true);

    // Create clothing but mark it all dirty
    const shirt = await db.ClothingCreate("Shirt", house_id, user_id, { category: "Tops", subcategory: "Shirt" });
    await db.ClothingCreate("Pants", house_id, user_id, { category: "Bottoms", subcategory: "Pants" });
    await db.ClothingCreate("Shoes", house_id, user_id, { category: "Shoes", subcategory: "Sneakers" });

    if (shirt != null) await db.ClothingMarkDirty(shirt.id);

    const result = await TriggerOutfits(db, 9);
    expect(result.households.length).toBe(1);
    expect(got_laundry_prompt).toBe(true);
    expect(got_laundry_button).toBe(true);
  });

  it('outfit dirty callback marks item dirty and regenerates', async () => {
    let message_count = 0;
    telegram.registerListener(async (x) => {
      message_count += 1;
      return generateTelegramResponse(null);
    });

    const house_id = (await db.HouseholdCreate("Callback house"))?.id;
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    if (user_id == null) return;

    const chat_id = 55555;
    expect(await db.UserRegisterTelegram(user_id, chat_id, 44444)).toBe(true);

    // Create clothing
    const shirt = await db.ClothingCreate("Shirt", house_id, user_id, { category: "Tops", subcategory: "Shirt" });
    const shirt2 = await db.ClothingCreate("Backup Shirt", house_id, user_id, { category: "Tops", subcategory: "Shirt" });
    await db.ClothingCreate("Pants", house_id, user_id, { category: "Bottoms", subcategory: "Pants" });
    await db.ClothingCreate("Shoes", house_id, user_id, { category: "Shoes", subcategory: "Sneakers" });

    if (shirt == null) return;

    // Create an OUTFIT_DIRTY callback
    const callback = await db.TelegramCallbackCreate({
      user_id,
      type: "OUTFIT_DIRTY",
      clothing_id: shirt.id,
      house_id,
    });
    expect(callback).not.toBeNull();
    if (callback == null) return;

    // Simulate callback query
    const query: TelegramCallbackQuery = {
      id: "outfit-dirty-test",
      message: {
        message_id: 12345,
        chat: { id: chat_id, type: "private" },
        date: Math.floor(getJulianDate()),
      },
      from: { id: 44444, is_bot: false, first_name: "Bob" },
      chat_instance: "test",
      data: callback,
    };
    const update: TelegramUpdate = {
      update_id: 1,
      callback_query: query,
    };

    message_count = 0;
    const result = await HandleTelegramUpdate(db, update);
    expect(result.status).toEqual(200);

    // Verify the item was marked dirty
    const dirtyShirt = await db.ClothingGet(shirt.id);
    expect(dirtyShirt).not.toBeNull();
    expect(dirtyShirt!.is_clean).toBe(0);

    // Should have sent new outfit messages
    expect(message_count).toBeGreaterThan(0);
  });

  it('laundry callback cleans all clothes and regenerates outfit', async () => {
    let message_count = 0;
    let got_outfit = false;
    telegram.registerListener(async (x) => {
      message_count += 1;
      if (x.type == "POST" && x.method == "sendMessage") {
        if ((x.data.text as string).includes("outfit suggestion")) {
          got_outfit = true;
        }
      }
      return generateTelegramResponse(null);
    });

    const house_id = (await db.HouseholdCreate("Laundry callback house"))?.id;
    if (house_id == null) return;

    const user_id = (await db.UserCreate("Bob", house_id))?.id;
    if (user_id == null) return;

    const chat_id = 33333;
    expect(await db.UserRegisterTelegram(user_id, chat_id, 22222)).toBe(true);

    // Create clothing and make it all dirty
    const shirt = await db.ClothingCreate("Shirt", house_id, user_id, { category: "Tops", subcategory: "Shirt" });
    const pants = await db.ClothingCreate("Pants", house_id, user_id, { category: "Bottoms", subcategory: "Pants" });
    const shoes = await db.ClothingCreate("Shoes", house_id, user_id, { category: "Shoes", subcategory: "Sneakers" });

    if (shirt == null || pants == null || shoes == null) return;
    await db.ClothingMarkDirty(shirt.id);
    await db.ClothingMarkDirty(pants.id);
    await db.ClothingMarkDirty(shoes.id);

    // Create an OUTFIT_LAUNDRY callback
    const callback = await db.TelegramCallbackCreate({
      user_id,
      type: "OUTFIT_LAUNDRY",
      house_id,
    });
    expect(callback).not.toBeNull();
    if (callback == null) return;

    const query: TelegramCallbackQuery = {
      id: "laundry-test",
      message: {
        message_id: 12345,
        chat: { id: chat_id, type: "private" },
        date: Math.floor(getJulianDate()),
      },
      from: { id: 22222, is_bot: false, first_name: "Bob" },
      chat_instance: "test",
      data: callback,
    };
    const update: TelegramUpdate = {
      update_id: 2,
      callback_query: query,
    };

    message_count = 0;
    got_outfit = false;
    const result = await HandleTelegramUpdate(db, update);
    expect(result.status).toEqual(200);

    // Verify all clothes are now clean
    const s = await db.ClothingGet(shirt.id);
    const p = await db.ClothingGet(pants.id);
    const sh = await db.ClothingGet(shoes.id);
    expect(s!.is_clean).toBe(1);
    expect(p!.is_clean).toBe(1);
    expect(sh!.is_clean).toBe(1);

    // Should have generated a new outfit
    expect(message_count).toBeGreaterThan(0);
    expect(got_outfit).toBe(true);
  });
});