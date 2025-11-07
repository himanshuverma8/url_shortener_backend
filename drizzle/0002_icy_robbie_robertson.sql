CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(55) NOT NULL,
	"last_name" varchar(55),
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"salt" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url_id" uuid NOT NULL,
	"visitor_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"referrer" text,
	"country" varchar(2),
	"country_name" varchar(100),
	"region" varchar(100),
	"postal_code" varchar(20),
	"timezone" varchar(50),
	"location" varchar(50),
	"org" text,
	"device" varchar(50),
	"os" varchar(50),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_url_id_urls_id_fk" FOREIGN KEY ("url_id") REFERENCES "public"."urls"("id") ON DELETE no action ON UPDATE no action;