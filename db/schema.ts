// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,primaryKey} from 'drizzle-orm/sqlite-core';
export const plans=sqliteTable('plans',{userId:text('user_id').notNull(),date:text('date').notNull(),payload:text('payload').notNull()},t=>[primaryKey({columns:[t.userId,t.date]})]);
