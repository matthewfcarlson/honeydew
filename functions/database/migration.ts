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
                .addColumn('_chat_id', 'varchar(255)')
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
    }
}

export const HoneydewMigrations: Migration[] = [
    HoneydewVersion1
]
export const LatestHoneydewDBVersion = HoneydewMigrations.length;