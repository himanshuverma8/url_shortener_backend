CREATE TABLE "geo_cache" (
	"ip_address" varchar(45) PRIMARY KEY NOT NULL,
	"country" varchar(2),
	"country_name" varchar(100),
	"region" varchar(100),
	"city" varchar(100),
	"postal_code" varchar(20),
	"timezone" varchar(50),
	"location" varchar(50),
	"org" text,
	"cached_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clicks" ADD COLUMN "browser" varchar(50);