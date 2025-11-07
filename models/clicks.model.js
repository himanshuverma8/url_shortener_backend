import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { urlsTable } from "./url.model.js";

export const clicksTable = pgTable('clicks', {
    id: uuid().primaryKey().defaultRandom(),
    urlId: uuid('url_id').references(() => urlsTable.id).notNull(),
    visitorId: uuid('visitor_id'), // Unique visitor identifier
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    referrer: text('referrer'),
    //geolocation data using ipinfo.io api using ip address of the user from response headers
    country: varchar('country', {length: 2}), //country code
    countryName: varchar('country_name', {length: 100}), //full name of the country
    region: varchar('region', {length: 100}), //State/Province
    postalCode: varchar('postal_code', {length: 20}),
    timezone: varchar('timezone', {length: 50}),
    location: varchar('location', {length: 50}), //lat, lon
    org: text('org'), //ISP organization
    //Device/Browser data
    device: varchar('device', {length: 50}), //mobile, desktop, tablet
    browser: varchar('device', {length: 50}), //chrome, firefox, safari
    os: varchar('os', {length: 50}), //Windows, macOS, iOS, Android
    timestamp: timestamp('timestamp').defaultNow().notNull()
})


