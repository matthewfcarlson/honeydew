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
const HoneydewVersion5 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "PROJECTS"
            await db.schema.dropTable(table_name).ifExists().execute();
            await db.schema
                .createTable(table_name)
                .addColumn('id', 'varchar(40)', (col) => col.primaryKey().unique())
                .addColumn('description', "varchar(255)", (col)=>col.notNull())
                .addColumn('household', "varchar(40)", (col)=>col.notNull())
                .execute()
        }
        {
            const table_name = "TASKS"
            await db.schema.dropTable(table_name).ifExists().execute();
            await db.schema
                .createTable(table_name)
                .addColumn('id', 'varchar(40)', (col) => col.primaryKey().unique())
                .addColumn('household', "varchar(40)", (col)=>col.notNull())
                .addColumn('description', "varchar(255)", (col)=>col.notNull())
                .addColumn('project', 'varchar(40)', (col) => col.defaultTo(null))
                .addColumn('added_by', 'varchar(40)', (col) => col.notNull())
                .addColumn('completed', 'integer', (col) => col.defaultTo(null)) // julian date that it was completed
                .addColumn('requirement1', 'varchar(40)', (col) => col.defaultTo(null))
                .addColumn('requirement2', 'varchar(40)', (col) => col.defaultTo(null))
                .execute()
        }
    }
}
const HoneydewVersion6 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "HOUSEHOLDS"
            console.error(db.schema
                .alterTable(table_name)
                .addColumn('expecting', "varchar(25)", (col)=>col.defaultTo(null)).compile().sql)
            await db.schema
                .alterTable(table_name)
                .addColumn('expecting', "varchar(25)", (col)=>col.defaultTo(null))
                .execute()
        }

    }
}

const HoneydewVersion7 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "USERS"
            await db.schema
                .alterTable(table_name)
                .addColumn('last_active_date', "integer", (col)=>col.defaultTo(null))
                .execute()
            await db.schema
                .alterTable(table_name)
                .addColumn('current_streak', "integer", (col)=>col.defaultTo(0).notNull())
                .execute()
        }
    }
}

const HoneydewVersion8 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "CHORES"
            await db.schema
                .alterTable(table_name)
                .addColumn('lastDoneBy', "varchar(40)", (col)=>col.defaultTo(null)) // tracks who last completed the chore
                .execute()
        }
    }
}

const HoneydewVersion9 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "HOUSEAUTOASSIGN"
            await db.schema
                .alterTable(table_name)
                .addColumn('outfitHour', "integer", (col)=>col.defaultTo(null)) // hour in UTC (0-23) for outfit suggestions, null means disabled
                .execute()
            await db.schema
                .alterTable(table_name)
                .addColumn('outfitLastAssignTime', "integer", (col)=>col.defaultTo(0)) // stored as julian day numbers
                .execute()
        }
    }
}

const HoneydewVersion10 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "CLOTHES"
            await db.schema.dropTable(table_name).ifExists().execute();
            await db.schema
                .createTable(table_name)
                .addColumn('id', 'varchar(40)', (col) => col.primaryKey().unique())
                .addColumn('household_id', 'varchar(40)', (col) => col.notNull())
                .addColumn('name', 'varchar(255)', (col) => col.notNull())
                .addColumn('category', 'varchar(100)', (col) => col.notNull().defaultTo(''))
                .addColumn('subcategory', 'varchar(100)', (col) => col.notNull().defaultTo(''))
                .addColumn('brand', 'varchar(255)', (col) => col.notNull().defaultTo(''))
                .addColumn('color', 'varchar(100)', (col) => col.notNull().defaultTo(''))
                .addColumn('size', 'varchar(50)', (col) => col.notNull().defaultTo(''))
                .addColumn('image_url', 'varchar(1024)', (col) => col.notNull().defaultTo(''))
                .addColumn('tags', 'varchar(1024)', (col) => col.notNull().defaultTo(''))
                .addColumn('wear_count', 'integer', (col) => col.notNull().defaultTo(0))
                .addColumn('is_clean', 'integer', (col) => col.notNull().defaultTo(1))
                .addColumn('added_by', 'varchar(40)', (col) => col.notNull())
                .addColumn('created_at', 'integer', (col) => col.notNull()) // julian day number
                .execute()
        }
    }
}

const HoneydewVersion11 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "USERS"
            await db.schema
                .alterTable(table_name)
                .addColumn('outfit_reminders', "integer", (col)=>col.defaultTo(1).notNull()) // 1 = opted in, 0 = opted out
                .execute()
        }
    }
}

const HoneydewVersion12 = {
    async up(db: Kysely<any>): Promise<void> {
        {
            const table_name = "CLOTHES"
            await db.schema
                .alterTable(table_name)
                .addColumn('max_wears', "integer", (col)=>col.defaultTo(1).notNull()) // number of wears before needing a wash
                .execute()
            await db.schema
                .alterTable(table_name)
                .addColumn('wears_since_wash', "integer", (col)=>col.defaultTo(0).notNull()) // wears since last wash, resets on clean
                .execute()
        }
    }
}

export const HoneydewMigrations: Migration[] = [
    HoneydewVersion1,
    HoneydewVersion2,
    HoneydewVersion3,
    HoneydewVersion4,
    HoneydewVersion5,
    HoneydewVersion6,
    HoneydewVersion7,
    HoneydewVersion8,
    HoneydewVersion9,
    HoneydewVersion10,
    HoneydewVersion11,
    HoneydewVersion12
]
export const LatestHoneydewDBVersion = HoneydewMigrations.length;