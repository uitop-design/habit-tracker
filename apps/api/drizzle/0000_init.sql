CREATE TYPE "public"."habit_color" AS ENUM('slate', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink');--> statement-breakpoint
CREATE TABLE "checkins" (
	"habit_id" uuid NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkins_habit_id_date_pk" PRIMARY KEY("habit_id","date")
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(48) NOT NULL,
	"color" "habit_color" NOT NULL,
	"weekdays" smallint[] NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habits_weekdays_check" CHECK (cardinality("habits"."weekdays") between 1 and 7 and "habits"."weekdays" <@ '{1,2,3,4,5,6,7}'::smallint[])
);
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "habits_active_name_key" ON "habits" USING btree (lower("name")) WHERE "habits"."archived_at" is null;