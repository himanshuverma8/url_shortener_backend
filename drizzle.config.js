import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: ['./models/user.model.js', './models/url.model.js', './models/clicks.model.js', './models/geoCache.model.js'],
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
