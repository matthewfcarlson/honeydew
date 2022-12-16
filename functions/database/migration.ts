import { Kysely, Migration, MigrationProvider, sql } from "kysely";

const HoneydewVersion1 = {
    async up(db: Kysely<any>): Promise<void> {
        await db.schema.dropTable('users').ifExists().execute();
        await db.schema
        .createTable('users')
        .addColumn('id', 'varchar(40)', (col) => col.primaryKey())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('household', 'varchar(40)', (col) => col.notNull())
        .addColumn('color', 'varchar(10)', (col) => col.notNull())
        .addColumn('icon', 'varchar(40)', (col) => col.notNull())
        .addColumn('_created_at', 'timestamp', (col) => col.defaultTo('now()').notNull())
        .addColumn('_recoverykey', 'varchar(255)', (col) => col.notNull())
        .addColumn('_chat_id', 'varchar(255)')
        .execute()
    }
}

export const HoneydewMigrations: Migration[] = [
    HoneydewVersion1
]
export const LatestHoneydewDBVersion = HoneydewMigrations.length.toString();