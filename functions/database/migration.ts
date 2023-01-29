import { cp } from "fs";
import { Kysely, Migration, MigrationProvider, sql } from "kysely";

const HoneydewVersion1 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "USERS"
            await db.schema.dropTable(table_name).ifExists().execute();
            await db.schema
                .createTable(table_name)
                .addColumn('id', 'varchar(40)', (col) => col.primaryKey().unique())
                .addColumn('name', 'varchar(255)', (col) => col.notNull())
                .addColumn('household', 'varchar(40)', (col) => col.notNull())
                .addColumn('color', 'varchar(10)', (col) => col.notNull())
                .addColumn('icon', 'varchar(40)', (col) => col.notNull())
                .addColumn('_created_at', 'timestamp', (col) => col.defaultTo('now()').notNull())
                .addColumn('_recoverykey', 'varchar(255)', (col) => col.notNull())
                .addColumn('_chat_id', 'int8', (col) => col.defaultTo(null))
                .execute()
        }
        {
            const table_name = "PROJECTS"
            await db.schema.dropTable(table_name).ifExists().execute();
            await db.schema
                .createTable(table_name)
                .addColumn('id', 'varchar(40)', (col) => col.primaryKey().unique())
                .addColumn('description', 'varchar(255)', (col) => col.notNull())
                .addColumn('household', 'varchar(40)', (col) => col.notNull())
                .execute()
        }
        {
            const table_name = "HOUSEHOLDS"
            await db.schema.dropTable(table_name).ifExists().execute();
            await db.schema
                .createTable(table_name)
                .addColumn('id', 'varchar(40)', (col) => col.primaryKey().unique())
                .addColumn('name', 'varchar(255)', (col) => col.notNull())
                .execute()
        }
        {
            const table_name = "RECIPES"
            await db.schema.dropTable(table_name).ifExists().execute();
            await db.schema
                .createTable(table_name)
                .addColumn('id', 'varchar(40)', (col) => col.unique())
                .addColumn('url', 'varchar(512)', (col) => col.primaryKey())
                .addColumn('image', 'varchar(512)', (col) => col.notNull())
                .addColumn('totalTime', 'integer', (col) => col.notNull()) // total time in minutes
                .addColumn('name', 'varchar(255)', (col) => col.notNull())
                .execute()
        }
        {
            const table_name = "CARDBOXES"
            await db.schema.dropTable(table_name).ifExists().execute();
            await db.schema
                .createTable(table_name)
                .addColumn('recipe_id', 'varchar(40)', (col) => col.unique())
                .addColumn('household_id', 'varchar(40)', (col) => col.notNull())
                .addColumn('lastMade', "integer", (col)=>col.defaultTo(null)) // stored as julian day numbers
                .addColumn('favorite', "integer", (col)=>col.defaultTo(0).notNull())
                .addUniqueConstraint("cardbox_ids_unique", ['household_id', 'recipe_id'])
                .execute()
        }
        {
            const table_name = "CHORES"
            await db.schema.dropTable(table_name).ifExists().execute();
            await db.schema
                .createTable(table_name)
                .addColumn('id', 'varchar(40)', (col) => col.primaryKey().unique())
                .addColumn('name', 'varchar(255)', (col) => col.notNull())
                .addColumn('household_id', 'varchar(40)', (col) => col.notNull())
                .addColumn('frequency', "integer", (col)=>col.notNull())
                .addColumn('lastDone', "integer", (col)=>col.notNull()) // stored as julian day numbers, defaults to today's date
                .addColumn('waitUntil', "integer", (col)=>col.defaultTo(null)) // stored as julian day numbers
                .execute()
        }
    }
}

const HoneydewVersion2 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "CARDBOXES"
            await db.schema
                .alterTable(table_name)
                .addColumn("meal_prep", "integer", (col)=>col.notNull().defaultTo(0))
                .execute()
        }
    }
}

const HoneydewVersion3 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "CHORES"
            await db.schema
                .alterTable(table_name)
                .addColumn('lastTimeAssigned', "integer", (col)=>col.defaultTo(null)) // stored as julian day numbers
                .execute()
            await db.schema
                .alterTable(table_name)
                .addColumn("doneBy", "varchar(40)", (col)=>col.defaultTo(null)) // this is the person that always does it
                .execute()
        }
    }
}
const HoneydewVersion4 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "HOUSEAUTOASSIGN"
            await db.schema.dropTable(table_name).ifExists().execute();
            await db.schema
                .createTable(table_name)
                .addColumn('house_id', 'varchar(40)', (col) => col.primaryKey().unique())
                .addColumn('choreAssignHour', "integer", (col)=>col.defaultTo(0)) // hour in UTC (0-23 that this should be triggered in)
                .addColumn('choreLastAssignTime', "integer", (col)=>col.defaultTo(0)) // stored as julian day numbers
                .execute()
        }
    }
}

export const HoneydewMigrations: Migration[] = [
    HoneydewVersion1,
    HoneydewVersion2,
    HoneydewVersion3,
    HoneydewVersion4,
]
export const LatestHoneydewDBVersion = HoneydewMigrations.length;