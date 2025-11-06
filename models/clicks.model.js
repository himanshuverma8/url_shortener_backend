import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { urlsTable } from "./url.model.js";

export const clicksTable = pgTable('clicks', {
    id: uuid().primaryKey().defaultRandom(),
    urlId: uuid('url_id').references(() => urlsTable.id).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    referrer: text('referrer'),
    country: varchar('country', { length: 2 }),
    timestamp: timestamp('timestamp').defaultNow().notNull()
})


