/**
 * Integration test example for the `post` router
 */
import { createInnerContext } from '../functions/api/context';
import { appRouter } from '../functions/api/router';
import { inferProcedureInput } from '@trpc/server';
import { TelegramAPI } from "../functions/database/_telegram";
import Database from "../functions/database/_db";
import { describe, expect, test } from '@jest/globals';
import { DbUser } from 'functions/db_types';
import { HoneydewPageData, HoneydewPageEnv } from 'functions/types';
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

function createData(user: DbUser | null): HoneydewPageData {
    const authorized = user != null;
    const userid = (user == null) ? null: user.id;
    return {
        db,
        timestamp: Date.now(),
        user,
        authorized,
        jwt_raw: '',
        userid,
    }
}

const ENV: HoneydewPageEnv = {
    TELEGRAM: "",
    JWT_SECRET: "",
    TELEGRAM_WH: "",
    PRODUCTION: "false",
    HONEYDEW,
    HONEYDEWSQL: __D1_BETA__HONEYDEWSQL,
    TURNSTILE: "",
}
const ROOT_URL = "http://localhost/"
describe('User tests', () => {
    test('you can query ', async () => {

        const house = await db.HouseholdCreate("BOB'S HOUSE");
        expect(house).not.toBeNull();
        if (house == null) return;
        expect(house.id.length).toBeGreaterThan(10);
        // Act
        const user = await db.UserCreate("BOBBY", house.id);
        // Assert
        if (user == null) return;

        const ctx = await createInnerContext(createData(user), ENV, ROOT_URL);

        const caller = appRouter.createCaller(ctx);
        const result = await caller.me.get();
        expect(result.id).toBe(user.id);

        //   const input: inferProcedureInput<AppRouter[']['add']> = {
        //     text: 'hello test',
        //     title: 'hello test',
        //   };

        //   const post = await caller.post.add(input);
        //   const byId = await caller.post.byId({ id: post.id });

        //   expect(byId).toMatchObject(input);
    });
});