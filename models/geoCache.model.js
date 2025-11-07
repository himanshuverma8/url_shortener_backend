import { pgTable, varchar, text, timestamp} from 'drizzle-orm/pg-core'

export const geoCacheTable = pgTable('geo_cache', {
    ipAddress: varchar('ip_address', {length: 45}).primaryKey(),
    country: varchar('country', {length: 2}),
    countryName: varchar('country_name', {length: 100}),
    region: varchar('region', {length: 100}),
    city: varchar('city', {length: 100}),
    postalCode: varchar('postal_code', {length: 20}),
    timezone: varchar('timezone', {length: 50}),
    location: varchar('location', {length: 50}),
    org: text('org'),
    cachedAt: timestamp('cached_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull() //cache for 30 days
})